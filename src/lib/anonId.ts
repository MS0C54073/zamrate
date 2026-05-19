// Generates and persists a strong, fully anonymous user identifier.
// 32 bytes of cryptographic randomness — no PII, no fingerprinting,
// never transmitted in URLs, never logged. Stored only in localStorage.
const KEY = "zamrate_anon_id";
const VERSION_KEY = "zamrate_anon_v";
const CURRENT_VERSION = "2";

function generate(): string {
  const rand = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(rand).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function getAnonId(): string {
  if (typeof window === "undefined") return "server";
  const version = localStorage.getItem(VERSION_KEY);
  let id = localStorage.getItem(KEY);
  if (!id || version !== CURRENT_VERSION) {
    id = generate();
    localStorage.setItem(KEY, id);
    localStorage.setItem(VERSION_KEY, CURRENT_VERSION);
  }
  return id;
}

/** Rotate the anonymous identity — destroys any link to prior activity. */
export function rotateAnonId(): string {
  const id = generate();
  localStorage.setItem(KEY, id);
  localStorage.setItem(VERSION_KEY, CURRENT_VERSION);
  return id;
}
