/*
  # Initial Schema Setup

  1. Authentication and Users
    - Extends default auth.users with profiles table
    - Adds role-based access control

  2. Scan History
    - Stores plant disease scan results
    - Links to users

  3. Educational Content
    - Stores disease information and treatments
    - Manages educational resources

  4. Chat History
    - Stores AI chat interactions

  5. Security
    - Enables RLS on all tables
    - Sets up appropriate access policies
*/

-- Create custom types
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('farmer', 'researcher', 'admin');
  END IF;
END $$;

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role DEFAULT 'farmer',
  full_name text,
  organization text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create scans table
CREATE TABLE IF NOT EXISTS scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  image_url text NOT NULL,
  scan_name text NOT NULL,
  disease_name text,
  confidence_score float,
  quality_score float,
  scan_time float,
  description text,
  severity text,
  treatment_recommendation text,
  preventive_measures text,
  created_at timestamptz DEFAULT now()
);

-- Create diseases table
CREATE TABLE IF NOT EXISTS diseases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text NOT NULL,
  symptoms text[] NOT NULL,
  treatments text[] NOT NULL,
  prevention_tips text[] NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create educational_resources table
CREATE TABLE IF NOT EXISTS educational_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  resource_type text NOT NULL,
  url text NOT NULL,
  disease_id uuid REFERENCES diseases(id),
  created_at timestamptz DEFAULT now()
);

-- Create chat_history table
CREATE TABLE IF NOT EXISTS chat_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  question text NOT NULL,
  answer text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE diseases ENABLE ROW LEVEL SECURITY;
ALTER TABLE educational_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Scans policies
CREATE POLICY "Users can view their own scans"
  ON scans FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own scans"
  ON scans FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Diseases policies (public read, admin write)
CREATE POLICY "Anyone can view diseases"
  ON diseases FOR SELECT
  TO authenticated
  USING (true);

-- Educational resources policies (public read)
CREATE POLICY "Anyone can view educational resources"
  ON educational_resources FOR SELECT
  TO authenticated
  USING (true);

-- Chat history policies
CREATE POLICY "Users can view their own chat history"
  ON chat_history FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create chat messages"
  ON chat_history FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Functions and Triggers
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, role, full_name)
  VALUES (new.id, 'farmer', new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user creation
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();