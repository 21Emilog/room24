-- =====================================================
-- FIX: Update RLS Policies for Chat Tables
-- =====================================================
-- Run this if you're getting "Failed to start chat" errors
-- This drops old policies and creates more permissive ones
-- =====================================================

-- Drop existing policies on conversations
DROP POLICY IF EXISTS "Users can view their conversations" ON conversations;
DROP POLICY IF EXISTS "Users can create conversations as renter" ON conversations;
DROP POLICY IF EXISTS "Users can update their conversations" ON conversations;

-- Drop existing policies on messages
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can send messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can update messages in their conversations" ON messages;

-- =====================================================
-- NEW POLICIES FOR CONVERSATIONS
-- =====================================================

-- Anyone authenticated can view conversations they're part of
CREATE POLICY "Users can view their conversations"
  ON conversations FOR SELECT
  TO authenticated
  USING (auth.uid() = renter_id OR auth.uid() = landlord_id);

-- Any authenticated user can create a conversation (as renter OR landlord)
CREATE POLICY "Users can create conversations"
  ON conversations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = renter_id OR auth.uid() = landlord_id);

-- Users can update conversations they're part of
CREATE POLICY "Users can update their conversations"
  ON conversations FOR UPDATE
  TO authenticated
  USING (auth.uid() = renter_id OR auth.uid() = landlord_id);

-- =====================================================
-- NEW POLICIES FOR MESSAGES
-- =====================================================

-- Users can view messages in conversations they're part of
CREATE POLICY "Users can view messages in their conversations"
  ON messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
      AND (c.renter_id = auth.uid() OR c.landlord_id = auth.uid())
    )
  );

-- Users can send messages in conversations they're part of
CREATE POLICY "Users can send messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
      AND (c.renter_id = auth.uid() OR c.landlord_id = auth.uid())
    )
  );

-- Users can update (mark as read) messages in their conversations
CREATE POLICY "Users can update messages"
  ON messages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
      AND (c.renter_id = auth.uid() OR c.landlord_id = auth.uid())
    )
  );

-- =====================================================
-- DONE! Try the chat feature again.
-- =====================================================
