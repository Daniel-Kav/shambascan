-- Add video-related columns to scans table
ALTER TABLE scans 
ADD COLUMN IF NOT EXISTS video_urls text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS video_titles text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS video_thumbnails text[] DEFAULT '{}';

-- Create an index on disease_name for faster lookups
CREATE INDEX IF NOT EXISTS idx_scans_disease_name ON scans(disease_name);

-- Add a check constraint to ensure arrays have the same length
ALTER TABLE scans
ADD CONSTRAINT video_arrays_length_check 
CHECK (
  array_length(video_urls, 1) = array_length(video_titles, 1) 
  AND array_length(video_urls, 1) = array_length(video_thumbnails, 1)
); 