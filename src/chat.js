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
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching messages:', error);
    return [];
  }

  return data || [];
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
export function subscribeToMessages(conversationId, onNewMessage) {
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
      (payload) => {
        onNewMessage(payload.new);
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
  try {
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
      // Gracefully handle missing table
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        console.warn('message_reactions table not found - feature disabled');
        return null;
      }
      console.error('Error adding reaction:', error);
      return null;
    }
    return data;
  } catch (err) {
    console.warn('Reactions feature unavailable:', err.message);
    return null;
  }
}

/**
 * Remove a reaction from a message
 */
export async function removeReaction(messageId, userId, emoji) {
  try {
    const { error } = await supabase
      .from('message_reactions')
      .delete()
      .eq('message_id', messageId)
      .eq('user_id', userId)
      .eq('emoji', emoji);

    if (error && error.code !== '42P01' && !error.message?.includes('does not exist')) {
      console.error('Error removing reaction:', error);
    }
  } catch (err) {
    console.warn('Reactions feature unavailable:', err.message);
  }
}

/**
 * Get reactions for a message
 */
export async function getMessageReactions(messageId) {
  try {
    const { data, error } = await supabase
      .from('message_reactions')
      .select('*')
      .eq('message_id', messageId);

    if (error) {
      // Gracefully handle missing table
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return [];
      }
      console.error('Error fetching reactions:', error);
      return [];
    }
    return data || [];
  } catch (err) {
    return [];
  }
}

/**
 * Subscribe to reactions for messages in a conversation
 */
export function subscribeToReactions(conversationId, onReaction) {
  try {
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
      .subscribe((status, err) => {
        if (err) console.warn('Reactions subscription unavailable');
      });

    return () => {
      try { supabase.removeChannel(channel); } catch (e) {}
    };
  } catch (err) {
    console.warn('Reactions feature unavailable');
    return () => {};
  }
}

// ===========================
// TYPING INDICATORS
// ===========================

/**
 * Set typing status for a user in a conversation
 */
export async function setTyping(conversationId, userId, isTyping) {
  try {
    if (isTyping) {
      const { error } = await supabase
        .from('typing_indicators')
        .upsert({
          conversation_id: conversationId,
          user_id: userId,
          started_at: new Date().toISOString(),
        }, { onConflict: 'conversation_id,user_id' });

      if (error && !error.message?.includes('duplicate') && error.code !== '42P01' && !error.message?.includes('does not exist')) {
        console.error('Error setting typing:', error);
      }
    } else {
      await supabase
        .from('typing_indicators')
        .delete()
        .eq('conversation_id', conversationId)
        .eq('user_id', userId);
    }
  } catch (err) {
    // Typing indicators table may not exist - gracefully ignore
  }
}

/**
 * Subscribe to typing indicators in a conversation
 */
export function subscribeToTyping(conversationId, currentUserId, onTypingChange) {
  try {
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
          try {
            // Fetch current typing users (excluding self)
            const { data } = await supabase
              .from('typing_indicators')
              .select('user_id')
              .eq('conversation_id', conversationId)
              .neq('user_id', currentUserId)
              .gt('started_at', new Date(Date.now() - 10000).toISOString());
            
            onTypingChange(data?.map(t => t.user_id) || []);
          } catch (err) {
            onTypingChange([]);
          }
        }
      )
      .subscribe((status, err) => {
        if (err) console.warn('Typing subscription unavailable');
      });

    return () => {
      try { supabase.removeChannel(channel); } catch (e) {}
    };
  } catch (err) {
    console.warn('Typing indicators unavailable');
    return () => {};
  }
}

// ===========================
// USER PRESENCE / ONLINE STATUS
// ===========================

/**
 * Update user's online presence
 */
export async function updatePresence(userId, isOnline, conversationId = null) {
  try {
    const { error } = await supabase
      .from('user_presence')
      .upsert({
        user_id: userId,
        is_online: isOnline,
        last_seen: new Date().toISOString(),
        current_conversation_id: conversationId,
      }, { onConflict: 'user_id' });

    if (error && error.code !== '42P01' && !error.message?.includes('does not exist')) {
      console.error('Error updating presence:', error);
    }
  } catch (err) {
    // Presence table may not exist - gracefully ignore
  }
}

/**
 * Get user's presence/online status
 */
export async function getUserPresence(userId) {
  try {
    const { data, error } = await supabase
      .from('user_presence')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      // Gracefully handle missing table
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return null;
      }
      console.error('Error fetching presence:', error);
      return null;
    }
    return data;
  } catch (err) {
    return null;
  }
}

/**
 * Subscribe to user presence changes
 */
export function subscribeToPresence(userId, onPresenceChange) {
  try {
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
      .subscribe((status, err) => {
        if (err) console.warn('Presence subscription unavailable');
      });

    return () => {
      try { supabase.removeChannel(channel); } catch (e) {}
    };
  } catch (err) {
    console.warn('Presence feature unavailable');
    return () => {};
  }
}

// ===========================
// READ RECEIPTS
// ===========================

/**
 * Mark messages as read with timestamp
 */
export async function markMessagesAsReadWithTimestamp(conversationId, userId) {
  const now = new Date().toISOString();
  
  try {
    // Try with read_at column first
    const { error } = await supabase
      .from('messages')
      .update({ read: true, read_at: now })
      .eq('conversation_id', conversationId)
      .neq('sender_id', userId)
      .is('read_at', null);

    if (error) {
      // If read_at column doesn't exist, fall back to regular mark as read
      if (error.message?.includes('read_at') || error.code === '42703') {
        await supabase
          .from('messages')
          .update({ read: true })
          .eq('conversation_id', conversationId)
          .neq('sender_id', userId)
          .eq('read', false);
      } else {
        console.error('Error marking messages as read:', error);
      }
    }
  } catch (err) {
    console.warn('Read receipts feature unavailable');
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
  try {
    // Try with reply_to_id column first
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
      // If reply_to_id column doesn't exist, send as regular message
      if (error.message?.includes('reply_to_id') || error.code === '42703') {
        return await sendMessage(conversationId, senderId, content);
      }
      console.error('Error sending reply:', error);
      throw error;
    }

    // Update conversation's last_message_at
    await supabase
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversationId);

    return data;
  } catch (err) {
    // Fall back to regular message
    return await sendMessage(conversationId, senderId, content);
  }
}

