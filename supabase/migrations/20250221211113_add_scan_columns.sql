-- Add missing columns to scans table if they don't exist
DO $$ 
BEGIN 
    -- Add description column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'scans' AND column_name = 'description') THEN
        ALTER TABLE scans ADD COLUMN description text;
    END IF;

    -- Add severity column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'scans' AND column_name = 'severity') THEN
        ALTER TABLE scans ADD COLUMN severity text;
    END IF;

    -- Add preventive_measures column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'scans' AND column_name = 'preventive_measures') THEN
        ALTER TABLE scans ADD COLUMN preventive_measures text;
    END IF;
END $$;
