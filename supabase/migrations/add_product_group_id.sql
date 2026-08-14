-- Run manually in Supabase (SQL editor). Adds the grouping link that lets
-- several product rows be presented as the size run of one piece.
--
-- Deliberately NOT a foreign key to a separate "product_groups" table: a
-- group has no attributes of its own. Every size stays a fully independent
-- product row with its own slug, price and status — the payment engine
-- (reservation, the checkout.session.completed compare-and-swap, Sendcloud
-- order creation, the confirmation email) keeps assuming one row = one
-- physical item, and group_id is invisible to all of it.
--
-- NULL means "not part of a size run" — a one-off piece, which is how every
-- product created before this migration stays, and how the product page
-- keeps rendering them exactly as before.
alter table public.products
  add column group_id uuid;

-- Partial: the only query is "give me the siblings of this group"
-- (src/lib/catalog.ts getSizeGroup), and ungrouped rows are the majority.
create index products_group_id_idx
  on public.products (group_id)
  where group_id is not null;

-- Table-level SELECT is revoked for anon on public.products; the role holds
-- an explicit column grant list instead, so a new column is invisible to the
-- public site until it is added to that list. Without this the size selector
-- would silently see group_id as null for every product.
grant select (group_id) on public.products to anon;

-- PostgREST caches the schema (columns and grants alike) — without this the
-- new column stays unknown until the next connection reset.
notify pgrst, 'reload schema';
