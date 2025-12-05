// Smart notification engine for saved searches and price drops

const STORAGE_KEY_SAVED_SEARCHES = 'saved-searches';
const STORAGE_KEY_NOTIFICATIONS = 'notifications';
const STORAGE_KEY_LISTING_SNAPSHOTS = 'listing-snapshots';
const STORAGE_KEY_AREA_SUBSCRIPTIONS = 'area-subscriptions';
const STORAGE_KEY_SEEN_LISTINGS = 'seen-listing-ids';
const STORAGE_KEY_LISTING_VIEWS = 'listing-views';
const STORAGE_KEY_VIEWED_LISTINGS = 'user-viewed-listings';
const STORAGE_KEY_LANDLORD_RESPONSE_TIMES = 'landlord-response-times';
const STORAGE_KEY_COMPARE_LIST = 'compare-listings';
const STORAGE_KEY_ROOMMATE_PROFILES = 'roommate-profiles';
const STORAGE_KEY_QUICK_REPLIES = 'landlord-quick-replies';

// ===== LISTING VIEWS TRACKING =====

export function trackListingView(listingId, userId = null) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LISTING_VIEWS);
    const views = raw ? JSON.parse(raw) : {};
    
    if (!views[listingId]) {
      views[listingId] = { count: 0, viewers: [] };
    }
    
    // Count unique views (by session if no user)
    const viewerId = userId || `session-${Date.now()}`;
    if (!views[listingId].viewers.includes(viewerId)) {
      views[listingId].count += 1;
      views[listingId].viewers.push(viewerId);
      // Keep only last 100 viewers
      if (views[listingId].viewers.length > 100) {
        views[listingId].viewers = views[listingId].viewers.slice(-100);
      }
    }
    
    localStorage.setItem(STORAGE_KEY_LISTING_VIEWS, JSON.stringify(views));
    return views[listingId].count;
  } catch (e) {
    console.error('Failed to track listing view', e);
    return 0;
  }
}

export function getListingViewCount(listingId) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LISTING_VIEWS);
    const views = raw ? JSON.parse(raw) : {};
    return views[listingId]?.count || 0;
  } catch {
    return 0;
  }
}

// Track listings user has viewed (for price drop alerts)
export function trackUserViewedListing(userId, listingId, price) {
  if (!userId) return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_VIEWED_LISTINGS);
    const viewed = raw ? JSON.parse(raw) : {};
    if (!viewed[userId]) viewed[userId] = {};
    viewed[userId][listingId] = { price, timestamp: Date.now() };
    localStorage.setItem(STORAGE_KEY_VIEWED_LISTINGS, JSON.stringify(viewed));
  } catch (e) {
    console.error('Failed to track viewed listing', e);
  }
}

export function getUserViewedListings(userId) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_VIEWED_LISTINGS);
    const viewed = raw ? JSON.parse(raw) : {};
    return viewed[userId] || {};
  } catch {
    return {};
  }
}

// Check for price drops on viewed listings
export function checkViewedListingPriceDrops(userId, currentListings) {
  if (!userId) return [];
  
  const viewed = getUserViewedListings(userId);
  const notifications = [];
  
  currentListings.forEach(listing => {
    const listingId = listing.id || `${listing.title}-${listing.createdAt}`;
    const viewedData = viewed[listingId];
    
    if (viewedData && parseFloat(viewedData.price) > parseFloat(listing.price)) {
      const drop = parseFloat(viewedData.price) - parseFloat(listing.price);
      notifications.push({
        type: 'price-drop',
        title: '💰 Price Drop!',
        body: `"${listing.title}" dropped by R${drop.toLocaleString()} to R${parseFloat(listing.price).toLocaleString()}/month`,
        listingId,
        oldPrice: viewedData.price,
        newPrice: listing.price,
      });
      // Update the stored price
      trackUserViewedListing(userId, listingId, listing.price);
    }
  });
  
  return notifications;
}

// ===== LANDLORD RESPONSE TIME TRACKING =====

export function trackLandlordContactClick(landlordId) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LANDLORD_RESPONSE_TIMES);
    const data = raw ? JSON.parse(raw) : {};
    
    if (!data[landlordId]) {
      data[landlordId] = { contacts: 0, avgResponseHours: null };
    }
    data[landlordId].contacts += 1;
    data[landlordId].lastContact = Date.now();
    
    localStorage.setItem(STORAGE_KEY_LANDLORD_RESPONSE_TIMES, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to track contact', e);
  }
}

