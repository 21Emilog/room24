-- Message Delete Feature for RentMzansi
-- Run this in your Supabase SQL Editor

-- ===========================
-- UPDATE MESSAGES TABLE FOR DELETE
-- ===========================

-- Add deleted_for array to track users who deleted the message for themselves
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS deleted_for UUID[] DEFAULT '{}';

-- Add deleted_at timestamp for "delete for everyone"
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- ===========================
-- UPDATE PROPERTY_MESSAGES TABLE FOR DELETE
-- ===========================

-- Add deleted_for array to track users who deleted the message for themselves
ALTER TABLE property_messages
ADD COLUMN IF NOT EXISTS deleted_for UUID[] DEFAULT '{}';

-- Add deleted_at timestamp for "delete for everyone"
ALTER TABLE property_messages
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- ===========================
-- INDEXES FOR FASTER QUERIES
-- ===========================

-- Index for deleted_for array queries (GIN index for array containment)
CREATE INDEX IF NOT EXISTS idx_messages_deleted_for ON messages USING GIN (deleted_for);
CREATE INDEX IF NOT EXISTS idx_property_messages_deleted_for ON property_messages USING GIN (deleted_for);

-- Index for deleted_at queries
CREATE INDEX IF NOT EXISTS idx_messages_deleted_at ON messages(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_property_messages_deleted_at ON property_messages(deleted_at) WHERE deleted_at IS NOT NULL;
