// Cloudflare Workers entry for the Tlapka static export + the existing Netlify Functions (web-standard Request/Response).
// Static files are served by the [assets] binding; only /api/* hits this Worker (run_worker_first). No Netlify-specific code is changed.
import ai from '../../netlify/functions/ai.mjs';
import aivet from '../../netlify/functions/aivet.mjs';
import vets from '../../netlify/functions/vets.mjs';
import entitlement from '../../netlify/functions/entitlement.mjs';
import accountDelete from '../../netlify/functions/account-delete.mjs';
import wallet from '../../netlify/functions/wallet.mjs';
import stripe from '../../netlify/functions/billing-stripe.mjs';
import revenuecat from '../../netlify/functions/billing-revenuecat.mjs';
import trashPurge from '../../netlify/functions/trash-purge.mjs';

const ROUTES = { '/api/ai': ai, '/api/aivet': aivet, '/api/vets': vets, '/api/entitlement': entitlement, '/api/account/delete': accountDelete,
  '/api/wallet/apple': wallet, '/api/wallet/google': wallet, '/api/billing/stripe': stripe, '/api/billing/revenuecat': revenuecat };

export default {
  async fetch(request, env, ctx) {
    // Netlify.env shim (the functions read Netlify.env.get(k) || process.env[k]); vars/secrets come from wrangler secrets.
    globalThis.Netlify = { env: { get: (k) => env[k] } };
    const url = new URL(request.url);
    const h = ROUTES[url.pathname.replace(/\/$/, '')];
    if (!h) return env.ASSETS ? env.ASSETS.fetch(request) : new Response('Not found', { status: 404 });
    return h(request, { waitUntil: ctx.waitUntil.bind(ctx) });
  },
  async scheduled(_event, env, ctx) {
    globalThis.Netlify = { env: { get: (k) => env[k] } };
    ctx.waitUntil(trashPurge(new Request('https://cron.local/'), {}));
  },
};
