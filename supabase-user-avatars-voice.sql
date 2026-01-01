-- ===========================
-- USER AVATARS & VOICE MESSAGES
-- Add avatar support to profiles and enable voice message functionality
-- ===========================

-- 1. Add avatar_url to profiles table for custom user avatars
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'avatar_url') THEN
    ALTER TABLE profiles ADD COLUMN avatar_url TEXT DEFAULT NULL;
    CREATE INDEX IF NOT EXISTS idx_profiles_avatar_url ON profiles(avatar_url);
  END IF;
END $$;

-- 2. Add message_type column to messages for voice/audio messages
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'message_type') THEN
    ALTER TABLE messages ADD COLUMN message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'voice', 'file'));
  END IF;
END $$;

-- 3. Add voice_duration to messages (in seconds) for voice messages
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'voice_duration') THEN
    ALTER TABLE messages ADD COLUMN voice_duration INTEGER DEFAULT NULL CHECK (voice_duration IS NULL OR voice_duration > 0);
  END IF;
END $$;

-- 4. Create voice_messages table for better organization
CREATE TABLE IF NOT EXISTS voice_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  audio_url TEXT NOT NULL,
  duration INTEGER NOT NULL CHECK (duration > 0),
  file_size INTEGER,
  mime_type TEXT DEFAULT 'audio/webm',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE voice_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for voice_messages
DROP POLICY IF EXISTS "Users can view voice messages in conversations" ON voice_messages;
CREATE POLICY "Users can view voice messages in conversations" ON voice_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM messages m 
      JOIN conversations c ON m.conversation_id = c.id
      WHERE m.id = message_id 
        AND (c.renter_id = auth.uid() OR c.landlord_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert voice messages" ON voice_messages;
CREATE POLICY "Users can insert voice messages" ON voice_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM messages m 
      WHERE m.id = message_id AND m.sender_id = auth.uid()
    )
  );

-- Enable realtime for voice_messages
ALTER PUBLICATION supabase_realtime ADD TABLE voice_messages;

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_voice_messages_message_id ON voice_messages(message_id);
CREATE INDEX IF NOT EXISTS idx_messages_message_type ON messages(message_type);
CREATE INDEX IF NOT EXISTS idx_messages_voice_duration ON messages(voice_duration) WHERE message_type = 'voice';

-- Function to clean up orphaned voice files if message is deleted
CREATE OR REPLACE FUNCTION cleanup_voice_file_on_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.message_type = 'voice' THEN
    -- Here you could add logic to delete the audio file from storage
    -- For now, just log that cleanup occurred
    RAISE NOTICE 'Voice message deleted: %', OLD.id;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Trigger to clean up on message delete
DROP TRIGGER IF EXISTS cleanup_voice_on_message_delete ON messages;
CREATE TRIGGER cleanup_voice_on_message_delete
  BEFORE DELETE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_voice_file_on_delete();

-- ===========================
-- COMMENTS FOR DOCUMENTATION
-- ===========================

COMMENT ON COLUMN profiles.avatar_url IS 'User avatar image URL - can be custom uploaded or generated';
COMMENT ON COLUMN messages.message_type IS 'Type of message: text, image, voice, or file';
COMMENT ON COLUMN messages.voice_duration IS 'Duration of voice message in seconds';
COMMENT ON TABLE voice_messages IS 'Stores metadata and URL for voice message audio files';
COMMENT ON COLUMN voice_messages.audio_url IS 'URL to the audio file stored in Supabase Storage (voice-messages bucket)';
COMMENT ON COLUMN voice_messages.duration IS 'Duration of the voice message in seconds';
COMMENT ON COLUMN voice_messages.file_size IS 'Size of the audio file in bytes';
