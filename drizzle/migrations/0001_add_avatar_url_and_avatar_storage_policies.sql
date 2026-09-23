ALTER TABLE public.admin_users ADD COLUMN IF NOT EXISTS avatar_url text;

DROP POLICY IF EXISTS "Anyone can upload avatars" ON storage.objects;
CREATE POLICY "Anyone can upload avatars" ON storage.objects FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'avatars');
DROP POLICY IF EXISTS "Anyone can read avatars" ON storage.objects;
CREATE POLICY "Anyone can read avatars" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'avatars');
DROP POLICY IF EXISTS "Anyone can update avatars" ON storage.objects;
CREATE POLICY "Anyone can update avatars" ON storage.objects FOR UPDATE TO anon, authenticated
  USING (bucket_id = 'avatars') WITH CHECK (bucket_id = 'avatars');
DROP POLICY IF EXISTS "Anyone can delete avatars" ON storage.objects;
CREATE POLICY "Anyone can delete avatars" ON storage.objects FOR DELETE TO anon, authenticated
  USING (bucket_id = 'avatars');