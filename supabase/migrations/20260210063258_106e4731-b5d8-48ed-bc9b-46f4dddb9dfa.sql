
-- Create storage bucket for strain images
INSERT INTO storage.buckets (id, name, public) VALUES ('strain-images', 'strain-images', true);

-- Allow public read access
CREATE POLICY "Strain images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'strain-images');

-- Allow authenticated users to upload (admin check done in edge function)
CREATE POLICY "Authenticated users can upload strain images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'strain-images');

-- Allow authenticated users to update/delete
CREATE POLICY "Authenticated users can update strain images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'strain-images');

CREATE POLICY "Authenticated users can delete strain images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'strain-images');
