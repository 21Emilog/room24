// Chat/Messaging functions for RentMzansi
import { supabase } from './supabase';

// ===========================
// CONVERSATIONS
// ===========================

/**
 * Get or create a conversation between renter and landlord for a listing
 */
export async function getOrCreateConversation(listingId, renterId, landlordId) {
  // Check if conversation already exists
  const { data: existing, error: fetchError } = await supabase
    .from('conversations')
    .select('*')
    .eq('listing_id', listingId)
    .eq('renter_id', renterId)
    .eq('landlord_id', landlordId)
    .maybeSingle();

  if (fetchError) {
    console.error('Error fetching conversation:', fetchError);
    throw fetchError;
  }

  if (existing) {
    return existing;
  }

  // Create new conversation
  const { data: newConvo, error: createError } = await supabase
    .from('conversations')
    .insert({
      listing_id: listingId,
      renter_id: renterId,
      landlord_id: landlordId,
      last_message_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (createError) {
    console.error('Error creating conversation:', createError);
    throw createError;
  }

  return newConvo;
}

/**
 * Get all conversations for a user (as renter or landlord)
 */
export async function getUserConversations(userId) {
  // Simple query without JOINs to avoid foreign key issues
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .or(`renter_id.eq.${userId},landlord_id.eq.${userId}`)
    .order('last_message_at', { ascending: false });

  if (error) {
    console.error('Error fetching conversations:', error);
    return [];
  }

  // Manually fetch related data for each conversation
  const enrichedConversations = await Promise.all(
    (data || []).map(async (convo) => {
      // Fetch listing info
      let listing = null;
      if (convo.listing_id) {
        const { data: listingData } = await supabase
          .from('listings')
          .select('id, title, photos, price, location')
          .eq('id', convo.listing_id)
          .maybeSingle();
        listing = listingData;
      }

      // Fetch renter profile
      let renter = null;
      if (convo.renter_id) {
        const { data: renterData } = await supabase
          .from('profiles')
          .select('id, display_name, photo_url')
          .eq('id', convo.renter_id)
          .maybeSingle();
        renter = renterData;
      }

      // Fetch landlord profile
      let landlord = null;
      if (convo.landlord_id) {
        const { data: landlordData } = await supabase
          .from('profiles')
          .select('id, display_name, photo_url')
          .eq('id', convo.landlord_id)
          .maybeSingle();
        landlord = landlordData;
      }

      return { ...convo, listing, renter, landlord };
    })
  );

  return enrichedConversations;
}

/**
 * Get a single conversation by ID
 */
export async function getConversation(conversationId) {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', conversationId)
    .single();

  if (error) {
    console.error('Error fetching conversation:', error);
    throw error;
  }

  // Manually fetch related data
  let listing = null;
  if (data.listing_id) {
    const { data: listingData } = await supabase
      .from('listings')
      .select('id, title, photos, price, location')
      .eq('id', data.listing_id)
      .maybeSingle();
    listing = listingData;
  }

  let renter = null;
  if (data.renter_id) {
    const { data: renterData } = await supabase
      .from('profiles')
      .select('id, display_name, photo_url')
      .eq('id', data.renter_id)
      .maybeSingle();
    renter = renterData;
  }

  let landlord = null;
  if (data.landlord_id) {
    const { data: landlordData } = await supabase
      .from('profiles')
      .select('id, display_name, photo_url')
      .eq('id', data.landlord_id)
      .maybeSingle();
    landlord = landlordData;
  }

  return { ...data, listing, renter, landlord };
}

// ===========================
// MESSAGES
// ===========================

/**
 * Get all messages in a conversation
 */
export async function getMessages(conversationId) {
  const { data, error } = await supabase
    .from('messages')
    .select('*, voice_messages(*)')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching messages:', error);
    return [];
  }

  // Flatten voice_messages array to single object
  return (data || []).map(msg => ({
    ...msg,
    voice: msg.voice_messages && msg.voice_messages[0] ? msg.voice_messages[0] : null,
    voice_messages: undefined, // Remove the array
  }));
}

/**
 * Send a message in a conversation
 */
export async function sendMessage(conversationId, senderId, content) {
  if (!content?.trim()) {
    throw new Error('Message content is required');
  }

  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      content: content.trim(),
      read: false,
    })
    .select()
    .single();

  if (error) {
    console.error('Error sending message:', error);
    throw error;
  }

  // Update conversation's last_message_at
  await supabase
    .from('conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', conversationId);

  return data;
}

