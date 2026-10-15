// Stand-in for @netlify/blobs on Cloudflare: aivet.mjs wraps getStore() in try/catch and falls back to "no store".
// Consequence: per-user rate-limit + free-trial counters are NOT persisted here. Replace with a KV-backed store before production.
export const getStore = () => { throw new Error('netlify blobs unavailable on Cloudflare (use KV)'); };
