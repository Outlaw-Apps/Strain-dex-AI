DROP POLICY IF EXISTS "Public read strain-images" ON storage.objects;
CREATE POLICY "Public read strain-images"
ON storage.objects FOR SELECT
USING (bucket_id = 'strain-images');

DROP POLICY IF EXISTS "Admins can upload strain-images" ON storage.objects;
CREATE POLICY "Admins can upload strain-images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'strain-images' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update strain-images" ON storage.objects;
CREATE POLICY "Admins can update strain-images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'strain-images' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete strain-images" ON storage.objects;
CREATE POLICY "Admins can delete strain-images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'strain-images' AND public.has_role(auth.uid(), 'admin'));
