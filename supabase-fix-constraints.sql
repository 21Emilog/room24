-- ============================================
-- FIX OVERLY STRICT CONSTRAINTS
-- Run this in Supabase SQL Editor
-- ============================================

-- The constraints added by security hardening are too strict
-- They reject empty strings and some valid data formats

-- 1. Drop the strict constraints
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS valid_email;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS valid_phone;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS valid_display_name;

-- 2. Add more lenient constraints that allow NULL and empty strings

-- Email: Allow NULL, empty string, or valid email format
ALTER TABLE profiles 
  ADD CONSTRAINT valid_email 
  CHECK (
    email IS NULL OR 
    email = '' OR 
    email ~* '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
  );

-- Phone: Allow NULL, empty string, or digits with optional + prefix
-- Also allow spaces/dashes in phone (will be stored as-is)
ALTER TABLE profiles 
  ADD CONSTRAINT valid_phone 
  CHECK (
    phone IS NULL OR 
    phone = '' OR 
    phone ~ '^[+]?[0-9\s\-\(\)]{7,20}$'
  );

-- Display name: Allow NULL, empty, or 1-100 chars
ALTER TABLE profiles 
  ADD CONSTRAINT valid_display_name 
  CHECK (
    display_name IS NULL OR 
    length(display_name) <= 100
  );

-- 3. Clean up any data that might still violate constraints
UPDATE profiles SET email = NULL WHERE email = '';
UPDATE profiles SET phone = NULL WHERE phone = '';
UPDATE profiles SET display_name = NULL WHERE display_name = '';

-- Done! The app should work now.
SELECT 'Constraints fixed successfully!' as status;
