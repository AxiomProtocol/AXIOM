import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
});

const prompt = `You are a senior security and infrastructure engineer doing a pre-deployment review of Axiom Protocol — an institutional private markets OS built on Next.js + Arbitrum One targeting institutional allocators and community investors.

Stack: Next.js 14 (Pages + App Router hybrid), PostgreSQL/Drizzle ORM, Wagmi v2 + Reown AppKit (SIWE), Stripe, Unit Finance (banking), BitGo (crypto custody), Alchemy, Auth0, Gemini AI

Scale: ~80 routes, 72 verified smart contracts on Arbitrum One, real estate deal intelligence, syndication, banking, DePIN, solvency dashboard, KYC, capital accounting

Known risks from codebase analysis:
1. Hardcoded fallback Ethereum addresses (0xa0b0...) in server/api.js when env vars missing
2. server/auth.js default session secret 'swf_secret_key_change_in_production' if SESSION_SECRET not set
3. _archive/ directory with legacy Express API code — risk of accidental routing or confusion
4. Rate limiting not consistently applied across all Next.js API routes
5. Mixed auth: SIWE wallet sessions + Auth0 OAuth + JWT — fragmented session management
6. Mix of Drizzle ORM and raw pool.query calls — parameterization consistency unclear
7. Admin-gated routes use ADMIN_SOLVENCY_KEY — not confirmed all paths validate server-side
8. BitGo CaaS requires static outbound IP — Replit Autoscale is serverless, may rotate IPs
9. DEPLOYER_PRIVATE_KEY in environment secrets — hot key exposure risk
10. Stripe webhook endpoint needs signature verification on every inbound event
11. Unit Finance webhook needs UNIT_WEBHOOK_SECRET verified
12. NEXT_PUBLIC_* env vars (ALCHEMY, WALLETCONNECT) are client-exposed — confirm only read-only keys
13. KYC document uploads go somewhere — need to confirm storage is not publicly accessible
14. No evidence of Content Security Policy headers
15. _archive/ and docs/ may contain internal financial modeling details accessible via HTTP

Active secrets: ADMIN_SOLVENCY_KEY, ALCHEMY_API_KEY, ALPHA_VANTAGE_API_KEY, BITGO_API_URL, BITGO_ENTERPRISE_ID, DEPLOYER_PRIVATE_KEY, DISCORD_BOT_TOKEN, ELEVENLABS_API_KEY, GEMINI_API_KEY, NEXT_PUBLIC_ALCHEMY_API_KEY, NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID, RENTCAST_API_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, UNIT_API_TOKEN, UNIT_API_URL, UNIT_ORG_ID, UNIT_WEBHOOK_SECRET

Provide a prioritized pre-deployment checklist in exactly this format — be direct, specific, no filler:

## MUST FIX BEFORE DEPLOY (blockers)
## SHOULD FIX BEFORE DEPLOY (high risk)  
## MONITOR AFTER DEPLOY (acceptable, track closely)
## FUTURE HARDENING (post-launch backlog)

Each item: risk → exact fix → why it matters for this specific platform.`;

const msg = await client.messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 8192,
  messages: [{ role: "user", content: prompt }],
});

console.log(msg.content[0].text);
