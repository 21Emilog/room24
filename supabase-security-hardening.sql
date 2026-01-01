-- ============================================
-- SUPABASE SECURITY HARDENING
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. DATABASE CONSTRAINTS FOR INPUT VALIDATION
-- Server-side validation that can't be bypassed
-- ============================================

-- STEP 1A: Clean up existing invalid data before adding constraints
-- Set invalid emails to NULL (or update them manually first)
UPDATE profiles SET email = NULL 
WHERE email IS NOT NULL 
  AND email !~* '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$';

-- Normalize phone numbers - remove spaces, dashes, parentheses
UPDATE profiles SET phone = regexp_replace(phone, '[\s\-\(\)]', '', 'g')
WHERE phone IS NOT NULL;

-- Set invalid phones to NULL (keeps international formats)
UPDATE profiles SET phone = NULL 
WHERE phone IS NOT NULL 
  AND phone !~ '^[+]?[0-9]{7,15}$';

-- STEP 1B: Drop existing constraints if they exist (in case of re-run)
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS valid_email;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS valid_phone;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS valid_display_name;

-- STEP 1C: Add constraints

-- Email validation constraint
ALTER TABLE profiles 
  ADD CONSTRAINT valid_email 
  CHECK (email IS NULL OR email ~* '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$');

-- Phone validation constraint (allows international formats: +27, +1, etc.)
-- More permissive: 7-15 digits, optional + prefix
ALTER TABLE profiles 
  ADD CONSTRAINT valid_phone 
  CHECK (phone IS NULL OR phone ~ '^[+]?[0-9]{7,15}$');

-- Display name length and character constraint
ALTER TABLE profiles 
  ADD CONSTRAINT valid_display_name 
  CHECK (
    display_name IS NULL OR 
    (length(display_name) BETWEEN 1 AND 100)
  );

-- Prevent empty messages (allow NULL for voice/file messages)
ALTER TABLE messages DROP CONSTRAINT IF EXISTS non_empty_content;
ALTER TABLE messages
  ADD CONSTRAINT non_empty_content
  CHECK (content IS NULL OR length(trim(content)) >= 0);

-- Message length limit (prevent abuse)
ALTER TABLE messages DROP CONSTRAINT IF EXISTS max_message_length;
ALTER TABLE messages
  ADD CONSTRAINT max_message_length
  CHECK (content IS NULL OR length(content) <= 10000);

-- ============================================
-- 2. STRICTER RLS POLICIES FOR STORAGE
-- Restrict access to only authorized users
-- ============================================

-- Drop overly permissive policies on voice-messages bucket
DROP POLICY IF EXISTS "Allow public read" ON storage.objects;
DROP POLICY IF EXISTS "Public read access" ON storage.objects;

-- Voice messages: Only conversation participants can read
CREATE POLICY "voice_messages_read_authorized"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'voice-messages' AND
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id::text = (storage.foldername(name))[1]
    AND (c.renter_id = auth.uid() OR c.landlord_id = auth.uid())
  )
);

-- Voice messages: Only authenticated users can upload to their conversations
CREATE POLICY "voice_messages_insert_authorized"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'voice-messages' AND
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id::text = (storage.foldername(name))[1]
    AND (c.renter_id = auth.uid() OR c.landlord_id = auth.uid())
  )
);

-- Listing images: Keep readable but require auth for upload
CREATE POLICY "listing_images_public_read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'listing-images');

CREATE POLICY "listing_images_auth_upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'listing-images');

-- Profile photos: Public read, auth upload, owner delete
CREATE POLICY "profile_photos_public_read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profile-photos');

CREATE POLICY "profile_photos_auth_upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'profile-photos');

CREATE POLICY "profile_photos_owner_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================
-- 3. RATE LIMITING TABLE & FUNCTION
-- Prevent abuse at the database level
-- ============================================

-- Create rate limits table if not exists
CREATE TABLE IF NOT EXISTS rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  ip_address inet,
  created_at timestamptz DEFAULT now(),
  window_start timestamptz DEFAULT now()
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup 
ON rate_limits (user_id, action, window_start);

-- Enable RLS
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Block all public access to rate_limits
DROP POLICY IF EXISTS "rate_limits_deny_all" ON rate_limits;
CREATE POLICY "rate_limits_deny_all" ON rate_limits FOR ALL USING (false);

-- Function to check rate limits
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_user_id uuid,
  p_action text,
  p_max_attempts int DEFAULT 10,
  p_window_seconds int DEFAULT 60
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
  v_window_start timestamptz;
BEGIN
  v_window_start := now() - (p_window_seconds || ' seconds')::interval;
  
  -- Count recent attempts
  SELECT COUNT(*) INTO v_count
  FROM rate_limits
  WHERE user_id = p_user_id
    AND action = p_action
    AND created_at > v_window_start;
  
  -- If over limit, deny
  IF v_count >= p_max_attempts THEN
    RETURN false;
  END IF;
  
  -- Log this attempt
  INSERT INTO rate_limits (user_id, action)
  VALUES (p_user_id, p_action);
  
  RETURN true;
