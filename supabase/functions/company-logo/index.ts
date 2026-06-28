// Resolve a company logo for a given domain. Tries multiple favicon services
// (Google faviconV2 — including www variants — DuckDuckGo, direct site paths)
// and, as a final fallback, scrapes the homepage for <link rel="icon"> tags.
// Rejects known placeholder bytes and returns 404 when nothing acceptable
// was found so the frontend can render the initials fallback.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const DDG_PLACEHOLDER_BYTES = 1478;

function logoDev(domain: string) {
  // Use Logo.dev with fallback=404 to handle missing logos gracefully
  return `https://img.logo.dev/${domain}?size=128&fallback=404`;
}

function googleFavicon(host: string) {
  return `https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${host}&size=128`;
}

function directSources(host: string): string[] {
  return [
    `https://${host}/favicon.ico`,
    `https://${host}/apple-touch-icon.png`,
    `https://${host}/apple-touch-icon-precomposed.png`,
    `https://${host}/favicon.png`,
  ];
}

function buildSources(domain: string): string[] {
  const bare = domain.replace(/^www\./, "");
  const www = `www.${bare}`;
  return [
    logoDev(bare),
    googleFavicon(www),
    googleFavicon(bare),
    `https://icons.duckduckgo.com/ip3/${bare}.ico`,
    ...directSources(www),
    ...directSources(bare),
  ];
}

function isPlaceholder(bytes: Uint8Array, url: string): boolean {
  if (url.includes("duckduckgo.com") && bytes.byteLength === DDG_PLACEHOLDER_BYTES) return true;
  // Google returns a 726-byte generic globe when nothing is found (status 404).
  if (url.includes("gstatic.com/faviconV2") && bytes.byteLength < 800) return true;
  if (bytes.byteLength < 150) return true;
  return false;
}

async function tryFetchImage(src: string): Promise<Response | null> {
  try {
    const r = await fetch(src, { redirect: "follow", signal: AbortSignal.timeout(4500) });
    if (!r.ok) return null;
    const ct = r.headers.get("content-type") || "";
    if (!ct.startsWith("image/")) return null;
    const bytes = new Uint8Array(await r.arrayBuffer());
    if (isPlaceholder(bytes, src)) return null;
    return new Response(bytes, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": ct,
        "Cache-Control": "public, max-age=86400, s-maxage=604800, immutable",
      },
    });
  } catch {
    return null;
  }
}

// Final fallback: fetch the homepage HTML and look for declared icons.
async function scrapeHomepageIcon(domain: string): Promise<Response | null> {
  const bare = domain.replace(/^www\./, "");
  const candidates = [`https://www.${bare}`, `https://${bare}`];
  for (const page of candidates) {
    try {
      const r = await fetch(page, {
        redirect: "follow",
        signal: AbortSignal.timeout(6000),
        headers: { "User-Agent": "Mozilla/5.0 (compatible; LogoFetcher/1.0)" },
      });
      if (!r.ok) continue;
      const html = await r.text();
      const head = html.slice(0, 200_000);
      const linkRe = /<link[^>]+rel=["']?(?:shortcut\s+)?(?:icon|apple-touch-icon|apple-touch-icon-precomposed|mask-icon)["']?[^>]*>/gi;
      const hrefRe = /href=["']([^"']+)["']/i;
      const found: string[] = [];
      let m: RegExpExecArray | null;
      while ((m = linkRe.exec(head))) {
        const h = m[0].match(hrefRe)?.[1];
        if (h) found.push(h);
      }
      // Also <meta property="og:image">
      const ogMatch = head.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
      if (ogMatch) found.push(ogMatch[1]);
      const base = new URL(page);
      for (const href of found) {
        let abs: string;
        try {
          abs = new URL(href, base).toString();
        } catch {
          continue;
        }
        const ok = await tryFetchImage(abs);
        if (ok) return ok;
      }
    } catch {
      // try next
    }
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const domain = (url.searchParams.get("domain") || "").trim().toLowerCase();
  if (!domain || !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) {
    return new Response(JSON.stringify({ error: "invalid domain" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  for (const src of buildSources(domain)) {
    const ok = await tryFetchImage(src);
    if (ok) return ok;
  }

  const scraped = await scrapeHomepageIcon(domain);
  if (scraped) return scraped;

  return new Response("not found", {
    status: 404,
    headers: { ...corsHeaders, "Cache-Control": "public, max-age=3600" },
  });
});
