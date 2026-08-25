CREATE POLICY "Anyone can read gallery images"
ON storage.objects FOR SELECT
USING (bucket_id = 'gallery');

CREATE POLICY "Anyone can upload gallery images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'gallery');

CREATE POLICY "Anyone can delete gallery images"
ON storage.objects FOR DELETE
USING (bucket_id = 'gallery');