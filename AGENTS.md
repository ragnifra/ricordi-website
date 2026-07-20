<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# AGENTS.md — Ricordi Archive

E-commerce for one-of-a-kind luxury/streetwear resale pieces. Next.js 14 (App Router, TypeScript, Tailwind, shadcn/ui with Lyra preset) + Supabase (Postgres, Storage, Auth) + Stripe Checkout.

## Architecture rules
- Every product is a UNIQUE piece: single unit, status lifecycle available → reserved → sold. Never introduce quantity-based stock logic.
- Database schema is FIXED (see schema.sql): products uses `slug` for URLs (never id), product_images uses `storage_path` (never "path"). Do not invent or rename fields — if the schema seems insufficient, ask before changing it.
- `products.sold_by_session_id` (text, nullable): set alongside `status='sold'` by the checkout.session.completed webhook handler, to the Stripe Checkout Session id that made the sale. It's the idempotency key that lets the handler tell a benign Stripe webhook redelivery of an already-processed sale (same session id — no-op) apart from a genuine double-sale conflict (different session id or null — refund). See src/app/api/webhooks/stripe/route.ts.
- Product URLs: /prodotto/[slug]. Catalog: /catalogo. Admin: /admin/*.
- Payments go through Stripe Checkout (hosted). Line items use price_data built at checkout time; the stripe_price_id column is unused legacy.
- Product status changes to "sold" ONLY via the Stripe webhook (checkout.session.completed). Reservations expire via reserved_until + release function.

## Security rules (strict)
- NEVER read, print, log, or echo the contents of .env.local or any environment variable VALUES. Referencing variable NAMES in code is fine.
- The `cost` field on products is private business data: it must NEVER be selected in any query used by public-facing pages, never sent to the client, never logged.
- `sold_by_session_id` is admin/webhook-internal (same treatment as `cost`): never selected in any query used by public-facing pages, never sent to the client.
- SUPABASE_SERVICE_ROLE_KEY and STRIPE_SECRET_KEY are server-only. Any file importing them must be server-side only (use the server-only package guard, already in place in lib/supabase/server.ts).
- All writes to products/product_images go through the admin client server-side. Never add public INSERT/UPDATE/DELETE RLS policies.
- Stripe webhook: always verify the signature against the raw request body before trusting any payload data.
- Never commit secrets. .env* is gitignored — keep it that way.
- Do not add third-party scripts, analytics, or dependencies without asking first.
- Validate and sanitize all user input server-side (admin forms included — being authenticated doesn't make input trusted).
- File uploads (admin): restrict to image MIME types, enforce a reasonable max size, and never trust the client-provided filename for anything security-relevant.

## UI/UX rules
- Permanent dark theme: semantic tokens only (bg-background, text-foreground, etc.) — NEVER raw color classes (bg-black, text-zinc-50, ...). This caused real contrast bugs before.
- Sharp edges everywhere, uppercase tracked labels, minimal editorial style. No rounded pills, no soft shadows.
- All pages must be responsive: verify 375px, 390-430px, 768px, 1280px+. Touch targets minimum 44x44px.
- Italian-language UI copy for customer-facing text.

## Workflow rules
- After every change: run typecheck (tsc --noEmit), lint, and next build before declaring done.
- Do not delete .next while the dev server is running (corrupts Turbopack cache).
- Ask before running destructive commands (rm -rf, dropping tables, force pushes).