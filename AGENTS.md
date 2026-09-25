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
- Payments go through Stripe Checkout — see "Checkout, webhooks and shipping" below for how it's delivered. Line items use price_data built at checkout time; the stripe_price_id column is unused legacy.
- Product status changes to "sold" ONLY via the Stripe webhook (checkout.session.completed). Reservations expire via reserved_until + release function.

## Product model
- One `products` row = one physical item. A piece sold in several sizes is several rows sharing a `group_id` (nullable; null = one-off piece). Each row keeps its own slug, price, status and checkout — `group_id` is a display link only.
- Shared across a group: brand, name, gender, category, composition, authenticity notes.
- Per row: size, price, condition, description, garment `measurements` (jsonb, keyed by measurement field id), parcel fields, status.
- Images: `product_images` rows are per `product_id`, but the create form uploads the shared set once and points every row at the same `storage_path`. So "this product dropped image X" ≠ "delete X" — storage cleanup must go through `removeUnreferencedStorageFiles`.
- Per-size photos REPLACE the shared set for that row, they do not append to it. A size gets its own photos exactly when that piece differs from its siblings (a flaw, different wear), so trailing them with a shoot of a different garment would misrepresent it. Empty picker = the shared set, unchanged — the same rule the per-size description follows. The row therefore always carries exactly one set, and its position 0 is the photo the catalog card and the Stripe line item show.
- The catalog collapses a group to one card (`collapseSizeGroups` in src/lib/catalog.ts); the product page renders the size selector from `getSizeGroup`.

## Admin image uploads (direct to Storage)
- Image bytes NEVER pass through a server action. The browser compresses each photo (src/lib/image-compression.ts), asks `createUploadSlots` for signed upload URLs, and PUTs straight to Supabase Storage. The form submission carries only storage paths. This exists because the hosting platform caps a serverless request body at ~4.5MB no matter what `serverActions.bodySizeLimit` says — keep that setting small, and never reintroduce a form that posts files.
- The client never chooses a path. `createUploadSlots` mints `uploads/<uuid>.<ext>` server-side from a content type checked against the allowlist; a signed URL only authorises its own path, so the browser cannot overwrite an existing product image or collide with another submission.
- A submitted path is validated three times: `UPLOAD_PATH_PATTERN` (it is a shape this server mints), `verifyUploadedImages` (the object exists, and its REAL stored contentType/size from `storage.info` are acceptable, and it is not already attached to another product), and the bucket's own limits. Nothing trusts what the form says about a file.
- Both admin pickers share `uploadImageFiles` (src/lib/admin/upload-image.ts) — ImagePicker and the one built into EditProductForm differ only in presentation, so a fix to uploading cannot land in one and miss the other.
- Slots are minted when a photo is picked, not when the form is saved, so objects can sit unattached. `cleanupOrphanUploads` sweeps one bounded page of `uploads/` older than 24h, scheduled with `after()` so it never delays a save.
- DEPLOY ORDER: supabase/migrations/restrict_product_images_bucket.sql must be run in the Supabase SQL editor BEFORE this code deploys. The bucket's `file_size_limit` and `allowed_mime_types` are now the enforcement point for browser-written bytes; without them the direct upload path has no server-side size or type ceiling. `allowed_mime_types` must stay in sync with what src/lib/image-compression.ts emits, or every upload starts failing.

## Taxonomy (src/lib/taxonomy.ts)
- Single contract for the gender+category pair. The PAIR is what's valid or not — "Donna" and "Camicie" can both exist while the combination doesn't.
- A category maps to three profiles: size scale (per gender), measurement field list, parcel defaults. Adding a category is one line; every profile map is `as const satisfies Record<...>`, so omitting a mapping is a compile error, not a runtime surprise.
- Measurements are stored under field ids, never labels — relabelling a field can't orphan stored values.

## Database, grants and deploy order
- Migrations are hand-run SQL in supabase/migrations/, applied via the Supabase SQL editor. There is no automated migration step.
- `anon` does NOT hold table-level SELECT on public.products — it holds an explicit column grant list. Every new public column needs its own `grant select (col) on public.products to anon;` or it is silently invisible to the public site. `cost` and `sold_by_session_id` are deliberately absent and stay that way.
- End every migration with `notify pgrst, 'reload schema';` — PostgREST caches columns and grants alike.
- ORDER MATTERS: when `PRODUCT_SELECT` (src/lib/catalog.ts) gains a column, the migration must run in Supabase BEFORE the code deploys. PostgREST rejects the whole request over one unknown column, so /catalogo, the home page, /prodotto/[slug] and /api/search all 500 rather than degrade.

## Checkout, webhooks and shipping
- Stripe renders the checkout UI, but it is embedded in our own page at /prodotto/[slug]/checkout — `ui_mode: "embedded_page"` in this SDK version. There is no redirect to a Stripe-hosted page.
- The session sets `permissions.update_shipping_details: "server_only"` because rates come from Sendcloud, not Stripe. The update route (src/app/api/checkout/update-shipping/route.ts) must write BOTH `shipping_options` AND `collected_information.shipping_details` — writing only the first makes checkout block with "dettagli della spedizione mancanti".
- The site 308-redirects the apex domain to www, and neither Stripe nor Sendcloud follows redirects. Webhook URLs must be `https://www.ricordiarchive.com/...`.
- Sendcloud is split across two API versions on purpose: rate lookup on v2 (src/lib/shipping/get-rate.ts), order creation on v3 Orders (src/lib/shipping/create-shipment.ts). v2 parcel creation returns 403 for this account.
- Orders are created as unshipped DRAFTS — no label, no charge. Generating the label is manual, in the Sendcloud panel, and is the point where a real cost is incurred. Never auto-generate labels.
- Sendcloud enforces an undocumented ~64-char cap on `order_id`/`order_number`. The product UUID (36 chars) is used deliberately, not the Stripe session id — a product can only ever be sold once, so it stays 1:1 with the sale and v3's order_id+integration upsert idempotency still holds.
- /termini-e-condizioni states checkout behaviour as contractual terms: countries served (= `CHECKOUT_COUNTRIES`), the IT free-shipping threshold (`FREE_SHIPPING_THRESHOLD_EUR`), time-limited reservation at checkout, order-confirmation email, per-size photos. Changing any of those in code makes the legal text false — flag it to the owner. The page text is verbatim legal copy: never reword it without supplied wording, and bump "Ultimo aggiornamento" when it changes.
- Idempotency: shipment creation and the confirmation email both hang off the same atomic compare-and-swap that marks the product sold. Anything new reacting to a sale must hang off that same guard, or Stripe retries will duplicate it — and must be wrapped in its own try/catch so it can never break the webhook's 200 or affect the other side effects.

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