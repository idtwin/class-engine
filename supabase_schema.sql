-- Run this in your Supabase SQL Editor

-- 1. Create the roster table
CREATE TABLE IF NOT EXISTS public.roster (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    class_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for roster
ALTER TABLE public.roster ENABLE ROW LEVEL SECURITY;

-- Allow public read access to roster (so students can see their names to pick their operator)
CREATE POLICY "Allow public read access on roster" 
ON public.roster FOR SELECT 
USING (true);

-- Allow authenticated users (teachers) to insert/update/delete roster
CREATE POLICY "Allow authenticated full access on roster" 
ON public.roster FOR ALL 
TO authenticated 
USING (true)
WITH CHECK (true);

-- 2. Create the session_auth table (for OTPs)
CREATE TABLE IF NOT EXISTS public.session_auth (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    roster_id TEXT NOT NULL REFERENCES public.roster(id) ON DELETE CASCADE,
    otp TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for session_auth
ALTER TABLE public.session_auth ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users (teachers) to view/insert/update/delete OTPs
CREATE POLICY "Allow authenticated full access on session_auth" 
ON public.session_auth FOR ALL 
TO authenticated 
USING (true)
WITH CHECK (true);

-- DO NOT allow public read/write access to session_auth directly.
-- The API route (/api/auth/verify) will use the Service Role key to verify OTP bypassing RLS safely.

-- 3. Create the student_profiles table (for XP, Avatars, and Rank)
CREATE TABLE IF NOT EXISTS public.student_profiles (
    roster_id TEXT PRIMARY KEY REFERENCES public.roster(id) ON DELETE CASCADE,
    xp INTEGER DEFAULT 0 NOT NULL,
    level INTEGER DEFAULT 1 NOT NULL,
    rank_title TEXT DEFAULT 'Rookie' NOT NULL,
    accuracy_rate DECIMAL DEFAULT 0.0 NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for student_profiles
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;

-- Allow public read access to profiles (so the HUD can fetch its own data)
CREATE POLICY "Allow public read access on student_profiles" 
ON public.student_profiles FOR SELECT 
USING (true);

-- Allow authenticated users to update/insert
CREATE POLICY "Allow authenticated full access on student_profiles" 
ON public.student_profiles FOR ALL 
TO authenticated 
USING (true)
WITH CHECK (true);

-- 4. Create the xp_events table (for keeping a ledger of how they earn points)
CREATE TABLE IF NOT EXISTS public.xp_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    roster_id TEXT NOT NULL REFERENCES public.roster(id) ON DELETE CASCADE,
    game_mode TEXT NOT NULL,
    event_type TEXT NOT NULL, -- e.g., 'Core', 'Hype', 'Comeback', 'Sniper'
    xp_awarded INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.xp_events ENABLE ROW LEVEL SECURITY;

-- Allow public inserts (so student phones can claim Action XP) and selects
CREATE POLICY "Allow public read/insert on xp_events" 
ON public.xp_events FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public select on xp_events" 
ON public.xp_events FOR SELECT 
USING (true);
