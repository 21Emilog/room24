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
