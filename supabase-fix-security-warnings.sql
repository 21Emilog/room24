-- Fix Security Warnings
-- Run this in Supabase SQL Editor

-- ============================================
-- FIX 1: Function Search Path Mutable
-- Setting search_path prevents potential SQL injection via schema manipulation
-- ============================================

-- Fix update_conversation_last_message (or similar name)
ALTER FUNCTION public.update_conversation_last_message() SET search_path = public;

-- Fix cleanup_voice_file_on_delete
ALTER FUNCTION public.cleanup_voice_file_on_delete() SET search_path = public;

-- Fix check_phone_registered
ALTER FUNCTION public.check_phone_registered(text) SET search_path = public;

-- Fix cleanup_typing_indicators
ALTER FUNCTION public.cleanup_typing_indicators() SET search_path = public;

-- Fix sanitize_text
ALTER FUNCTION public.sanitize_text(text) SET search_path = public;

-- Fix is_valid_email
ALTER FUNCTION public.is_valid_email(text) SET search_path = public;

-- Fix user_owns_listing
ALTER FUNCTION public.user_owns_listing(uuid) SET search_path = public;

-- Fix cleanup_old_rate_limits
ALTER FUNCTION public.cleanup_old_rate_limits() SET search_path = public;

-- Fix handle_new_user
ALTER FUNCTION public.handle_new_user() SET search_path = public;


-- ============================================
-- FIX 2: Leaked Password Protection
-- This must be enabled in the Supabase Dashboard:
-- 
-- 1. Go to: Authentication > Providers > Email
-- 2. Enable "Leaked Password Protection"
-- 
-- OR use the API (if available):
-- This feature checks passwords against known data breaches
-- and prevents users from using compromised passwords.
-- ============================================

-- Note: If any ALTER FUNCTION fails with "function does not exist",
-- it means the function name or parameters are slightly different.
-- Check your actual function signatures in Database > Functions
-- and adjust the ALTER statements accordingly.
