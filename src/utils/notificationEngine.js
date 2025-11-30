// Smart notification engine for saved searches and price drops

const STORAGE_KEY_SAVED_SEARCHES = 'saved-searches';
const STORAGE_KEY_NOTIFICATIONS = 'notifications';
const STORAGE_KEY_LISTING_SNAPSHOTS = 'listing-snapshots';

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
