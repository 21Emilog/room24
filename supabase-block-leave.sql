-- Block System & Leave Group for RentMzansi
-- Run this in your Supabase SQL Editor

-- ===========================
-- BLOCKED USERS TABLE
-- ===========================

CREATE TABLE IF NOT EXISTS blocked_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason TEXT DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique block relationships
  UNIQUE(blocker_id, blocked_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocker ON blocked_users(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked ON blocked_users(blocked_id);

-- RLS Policies for blocked_users
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;

-- Users can see their own blocks
CREATE POLICY "Users can view their own blocks"
  ON blocked_users FOR SELECT
  USING (auth.uid() = blocker_id);

-- Users can block others
CREATE POLICY "Users can create blocks"
  ON blocked_users FOR INSERT
  WITH CHECK (auth.uid() = blocker_id);

-- Users can unblock
CREATE POLICY "Users can delete their own blocks"
  ON blocked_users FOR DELETE
  USING (auth.uid() = blocker_id);

-- ===========================
-- UPDATE TENANTS TABLE FOR LEAVE
-- ===========================

-- Add left_at column to track when tenant left voluntarily
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS left_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add left_reason column
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS left_reason TEXT DEFAULT NULL;

-- ===========================
-- ENSURE PHONE NUMBER IN PROFILES
-- ===========================

-- Make sure phone column exists and is indexed for contact matching
-- (Should already exist, but just in case)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT NULL;

-- Create index for phone lookups (for contact matching)
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON profiles(phone) WHERE phone IS NOT NULL;

-- ===========================
-- HELPER FUNCTION: Check if phone is registered
-- ===========================

CREATE OR REPLACE FUNCTION check_phone_registered(phone_number TEXT)
RETURNS TABLE (
  user_id UUID,
  display_name TEXT,
  photo_url TEXT,
  is_registered BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as user_id,
    p.display_name,
    p.photo_url,
    TRUE as is_registered
  FROM profiles p
  WHERE p.phone = phone_number
     OR p.phone = REPLACE(phone_number, ' ', '')
     OR p.phone = REPLACE(REPLACE(phone_number, '+27', '0'), ' ', '')
     OR REPLACE(REPLACE(p.phone, '+27', '0'), ' ', '') = REPLACE(REPLACE(phone_number, '+27', '0'), ' ', '');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
