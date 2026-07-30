-- Run manually in Supabase (SQL editor). Adds columns to persist the draft
-- Sendcloud parcel created automatically when a product is marked sold.
--
-- Naming note: "parcel_created_at" instead of the originally proposed
-- "shipped_at" — nothing has actually shipped at this point. The parcel is
-- created with request_label = false (see src/lib/shipping/create-shipment.ts),
-- so it's a draft awaiting manual label generation in the Sendcloud panel;
-- tracking_number/tracking_url will typically be NULL until that happens.
alter table products
  add column sendcloud_parcel_id bigint,
  add column tracking_number text,
  add column tracking_url text,
  add column parcel_created_at timestamptz;

-- Defense-in-depth only: the real idempotency guard is the atomic
-- status != 'sold' compare-and-swap already in the checkout.session.completed
-- handler (src/app/api/webhooks/stripe/route.ts), which ensures shipment
-- creation only ever runs on the one delivery that actually flips a product
-- to "sold". This constraint just makes a duplicate write impossible even if
-- that invariant were ever violated by a future bug. NULLs (not-yet-shipped
-- products) are unrestricted, per standard Postgres unique-index semantics.
create unique index products_sendcloud_parcel_id_key
  on products (sendcloud_parcel_id)
  where sendcloud_parcel_id is not null;
