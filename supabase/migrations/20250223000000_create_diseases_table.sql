-- Create diseases table
CREATE TABLE IF NOT EXISTS diseases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  total_cases INTEGER DEFAULT 1,
  first_detected TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_detected TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add index on disease name for faster lookups
CREATE INDEX IF NOT EXISTS idx_diseases_name ON diseases(name);

-- Create function to update disease statistics
CREATE OR REPLACE FUNCTION update_disease_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Try to update existing disease
  WITH upsert AS (
    UPDATE diseases
    SET 
      total_cases = total_cases + 1,
      last_detected = CURRENT_TIMESTAMP
    WHERE name = NEW.disease_name
    RETURNING *
  )
  -- If disease doesn't exist, insert it
  INSERT INTO diseases (name)
  SELECT NEW.disease_name
  WHERE NOT EXISTS (SELECT 1 FROM upsert);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update disease stats on new scans
DROP TRIGGER IF EXISTS update_disease_stats_trigger ON scans;
CREATE TRIGGER update_disease_stats_trigger
  AFTER INSERT ON scans
  FOR EACH ROW
  EXECUTE FUNCTION update_disease_stats(); 