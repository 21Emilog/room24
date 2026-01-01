-- SQL Migration for Group Invitation System
-- Run this in your Supabase SQL Editor

-- Add invitation-related columns to tenants table
-- These columns support accept/decline for group invitations

-- Add accepted_at column to track when invitation was accepted
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add invited_at column to track when invitation was sent
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS invited_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Ensure status column exists and update any existing 'active' rows
-- Status values: 'pending', 'active', 'declined', 'left', 'removed', 'banned'
-- If the status column doesn't exist, add it with default 'pending'
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tenants' AND column_name = 'status') THEN
        ALTER TABLE tenants ADD COLUMN status TEXT DEFAULT 'pending';
    END IF;
END $$;

-- Update existing records to have invited_at if they don't have it
UPDATE tenants 
SET invited_at = created_at 
WHERE invited_at IS NULL;

-- Update existing active records to have accepted_at
UPDATE tenants 
SET accepted_at = created_at 
WHERE status = 'active' AND accepted_at IS NULL;

-- Create index for faster pending invitation queries
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);
CREATE INDEX IF NOT EXISTS idx_tenants_tenant_id_status ON tenants(tenant_id, status);

-- Add RLS policies for invitation management (if not already exists)
-- Users can view their own invitations
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own tenant records') THEN
        CREATE POLICY "Users can view their own tenant records"
        ON tenants FOR SELECT
        USING (auth.uid() = tenant_id);
    END IF;
END $$;

-- Users can update their own invitation status (accept/decline)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update their own tenant status') THEN
        CREATE POLICY "Users can update their own tenant status"
        ON tenants FOR UPDATE
        USING (auth.uid() = tenant_id);
    END IF;
END $$;
