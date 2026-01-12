-- ============================================
-- ADD LISTING TYPE COLUMN
-- Run this in Supabase SQL Editor
-- ============================================

-- Add the listing_type column to listings table
ALTER TABLE listings 
ADD COLUMN IF NOT EXISTS listing_type text DEFAULT 'room';

-- Drop constraint if exists, then add it
ALTER TABLE listings DROP CONSTRAINT IF EXISTS valid_listing_type;
ALTER TABLE listings 
ADD CONSTRAINT valid_listing_type 
CHECK (listing_type IN ('room', 'backroom', 'guesthouse'));

-- Create index for filtering by listing type
CREATE INDEX IF NOT EXISTS idx_listings_type ON listings (listing_type);

-- Verify the column was added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'listings' AND column_name = 'listing_type';
