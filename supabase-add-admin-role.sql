-- ============================================
-- ADD ADMIN ROLE TO PROFILES
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Add user_type column to profiles (if not exists)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS user_type text DEFAULT 'user';

-- 2. Fix existing NULL or invalid values BEFORE adding constraint
UPDATE profiles SET user_type = 'user' 
WHERE user_type IS NULL OR user_type NOT IN ('user', 'admin', 'moderator');

-- 3. Create index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_user_type ON profiles(user_type);

-- 4. Add constraint to limit valid values
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS valid_user_type;
ALTER TABLE profiles 
ADD CONSTRAINT valid_user_type 
CHECK (user_type IN ('user', 'admin', 'moderator'));

-- 5. Set yourself as admin (replace with your user ID or email)
-- Option A: By email (uncomment and modify)
-- UPDATE profiles SET user_type = 'admin' WHERE email = 'your-email@example.com';

-- Option B: By user ID (uncomment and modify)
-- UPDATE profiles SET user_type = 'admin' WHERE id = 'your-user-uuid-here';

-- Option C: Make the first user admin
UPDATE profiles SET user_type = 'admin' 
WHERE id = (SELECT id FROM profiles ORDER BY created_at ASC LIMIT 1);

-- 6. Update audit_log policy to allow admin access
DROP POLICY IF EXISTS "audit_log_owner_read" ON audit_log;
DROP POLICY IF EXISTS "audit_log_admin_read" ON audit_log;

-- Users can see their own logs, admins can see all
CREATE POLICY "audit_log_access" ON audit_log
FOR SELECT
USING (
  user_id = auth.uid() 
  OR EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND user_type = 'admin'
  )
);

-- 7. Update content_flags policy to allow admin access
DROP POLICY IF EXISTS "content_flags_deny_public" ON content_flags;
DROP POLICY IF EXISTS "content_flags_admin_access" ON content_flags;

-- Only admins can view/manage content flags
CREATE POLICY "content_flags_admin_access" ON content_flags
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND user_type IN ('admin', 'moderator')
  )
);

-- 8. Update blocklist policy to allow admin access
DROP POLICY IF EXISTS "blocklist_deny_public" ON blocklist;
DROP POLICY IF EXISTS "blocklist_admin_access" ON blocklist;

-- Only admins can view/manage blocklist
CREATE POLICY "blocklist_admin_access" ON blocklist
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND user_type = 'admin'
  )
);

-- 9. Create helper function to check if user is admin
DROP FUNCTION IF EXISTS is_admin();
CREATE FUNCTION is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND user_type = 'admin'
  );
END;
$$;

-- 10. Create helper function to check if user is moderator or admin
DROP FUNCTION IF EXISTS is_moderator();
CREATE FUNCTION is_moderator()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND user_type IN ('admin', 'moderator')
  );
END;
$$;

-- 11. Verify: Check who is admin
SELECT id, email, display_name, user_type, created_at 
FROM profiles 
WHERE user_type = 'admin';
