// Resolve a company logo for a given domain. Tries multiple favicon services,
// rejects known placeholder images, and returns the first real logo as image
// bytes. Returns 404 when nothing acceptable was found so the <img> onError
// handler can render the initials fallback.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// DuckDuckGo's "no icon" placeholder is exactly 1478 bytes.
const DDG_PLACEHOLDER_BYTES = 1478;

const SOURCES = (domain: string): string[] => [
  `https://icons.duckduckgo.com/ip3/${domain}.ico`,
  `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
  `https://${domain}/favicon.ico`,
  `https://${domain}/apple-touch-icon.png`,
];

function isPlaceholder(bytes: Uint8Array, url: string): boolean {
  // DDG default
  if (url.includes("duckduckgo.com") && bytes.byteLength === DDG_PLACEHOLDER_BYTES) {
    return true;
  }
  // Google generic globe is tiny (< 800 bytes) and an SVG/PNG of a globe.
  if (url.includes("google.com/s2") && bytes.byteLength < 800) {
    return true;
  }
  // Anything under 200 bytes is too small to be a real logo.
  if (bytes.byteLength < 200) return true;
  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const domain = (url.searchParams.get("domain") || "").trim().toLowerCase();
  if (!domain || !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) {
    return new Response(JSON.stringify({ error: "invalid domain" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  for (const src of SOURCES(domain)) {
    try {
      const r = await fetch(src, {
        redirect: "follow",
        signal: AbortSignal.timeout(4000),
      });
      if (!r.ok) continue;
      const ct = r.headers.get("content-type") || "";
      if (!ct.startsWith("image/")) continue;
      const bytes = new Uint8Array(await r.arrayBuffer());
      if (isPlaceholder(bytes, src)) continue;
      return new Response(bytes, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": ct,
          // Cache aggressively at the CDN/browser.
          "Cache-Control": "public, max-age=86400, s-maxage=604800, immutable",
        },
      });
    } catch {
      // try next source
    }
  }

  return new Response("not found", {
    status: 404,
    headers: { ...corsHeaders, "Cache-Control": "public, max-age=3600" },
  });
});
