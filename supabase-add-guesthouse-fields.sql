-- ============================================
-- ADD GUESTHOUSE/BNB FIELDS TO LISTINGS
-- Run this in Supabase SQL Editor
-- ============================================

-- Add pricing type field
ALTER TABLE listings 
ADD COLUMN IF NOT EXISTS price_type text DEFAULT 'monthly';

-- Add minimum/maximum stay (in nights)
ALTER TABLE listings 
ADD COLUMN IF NOT EXISTS min_stay integer DEFAULT 1;

ALTER TABLE listings 
ADD COLUMN IF NOT EXISTS max_stay integer DEFAULT 0;

-- Add check-in/check-out times
ALTER TABLE listings 
ADD COLUMN IF NOT EXISTS check_in_time text DEFAULT '14:00';

ALTER TABLE listings 
ADD COLUMN IF NOT EXISTS check_out_time text DEFAULT '10:00';

-- Add breakfast included flag
ALTER TABLE listings 
ADD COLUMN IF NOT EXISTS breakfast_included boolean DEFAULT false;

-- Add cleaning fee
ALTER TABLE listings 
ADD COLUMN IF NOT EXISTS cleaning_fee numeric DEFAULT NULL;

-- Add house rules
ALTER TABLE listings 
ADD COLUMN IF NOT EXISTS house_rules text DEFAULT NULL;

-- Add constraint for valid price types
ALTER TABLE listings DROP CONSTRAINT IF EXISTS valid_price_type;
ALTER TABLE listings 
ADD CONSTRAINT valid_price_type 
CHECK (price_type IN ('monthly', 'weekly', 'nightly'));

-- Create index for filtering by price type
CREATE INDEX IF NOT EXISTS idx_listings_price_type ON listings (price_type);

-- Verify columns were added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'listings' 
AND column_name IN ('price_type', 'min_stay', 'max_stay', 'check_in_time', 'check_out_time', 'breakfast_included', 'cleaning_fee', 'house_rules');
