// Tenant Management API for RentMzansi
// Allows landlords to manage their properties and tenants

import { supabase } from './supabase';

// ===========================
// PROPERTIES
// ===========================

/**
 * Create a new property for a landlord
 */
export async function createProperty({ landlordId, name, address, description, listingId }) {
  const { data, error } = await supabase
    .from('properties')
    .insert({
      landlord_id: landlordId,
      name,
      address,
      description,
      listing_id: listingId || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating property:', error);
    throw error;
  }

  return data;
}

/**
 * Get all properties for a landlord
 */
export async function getLandlordProperties(landlordId) {
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .eq('landlord_id', landlordId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching properties:', error);
    return [];
  }

  return data || [];
}

/**
 * Get properties where user is a tenant
 */
export async function getTenantProperties(tenantId) {
  const { data, error } = await supabase
    .from('tenants')
    .select(`
      *,
      property:properties(*)
    `)
    .eq('tenant_id', tenantId)
    .eq('status', 'active');

  if (error) {
    console.error('Error fetching tenant properties:', error);
    return [];
  }

  return data || [];
}

/**
 * Update a property
 */
export async function updateProperty(propertyId, updates) {
  const { data, error } = await supabase
    .from('properties')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', propertyId)
    .select()
    .single();

  if (error) {
    console.error('Error updating property:', error);
    throw error;
  }

  return data;
}

/**
 * Delete a property
 */
export async function deleteProperty(propertyId) {
  const { error } = await supabase
    .from('properties')
    .delete()
    .eq('id', propertyId);

  if (error) {
    console.error('Error deleting property:', error);
    throw error;
  }
}

// ===========================
// TENANTS
// ===========================

/**
 * Add a tenant to a property
 */
export async function addTenant({ propertyId, tenantId, landlordId, roomNumber, rentAmount, leaseStart, leaseEnd, notes }) {
  const { data, error } = await supabase
    .from('tenants')
    .insert({
      property_id: propertyId,
      tenant_id: tenantId,
      landlord_id: landlordId,
      room_number: roomNumber,
      rent_amount: rentAmount,
      lease_start: leaseStart,
      lease_end: leaseEnd,
      notes,
      status: 'pending', // Start as pending, user must accept
      // accepted_at will be set when user accepts
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding tenant:', error);
    throw error;
  }

  return data;
}

/**
 * Accept a group invitation (tenant accepts to join property)
 */
export async function acceptGroupInvitation(tenantRecordId) {
  try {
    const { data, error } = await supabase
      .from('tenants')
      .update({
        status: 'active',
        accepted_at: new Date().toISOString(),
      })
      .eq('id', tenantRecordId)
      .select()
      .single();

    if (error) {
      console.error('Error accepting invitation:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err) {
    console.error('Error accepting invitation:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Decline a group invitation (tenant declines to join property)
 */
export async function declineGroupInvitation(tenantRecordId) {
  try {
    const { data, error } = await supabase
      .from('tenants')
      .update({
        status: 'declined',
        left_at: new Date().toISOString(),
        left_reason: 'Declined invitation',
      })
      .eq('id', tenantRecordId)
      .select()
      .single();

    if (error) {
      console.error('Error declining invitation:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err) {
    console.error('Error declining invitation:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Get pending invitations for a user
 */
export async function getPendingInvitations(userId) {
  const { data, error } = await supabase
    .from('tenants')
    .select(`
      *,
      property:properties(id, name, address, landlord_id)
    `)
    .eq('tenant_id', userId)
    .eq('status', 'pending');

  if (error) {
    console.error('Error fetching pending invitations:', error);
    return [];
  }

  // Fetch landlord info for each invitation
  const enrichedInvitations = await Promise.all(
    (data || []).map(async (inv) => {
      const { data: landlord } = await supabase
        .from('profiles')
        .select('id, display_name, photo_url')
        .eq('id', inv.landlord_id)
        .maybeSingle();

      return {
        ...inv,
        landlord: landlord || { display_name: 'Unknown' },
      };
    })
  );

  return enrichedInvitations;
}

/**
 * Get all tenants for a property
 */
export async function getPropertyTenants(propertyId) {
  const { data: tenants, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('property_id', propertyId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching tenants:', error);
    return [];
  }

  // Fetch profile info for each tenant
  const enrichedTenants = await Promise.all(
    (tenants || []).map(async (tenant) => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, display_name, photo_url, phone')
        .eq('id', tenant.tenant_id)
        .maybeSingle();

      return {
        ...tenant,
        profile: profile || { display_name: 'Unknown User' },
      };
    })
  );

  return enrichedTenants;
}

/**
 * Update tenant status
 */
export async function updateTenantStatus(tenantRecordId, status) {
  const updates = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === 'ended') {
    updates.ended_at = new Date().toISOString();
  } else if (status === 'active') {
    updates.accepted_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('tenants')
    .update(updates)
    .eq('id', tenantRecordId)
    .select()
    .single();

  if (error) {
    console.error('Error updating tenant status:', error);
    throw error;
  }

  return data;
}

/**
 * Remove a tenant from a property
 */
export async function removeTenant(tenantRecordId) {
  const { error } = await supabase
    .from('tenants')
    .delete()
    .eq('id', tenantRecordId);

  if (error) {
    console.error('Error removing tenant:', error);
    throw error;
  }
}

/**
 * Update tenant details
 */
export async function updateTenant(tenantRecordId, updates) {
  const { data, error } = await supabase
    .from('tenants')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', tenantRecordId)
    .select()
    .single();

  if (error) {
    console.error('Error updating tenant:', error);
    throw error;
  }

  return data;
}

// ===========================
// ADMIN FUNCTIONS
// ===========================

/**
 * Check if user is admin of a property (landlord or promoted admin)
 */
export async function isPropertyAdmin(propertyId, userId) {
  // Check if user is landlord
  const { data: property } = await supabase
    .from('properties')
    .select('landlord_id')
    .eq('id', propertyId)
    .maybeSingle();

  if (property?.landlord_id === userId) {
    return true;
  }

  // Check if user is promoted admin
  const { data: tenant } = await supabase
    .from('tenants')
    .select('is_admin')
    .eq('property_id', propertyId)
    .eq('tenant_id', userId)
    .eq('status', 'active')
    .maybeSingle();

  return tenant?.is_admin === true;
}

/**
 * Promote or demote a tenant to/from admin
 */
export async function setTenantAdmin(tenantRecordId, isAdmin) {
  const { data, error } = await supabase
    .from('tenants')
    .update({ is_admin: isAdmin, updated_at: new Date().toISOString() })
    .eq('id', tenantRecordId)
    .select()
    .single();

  if (error) {
    console.error('Error updating tenant admin status:', error);
    throw error;
  }

  return data;
}

/**
 * Toggle admin-only messages setting for a property
 */
export async function setAdminOnlyMessages(propertyId, adminOnly) {
  const { data, error } = await supabase
    .from('properties')
    .update({ admin_only_messages: adminOnly, updated_at: new Date().toISOString() })
    .eq('id', propertyId)
    .select()
    .single();

  if (error) {
    console.error('Error updating admin-only messages setting:', error);
    // Check if error is because column doesn't exist
    if (error.message?.includes('admin_only_messages') || error.code === '42703') {
      throw new Error('Please run the database migration to add admin_only_messages column');
    }
    throw error;
  }

  return data;
}

/**
 * Check if user can send messages in property chat
 */
export async function canSendPropertyMessage(propertyId, userId) {
  // Get property settings
  const { data: property, error } = await supabase
    .from('properties')
    .select('landlord_id, admin_only_messages')
    .eq('id', propertyId)
    .maybeSingle();

  if (error) {
    console.error('Error checking property:', error);
    return true; // Default to allowing messages if there's an error
  }

  if (!property) return false;

  // Landlord can ALWAYS send messages
  if (property.landlord_id === userId) {
    return true;
  }

  // If admin_only_messages is off or doesn't exist, anyone can send
  if (!property.admin_only_messages) return true;

  // If admin_only_messages is on, check if user is admin
  return await isPropertyAdmin(propertyId, userId);
}

// ===========================
// TENANT INVITATIONS
// ===========================

/**
 * Generate a random invite code
 */
function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/**
 * Create an invitation for a tenant
 */
export async function createTenantInvitation({ propertyId, landlordId, email, phone }) {
  const inviteCode = generateInviteCode();

  const { data, error } = await supabase
    .from('tenant_invitations')
    .insert({
      property_id: propertyId,
      landlord_id: landlordId,
      email: email || null,
      phone: phone || null,
      invite_code: inviteCode,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating invitation:', error);
    throw error;
  }

  return data;
}

/**
 * Get pending invitations for a property
 */
export async function getPropertyInvitations(propertyId) {
  const { data, error } = await supabase
    .from('tenant_invitations')
    .select('*')
    .eq('property_id', propertyId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching invitations:', error);
    return [];
  }

  return data || [];
}

/**
 * Accept an invitation with code
 */
export async function acceptInvitation(inviteCode, userId) {
  // Find the invitation
  const { data: invitation, error: findError } = await supabase
    .from('tenant_invitations')
    .select('*, property:properties(*)')
    .eq('invite_code', inviteCode.toUpperCase())
    .eq('status', 'pending')
    .maybeSingle();

  if (findError || !invitation) {
    throw new Error('Invalid or expired invitation code');
  }

  // Check if expired
  if (new Date(invitation.expires_at) < new Date()) {
    throw new Error('This invitation has expired');
  }

  // Add user as tenant
  const { error: addError } = await supabase
    .from('tenants')
    .insert({
      property_id: invitation.property_id,
      tenant_id: userId,
      landlord_id: invitation.landlord_id,
      status: 'active',
      accepted_at: new Date().toISOString(),
    });

  if (addError) {
    // Check if already a tenant
    if (addError.code === '23505') {
      throw new Error('You are already a tenant of this property');
    }
    throw addError;
  }

  // Update invitation status
  await supabase
    .from('tenant_invitations')
    .update({
      status: 'accepted',
      accepted_by: userId,
      accepted_at: new Date().toISOString(),
    })
    .eq('id', invitation.id);

  return invitation.property;
}

/**
 * Cancel an invitation
 */
export async function cancelInvitation(invitationId) {
  const { error } = await supabase
    .from('tenant_invitations')
    .update({ status: 'cancelled' })
    .eq('id', invitationId);

  if (error) {
    console.error('Error cancelling invitation:', error);
    throw error;
  }
}

// ===========================
// PROPERTY MESSAGES (Group Chat)
// ===========================

/**
 * Send a message in property chat
 */
export async function sendPropertyMessage({ propertyId, senderId, content, messageType = 'text', voiceUrl = null, voiceDuration = null }) {
  console.log('sendPropertyMessage called:', { propertyId, senderId, content, messageType, voiceUrl, voiceDuration });
  
  const insertData = {
    property_id: propertyId,
    sender_id: senderId,
    content,
    message_type: messageType,
  };

  // Only add voice fields if they have values
  if (voiceUrl) {
    insertData.voice_url = voiceUrl;
  }
  if (voiceDuration) {
    insertData.voice_duration = voiceDuration;
  }

  const { data, error } = await supabase
    .from('property_messages')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error('Error sending property message:', error);
    throw error;
  }

  console.log('Message sent successfully:', data);
  return data;
}

/**
 * Get messages for a property
 */
export async function getPropertyMessages(propertyId, limit = 50) {
  const { data: messages, error } = await supabase
    .from('property_messages')
    .select('*')
    .eq('property_id', propertyId)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('Error fetching property messages:', error);
    return [];
  }

  // Fetch sender profiles
  const senderIds = [...new Set(messages.map(m => m.sender_id))];
  const profiles = {};

  await Promise.all(
    senderIds.map(async (senderId) => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, display_name, photo_url')
        .eq('id', senderId)
        .maybeSingle();
      profiles[senderId] = profile || { display_name: 'Unknown' };
    })
  );

  return messages.map(msg => ({
    ...msg,
    sender: profiles[msg.sender_id],
  }));
}

/**
 * Mark messages as read
 */
export async function markPropertyMessagesAsRead(propertyId, userId) {
  // Get unread messages
  const { data: messages } = await supabase
    .from('property_messages')
    .select('id, read_by')
    .eq('property_id', propertyId);

  // Update each message that hasn't been read by this user
  const updates = (messages || [])
    .filter(msg => !msg.read_by?.includes(userId))
    .map(msg => ({
      id: msg.id,
      read_by: [...(msg.read_by || []), userId],
    }));

  for (const update of updates) {
    await supabase
      .from('property_messages')
      .update({ read_by: update.read_by })
      .eq('id', update.id);
  }
}

/**
 * Subscribe to property messages
 */
export function subscribeToPropertyMessages(propertyId, onNewMessage) {
  const channel = supabase
    .channel(`property-messages:${propertyId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'property_messages',
        filter: `property_id=eq.${propertyId}`,
      },
      async (payload) => {
        // Fetch sender profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, display_name, photo_url')
          .eq('id', payload.new.sender_id)
          .maybeSingle();

        onNewMessage({
          ...payload.new,
          sender: profile || { display_name: 'Unknown' },
        });
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// ===========================
// USER SEARCH (for adding tenants)
// ===========================

/**
 * Search for users by name, email, or phone
 */
export async function searchUsers(query, excludeIds = []) {
  if (!query || query.length < 2) return [];

  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, photo_url, phone')
    .or(`display_name.ilike.%${query}%,phone.ilike.%${query}%`)
    .limit(10);

  if (error) {
    console.error('Error searching users:', error);
    return [];
  }

  // Filter out excluded IDs
  return (data || []).filter(user => !excludeIds.includes(user.id));
}

/**
 * Get property with all related data
 */
export async function getPropertyWithDetails(propertyId) {
  const { data: property, error } = await supabase
    .from('properties')
    .select('*')
    .eq('id', propertyId)
    .single();

  if (error) {
    console.error('Error fetching property:', error);
    return null;
  }

  // Get tenants
  const tenants = await getPropertyTenants(propertyId);

  // Get pending invitations
  const invitations = await getPropertyInvitations(propertyId);

  // Get landlord profile
  const { data: landlordProfile } = await supabase
    .from('profiles')
    .select('id, display_name, photo_url, phone')
    .eq('id', property.landlord_id)
    .maybeSingle();

  return {
    ...property,
    tenants,
    invitations,
    landlord: landlordProfile,
  };
}

// ===========================
// LEAVE GROUP (for tenants)
// ===========================

/**
 * Tenant leaves a property group voluntarily
 */
export async function leavePropertyGroup(tenantRecordId, reason = null) {
  const { error } = await supabase
    .from('tenants')
    .update({
      status: 'left',
      left_at: new Date().toISOString(),
      left_reason: reason,
    })
    .eq('id', tenantRecordId);

  if (error) {
    console.error('Error leaving property:', error);
    throw error;
  }
}

// ===========================
// BLOCKING SYSTEM
// ===========================

/**
 * Block a user
 */
export async function blockUser(blockerId, blockedId, reason = null) {
  const { data, error } = await supabase
    .from('blocked_users')
    .insert({
      blocker_id: blockerId,
      blocked_id: blockedId,
      reason,
    })
    .select()
    .single();

  if (error) {
    // Might already be blocked
    if (error.code === '23505') {
      return { alreadyBlocked: true };
    }
    console.error('Error blocking user:', error);
    throw error;
  }

  return data;
}

/**
 * Unblock a user
 */
export async function unblockUser(blockerId, blockedId) {
  const { error } = await supabase
    .from('blocked_users')
    .delete()
    .eq('blocker_id', blockerId)
    .eq('blocked_id', blockedId);

  if (error) {
    console.error('Error unblocking user:', error);
    throw error;
  }
}

/**
 * Get list of users blocked by current user
 */
export async function getBlockedUsers(userId) {
  const { data, error } = await supabase
    .from('blocked_users')
    .select('*, blocked:profiles!blocked_id(id, display_name, photo_url)')
    .eq('blocker_id', userId);

  if (error) {
    console.error('Error fetching blocked users:', error);
    return [];
  }

  return data || [];
}

/**
 * Check if a user is blocked
 */
export async function isUserBlocked(blockerId, blockedId) {
  const { data, error } = await supabase
    .from('blocked_users')
    .select('id')
    .eq('blocker_id', blockerId)
    .eq('blocked_id', blockedId)
    .maybeSingle();

  if (error) {
    console.error('Error checking block status:', error);
    return false;
  }

  return !!data;
}

// ===========================
// CONTACT MATCHING
// ===========================

/**
 * Normalize phone number for matching
 */
function normalizePhone(phone) {
  if (!phone) return null;
  // Remove all spaces, dashes, parentheses
  let normalized = phone.replace(/[\s\-()]/g, '');
  // Convert +27 to 0 for South African numbers
  if (normalized.startsWith('+27')) {
    normalized = '0' + normalized.slice(3);
  }
  // Remove leading + if any other country
  if (normalized.startsWith('+')) {
    normalized = normalized.slice(1);
  }
  return normalized;
}

/**
 * Check if a phone number is registered in the app
 */
export async function checkPhoneRegistered(phoneNumber) {
  const normalized = normalizePhone(phoneNumber);
  if (!normalized) return null;

  // Search for matching phone in profiles
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, photo_url, phone')
    .or(`phone.eq.${phoneNumber},phone.eq.${normalized}`)
    .maybeSingle();

  if (error) {
    console.error('Error checking phone registration:', error);
    return null;
  }

  return data;
}

/**
 * Check multiple phone numbers for registration
 * Returns map of phone -> user data (or null if not registered)
 */
export async function checkPhonesRegistered(phoneNumbers) {
  const results = {};
  
  // Normalize all phone numbers
  const normalizedPhones = phoneNumbers.map(p => ({
    original: p,
    normalized: normalizePhone(p)
  })).filter(p => p.normalized);

  if (normalizedPhones.length === 0) return results;

  // Build OR query for all phones
  const phoneQueries = normalizedPhones.flatMap(p => [p.original, p.normalized]);
  const uniquePhones = [...new Set(phoneQueries)];
  
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, photo_url, phone')
    .in('phone', uniquePhones);

  if (error) {
    console.error('Error checking phone registrations:', error);
    return results;
  }

  // Map results back to original phone numbers
  const phoneToUser = {};
  (data || []).forEach(user => {
    if (user.phone) {
      phoneToUser[user.phone] = user;
      phoneToUser[normalizePhone(user.phone)] = user;
    }
  });

  normalizedPhones.forEach(({ original, normalized }) => {
    results[original] = phoneToUser[original] || phoneToUser[normalized] || null;
  });

  return results;
}

/**
 * Request access to device contacts
 * Returns array of contacts with phone numbers
 */
export async function requestContactsAccess() {
  // Check if Contact Picker API is supported
  if (!('contacts' in navigator && 'ContactsManager' in window)) {
    throw new Error('Contact Picker API is not supported on this device');
  }

  try {
    const props = ['name', 'tel'];
    const opts = { multiple: true };
    
    const contacts = await navigator.contacts.select(props, opts);
    
    // Flatten contacts with multiple phone numbers
    const flatContacts = [];
    contacts.forEach(contact => {
      const name = contact.name?.[0] || 'Unknown';
      (contact.tel || []).forEach(phone => {
        if (phone) {
          flatContacts.push({
            name,
            phone: phone.trim()
          });
        }
      });
    });

    return flatContacts;
  } catch (error) {
    if (error.name === 'NotAllowedError') {
      throw new Error('Permission to access contacts was denied');
    }
    throw error;
  }
}

/**
 * Pick contacts and check which ones are registered
 */
export async function pickContactsAndCheckRegistration() {
  const contacts = await requestContactsAccess();
  
  if (contacts.length === 0) {
    return { contacts: [], registered: {}, notRegistered: [] };
  }

  const phoneNumbers = contacts.map(c => c.phone);
  const registrationMap = await checkPhonesRegistered(phoneNumbers);

  const registered = {};
  const notRegistered = [];

  contacts.forEach(contact => {
    const user = registrationMap[contact.phone];
    if (user) {
      registered[contact.phone] = {
        ...contact,
        user
      };
    } else {
      notRegistered.push(contact);
    }
  });

  return { contacts, registered, notRegistered };
}

/**
 * Delete a property message for the current user only
 */
export async function deletePropertyMessageForMe(messageId, userId) {
  try {
    // Get current message to update deleted_for array
    const { data: message, error: fetchError } = await supabase
      .from('property_messages')
      .select('deleted_for')
      .eq('id', messageId)
      .single();

    if (fetchError) {
      console.error('Error fetching property message:', fetchError);
      throw fetchError;
    }

    // Add user to deleted_for array
    const deletedFor = message?.deleted_for || [];
    if (!deletedFor.includes(userId)) {
      deletedFor.push(userId);
    }

    const { error } = await supabase
      .from('property_messages')
      .update({ deleted_for: deletedFor })
      .eq('id', messageId);

    if (error) {
      console.error('Error deleting property message for me:', error);
      throw error;
    }

    return true;
  } catch (err) {
    console.error('Error in deletePropertyMessageForMe:', err);
    throw err;
  }
}

/**
 * Delete a property message for everyone (sender only)
 */
export async function deletePropertyMessageForEveryone(messageId, senderId) {
  try {
    // Verify the user is the sender
    const { data: message, error: fetchError } = await supabase
      .from('property_messages')
      .select('sender_id, content, voice_url')
      .eq('id', messageId)
      .single();

    if (fetchError) {
      console.error('Error fetching property message:', fetchError);
      throw fetchError;
    }

    if (message?.sender_id !== senderId) {
      throw new Error('You can only delete your own messages for everyone');
    }

    // If it's a voice message, delete the audio file
    if (message?.voice_url) {
      try {
        const urlParts = message.voice_url.split('/');
        const fileName = urlParts.slice(-2).join('/');
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
      .from('property_messages')
      .update({ 
        content: '🚫 This message was deleted',
        deleted_at: new Date().toISOString(),
        voice_url: null,
        voice_duration: null,
        message_type: 'deleted'
      })
      .eq('id', messageId);

    if (error) {
      console.error('Error deleting property message for everyone:', error);
      throw error;
    }

    return true;
  } catch (err) {
    console.error('Error in deletePropertyMessageForEveryone:', err);
    throw err;
  }
}