export function getLandlordResponseStats(landlordId) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LANDLORD_RESPONSE_TIMES);
    const data = raw ? JSON.parse(raw) : {};
    return data[landlordId] || { contacts: 0, avgResponseHours: null };
  } catch {
    return { contacts: 0, avgResponseHours: null };
  }
}

// Simulate response time based on contacts (in production, track actual responses)
export function getResponseTimeBadge(landlordId) {
  const stats = getLandlordResponseStats(landlordId);
  // For MVP: show "Active" if they've had contacts recently
  if (stats.contacts >= 5) return { text: 'Very Active', color: 'emerald' };
  if (stats.contacts >= 2) return { text: 'Active', color: 'blue' };
  return null;
}

// ===== ROOM COMPARISON =====

export function getCompareList() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_COMPARE_LIST);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addToCompare(listingId) {
  try {
    const list = getCompareList();
    if (list.length >= 3) {
      return { success: false, message: 'You can only compare up to 3 rooms' };
    }
    if (list.includes(listingId)) {
      return { success: false, message: 'Already in compare list' };
    }
    list.push(listingId);
    localStorage.setItem(STORAGE_KEY_COMPARE_LIST, JSON.stringify(list));
    return { success: true, message: 'Added to compare' };
  } catch {
    return { success: false, message: 'Failed to add' };
  }
}

export function removeFromCompare(listingId) {
  try {
    let list = getCompareList();
    list = list.filter(id => id !== listingId);
    localStorage.setItem(STORAGE_KEY_COMPARE_LIST, JSON.stringify(list));
    return { success: true };
  } catch {
    return { success: false };
  }
}

export function clearCompareList() {
  try {
    localStorage.setItem(STORAGE_KEY_COMPARE_LIST, JSON.stringify([]));
  } catch {}
}

// ===== ROOMMATE MATCHING =====

export function saveRoommateProfile(userId, profile) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ROOMMATE_PROFILES);
    const profiles = raw ? JSON.parse(raw) : {};
    profiles[userId] = {
      ...profile,
      userId,
      createdAt: profiles[userId]?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY_ROOMMATE_PROFILES, JSON.stringify(profiles));
    return { success: true };
  } catch (e) {
    console.error('Failed to save roommate profile', e);
    return { success: false };
  }
}

export function getRoommateProfile(userId) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ROOMMATE_PROFILES);
    const profiles = raw ? JSON.parse(raw) : {};
    return profiles[userId] || null;
  } catch {
    return null;
  }
}

export function getAllRoommateProfiles() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ROOMMATE_PROFILES);
    const profiles = raw ? JSON.parse(raw) : {};
    return Object.values(profiles);
  } catch {
    return [];
  }
}

export function searchRoommates(filters) {
  const profiles = getAllRoommateProfiles();
  return profiles.filter(profile => {
    if (filters.location && !profile.preferredAreas?.some(area => 
      area.toLowerCase().includes(filters.location.toLowerCase())
    )) return false;
    if (filters.maxBudget && profile.budget > filters.maxBudget) return false;
    if (filters.minBudget && profile.budget < filters.minBudget) return false;
    if (filters.gender && profile.gender !== filters.gender && profile.gender !== 'any') return false;
    return true;
  });
}

export function deleteRoommateProfile(userId) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ROOMMATE_PROFILES);
    const profiles = raw ? JSON.parse(raw) : {};
    delete profiles[userId];
    localStorage.setItem(STORAGE_KEY_ROOMMATE_PROFILES, JSON.stringify(profiles));
    return { success: true };
  } catch {
    return { success: false };
  }
}

// ===== LANDLORD QUICK REPLIES =====

const DEFAULT_QUICK_REPLIES = [
  { id: 1, text: "Hi! Yes, the room is still available. When would you like to view it?" },
  { id: 2, text: "Thanks for your interest! The room is available from the date listed. Would you like to schedule a viewing?" },
  { id: 3, text: "Hi! I can show you the room this week. What day works for you?" },
  { id: 4, text: "The room has been taken. I'll update the listing soon." },
  { id: 5, text: "Please call me to discuss details and arrange a viewing." },
];

export function getLandlordQuickReplies(landlordId) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_QUICK_REPLIES);
    const replies = raw ? JSON.parse(raw) : {};
    return replies[landlordId] || DEFAULT_QUICK_REPLIES;
  } catch {
    return DEFAULT_QUICK_REPLIES;
  }
}

