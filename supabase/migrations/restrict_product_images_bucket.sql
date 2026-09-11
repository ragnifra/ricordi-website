-- Harden the product-images bucket.
--
-- Until now the bucket had no file_size_limit and no allowed_mime_types: every
-- restriction lived in application code, which was fine while image bytes only
-- ever reached Storage through the server action (service-role, already
-- validated). The admin form now uploads straight from the browser to a signed
-- URL, so Storage itself is the enforcement point and has to carry the limits.
--
-- The MIME list must match exactly what src/lib/image-compression.ts emits
-- (image/jpeg and image/webp) plus image/png for the pre-existing objects. If
-- the compressor's output types ever change, this array changes with it or
-- every upload starts failing.
--
-- RUN THIS IN THE SUPABASE SQL EDITOR BEFORE DEPLOYING THE CODE.

update storage.buckets
set file_size_limit = 8388608, -- 8 MB, mirrors MAX_IMAGE_SIZE_BYTES
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'product-images';

notify pgrst, 'reload schema';
