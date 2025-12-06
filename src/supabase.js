// Supabase client for RentMzansi
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xohczphzosfgdlgwrlrw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvaGN6cGh6b3NmZ2RsZ3dybHJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2MTE1NDQsImV4cCI6MjA4MDE4NzU0NH0.AlW0ul9nwusOjEM36ERhN5XYsj0FzDHBBjufwd0rRYM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ===========================
// AUTHENTICATION FUNCTIONS
// ===========================

// Sign up with email and password
export async function signUpWithEmail(email, password, captchaToken) {
  const payload = {
    email,
    password,
    options: {
      emailRedirectTo: window.location.origin,
    }
  };

  if (captchaToken) {
    payload.options.captchaToken = captchaToken;
  }

  const { data, error } = await supabase.auth.signUp(payload);
  
  if (error) {
    console.error('Sign up error:', error);
    throw error;
  }
  
  // Check if email confirmation is required
  // If user.identities is empty, email confirmation is pending
  if (data.user && data.user.identities && data.user.identities.length === 0) {
    throw new Error('Please check your email to confirm your account before signing in.');
  }
  
  // If session exists, user is signed in (email confirmation disabled)
  if (data.session) {
    return data.user;
  }
  
  // Email confirmation required
  if (data.user && !data.session) {
    throw new Error('Please check your email and click the confirmation link to complete signup.');
  }
  
  return data.user;
}

// Sign in with email and password
export async function signInWithEmail(email, password, captchaToken) {
  const payload = {
    email,
    password,
  };

  if (captchaToken) {
    payload.captchaToken = captchaToken;
  }

  const { data, error } = await supabase.auth.signInWithPassword(payload);
  
  if (error) {
    console.error('Sign in error:', error);
    throw error;
  }
  
  return data.user;
}

// Sign in with Google
export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
    }
  });
  
  if (error) {
    console.error('Google sign in error:', error);
    throw error;
  }
  
  return data;
}

// Sign out
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('Sign out error:', error);
    throw error;
  }
}

// Get current user
export function getCurrentUser() {
  return supabase.auth.getUser();
}

// Get current session
export function getSession() {
  return supabase.auth.getSession();
}

// Listen to auth state changes
export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(session?.user || null, event);
  });
}

// Send password reset email
export async function resetPassword(email, captchaToken = '') {
  const options = {
    redirectTo: `${window.location.origin}/reset-password`,
  };
  
  if (captchaToken) {
    options.captchaToken = captchaToken;
  }
  
  const { error } = await supabase.auth.resetPasswordForEmail(email, options);
  
  if (error) {
    console.error('Password reset error:', error);
    throw error;
  }
}

// ===========================
// PROFILE FUNCTIONS (localStorage-based for simplicity)
// ===========================

export function getProfile(userId) {
  const profile = localStorage.getItem(`user-profile-${userId}`);
  return profile ? JSON.parse(profile) : null;
}

export function saveProfile(userId, profileData) {
  localStorage.setItem(`user-profile-${userId}`, JSON.stringify(profileData));
  localStorage.setItem(`user-type-${userId}`, profileData.userType || 'renter');
  if (profileData.landlordComplete) {
    localStorage.setItem(`landlord-complete-${userId}`, 'true');
  }
  return profileData;
}

export function updateProfile(userId, updates) {
  const existing = getProfile(userId) || {};
  const updated = { ...existing, ...updates };
  saveProfile(userId, updated);
  return updated;
}

export function isLandlordComplete(userId) {
  return localStorage.getItem(`landlord-complete-${userId}`) === 'true';
}

export function setLandlordComplete(userId, complete = true) {
  localStorage.setItem(`landlord-complete-${userId}`, complete ? 'true' : 'false');
}

export function getUserType(userId) {
  return localStorage.getItem(`user-type-${userId}`) || 'renter';
}

export async function ensureProfileRecord(userId) {
  if (!userId) {
    return null;
  }

  try {
    const { data: existing, error: fetchError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (fetchError) {
      console.error('Error checking profile record:', fetchError);
      throw fetchError;
    }

    if (existing) {
      return existing;
    }

    const { data, error } = await supabase
      .from('profiles')
      .insert({ id: userId })
      .select('id')
      .single();

    if (error) {
      console.error('Error creating profile record:', error);
      throw error;
    }

    return data;
  } catch (err) {
    console.error('ensureProfileRecord failed:', err);
    throw err;
  }
}

export async function syncProfileToSupabase(userId, profileData = {}) {
  if (!userId) return false;

  const payload = {
    display_name: profileData.displayName || profileData.name || '',
    email: profileData.email || '',
    phone: profileData.phone || '',
    whatsapp: profileData.whatsapp || '',
    user_type: profileData.userType || 'renter',
    photo_url: profileData.photoURL || profileData.photo || '',
    landlord_complete: !!profileData.landlordComplete,
    landlord_info: profileData.landlordInfo || null,
    notification_prefs: profileData.notificationPrefs || null,
    updated_at: new Date().toISOString(),
  };

  // First, check if profile exists
  const { data: existing, error: fetchError } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  if (fetchError) {
    console.error('Error checking profile:', fetchError);
    throw fetchError;
  }

  if (existing) {
    // Update existing profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', userId);

    if (updateError) {
      console.error('syncProfileToSupabase update failed:', updateError);
      throw updateError;
    }
  } else {
    // Insert new profile
    const { error: insertError } = await supabase
      .from('profiles')
      .insert({ id: userId, ...payload });

    if (insertError) {
      console.error('syncProfileToSupabase insert failed:', insertError);
      throw insertError;
    }
  }

  return true;
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
  if (!listingData?.landlordId) {
    throw new Error('Missing landlordId for listing creation');
  }

  // Ensure the foreign-key target exists so inserts don't fail
  await ensureProfileRecord(listingData.landlordId);

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
