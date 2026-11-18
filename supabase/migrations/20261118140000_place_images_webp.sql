-- ===========================================================================
-- Place photos (owner, 2026-11-18): the place-images bucket also accepts WebP, for the small grid copies
-- (small/<lookup>.webp) and page-header copies (header/<lookup>.webp) the app shows instead of the large JPEGs.
-- Made by scripts/app/make-place-photos.mjs. The original JPEGs stay as they are.
-- ===========================================================================

update storage.buckets
  set allowed_mime_types = array['image/jpeg', 'image/webp']
  where id = 'place-images';
