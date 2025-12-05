-- =====================================================
-- RentMzansi Chat/Messaging Tables for Supabase
-- =====================================================
-- Run this SQL in your Supabase SQL Editor to create
-- the tables needed for the chat feature.
-- =====================================================

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- CONVERSATIONS TABLE
-- =====================================================
-- Stores chat conversations between renters and landlords
-- Each conversation is linked to a specific listing

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
  renter_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  landlord_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure unique conversation per listing/renter/landlord combo
  UNIQUE(listing_id, renter_id, landlord_id)
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_conversations_renter ON conversations(renter_id);
CREATE INDEX IF NOT EXISTS idx_conversations_landlord ON conversations(landlord_id);
CREATE INDEX IF NOT EXISTS idx_conversations_listing ON conversations(listing_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON conversations(last_message_at DESC);

-- =====================================================
-- MESSAGES TABLE
-- =====================================================
-- Stores individual messages within conversations

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(conversation_id, read) WHERE read = FALSE;

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================
-- Ensure users can only access their own conversations

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;


-- CREATE POLICY "Users can view their conversations"
--   ON conversations FOR SELECT
--   USING (auth.uid() = renter_id OR auth.uid() = landlord_id);


-- CREATE POLICY "Users can create conversations as renter"
--   ON conversations FOR INSERT
--   WITH CHECK (auth.uid() = renter_id);


-- CREATE POLICY "Users can update their conversations"
--   ON conversations FOR UPDATE
--   USING (auth.uid() = renter_id OR auth.uid() = landlord_id);


-- CREATE POLICY "Users can view messages in their conversations"
--   ON messages FOR SELECT
--   USING (
--     EXISTS (
--       SELECT 1 FROM conversations c
--       WHERE c.id = messages.conversation_id
--       AND (c.renter_id = auth.uid() OR c.landlord_id = auth.uid())
--     )
--   );


-- CREATE POLICY "Users can send messages in their conversations"
--   ON messages FOR INSERT
--   WITH CHECK (
--     auth.uid() = sender_id AND
--     EXISTS (
--       SELECT 1 FROM conversations c
--       WHERE c.id = messages.conversation_id
--       AND (c.renter_id = auth.uid() OR c.landlord_id = auth.uid())
--     )
--   );


-- CREATE POLICY "Users can update messages in their conversations"
--   ON messages FOR UPDATE
--   USING (
--     EXISTS (
--       SELECT 1 FROM conversations c
--       WHERE c.id = messages.conversation_id
--       AND (c.renter_id = auth.uid() OR c.landlord_id = auth.uid())
--     )
--   );

-- =====================================================
-- REALTIME SUBSCRIPTIONS
-- =====================================================
-- Enable realtime for both tables

ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- =====================================================
-- OPTIONAL: Function to auto-update last_message_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET last_message_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_last_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_last_message();

-- =====================================================


-- =====================================================
-- REPORTS TABLE (for spam/block/report feature)
-- =====================================================
-- Stores user reports for spam, abuse, fake listings, etc.

CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reported_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  reported_by_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_reports_reported_user ON reports(reported_user_id);
CREATE INDEX IF NOT EXISTS idx_reports_reported_by ON reports(reported_by_id);
CREATE INDEX IF NOT EXISTS idx_reports_conversation ON reports(conversation_id);
CREATE INDEX IF NOT EXISTS idx_reports_created ON reports(created_at);

-- Enable RLS
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Users can view reports they created or received
CREATE POLICY "Users can view their reports" ON reports FOR SELECT
  USING (auth.uid() = reported_user_id OR auth.uid() = reported_by_id);

-- Users can create reports (must be the reporter)
CREATE POLICY "Users can create reports" ON reports FOR INSERT
  WITH CHECK (auth.uid() = reported_by_id);

-- Admins can view all reports (optional, add admin role check if needed)

-- =====================================================
