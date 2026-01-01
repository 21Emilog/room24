-- Fix RLS on rate_limits table
-- Run this in Supabase SQL Editor

-- Enable RLS on the rate_limits table
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Create policy: Only allow the service role (backend) to manage rate limits
-- Regular users should not be able to read, insert, update, or delete rate limits

-- Policy for SELECT - no one can read (handled server-side)
CREATE POLICY "rate_limits_no_public_read"
ON public.rate_limits
FOR SELECT
TO public
USING (false);

-- Policy for INSERT - no one can insert (handled server-side)  
CREATE POLICY "rate_limits_no_public_insert"
ON public.rate_limits
FOR INSERT
TO public
WITH CHECK (false);

-- Policy for UPDATE - no one can update (handled server-side)
CREATE POLICY "rate_limits_no_public_update"
ON public.rate_limits
FOR UPDATE
TO public
USING (false)
WITH CHECK (false);

-- Policy for DELETE - no one can delete (handled server-side)
CREATE POLICY "rate_limits_no_public_delete"
ON public.rate_limits
FOR DELETE
TO public
USING (false);

-- Note: The service_role key (used by backend/Edge Functions) bypasses RLS
-- so your server-side rate limiting will still work
