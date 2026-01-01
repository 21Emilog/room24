-- Add admin_only_messages column to properties table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'admin_only_messages') THEN
    ALTER TABLE properties ADD COLUMN admin_only_messages BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Add is_admin column to tenants table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'is_admin') THEN
    ALTER TABLE tenants ADD COLUMN is_admin BOOLEAN DEFAULT false;
  END IF;
END $$;