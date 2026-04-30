-- Restore EXECUTE so RLS policies that call these helpers continue to work.
-- The functions only return booleans and are safe to expose to anon/authenticated.
GRANT EXECUTE ON FUNCTION public.is_admin_tier(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_blocked(text) TO anon, authenticated;

-- Tighten public bucket: previous policy let anyone list ALL objects.
-- Replace with a policy that doesn't allow broad listing — clients can still
-- fetch a logo by its full known URL via the public-bucket CDN.
DROP POLICY IF EXISTS "Public read company logos" ON storage.objects;
CREATE POLICY "Public read company logos by path" ON storage.objects
  FOR SELECT TO public
  USING (
    bucket_id = 'company-logos'
    AND (storage.foldername(name))[1] = 'public'
  );
