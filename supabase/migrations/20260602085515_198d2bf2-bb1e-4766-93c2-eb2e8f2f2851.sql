
CREATE POLICY "Anyone can upload chat images" ON storage.objects FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'chat-uploads');
CREATE POLICY "Anyone can read chat images" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'chat-uploads');