export function saveLandlordQuickReplies(landlordId, replies) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_QUICK_REPLIES);
    const allReplies = raw ? JSON.parse(raw) : {};
    allReplies[landlordId] = replies;
    localStorage.setItem(STORAGE_KEY_QUICK_REPLIES, JSON.stringify(allReplies));
    return { success: true };
  } catch {
    return { success: false };
  }
}

export function getDefaultQuickReplies() {
  return DEFAULT_QUICK_REPLIES;
}

// ===== AREA SUBSCRIPTIONS =====

export function getAreaSubscriptions(userId) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_AREA_SUBSCRIPTIONS);
    const subs = raw ? JSON.parse(raw) : {};
    return subs[userId] || [];
  } catch {
    return [];
  }
}

export function getAllAreaSubscriptions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_AREA_SUBSCRIPTIONS);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function subscribeToArea(userId, area) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_AREA_SUBSCRIPTIONS);
    const subs = raw ? JSON.parse(raw) : {};
    subs[userId] = subs[userId] || [];
    
    const normalizedArea = area.trim().toLowerCase();
    const exists = subs[userId].some(a => a.toLowerCase() === normalizedArea);
    
    if (!exists) {
      subs[userId].push(area.trim());
      localStorage.setItem(STORAGE_KEY_AREA_SUBSCRIPTIONS, JSON.stringify(subs));
      return { success: true, message: `You'll be notified when rooms are listed in ${area}` };
    }
    return { success: false, message: `Already subscribed to ${area}` };
  } catch (e) {
    console.error('Failed to subscribe to area', e);
    return { success: false, message: 'Failed to subscribe' };
  }
}

export function unsubscribeFromArea(userId, area) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_AREA_SUBSCRIPTIONS);
    const subs = raw ? JSON.parse(raw) : {};
    if (subs[userId]) {
      subs[userId] = subs[userId].filter(a => a.toLowerCase() !== area.toLowerCase());
      localStorage.setItem(STORAGE_KEY_AREA_SUBSCRIPTIONS, JSON.stringify(subs));
    }
    return { success: true };
  } catch (e) {
    console.error('Failed to unsubscribe from area', e);
    return { success: false };
  }
}

// Check new listings against area subscriptions
export function checkAreaSubscriptions(userId, currentListings) {
  if (!userId) return [];
  
  const subscribedAreas = getAreaSubscriptions(userId);
  if (subscribedAreas.length === 0) return [];
  
  const notifications = [];
  const seenIds = getSeenListingIds();
  
  currentListings.forEach(listing => {
    const listingId = listing.id || `${listing.title}-${listing.createdAt}`;
    
    // Skip if we've already seen this listing
    if (seenIds.includes(listingId)) return;
    
    // Check if listing location matches any subscribed area
    const listingLocation = (listing.location || '').toLowerCase();
    const listingFullAddress = (listing.fullAddress || '').toLowerCase();
    
    subscribedAreas.forEach(area => {
      const areaLower = area.toLowerCase();
      if (listingLocation.includes(areaLower) || listingFullAddress.includes(areaLower)) {
        notifications.push({
          type: 'area-alert',
          title: `🏠 New Room in ${area}!`,
          body: `"${listing.title}" - R${listing.price}/month in ${listing.location}`,
          listingId: listingId,
          area: area,
          price: listing.price,
          location: listing.location,
        });
      }
    });
  });
  
  // Mark listings as seen
  const newSeenIds = [...new Set([...seenIds, ...currentListings.map(l => l.id || `${l.title}-${l.createdAt}`)])];
  saveSeenListingIds(newSeenIds.slice(-500)); // Keep last 500
  
  return notifications;
}

function getSeenListingIds() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SEEN_LISTINGS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveSeenListingIds(ids) {
  try {
    localStorage.setItem(STORAGE_KEY_SEEN_LISTINGS, JSON.stringify(ids));
  } catch (e) {
    console.error('Failed to save seen listing ids', e);
  }
}

// ===== SAVED SEARCHES =====

export function getSavedSearches() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SAVED_SEARCHES);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveSearch(criteria) {
  try {
    const searches = getSavedSearches();
    const entry = {
      id: Date.now(),
      ...criteria,
      createdAt: Date.now(),
    };
    searches.push(entry);
    localStorage.setItem(STORAGE_KEY_SAVED_SEARCHES, JSON.stringify(searches));
    return entry;
  } catch (e) {
    console.error('Failed to save search', e);
    return null;
  }
}

