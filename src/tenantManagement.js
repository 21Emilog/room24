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
      status: 'active',
      accepted_at: new Date().toISOString(),
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
    throw error;
  }

  return data;
}

/**
 * Check if user can send messages in property chat
 */
export async function canSendPropertyMessage(propertyId, userId) {
  // Get property settings
  const { data: property } = await supabase
    .from('properties')
    .select('landlord_id, admin_only_messages')
    .eq('id', propertyId)
    .maybeSingle();

  if (!property) return false;

  // If admin_only_messages is off, anyone can send
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
export async function sendPropertyMessage({ propertyId, senderId, content, messageType = 'text' }) {
  const { data, error } = await supabase
    .from('property_messages')
    .insert({
      property_id: propertyId,
      sender_id: senderId,
      content,
      message_type: messageType,
      read_by: [senderId], // Sender has read it
    })
    .select()
    .single();

  if (error) {
    console.error('Error sending property message:', error);
    throw error;
  }

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
