
ALTER TABLE public.company_suggestions ADD COLUMN IF NOT EXISTS logo_url text;

-- Allow anyone (including anon suggesters) to upload a logo into the
-- 'suggestions/' folder of company-logos so their submission can include it.
DROP POLICY IF EXISTS "Anyone can upload suggestion logos" ON storage.objects;
CREATE POLICY "Anyone can upload suggestion logos"
ON storage.objects FOR INSERT TO anon, authenticated
WITH CHECK (
  bucket_id = 'company-logos'
  AND (storage.foldername(name))[1] = 'suggestions'
  AND lower(storage.extension(name)) = ANY (ARRAY['png','jpg','jpeg','webp'])
);
