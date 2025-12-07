-- ===========================
-- MESSAGING ENHANCEMENTS
-- Add reactions, read receipts, typing indicators, online status
-- ===========================

-- 1. Add read_at timestamp to messages for "Seen at" feature
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'read_at') THEN
    ALTER TABLE messages ADD COLUMN read_at TIMESTAMPTZ DEFAULT NULL;
  END IF;
END $$;

-- 2. Add reply_to_id for message replies/quotes
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'reply_to_id') THEN
    ALTER TABLE messages ADD COLUMN reply_to_id UUID REFERENCES messages(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 3. Create message_reactions table
CREATE TABLE IF NOT EXISTS message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL CHECK (emoji IN ('❤️', '👍', '😂', '😮', '😢', '🔥')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_id, user_id, emoji)
);

-- 4. Create user_presence table for online status
CREATE TABLE IF NOT EXISTS user_presence (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_online BOOLEAN DEFAULT false,
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  current_conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL
);

-- 5. Create typing_indicators table for real-time typing status
CREATE TABLE IF NOT EXISTS typing_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(conversation_id, user_id)
);

-- Enable RLS
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE typing_indicators ENABLE ROW LEVEL SECURITY;

-- RLS Policies for message_reactions
DROP POLICY IF EXISTS "Users can view reactions" ON message_reactions;
CREATE POLICY "Users can view reactions" ON message_reactions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can add reactions" ON message_reactions;
CREATE POLICY "Users can add reactions" ON message_reactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can remove own reactions" ON message_reactions;
CREATE POLICY "Users can remove own reactions" ON message_reactions
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for user_presence
DROP POLICY IF EXISTS "Users can view presence" ON user_presence;
CREATE POLICY "Users can view presence" ON user_presence
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own presence" ON user_presence;
CREATE POLICY "Users can update own presence" ON user_presence
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for typing_indicators
DROP POLICY IF EXISTS "Users can view typing indicators" ON typing_indicators;
CREATE POLICY "Users can view typing indicators" ON typing_indicators
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage own typing" ON typing_indicators;
CREATE POLICY "Users can manage own typing" ON typing_indicators
  FOR ALL USING (auth.uid() = user_id);

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE message_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE user_presence;
ALTER PUBLICATION supabase_realtime ADD TABLE typing_indicators;

-- Function to automatically clean up old typing indicators (older than 10 seconds)
CREATE OR REPLACE FUNCTION cleanup_typing_indicators()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM typing_indicators 
  WHERE started_at < NOW() - INTERVAL '10 seconds';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to clean up on new typing indicator
DROP TRIGGER IF EXISTS cleanup_typing_on_insert ON typing_indicators;
CREATE TRIGGER cleanup_typing_on_insert
  AFTER INSERT ON typing_indicators
  EXECUTE FUNCTION cleanup_typing_indicators();

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_typing_indicators_conversation ON typing_indicators(conversation_id);
CREATE INDEX IF NOT EXISTS idx_user_presence_online ON user_presence(is_online) WHERE is_online = true;