export function deleteSavedSearch(id) {
  try {
    const searches = getSavedSearches().filter(s => s.id !== id);
    localStorage.setItem(STORAGE_KEY_SAVED_SEARCHES, JSON.stringify(searches));
  } catch (e) {
    console.error('Failed to delete saved search', e);
  }
}

export function getNotifications() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_NOTIFICATIONS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addNotification(notification) {
  try {
    const notifications = getNotifications();
    const entry = {
      id: Date.now(),
      ...notification,
      timestamp: Date.now(),
      read: false,
    };
    notifications.unshift(entry); // newest first
    // Keep last 50
    const trimmed = notifications.slice(0, 50);
    localStorage.setItem(STORAGE_KEY_NOTIFICATIONS, JSON.stringify(trimmed));
    return entry;
  } catch (e) {
    console.error('Failed to add notification', e);
    return null;
  }
}

export function markNotificationRead(id) {
  try {
    const notifications = getNotifications();
    const item = notifications.find(n => n.id === id);
    if (item) {
      item.read = true;
      localStorage.setItem(STORAGE_KEY_NOTIFICATIONS, JSON.stringify(notifications));
    }
  } catch (e) {
    console.error('Failed to mark notification read', e);
  }
}

export function clearNotifications() {
  try {
    localStorage.setItem(STORAGE_KEY_NOTIFICATIONS, JSON.stringify([]));
  } catch (e) {
    console.error('Failed to clear notifications', e);
  }
}

// Check for new listings that match saved searches
export function checkNewListings(currentListings, savedSearches) {
  const notifications = [];
  const snapshots = getListingSnapshots();
  
  currentListings.forEach(listing => {
    const key = listing.id || `${listing.title}-${listing.createdAt}`;
    if (snapshots[key]) return; // already seen
    
    // Check each saved search
    savedSearches.forEach(search => {
      if (matchesSearch(listing, search)) {
        notifications.push({
          type: 'new-listing',
          title: 'New Listing Match',
          body: `"${listing.title}" matches your saved search in ${search.location || 'your area'}`,
          listingId: key,
          searchId: search.id,
        });
      }
    });
  });
  
  // Update snapshots with current listings
  currentListings.forEach(listing => {
    const key = listing.id || `${listing.title}-${listing.createdAt}`;
    snapshots[key] = {
      price: listing.price,
      timestamp: Date.now(),
    };
  });
  saveListingSnapshots(snapshots);
  
  return notifications;
}

// Check for price drops on favorites
export function checkPriceDrops(currentListings, favorites) {
  const notifications = [];
  const snapshots = getListingSnapshots();
  
  currentListings.forEach(listing => {
    const key = listing.id || `${listing.title}-${listing.createdAt}`;
    if (!favorites.includes(key)) return; // not a favorite
    
    const snap = snapshots[key];
    if (snap && snap.price > listing.price) {
      const drop = snap.price - listing.price;
      notifications.push({
        type: 'price-drop',
        title: 'Price Drop Alert',
        body: `"${listing.title}" dropped by R${drop} to R${listing.price}/month`,
        listingId: key,
        oldPrice: snap.price,
        newPrice: listing.price,
      });
    }
  });
  
  // Update snapshots
  currentListings.forEach(listing => {
    const key = listing.id || `${listing.title}-${listing.createdAt}`;
    snapshots[key] = {
      price: listing.price,
      timestamp: Date.now(),
    };
  });
  saveListingSnapshots(snapshots);
  
  return notifications;
}

function matchesSearch(listing, search) {
  // Location match (basic substring)
  if (search.location && !listing.location.toLowerCase().includes(search.location.toLowerCase())) {
    return false;
  }
  
  // Price range
  if (search.priceMin !== undefined && listing.price < search.priceMin) return false;
  if (search.priceMax !== undefined && listing.price > search.priceMax) return false;
  
  // Amenities
  if (search.amenities && search.amenities.length > 0) {
    const listingAmenities = listing.amenities || [];
    const hasAll = search.amenities.every(a => listingAmenities.includes(a));
    if (!hasAll) return false;
  }
  
  return true;
}

function getListingSnapshots() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LISTING_SNAPSHOTS);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveListingSnapshots(snapshots) {
  try {
    localStorage.setItem(STORAGE_KEY_LISTING_SNAPSHOTS, JSON.stringify(snapshots));
  } catch (e) {
    console.error('Failed to save listing snapshots', e);
  }
}
