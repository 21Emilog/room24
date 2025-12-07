-- Tenant Management Tables for RentMzansi
-- This allows landlords to manage their properties and tenants

-- Properties table (landlord's managed properties)
CREATE TABLE IF NOT EXISTS properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL, -- e.g., "Hillbrow Apartments", "Main Street House"
  address TEXT,
  description TEXT,
  listing_id UUID REFERENCES listings(id) ON DELETE SET NULL, -- Optional link to a listing
  -- Admin settings for group chat
  admin_only_messages BOOLEAN DEFAULT false, -- If true, only admins can send messages
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add column if table already exists (for migrations)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'admin_only_messages') THEN
    ALTER TABLE properties ADD COLUMN admin_only_messages BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Tenants table (links tenants to properties)
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  tenant_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  landlord_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'pending', 'ended')),
  -- pending = invited but not accepted, active = currently renting, ended = moved out
  is_admin BOOLEAN DEFAULT false, -- Can be promoted to admin by landlord or other admins
  room_number TEXT, -- Optional room/unit identifier
  rent_amount DECIMAL(10, 2),
  lease_start DATE,
  lease_end DATE,
  notes TEXT,
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(property_id, tenant_id) -- One tenant entry per property
);

-- Add is_admin column if table already exists (for migrations)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'is_admin') THEN
    ALTER TABLE tenants ADD COLUMN is_admin BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Tenant invitations (for inviting users who aren't on the platform yet)
CREATE TABLE IF NOT EXISTS tenant_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  landlord_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  email TEXT, -- For email invitations
  phone TEXT, -- For SMS/WhatsApp invitations
  invite_code TEXT UNIQUE NOT NULL, -- Random code for joining
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_by UUID REFERENCES auth.users(id),
  accepted_at TIMESTAMPTZ
);

-- Property chat messages (group chat for a property)
CREATE TABLE IF NOT EXISTS property_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'announcement', 'notice', 'image')),
  read_by UUID[] DEFAULT '{}', -- Array of user IDs who have read this
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for properties
CREATE POLICY "Landlords can manage their properties" ON properties
  FOR ALL USING (landlord_id = auth.uid());

CREATE POLICY "Tenants can view properties they belong to" ON properties
  FOR SELECT USING (
    id IN (SELECT property_id FROM tenants WHERE tenant_id = auth.uid() AND status = 'active')
  );

-- RLS Policies for tenants
CREATE POLICY "Landlords can manage tenants in their properties" ON tenants
  FOR ALL USING (landlord_id = auth.uid());

CREATE POLICY "Tenants can view their own tenant records" ON tenants
  FOR SELECT USING (tenant_id = auth.uid());

CREATE POLICY "Tenants can update their own status" ON tenants
  FOR UPDATE USING (tenant_id = auth.uid())
  WITH CHECK (tenant_id = auth.uid());

-- RLS Policies for invitations
CREATE POLICY "Landlords can manage their invitations" ON tenant_invitations
  FOR ALL USING (landlord_id = auth.uid());

CREATE POLICY "Anyone can view invitations by code" ON tenant_invitations
  FOR SELECT USING (true);

-- RLS Policies for property messages
CREATE POLICY "Property members can view messages" ON property_messages
  FOR SELECT USING (
    property_id IN (
      SELECT id FROM properties WHERE landlord_id = auth.uid()
      UNION
      SELECT property_id FROM tenants WHERE tenant_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Property members can send messages" ON property_messages
  FOR INSERT WITH CHECK (
    property_id IN (
      SELECT id FROM properties WHERE landlord_id = auth.uid()
      UNION
      SELECT property_id FROM tenants WHERE tenant_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Users can update read status" ON property_messages
  FOR UPDATE USING (
    property_id IN (
      SELECT id FROM properties WHERE landlord_id = auth.uid()
      UNION
      SELECT property_id FROM tenants WHERE tenant_id = auth.uid() AND status = 'active'
    )
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_properties_landlord ON properties(landlord_id);
CREATE INDEX IF NOT EXISTS idx_tenants_property ON tenants(property_id);
CREATE INDEX IF NOT EXISTS idx_tenants_tenant ON tenants(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenants_landlord ON tenants(landlord_id);
CREATE INDEX IF NOT EXISTS idx_tenant_invitations_code ON tenant_invitations(invite_code);
CREATE INDEX IF NOT EXISTS idx_property_messages_property ON property_messages(property_id);

-- Enable realtime for property messages
ALTER PUBLICATION supabase_realtime ADD TABLE property_messages;
