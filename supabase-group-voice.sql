-- Add voice message support to property_messages table
-- Run this in your Supabase SQL Editor

-- Add voice_url column for storing voice message URLs
ALTER TABLE property_messages
ADD COLUMN IF NOT EXISTS voice_url TEXT DEFAULT NULL;

-- Add voice_duration column for storing voice message duration in seconds
ALTER TABLE property_messages
ADD COLUMN IF NOT EXISTS voice_duration INTEGER DEFAULT NULL;

-- Add an index for faster lookups
CREATE INDEX IF NOT EXISTS idx_property_messages_voice ON property_messages(voice_url) WHERE voice_url IS NOT NULL;

-- Make sure the voice-messages bucket has proper policies (if not already created)
-- The bucket should already exist from the chat voice messages setup
