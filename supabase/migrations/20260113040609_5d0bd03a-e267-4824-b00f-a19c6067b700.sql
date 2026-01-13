-- Add missing columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS instagram_url TEXT,
ADD COLUMN IF NOT EXISTS gallery_photos TEXT[];

-- Add missing columns to connections table
ALTER TABLE public.connections
ADD COLUMN IF NOT EXISTS connection_avatar_url TEXT,
ADD COLUMN IF NOT EXISTS connection_linkedin TEXT,
ADD COLUMN IF NOT EXISTS connection_instagram TEXT,
ADD COLUMN IF NOT EXISTS connection_gallery_photos TEXT[];

-- Add photo_urls column to meeting_notes to persist meeting photos
ALTER TABLE public.meeting_notes
ADD COLUMN IF NOT EXISTS photo_urls TEXT[];