/**
 * Mark all messages in a conversation as read for a user
 */
export async function markMessagesAsRead(conversationId, userId) {
  const { error } = await supabase
    .from('messages')
    .update({ read: true })
    .eq('conversation_id', conversationId)
    .neq('sender_id', userId)
    .eq('read', false);

  if (error) {
    console.error('Error marking messages as read:', error);
  }
}

/**
 * Get unread message count for a user
 */
export async function getUnreadCount(userId) {
  // First get all conversation IDs where user is participant
  const { data: conversations, error: convoError } = await supabase
    .from('conversations')
    .select('id')
    .or(`renter_id.eq.${userId},landlord_id.eq.${userId}`);

  if (convoError || !conversations?.length) {
    return 0;
  }

  const convoIds = conversations.map(c => c.id);

  // Count unread messages not sent by this user
  const { count, error } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .in('conversation_id', convoIds)
    .neq('sender_id', userId)
    .eq('read', false);

  if (error) {
    console.error('Error getting unread count:', error);
    return 0;
  }

  return count || 0;
}

// ===========================
// REAL-TIME SUBSCRIPTIONS
// ===========================

/**
 * Subscribe to new messages in a conversation
 */
export function subscribeToMessages(conversationId, onNewMessage, onMessageUpdate = null) {
  const channel = supabase
    .channel(`messages:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      async (payload) => {
        // For voice messages, fetch the voice data
        if (payload.new.message_type === 'voice') {
          try {
            const voiceData = await getVoiceMessage(payload.new.id);
            onNewMessage({
              ...payload.new,
              voice: voiceData,
            });
          } catch (err) {
            console.error('Error fetching voice message:', err);
            onNewMessage(payload.new);
          }
        } else {
          onNewMessage(payload.new);
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        // Call update handler for read status changes
        if (onMessageUpdate) {
          onMessageUpdate(payload.new);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Subscribe to conversation updates for a user (new messages indicator)
 */
export function subscribeToUserConversations(userId, onUpdate) {
  const channel = supabase
    .channel(`user-conversations:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'conversations',
      },
      (payload) => {
        // Check if user is part of this conversation
        const convo = payload.new || payload.old;
        if (convo.renter_id === userId || convo.landlord_id === userId) {
          onUpdate(payload);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Subscribe to new messages for a user (for unread badge)
 */
export function subscribeToNewMessages(userId, conversationIds, onNewMessage) {
  if (!conversationIds?.length) return () => {};

  const channel = supabase
    .channel(`user-messages:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      },
      (payload) => {
        const msg = payload.new;
        // Only notify if message is in user's conversations and not from them
        if (conversationIds.includes(msg.conversation_id) && msg.sender_id !== userId) {
          onNewMessage(msg);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// ===========================
// QUICK REPLIES (for landlords)
// ===========================

const DEFAULT_QUICK_REPLIES = [
  "Hi! Thanks for your interest. When would you like to view the room?",
  "The room is still available. Would you like to schedule a viewing?",
  "Yes, the price includes water and electricity.",
  "Sorry, the room has been taken. I'll let you know if anything else comes up.",
  "The deposit is equal to one month's rent.",
];

export function getQuickReplies(landlordId) {
  try {
    const stored = localStorage.getItem(`quick-replies-${landlordId}`);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to load quick replies:', e);
  }
  return DEFAULT_QUICK_REPLIES;
}

export function saveQuickReplies(landlordId, replies) {
  try {
    localStorage.setItem(`quick-replies-${landlordId}`, JSON.stringify(replies));
  } catch (e) {
    console.warn('Failed to save quick replies:', e);
  }
}

/**
 * Report a user for spam, abuse, etc.
 * @param {Object} params - { reportedUserId, reportedById, conversationId, reason }
 * @returns {Promise<Object>} - The created report row
 */
export async function reportUser({ reportedUserId, reportedById, conversationId, reason }) {
  const { data, error } = await supabase
    .from('reports')
    .insert({
      reported_user_id: reportedUserId,
      reported_by_id: reportedById,
      conversation_id: conversationId,
      reason,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) {
    console.error('Error reporting user:', error);
    throw error;
  }
  return data;
}

// ===========================
// MESSAGE REACTIONS
// ===========================

const REACTION_EMOJIS = ['❤️', '👍', '😂', '😮', '😢', '🔥'];

export { REACTION_EMOJIS };

/**
 * Add a reaction to a message
 */
export async function addReaction(messageId, userId, emoji) {
  const { data, error } = await supabase
    .from('message_reactions')
    .upsert({
      message_id: messageId,
      user_id: userId,
      emoji,
    }, { onConflict: 'message_id,user_id,emoji' })
    .select()
    .single();

  if (error) {
    console.error('Error adding reaction:', error);
    throw error;
  }
  return data;
}

/**
 * Remove a reaction from a message
 */
export async function removeReaction(messageId, userId, emoji) {
  const { error } = await supabase
    .from('message_reactions')
    .delete()
    .eq('message_id', messageId)
    .eq('user_id', userId)
    .eq('emoji', emoji);

  if (error) {
    console.error('Error removing reaction:', error);
    throw error;
  }
}

/**
 * Get reactions for a message
 */
export async function getMessageReactions(messageId) {
  const { data, error } = await supabase
    .from('message_reactions')
    .select('*')
    .eq('message_id', messageId);

  if (error) {
    console.error('Error fetching reactions:', error);
    return [];
  }
  return data || [];
}

/**
 * Subscribe to reactions for messages in a conversation
 */
export function subscribeToReactions(conversationId, onReaction) {
  const channel = supabase
    .channel(`reactions-${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'message_reactions',
      },
      (payload) => {
        onReaction(payload);
      }
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

// ===========================
// TYPING INDICATORS
// ===========================

/**
 * Set typing status for a user in a conversation
 */
export async function setTyping(conversationId, userId, isTyping) {
  if (isTyping) {
    const { error } = await supabase
      .from('typing_indicators')
      .upsert({
        conversation_id: conversationId,
        user_id: userId,
        started_at: new Date().toISOString(),
      }, { onConflict: 'conversation_id,user_id' });

    if (error && !error.message?.includes('duplicate')) {
      console.error('Error setting typing:', error);
    }
  } else {
    await supabase
      .from('typing_indicators')
      .delete()
      .eq('conversation_id', conversationId)
      .eq('user_id', userId);
  }
}

/**
 * Subscribe to typing indicators in a conversation
 */
export function subscribeToTyping(conversationId, currentUserId, onTypingChange) {
  const channel = supabase
    .channel(`typing-${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'typing_indicators',
        filter: `conversation_id=eq.${conversationId}`,
      },
      async () => {
        // Fetch current typing users (excluding self)
        const { data } = await supabase
          .from('typing_indicators')
          .select('user_id')
          .eq('conversation_id', conversationId)
          .neq('user_id', currentUserId)
          .gt('started_at', new Date(Date.now() - 10000).toISOString());
        
        onTypingChange(data?.map(t => t.user_id) || []);
      }
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

// ===========================
// USER PRESENCE / ONLINE STATUS
// ===========================

/**
 * Update user's online presence
 */
export async function updatePresence(userId, isOnline, conversationId = null) {
  const { error } = await supabase
    .from('user_presence')
    .upsert({
      user_id: userId,
      is_online: isOnline,
      last_seen: new Date().toISOString(),
      current_conversation_id: conversationId,
    }, { onConflict: 'user_id' });

  if (error) {
    console.error('Error updating presence:', error);
  }
}

/**
 * Get user's presence/online status
 */
export async function getUserPresence(userId) {
  const { data, error } = await supabase
    .from('user_presence')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching presence:', error);
    return null;
  }
  return data;
}

/**
 * Subscribe to user presence changes
 */
export function subscribeToPresence(userId, onPresenceChange) {
  const channel = supabase
    .channel(`presence-${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'user_presence',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        onPresenceChange(payload.new);
      }
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

// ===========================
// READ RECEIPTS
// ===========================

/**
 * Mark messages as read with timestamp
 */
export async function markMessagesAsReadWithTimestamp(conversationId, userId) {
  const now = new Date().toISOString();
  
  const { error } = await supabase
    .from('messages')
    .update({ read: true, read_at: now })
    .eq('conversation_id', conversationId)
    .neq('sender_id', userId)
    .is('read_at', null);

  if (error) {
    console.error('Error marking messages as read:', error);
  }
  
  return now;
}

// ===========================
// MESSAGE REPLIES
// ===========================

/**
 * Send a reply to a specific message
 */
export async function sendReply(conversationId, senderId, content, replyToId) {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      content: content.trim(),
      reply_to_id: replyToId,
      read: false,
    })
    .select()
    .single();

  if (error) {
    console.error('Error sending reply:', error);
    throw error;
  }

  // Update conversation's last_message_at
  await supabase
    .from('conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', conversationId);

  return data;
}

// ===========================
// VOICE MESSAGES
// ===========================

/**
 * Send a voice message
 * @param {string} conversationId - Conversation ID
 * @param {string} senderId - Sender user ID
 * @param {Blob} audioBlob - Audio blob from recorder
 * @param {number} duration - Duration in seconds
 * @returns {Promise<Object>} - The created message
 */
export async function sendVoiceMessage(conversationId, senderId, audioBlob, duration) {
  if (!audioBlob) {
    throw new Error('Audio blob is required');
  }

  if (!duration || duration <= 0) {
    throw new Error('Duration must be greater than 0');
  }

  try {
    console.log('Starting voice message upload...', { conversationId, duration, blobSize: audioBlob.size });

    // 1. Create the message record FIRST
    const { data: message, error: msgError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        content: `[Voice message - ${Math.round(duration)}s]`,
        message_type: 'voice',
        voice_duration: Math.round(duration),
        read: false,
      })
      .select()
      .single();

    if (msgError) {
      console.error('Error creating voice message:', msgError);
      throw msgError;
    }

    console.log('Message created:', message.id);

    // 2. Upload audio to Supabase Storage
    const fileName = `${conversationId}/${message.id}-${Date.now()}.webm`;
    console.log('Uploading to:', fileName);

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('voice-messages')
      .upload(fileName, audioBlob, {
        cacheControl: '3600',
        upsert: false,
        contentType: 'audio/webm',
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      // Delete message if upload fails
      await supabase.from('messages').delete().eq('id', message.id);
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    console.log('File uploaded successfully:', uploadData);

    // 3. Get public URL
    const { data: urlData } = supabase.storage
      .from('voice-messages')
      .getPublicUrl(fileName);

    console.log('Public URL:', urlData.publicUrl);

    // 4. Create voice_messages record with metadata
    const { data: voiceRecord, error: voiceError } = await supabase
      .from('voice_messages')
      .insert({
        message_id: message.id,
        audio_url: urlData.publicUrl,
        duration: Math.round(duration),
        file_size: audioBlob.size,
        mime_type: audioBlob.type || 'audio/webm',
      })
      .select()
      .single();

    if (voiceError) {
      console.error('Error creating voice record:', voiceError);
      // Still return the message with URL even if voice record fails
      return {
        ...message,
        voice: {
          audio_url: urlData.publicUrl,
          duration: Math.round(duration),
        },
      };
    }

    console.log('Voice record created:', voiceRecord);

    // Update conversation's last_message_at
    await supabase
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversationId);

    return {
      ...message,
      voice: voiceRecord,
    };
  } catch (err) {
    console.error('Error sending voice message:', err);
    throw err;
  }
}

/**
 * Get voice message details
 */
export async function getVoiceMessage(messageId) {
  const { data, error } = await supabase
    .from('voice_messages')
    .select('*')
    .eq('message_id', messageId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching voice message:', error);
    return null;
  }

  return data;
}

/**
 * Delete a voice message (remove both message and audio file)
 */
export async function deleteVoiceMessage(messageId) {
  try {
    // Get voice message details first
    const voiceMsg = await getVoiceMessage(messageId);
    
    if (voiceMsg) {
      // Extract file path from URL
      const urlParts = voiceMsg.audio_url.split('/');
      const fileName = urlParts.slice(-3).join('/'); // Get: voice/conversationId/filename
      
      // Delete from storage
      await supabase.storage
        .from('voice-messages')
        .remove([fileName]);
    }

    // Delete message record (cascade will delete voice_messages record)
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId);

    if (error) {
      console.error('Error deleting voice message:', error);
      throw error;
    }

    return true;
  } catch (err) {
    console.error('Error in deleteVoiceMessage:', err);
    throw err;
  }
}

/**
 * Delete a message for the current user only (hide it from their view)
 * @param {string} messageId - The message ID to delete
 * @param {string} userId - The user hiding the message
 */
export async function deleteMessageForMe(messageId, userId) {
  try {
    // Get current message to update deleted_for array
    const { data: message, error: fetchError } = await supabase
      .from('messages')
      .select('deleted_for')
      .eq('id', messageId)
      .single();

    if (fetchError) {
      console.error('Error fetching message:', fetchError);
      throw fetchError;
    }

    // Add user to deleted_for array
    const deletedFor = message?.deleted_for || [];
    if (!deletedFor.includes(userId)) {
      deletedFor.push(userId);
    }

    const { error } = await supabase
      .from('messages')
      .update({ deleted_for: deletedFor })
      .eq('id', messageId);

    if (error) {
      console.error('Error deleting message for me:', error);
      throw error;
    }

    return true;
  } catch (err) {
    console.error('Error in deleteMessageForMe:', err);
    throw err;
  }
}

/**
 * Delete a message for everyone (sender only)
 * @param {string} messageId - The message ID to delete
 * @param {string} senderId - The sender's user ID (must match message sender)
 */
export async function deleteMessageForEveryone(messageId, senderId) {
  try {
    // Verify the user is the sender
    const { data: message, error: fetchError } = await supabase
      .from('messages')
      .select('sender_id, content, voice_url')
      .eq('id', messageId)
      .single();

    if (fetchError) {
      console.error('Error fetching message:', fetchError);
      throw fetchError;
    }

    if (message?.sender_id !== senderId) {
      throw new Error('You can only delete your own messages for everyone');
    }

    // If it's a voice message, delete the audio file
    if (message?.voice_url) {
      try {
        const urlParts = message.voice_url.split('/');
        const fileName = urlParts.slice(-3).join('/');
        await supabase.storage
          .from('voice-messages')
          .remove([fileName]);
      } catch (e) {
        console.warn('Failed to delete voice file:', e);
      }
    }

    // If it's an image message, try to delete from storage
    if (message?.content?.startsWith('[Image]')) {
      try {
        const imageUrl = message.content.replace('[Image] ', '');
        const urlParts = imageUrl.split('/');
        const fileName = urlParts.slice(-3).join('/');
        await supabase.storage
          .from('chat-images')
          .remove([fileName]);
      } catch (e) {
        console.warn('Failed to delete image file:', e);
      }
    }

    // Update message to show it was deleted
    const { error } = await supabase
      .from('messages')
      .update({ 
        content: '🚫 This message was deleted',
        deleted_at: new Date().toISOString(),
        voice_url: null,
        voice_duration: null,
        message_type: 'deleted'
      })
      .eq('id', messageId);

    if (error) {
      console.error('Error deleting message for everyone:', error);
      throw error;
    }

    return true;
  } catch (err) {
    console.error('Error in deleteMessageForEveryone:', err);
    throw err;
  }
}


