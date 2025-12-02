// Supabase client for Room24
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xohczphzosfgdlgwrlrw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvaGN6cGh6b3NmZ2RsZ3dybHJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2MTE1NDQsImV4cCI6MjA4MDE4NzU0NH0.AlW0ul9nwusOjEM36ERhN5XYsj0FzDHBBjufwd0rRYM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ===========================
// PROFILE FUNCTIONS
// ===========================

export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  
  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching profile:', error);
    return null;
  }
  return data;
}

export async function saveProfile(userId, profileData) {
  const { data, error } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      email: profileData.email,
      display_name: profileData.displayName,
      user_type: profileData.userType,
      phone: profileData.phone || '',
      photo_url: profileData.photoURL || '',
      landlord_complete: profileData.landlordComplete || false,
      landlord_info: profileData.landlordInfo || null,
      notification_prefs: profileData.notificationPrefs || { updates: true, marketing: false },
    }, { onConflict: 'id' });
  
  if (error) {
    console.error('Error saving profile:', error);
    throw error;
  }
  return data;
}

export async function updateProfile(userId, updates) {
  const dbUpdates = {};
  if (updates.displayName !== undefined) dbUpdates.display_name = updates.displayName;
  if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
  if (updates.photoURL !== undefined) dbUpdates.photo_url = updates.photoURL;
  if (updates.userType !== undefined) dbUpdates.user_type = updates.userType;
  if (updates.landlordComplete !== undefined) dbUpdates.landlord_complete = updates.landlordComplete;
  if (updates.landlordInfo !== undefined) dbUpdates.landlord_info = updates.landlordInfo;
  if (updates.notificationPrefs !== undefined) dbUpdates.notification_prefs = updates.notificationPrefs;

  const { data, error } = await supabase
    .from('profiles')
    .update(dbUpdates)
    .eq('id', userId);
  
  if (error) {
    console.error('Error updating profile:', error);
    throw error;
  }
  return data;
}

// ===========================
// LISTINGS FUNCTIONS
// ===========================

export async function fetchAllListings() {
  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching listings:', error);
    return [];
  }
  
  // Convert snake_case to camelCase for frontend
  return data.map(listing => ({
    id: listing.id,
    title: listing.title,
    price: listing.price,
    location: listing.location,
    streetAddress: listing.street_address,
    fullAddress: listing.full_address,
    description: listing.description,
    photos: listing.photos || [],
    status: listing.status,
    availableDate: listing.available_date,
    amenities: listing.amenities || [],
    latitude: listing.latitude,
    longitude: listing.longitude,
    paymentMethod: listing.payment_method,
    premium: listing.premium,
    landlordId: listing.landlord_id,
    landlordName: listing.landlord_name,
    landlordPhone: listing.landlord_phone,
    landlordEmail: listing.landlord_email,
    landlordPhoto: listing.landlord_photo,
    createdAt: listing.created_at,
  }));
}

export async function createListing(listingData) {
  const { data, error } = await supabase
    .from('listings')
    .insert({
      title: listingData.title,
      price: listingData.price,
      location: listingData.location,
      street_address: listingData.streetAddress,
      full_address: listingData.fullAddress,
      description: listingData.description,
      photos: listingData.photos || [],
      status: listingData.status || 'available',
      available_date: listingData.availableDate,
      amenities: listingData.amenities || [],
      latitude: listingData.latitude,
      longitude: listingData.longitude,
      payment_method: listingData.paymentMethod,
      premium: listingData.premium || false,
      landlord_id: listingData.landlordId,
      landlord_name: listingData.landlordName,
      landlord_phone: listingData.landlordPhone,
      landlord_email: listingData.landlordEmail,
      landlord_photo: listingData.landlordPhoto,
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error creating listing:', error);
    throw error;
  }
  
  return {
    id: data.id,
    title: data.title,
    price: data.price,
    location: data.location,
    streetAddress: data.street_address,
    fullAddress: data.full_address,
    description: data.description,
    photos: data.photos || [],
    status: data.status,
    availableDate: data.available_date,
    amenities: data.amenities || [],
    latitude: data.latitude,
    longitude: data.longitude,
    paymentMethod: data.payment_method,
    premium: data.premium,
    landlordId: data.landlord_id,
    landlordName: data.landlord_name,
    landlordPhone: data.landlord_phone,
    landlordEmail: data.landlord_email,
    landlordPhoto: data.landlord_photo,
    createdAt: data.created_at,
  };
}

export async function deleteListing(listingId) {
  const { error } = await supabase
    .from('listings')
    .delete()
    .eq('id', listingId);
  
  if (error) {
    console.error('Error deleting listing:', error);
    throw error;
  }
  return true;
}

export async function updateListing(listingId, updates) {
  const dbUpdates = {};
  if (updates.title !== undefined) dbUpdates.title = updates.title;
  if (updates.price !== undefined) dbUpdates.price = updates.price;
  if (updates.location !== undefined) dbUpdates.location = updates.location;
  if (updates.streetAddress !== undefined) dbUpdates.street_address = updates.streetAddress;
  if (updates.fullAddress !== undefined) dbUpdates.full_address = updates.fullAddress;
  if (updates.description !== undefined) dbUpdates.description = updates.description;
  if (updates.photos !== undefined) dbUpdates.photos = updates.photos;
  if (updates.status !== undefined) dbUpdates.status = updates.status;
  if (updates.availableDate !== undefined) dbUpdates.available_date = updates.availableDate;
  if (updates.amenities !== undefined) dbUpdates.amenities = updates.amenities;

  const { data, error } = await supabase
    .from('listings')
    .update(dbUpdates)
    .eq('id', listingId)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating listing:', error);
    throw error;
  }
  return data;
}

// Subscribe to real-time listing changes
export function subscribeToListings(callback) {
  const subscription = supabase
    .channel('listings-channel')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'listings' },
      async () => {
        // Refetch all listings when any change occurs
        const listings = await fetchAllListings();
        callback(listings);
      }
    )
    .subscribe();
  
  return () => {
    subscription.unsubscribe();
  };
}
