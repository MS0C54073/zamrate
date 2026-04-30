// Generates and persists a stable anonymous user identifier in localStorage.
const KEY = "zamrate_anon_id";

export function getAnonId(): string {
  if (typeof window === "undefined") return "server";
  let id = localStorage.getItem(KEY);
  if (!id) {
    const rand = crypto.getRandomValues(new Uint8Array(24));
    id = Array.from(rand).map((b) => b.toString(16).padStart(2, "0")).join("");
    localStorage.setItem(KEY, id);
  }
  return id;
}
