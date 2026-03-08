
-- Add avatar_url column to gd_users
ALTER TABLE public.gd_users ADD COLUMN IF NOT EXISTS avatar_url text;

-- Create avatars storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;

-- Allow anyone to read avatars
CREATE POLICY "Public read avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');

-- Allow anyone to upload avatars (since we use guest auth, not supabase auth)
CREATE POLICY "Anyone can upload avatars" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars');

-- Allow anyone to update avatars
CREATE POLICY "Anyone can update avatars" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars');

-- Allow anyone to delete avatars
CREATE POLICY "Anyone can delete avatars" ON storage.objects FOR DELETE USING (bucket_id = 'avatars');
