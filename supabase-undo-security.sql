-- ============================================
-- UNDO SECURITY HARDENING
-- Run this in Supabase SQL Editor to remove security additions
-- ============================================

-- 1. Remove constraints from profiles
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS valid_email;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS valid_phone;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS valid_display_name;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS valid_user_type;

-- 2. Remove constraints from messages
ALTER TABLE messages DROP CONSTRAINT IF EXISTS non_empty_content;
ALTER TABLE messages DROP CONSTRAINT IF EXISTS max_message_length;

-- 3. Drop storage policies (keeps original ones if they existed)
DROP POLICY IF EXISTS "voice_messages_read_authorized" ON storage.objects;
DROP POLICY IF EXISTS "voice_messages_insert_authorized" ON storage.objects;
DROP POLICY IF EXISTS "listing_images_public_read" ON storage.objects;
DROP POLICY IF EXISTS "listing_images_auth_upload" ON storage.objects;
DROP POLICY IF EXISTS "profile_photos_public_read" ON storage.objects;
DROP POLICY IF EXISTS "profile_photos_auth_upload" ON storage.objects;
DROP POLICY IF EXISTS "profile_photos_owner_delete" ON storage.objects;

-- 4. Drop rate_limits policies and index
DROP POLICY IF EXISTS "rate_limits_deny_all" ON rate_limits;
DROP INDEX IF EXISTS idx_rate_limits_lookup;

-- 5. Drop functions
DROP FUNCTION IF EXISTS check_rate_limit_v2(uuid, int, int);
DROP FUNCTION IF EXISTS cleanup_old_rate_limits() CASCADE;
DROP FUNCTION IF EXISTS log_audit(text, text, text, jsonb, jsonb);
DROP FUNCTION IF EXISTS check_suspicious_content() CASCADE;
DROP FUNCTION IF EXISTS is_blocked(text, text);
DROP FUNCTION IF EXISTS is_admin();
DROP FUNCTION IF EXISTS is_moderator();

-- 6. Drop triggers
DROP TRIGGER IF EXISTS check_message_content ON messages;

-- 7. Drop audit_log policies and table
DROP POLICY IF EXISTS "audit_log_owner_read" ON audit_log;
DROP POLICY IF EXISTS "audit_log_access" ON audit_log;
DROP TABLE IF EXISTS audit_log;

-- 8. Drop content_flags policies and table
DROP POLICY IF EXISTS "content_flags_deny_public" ON content_flags;
DROP POLICY IF EXISTS "content_flags_admin_access" ON content_flags;
DROP TABLE IF EXISTS content_flags;

-- 9. Drop blocklist policies and table
DROP POLICY IF EXISTS "blocklist_deny_public" ON blocklist;
DROP POLICY IF EXISTS "blocklist_admin_access" ON blocklist;
DROP TABLE IF EXISTS blocklist;

-- 10. Drop user_type column (if added)
ALTER TABLE profiles DROP COLUMN IF EXISTS user_type;

-- Done! Security additions have been removed.
SELECT 'Security hardening removed successfully' AS status;
