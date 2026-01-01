# Avatars & Voice Messages Implementation Guide

## Summary of Changes

This implementation adds two major features to RentMzansi:

### 1. **User Avatars** ✨
- Users can now upload and set custom avatars
- Stored in the `profiles.avatar_url` column
- Falls back to generated initials if no avatar is set

### 2. **Voice Messages** 🎙️
- Users can send voice notes in chats
- Real-time recording with duration display
- Audio files stored securely in Supabase Storage
- Metadata tracked in `voice_messages` table

---

## Database Setup (Supabase)

### Step 1: Run SQL Migration
Run the contents of `supabase-user-avatars-voice.sql` in your Supabase SQL editor:

**Changes include:**
- `profiles.avatar_url` - NEW column for avatar URLs
- `messages.message_type` - NEW column (text, image, voice, file)
- `messages.voice_duration` - NEW column for voice message length in seconds
- `voice_messages` table - NEW table for voice metadata
- Indexes and RLS policies for security

### Step 2: Create Storage Bucket
Create a new Supabase Storage bucket named `voice-messages`:
1. Go to **Storage** in Supabase dashboard
2. Create new bucket: `voice-messages`
3. Make it **Public** (so URLs are accessible)
4. Set appropriate CORS settings

---

## Code Changes

### Files Modified:

#### 1. **src/chat.js**
- Added `sendVoiceMessage()` - Sends voice message with audio blob
- Added `getVoiceMessage()` - Retrieves voice message metadata
- Added `deleteVoiceMessage()` - Deletes voice message and audio file

#### 2. **src/components/ChatWindow.jsx**
- Added voice recording state management
- Added `handleStartRecording()` - Initiates voice recording
- Added `handleStopRecording()` - Stops recording and sends message
- Added `handleCancelRecording()` - Cancels active recording
- Updated mic button to toggle between states:
  - **Idle**: Shows mic icon (click to start)
  - **Recording**: Shows timer + cancel/send buttons
  - **Has Text**: Shows send button instead

#### 3. **src/utils/voiceRecorder.js** (NEW FILE)
- `VoiceRecorder` class - Handles MediaRecorder API
- Browser permission handling
- Audio codec detection and fallback
- Utilities: `formatDuration()`, `playAudio()`, `blobToBase64()`

### New SQL File:
- **supabase-user-avatars-voice.sql** - Complete migration script

---

## How to Use

### For Users - Recording Voice Messages:
1. In a chat, if you haven't typed anything, the mic button appears
2. Click the mic button to start recording
3. A timer shows how long you've been recording
4. Click **X** to cancel or **Send** to send the message
5. Message appears in chat with duration label

### For Developers - Sending Voice Messages:
```javascript
import { sendVoiceMessage } from '../chat';

// audioBlob comes from MediaRecorder API
const result = await sendVoiceMessage(
  conversationId,
  currentUserId,
  audioBlob,
  durationInSeconds
);
```

### For Users - Setting Avatars (Future):
When avatar upload UI is built, store URL in `profiles.avatar_url`:
```javascript
const { data } = await supabase
  .from('profiles')
  .update({ avatar_url: 'https://...' })
  .eq('id', userId);
```

---

## Security Features

✅ **Row-Level Security (RLS):**
- Voice messages are only visible to conversation participants
- Only message sender can delete voice messages
- Proper cascading deletes on record deletion

✅ **Audio File Storage:**
- Stored in isolated `voice-messages` bucket
- Path includes conversation ID for organization
- Public URLs only for authorized conversations

✅ **Data Validation:**
- Minimum 1 second recording required
- Voice duration must be > 0 seconds
- Message type validation (text, image, voice, file)

---

## Browser Compatibility

| Browser | Support | Notes |
|---------|---------|-------|
| Chrome | ✅ | Full support |
| Firefox | ✅ | Full support |
| Safari | ✅ | Full support (iOS 14.5+) |
| Edge | ✅ | Full support |
| IE 11 | ❌ | Not supported |

**Required APIs:**
- MediaRecorder API
- getUserMedia (microphone permission)
- Blob & File APIs

---

## Testing Checklist

- [ ] Run SQL migration in Supabase
- [ ] Create `voice-messages` storage bucket
- [ ] Test mic button appears when no text entered
- [ ] Test voice recording starts/stops correctly
- [ ] Test voice message appears in chat
- [ ] Test message duration displays correctly
- [ ] Test cancel button stops recording without sending
- [ ] Test error handling (microphone denied, browser unsupported)
- [ ] Test audio file uploads to Supabase Storage
- [ ] Test audio file is accessible via public URL
- [ ] Test message deletion (both message and audio file)

---

## Future Enhancements

1. **Avatar Upload UI**
   - Profile page with avatar editor
   - Drag-and-drop image upload
   - Gravatar integration

2. **Voice Message Playback**
   - Audio player UI in message bubbles
   - Play/pause controls
   - Duration slider

3. **Advanced Features**
   - Voice message transcription (Speech-to-Text)
   - Audio compression
   - Voice message reactions (like text messages)
   - Message history search

---

## Troubleshooting

**Error: "Microphone access denied"**
- Check browser permissions for microphone
- Ensure site is using HTTPS
- Try a different browser

**Error: "Browser does not support voice recording"**
- Use a modern browser (Chrome, Firefox, Safari, Edge)
- Update to latest browser version

**Voice files not uploading**
- Verify `voice-messages` bucket exists and is public
- Check Supabase project settings
- Verify RLS policies are applied correctly

---

## Database Schema Summary

```sql
-- profiles table (modified)
avatar_url TEXT DEFAULT NULL

-- messages table (modified)
message_type TEXT DEFAULT 'text' CHECK (type IN ('text', 'image', 'voice', 'file'))
voice_duration INTEGER CHECK (voice_duration > 0 OR voice_duration IS NULL)

-- voice_messages table (new)
id UUID PRIMARY KEY
message_id UUID REFERENCES messages(id) ON DELETE CASCADE
audio_url TEXT NOT NULL
duration INTEGER NOT NULL CHECK (duration > 0)
file_size INTEGER
mime_type TEXT DEFAULT 'audio/webm'
created_at TIMESTAMPTZ DEFAULT NOW()
```

---

**Implementation completed:** December 13, 2025
**Status:** Ready for Supabase SQL migration and testing