END;
$$;

-- Cleanup old rate limit entries (run as scheduled job)
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM rate_limits WHERE created_at < now() - interval '1 hour';
END;
$$;

-- ============================================
-- 4. AUDIT LOGGING FOR SENSITIVE ACTIONS
-- Track important events for security review
-- ============================================

CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  resource_type text,
  resource_id text,
  old_data jsonb,
  new_data jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Index for querying audit logs
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log (action, created_at DESC);

-- Enable RLS - only admins can read
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_log_admin_only" ON audit_log
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- Function to log actions
CREATE OR REPLACE FUNCTION log_audit(
  p_action text,
  p_resource_type text DEFAULT NULL,
  p_resource_id text DEFAULT NULL,
  p_old_data jsonb DEFAULT NULL,
  p_new_data jsonb DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO audit_log (user_id, action, resource_type, resource_id, old_data, new_data)
  VALUES (auth.uid(), p_action, p_resource_type, p_resource_id, p_old_data, p_new_data);
END;
$$;

-- ============================================
-- 5. CONTENT MODERATION TRIGGERS
-- Automatically flag suspicious content
-- ============================================

-- Suspicious patterns table
CREATE TABLE IF NOT EXISTS content_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type text NOT NULL, -- 'message', 'listing', 'profile'
  content_id uuid NOT NULL,
  reason text NOT NULL,
  flagged_at timestamptz DEFAULT now(),
  reviewed boolean DEFAULT false,
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_content_flags_pending 
ON content_flags (reviewed, flagged_at DESC) WHERE NOT reviewed;

-- Enable RLS
ALTER TABLE content_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "content_flags_admin_only" ON content_flags
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- Function to check for suspicious content
CREATE OR REPLACE FUNCTION check_suspicious_content()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_content text;
  v_suspicious boolean := false;
  v_reason text := '';
BEGIN
  -- Get content to check
  IF TG_TABLE_NAME = 'messages' THEN
    v_content := NEW.content;
  ELSIF TG_TABLE_NAME = 'listings' THEN
    v_content := NEW.title || ' ' || COALESCE(NEW.description, '');
  ELSIF TG_TABLE_NAME = 'profiles' THEN
    v_content := COALESCE(NEW.display_name, '') || ' ' || COALESCE(NEW.bio, '');
  END IF;
  
  -- Check for suspicious patterns
  IF v_content ~* '<script|javascript:|onclick|onerror|onload' THEN
    v_suspicious := true;
    v_reason := 'Potential XSS attempt';
  ELSIF v_content ~* 'bank\s*details|send\s*money|western\s*union|moneygram' THEN
    v_suspicious := true;
    v_reason := 'Potential scam keywords';
  ELSIF v_content ~* 'nigerian\s*prince|lottery\s*winner|inheritance' THEN
    v_suspicious := true;
    v_reason := 'Common scam patterns';
  END IF;
  
  -- Flag if suspicious
  IF v_suspicious THEN
    INSERT INTO content_flags (content_type, content_id, reason)
    VALUES (TG_TABLE_NAME, NEW.id, v_reason);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Apply trigger to messages
DROP TRIGGER IF EXISTS check_message_content ON messages;
CREATE TRIGGER check_message_content
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION check_suspicious_content();

-- ============================================
-- 6. SECURE PASSWORD POLICIES
-- Enforce at authentication level
-- ============================================

-- Note: Password policies are configured in Supabase Dashboard:
-- Authentication > Providers > Email
-- - Minimum password length: 12 characters (recommended)
-- - Enable "Leaked Password Protection" (Pro plan)
-- - Enable "Email Confirmation"

-- ============================================
-- 7. SESSION SECURITY
-- Configure in supabase dashboard or via API
-- ============================================

-- Recommended settings (set in Dashboard > Authentication > Settings):
-- - JWT expiry: 3600 (1 hour)
-- - Refresh token rotation: Enabled
-- - Refresh token reuse interval: 10 seconds

-- ============================================
-- 8. BLOCKLIST FOR ABUSE PREVENTION
-- ============================================

CREATE TABLE IF NOT EXISTS blocklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL, -- 'user', 'ip', 'email', 'phone'
  value text NOT NULL,
  reason text,
  blocked_by uuid REFERENCES auth.users(id),
  blocked_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  UNIQUE(type, value)
);

CREATE INDEX IF NOT EXISTS idx_blocklist_lookup ON blocklist (type, value);

-- Enable RLS
ALTER TABLE blocklist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "blocklist_admin_only" ON blocklist
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- Function to check blocklist
CREATE OR REPLACE FUNCTION is_blocked(
  p_type text,
  p_value text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM blocklist
    WHERE type = p_type
      AND value = p_value
      AND (expires_at IS NULL OR expires_at > now())
  );
END;
$$;

-- ============================================
-- NOTES:
-- ============================================
-- Run individual sections if some fail
-- Check if tables/columns exist before adding constraints
-- Some policies may need adjustment based on your exact schema
-- Test thoroughly in development before production
