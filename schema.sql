-- GoWest CRM Database Schema
-- Run this in Supabase SQL Editor

-- Leads table
CREATE TABLE IF NOT EXISTS leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT,
  address TEXT,
  city TEXT,
  state TEXT DEFAULT 'TX',
  county TEXT,
  zip TEXT,
  acreage DECIMAL,
  phone TEXT,
  email TEXT,
  pipeline TEXT DEFAULT 'listing',
  stage TEXT DEFAULT 'New',
  lat DECIMAL,
  lng DECIMAL,
  notes TEXT,
  assigned_to UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users table (team members)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'member',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  assigned_to UUID REFERENCES users(id),
  assigned_by UUID REFERENCES users(id),
  lead_id UUID REFERENCES leads(id),
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Calendar events table
CREATE TABLE IF NOT EXISTS events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  all_day BOOLEAN DEFAULT FALSE,
  user_id UUID REFERENCES users(id),
  lead_id UUID REFERENCES leads(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Policies for authenticated users (team members can see everything)
CREATE POLICY "Authenticated users can view all leads" ON leads
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert leads" ON leads
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update leads" ON leads
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete leads" ON leads
  FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view all users" ON users
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can view all tasks" ON tasks
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage tasks" ON tasks
  FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated users can view all events" ON events
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage events" ON events
  FOR ALL TO authenticated USING (true);

-- Function to auto-create user record on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user record
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
