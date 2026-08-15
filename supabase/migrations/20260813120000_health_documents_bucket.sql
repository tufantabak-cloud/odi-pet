-- Create the health_documents bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('health_documents', 'health_documents', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for health_documents bucket

-- Allow authenticated users to upload files
CREATE POLICY "Users can upload health documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'health_documents');

-- Allow authenticated users to view files
CREATE POLICY "Users can view health documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'health_documents');

-- Allow authenticated users to delete files
CREATE POLICY "Users can delete health documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'health_documents');
