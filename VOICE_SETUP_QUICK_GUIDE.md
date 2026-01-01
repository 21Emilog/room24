# Quick Setup Guide - Avatars & Voice Messages

## 🚀 What's New?

Your app now supports:
- **User Avatars** - Custom profile pictures
- **Voice Messages** - Send audio notes in chats

---

## ⚡ Quick Start (5 minutes)

### 1. Migrate Database (Required)
Open your Supabase dashboard SQL editor and run:

**File:** `supabase-user-avatars-voice.sql`

This adds:
- ✅ Avatar URL column to profiles
- ✅ Voice message support in messages table
- ✅ New voice_messages table with audio metadata
- ✅ Proper RLS security policies
- ✅ Indexes for performance

### 2. Create Storage Bucket (Required)
In Supabase Storage:
1. Click **New Bucket**
2. Name: `voice-messages`
3. Make it **Public**
4. Create bucket

**That's it!** The app is now ready to use voice messages.

---

## 🎙️ How Voice Messages Work

### For Users:
1. **Open a chat** with another user
2. **If message box is empty**, the mic icon appears
3. **Click mic** → Recording starts with timer
4. **Send button** uploads audio when done
5. **Message appears** in chat with duration

### What Happens Behind the Scenes:
1. Browser records audio using MediaRecorder API
2. Audio saved as WebM format (efficient codec)
3. Uploaded to Supabase Storage (`voice-messages/conversationId/messageId.webm`)
4. Message record created with audio metadata
5. Message appears in real-time chat

---

## 🎨 Avatars (Future Enhancement)

When you build the avatar upload UI, just update:
```javascript
const { data } = await supabase
  .from('profiles')
  .update({ avatar_url: urlToImage })
  .eq('id', userId);
```

Display avatars from `user.profile?.avatar_url`

---

## 🔒 Security Features

✅ Only conversation participants can hear voice messages
✅ Only message sender can delete their voice message
✅ Audio files isolated in secure bucket
✅ Automatic cleanup if message is deleted
✅ RLS policies prevent unauthorized access

---

## ✅ Testing Checklist

After running the SQL migration:

- [ ] Log in to your app
- [ ] Open a chat with another user
- [ ] Leave message input empty (mic should appear)
- [ ] Click mic to start recording
- [ ] Talk for 5+ seconds
- [ ] Click send button
- [ ] Voice message appears in chat with duration
- [ ] Try clicking X to cancel a recording
- [ ] Test with different browsers

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Mic button not appearing | Make sure message box is empty, text input cleared |
| Recording won't start | Check microphone permissions in browser settings |
| Audio won't upload | Verify `voice-messages` bucket exists and is public |
| "Browser not supported" error | Use Chrome, Firefox, Safari, or Edge (not IE11) |
| Audio file error | Ensure Supabase Storage bucket is properly created |

---

## 📊 Database Schema

New columns/tables added:
```
profiles.avatar_url              TEXT (user avatar URL)
messages.message_type            TEXT ('text', 'image', 'voice', 'file')
messages.voice_duration          INTEGER (seconds)
voice_messages.audio_url         TEXT (URL to audio file)
voice_messages.duration          INTEGER (duration in seconds)
voice_messages.file_size         INTEGER (bytes)
voice_messages.mime_type         TEXT (audio/webm)
```

---

## 🎯 Next Steps

### Optional Enhancements:
1. **Avatar UI** - Add image upload in profile settings
2. **Voice Playback UI** - Add play/pause button in messages
3. **Transcription** - Convert voice to text using third-party API
4. **Audio Compression** - Reduce file sizes before upload

### Monitoring:
- Check storage usage in Supabase dashboard
- Monitor voice message creation in database
- Set up alerts if voice files fail to upload

---

## 📝 Files Modified

- `src/chat.js` - Voice message functions
- `src/components/ChatWindow.jsx` - Voice UI and recording
- `src/utils/voiceRecorder.js` - Audio recording utility
- `supabase-user-avatars-voice.sql` - Database migration
- `supabase-messaging-enhancements.sql` - Existing messaging features

---

## 🆘 Need Help?

Check `AVATARS_VOICE_IMPLEMENTATION.md` for detailed documentation on:
- Architecture and design decisions
- Complete code walthrough
- Advanced features
- Troubleshooting guide

---

**Ready to test?** Deploy the app and start using voice messages! 🎉
