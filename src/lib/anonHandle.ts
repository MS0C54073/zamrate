// Deterministically derive a friendly, anonymous display handle from an
// opaque anonymous_user_id. Same id → same handle, but the original id
// is never revealed. Used to distinguish commenters in threads while
// keeping their identity private.
const ADJECTIVES = [
  "Quiet", "Brave", "Kind", "Swift", "Bold", "Wise", "Calm", "Sharp",
  "Gentle", "Loyal", "Honest", "Curious", "Steady", "Bright", "Humble",
  "Fearless", "Cheerful", "Patient", "Noble", "Eager",
];
const ANIMALS = [
  "Lion", "Eagle", "Zebra", "Buffalo", "Leopard", "Crane", "Hippo", "Otter",
  "Falcon", "Antelope", "Heron", "Mongoose", "Kingfisher", "Impala",
  "Cheetah", "Pangolin", "Stork", "Bushbuck", "Owl", "Ibis",
];

function hash(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function anonHandle(anonId: string): string {
  if (!anonId) return "Anonymous";
  const h = hash(anonId);
  const a = ADJECTIVES[h % ADJECTIVES.length];
  const b = ANIMALS[(h >>> 8) % ANIMALS.length];
  const n = (h >>> 16) % 90 + 10; // 10..99
  return `${a}${b}${n}`;
}

export function isMine(anonId: string, mine: string): boolean {
  return anonId === mine;
}
