-- Run manually in Supabase (SQL editor) BEFORE deploying the matching code.
--
-- Same rule as add_product_group_id.sql, for the same reason: the public
-- product select now names gender, composition and measurements, and
-- PostgREST rejects the whole request when a listed column is unknown. Until
-- this has run, /catalogo, the home page, /prodotto/[slug] and /api/search
-- would all fail rather than degrade.
--
-- Nothing here touches the payment engine: weight_grams and
-- length_cm/width_cm/height_cm keep their NOT NULL and CHECK constraints and
-- keep describing the parcel, exactly as getShippingRate and
-- create-shipment.ts expect.

begin;

-- 1. Gender ------------------------------------------------------------
--
-- Added nullable, backfilled, then locked down: every existing row is a test
-- product, and 'Uomo' is what the taxonomy work assumes for them.
alter table public.products
  add column gender text;

update public.products
  set gender = 'Uomo'
  where gender is null;

alter table public.products
  alter column gender set not null,
  add constraint products_gender_check check (gender in ('Uomo', 'Donna'));

-- Deliberately no default: gender is required for new products, and the
-- admin form always supplies it. An insert that forgets it should fail loudly
-- rather than silently become menswear.

-- 2. Composition -------------------------------------------------------
--
-- Free text ("100% cotone", "80% lana, 20% cashmere"). A property of the
-- garment, so every size of a piece carries the same value.
alter table public.products
  add column composition text,
  add constraint products_composition_length_check
    check (composition is null or char_length(composition) <= 200);

-- 3. Garment measurements ----------------------------------------------
--
-- Display only — never used for shipping. Keyed by measurement field id (see
-- MEASUREMENT_FIELDS in src/lib/taxonomy.ts), never by label, so relabelling
-- a field can't orphan the values stored under it. Values are centimetres.
--
-- Per individual size, not per group: a 30 and a 34 of the same jeans have
-- different waists.
alter table public.products
  add column measurements jsonb,
  add constraint products_measurements_object_check
    check (measurements is null or jsonb_typeof(measurements) = 'object');

-- 4. Grants ------------------------------------------------------------
--
-- Table-level SELECT is revoked for anon on public.products; the role holds
-- an explicit column grant list instead, so a new column is invisible to the
-- public site until it is added to that list. "cost" and
-- "sold_by_session_id" are deliberately absent from it and stay that way.
grant select (gender) on public.products to anon;
grant select (composition) on public.products to anon;
grant select (measurements) on public.products to anon;

-- 5. Category remap ----------------------------------------------------
--
-- The old six categories against the new taxonomy:
--   Maglieria  -> 'Maglieria e maglioni'  (renamed)
--   Pantaloni  -> unchanged
--   Giacche    -> unchanged
--   Camicie    -> unchanged
--   Borse      -> now a DEPARTMENT, not a category: no valid target
--   Accessori  -> now a DEPARTMENT, not a category: no valid target
--
-- Nothing is guessed for the last two. Step 6 lists whatever is left over so
-- it can be recategorised by hand.
update public.products
  set category = 'Maglieria e maglioni'
  where category = 'Maglieria';

commit;

-- 6. Rows with no valid category ---------------------------------------
--
-- Read-only. Anything returned here still holds a department name in its
-- category column and needs a real category (or deleting) by hand.
select id, slug, brand, name, category, size, status
  from public.products
 where category in ('Borse', 'Accessori')
 order by created_at;

-- 7. PostgREST caches the schema (columns and grants alike) — without this
-- the new columns stay unknown until the next connection reset.
notify pgrst, 'reload schema';
