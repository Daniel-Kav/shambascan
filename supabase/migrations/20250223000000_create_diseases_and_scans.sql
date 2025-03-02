-- Create diseases table if it doesn't exist
CREATE TABLE IF NOT EXISTS diseases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  first_detected TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_detected TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create or modify scans table
CREATE TABLE IF NOT EXISTS scans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  image_url TEXT NOT NULL,
  disease_name TEXT,
  confidence_score FLOAT,
  severity TEXT,
  description TEXT,
  treatment_recommendation TEXT,
  preventive_measures TEXT,
  video_urls TEXT[] DEFAULT '{}',
  video_titles TEXT[] DEFAULT '{}',
  video_thumbnails TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  scan_time FLOAT,
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_diseases_name ON diseases(name);
CREATE INDEX IF NOT EXISTS idx_scans_user_id ON scans(user_id);
CREATE INDEX IF NOT EXISTS idx_scans_disease_name ON scans(disease_name);
CREATE INDEX IF NOT EXISTS idx_scans_created_at ON scans(created_at);

-- Create function to update disease statistics
CREATE OR REPLACE FUNCTION update_disease_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if disease_name is not null
  IF NEW.disease_name IS NOT NULL THEN
    -- Try to update existing disease
    WITH upsert AS (
      UPDATE diseases
      SET last_detected = CURRENT_TIMESTAMP
      WHERE name = NEW.disease_name
      RETURNING *
    )
    -- If disease doesn't exist, insert it
    INSERT INTO diseases (name)
    SELECT NEW.disease_name
    WHERE NOT EXISTS (SELECT 1 FROM upsert);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update disease stats on new scans
DROP TRIGGER IF EXISTS update_disease_stats_trigger ON scans;
CREATE TRIGGER update_disease_stats_trigger
  AFTER INSERT ON scans
  FOR EACH ROW
  EXECUTE FUNCTION update_disease_stats(); 