import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { initFirebase, initAnalytics, requestFcmToken, listenForegroundMessages, trackEvent, fetchListings, addListing, deleteListing, subscribeToListings, isFirestoreEnabled, subscribeToAuthState, getUserProfile, saveUserProfile, getLinkedProviders, linkGoogleAccount } from './firebase';
import { Home, PlusCircle, Search, MapPin, X, User, Phone, Mail, Edit, CheckCircle, Heart, Calendar, Bell, AlertTriangle, LogOut, Link2, Download, Smartphone } from 'lucide-react';
import Header from './components/Header';
import ListingDetailModal from './components/ListingDetailModal';
import Footer from './components/Footer';
import BrowseView from './components/BrowseView';
import PrivacyPolicyModal from './components/PrivacyPolicyModal';
import NotificationBanner from './components/NotificationBanner';
import AnalyticsConsentModal from './components/AnalyticsConsentModal';
import NotificationsPanel from './components/NotificationsPanel';
import PhotoEditor from './components/PhotoEditor';
import OfflineIndicator from './components/OfflineIndicator';
import BackToTop from './components/BackToTop';
import { getNotifications } from './utils/notificationEngine';
import { loadListingTemplate, saveListingTemplate, clearListingTemplate } from './utils/listingTemplateStorage';
import { 
  signUpWithEmail, 
  signInWithEmail, 
  signInWithGoogle, 
  signOut as firebaseSignOut, 
  resetPassword 
} from './firebase';

export default function RentalPlatform() {
  const [currentView, setCurrentView] = useState('browse');
  const [userType, setUserType] = useState(null);
  const [previewAsRenter, setPreviewAsRenter] = useState(false); // landlord UI preview toggle
  const [listings, setListings] = useState([]);
  const [selectedListing, setSelectedListing] = useState(null);
  const [users, setUsers] = useState([]); // registry of all users (localStorage 'users')
  const [searchLocation, setSearchLocation] = useState('');
  const [priceRange, setPriceRange] = useState([0, 10000]);
  const [selectedAmenities, setSelectedAmenities] = useState([]);
  const [sortBy, setSortBy] = useState('newest');
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null); // Extended profile from Firestore
  const [authLoading, setAuthLoading] = useState(true); // Loading state for auth
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authDefaultType, setAuthDefaultType] = useState('renter');
  const [authDefaultMode, setAuthDefaultMode] = useState('signin');
  // Mobile menu state moved into Header component
  const [toast, setToast] = useState(null);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [notificationBanner, setNotificationBanner] = useState(null);
  const [showAnalyticsConsent, setShowAnalyticsConsent] = useState(false);
  const [showNotificationsPanel, setShowNotificationsPanel] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  const openAuthModal = (type = 'renter', mode = 'signin') => {
    setAuthDefaultType(type);
    setAuthDefaultMode(mode);
    setShowAuthModal(true);
  };

  // Auth functions to pass to AuthModal
  const authFunctions = {
    signUp: async (email, password, displayName, userTypeParam = 'renter') => {
      const firebaseUser = await signUpWithEmail(email, password, displayName);
      
      // Create user profile data
      const profileData = {
        email: firebaseUser.email,
        displayName: displayName || firebaseUser.displayName,
        userType: userTypeParam,
        phone: '',
        photoURL: firebaseUser.photoURL || '',
        createdAt: new Date().toISOString(),
        landlordComplete: userTypeParam === 'renter',
      };
      
      // Immediately update local state with the correct user type
      // This ensures the user is a landlord even if Firestore save is slow/fails
      setUserProfile(profileData);
      setUserType(userTypeParam);
      
      // Save to Firestore in background (don't wait for it)
      saveUserProfile(firebaseUser.uid, profileData)
        .then(() => console.log('Profile saved to Firestore'))
        .catch(err => console.warn('Could not save profile to Firestore:', err));
      
      return firebaseUser;
    },
    signIn: async (email, password) => {
      return await signInWithEmail(email, password);
    },
    signInGoogle: async (userTypeParam = 'renter') => {
      const firebaseUser = await signInWithGoogle();
      
      // Check if user profile exists (with timeout)
      let profile = null;
      try {
        const getProfilePromise = getUserProfile(firebaseUser.uid);
        const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(null), 3000));
        profile = await Promise.race([getProfilePromise, timeoutPromise]);
      } catch (err) {
        console.warn('Could not fetch profile:', err);
      }
      
      if (!profile) {
        // Create new profile for Google user
        const profileData = {
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || '',
          userType: userTypeParam,
          phone: '',
          photoURL: firebaseUser.photoURL || '',
          createdAt: new Date().toISOString(),
          landlordComplete: userTypeParam === 'renter',
        };
        
        // Set local state immediately
        setUserProfile(profileData);
        setUserType(userTypeParam);
        
        // Save to Firestore in background (don't wait)
        saveUserProfile(firebaseUser.uid, profileData)
          .then(() => console.log('Google profile saved to Firestore'))
          .catch(err => console.warn('Could not save Google profile:', err));
      } else {
        // Existing user - use their saved profile
        setUserProfile(profile);
        setUserType(profile.userType || 'renter');
      }
      
      return firebaseUser;
    },
    sendPasswordReset: async (email) => {
      await resetPassword(email);
    }
  };

  // Update unread notification count
  useEffect(() => {
    const updateUnreadCount = () => {
      const notifications = getNotifications();
      setUnreadCount(notifications.filter(n => !n.read).length);
    };
    updateUnreadCount();
    const interval = setInterval(updateUnreadCount, 5000); // check every 5s
    return () => clearInterval(interval);
  }, []);

  // PWA Install Banner Logic
  useEffect(() => {
    // Check if already installed or dismissed
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches 
                     || window.navigator.standalone === true;
    const wasDismissed = localStorage.getItem('installBannerDismissed');
    const dismissedTime = wasDismissed ? parseInt(wasDismissed, 10) : 0;
    const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);
    
    if (isInstalled) {
      setShowInstallBanner(false);
      return;
    }

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Show banner if not dismissed recently (within 7 days)
      if (!wasDismissed || daysSinceDismissed > 7) {
        setTimeout(() => setShowInstallBanner(true), 3000); // Show after 3 seconds
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // For iOS (no beforeinstallprompt), show manual instructions after delay
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS && !isInstalled && (!wasDismissed || daysSinceDismissed > 7)) {
      setTimeout(() => setShowInstallBanner(true), 5000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowInstallBanner(false);
        showToast('Room24 installed! Check your home screen', 'success', '🎉 Installed!');
      }
      setDeferredPrompt(null);
    } else {
      // Check if already installed
      const isInstalled = window.matchMedia('(display-mode: standalone)').matches 
                       || window.navigator.standalone === true;
      
      if (isInstalled) {
        showToast('Room24 is already installed on your device!', 'success', '✅ Already Installed');
      } else {
        // iOS or browser that doesn't support install prompt
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        if (isIOS) {
          showToast('Tap the Share button (□↑) at the bottom, then "Add to Home Screen"', 'info', '📱 Install on iPhone');
        } else {
          showToast('Click the menu (⋮) then "Install app" or "Add to Home Screen"', 'info', '📱 Install Room24');
        }
      }
    }
  };

  const dismissInstallBanner = () => {
    setShowInstallBanner(false);
    localStorage.setItem('installBannerDismissed', Date.now().toString());
  };
  

  useEffect(() => {
    loadData();
    // Initialize Firebase + FCM token fetch (deferred until user interaction if desired)
    const app = initFirebase();
    
    // Set up Firebase Auth listener
    const unsubscribeAuth = subscribeToAuthState(async (firebaseUser) => {
      if (firebaseUser) {
        setCurrentUser(firebaseUser);
        // Fetch extended profile from Firestore
        try {
          const profile = await getUserProfile(firebaseUser.uid);
          if (profile) {
            // Only update if we don't already have a profile set (avoid overwriting during signup)
            setUserProfile(prev => prev || profile);
            setUserType(prev => prev || profile.userType || 'renter');
          }
        } catch (err) {
          console.error('Error fetching user profile:', err);
        }
      } else {
        setCurrentUser(null);
        setUserProfile(null);
        setUserType(null);
      }
      setAuthLoading(false);
    });
    
    // Set up real-time listener for Firestore listings
    let unsubscribeListings = null;
    if (isFirestoreEnabled()) {
      unsubscribeListings = subscribeToListings((firestoreListings) => {
        if (firestoreListings && firestoreListings.length >= 0) {
          setListings(firestoreListings);
          // Cache locally for offline access
          localStorage.setItem('listings', JSON.stringify(firestoreListings));
        }
      });
    }
    
    // Check analytics consent and show modal if not set
    const analyticsConsent = localStorage.getItem('analytics-consent');
    if (!analyticsConsent && process.env.REACT_APP_ENABLE_ANALYTICS === 'true') {
      // Delay modal slightly so UI loads first
      setTimeout(() => setShowAnalyticsConsent(true), 2000);
    } else if (analyticsConsent === 'yes') {
      initAnalytics(app);
    }

    (async () => {
      try {
        const token = await requestFcmToken();
        if (token) {
          console.log('Obtained FCM token:', token);
          trackEvent('fcm_token_obtained');
        }
      } catch (e) {
        console.warn('FCM token request failed', e);
      }
    })();
    
    listenForegroundMessages((payload) => {
      // Display notification banner instead of toast
      const notification = payload?.notification || {};
      if (notification.title || notification.body) {
        setNotificationBanner({
          title: notification.title,
          body: notification.body
        });
        // Auto-dismiss after 8 seconds
        setTimeout(() => setNotificationBanner(null), 8000);
      }
    });
    
    // Cleanup: unsubscribe from listeners on unmount
    return () => {
      if (unsubscribeAuth) {
        unsubscribeAuth();
      }
      if (unsubscribeListings) {
        unsubscribeListings();
      }
    };
  }, []);

  // Guard: if someone navigates to 'add' without landlord auth, prompt to sign in
  useEffect(() => {
    if (authLoading) return; // Wait for auth to load
    
    if (currentView === 'add') {
      if (!currentUser) {
        openAuthModal('landlord');
        setCurrentView('browse');
      } else if (userType !== 'landlord') {
        // Not a landlord - prompt to become one
        openAuthModal('landlord');
        setCurrentView('browse');
      } else if (!userProfile?.landlordComplete) {
        // Landlord but hasn't completed onboarding
        setCurrentView('landlord-onboarding');
      }
    }
  }, [currentView, currentUser, userType, userProfile, authLoading]);

  const loadData = async () => {
    try {
      // Try to load from Firestore first
      const firestoreListings = await fetchListings();
      if (firestoreListings && firestoreListings.length > 0) {
        console.log('Loaded listings from Firestore');
        setListings(firestoreListings);
        // Also cache to localStorage for offline access
        localStorage.setItem('listings', JSON.stringify(firestoreListings));
      } else {
        // Fall back to localStorage
        const listingsResult = localStorage.getItem('listings');
        if (listingsResult) {
          console.log('Loaded listings from localStorage (Firestore empty or unavailable)');
          setListings(JSON.parse(listingsResult));
        }
      }
      
      const userResult = localStorage.getItem('current-user');
      const usersResult = localStorage.getItem('users');
      if (userResult) {
        const user = JSON.parse(userResult);
        setCurrentUser(user);
        setUserType(user.type);
      }
      if (usersResult) {
        try {
          const parsed = JSON.parse(usersResult);
          setUsers(Array.isArray(parsed) ? parsed : []);
        } catch (e) {
          console.warn('Corrupt users array in storage, resetting');
          setUsers([]);
        }
      }
    } catch (error) {
      console.log('No existing data found, starting fresh');
      // Add sample listings for testing the map
      const sampleListings = [
        {
          id: 'listing-1',
          title: 'Cozy Room in Soweto',
          price: 2500,
          location: 'Soweto, Johannesburg',
          description: 'Comfortable room with bathroom and kitchen access',
          photos: [],
          status: 'available',
          availableDate: new Date().toISOString(),
          amenities: ['WiFi', 'Kitchen'],
          landlordId: 'landlord-1',
          landlordName: 'John Smith',
          landlordPhone: '+27 123 456 7890',
          landlordEmail: 'john@example.com',
          landlordPhoto: '',
          createdAt: new Date().toISOString()
        },
        {
          id: 'listing-2',
          title: 'Modern Apartment in Sandton',
          price: 4500,
          location: 'Sandton, Johannesburg',
          description: 'Luxurious apartment with parking and security',
          photos: [],
          status: 'available',
          availableDate: new Date().toISOString(),
          amenities: ['WiFi', 'Parking', 'Air Conditioning'],
          landlordId: 'landlord-2',
          landlordName: 'Jane Doe',
          landlordPhone: '+27 987 654 3210',
          landlordEmail: 'jane@example.com',
          landlordPhoto: '',
          createdAt: new Date().toISOString()
        },
        {
          id: 'listing-3',
          title: 'Studio in Midrand',
          price: 3200,
          location: 'Midrand, Johannesburg',
          description: 'Spacious studio flat with laundry facilities',
          photos: [],
          status: 'available',
          availableDate: new Date().toISOString(),
          amenities: ['Laundry', 'WiFi'],
          landlordId: 'landlord-3',
          landlordName: 'Mike Johnson',
          landlordPhone: '+27 555 555 5555',
          landlordEmail: 'mike@example.com',
          landlordPhoto: '',
          createdAt: new Date().toISOString()
        }
      ];
      setListings(sampleListings);
    }
  };

  // Helper: check for duplicate phone or email in registry (exclude an optional user id)
  const isDuplicateContact = (phone, email, ignoreId = null) => {
    const normalizedPhone = (phone || '').trim();
    const normalizedEmail = (email || '').trim().toLowerCase();
    if (!users || users.length === 0) return false;
    return users.some(u => {
      if (ignoreId && u.id === ignoreId) return false;
      const uPhone = (u.phone || '').trim();
      const uEmail = (u.email || '').trim().toLowerCase();
      const phoneMatch = normalizedPhone && uPhone && uPhone === normalizedPhone;
      const emailMatch = normalizedEmail && uEmail && uEmail === normalizedEmail;
      return phoneMatch || emailMatch;
    });
  };

  // Toast notification helper
  const showToast = (message, type = 'info', title = '') => {
    setToast({ message, type, title });
    setTimeout(() => setToast(null), 5000);
  };

  const handleAnalyticsConsentAccept = () => {
    localStorage.setItem('analytics-consent', 'yes');
    setShowAnalyticsConsent(false);
    const app = initFirebase();
    initAnalytics(app);
    trackEvent('analytics_consent_granted');
    showToast('Analytics enabled', 'success', 'Thank you!');
  };

  const handleAnalyticsConsentDecline = () => {
    localStorage.setItem('analytics-consent', 'no');
    setShowAnalyticsConsent(false);
    showToast('Analytics disabled', 'info');
  };

  const saveListings = async (newListings) => {
    try {
      localStorage.setItem('listings', JSON.stringify(newListings));
      setListings(newListings);
      // Broadcast to runtime service worker for offline snapshot caching
      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        try { navigator.serviceWorker.controller.postMessage({ type: 'SYNC_LISTINGS', payload: newListings }); } catch {}
      }
    } catch (error) {
      console.error('Error saving listings:', error);
    }
  };

  const saveSubscriptions = async (subscriptions) => {
    try {
      localStorage.setItem('subscriptions', JSON.stringify(subscriptions));
    } catch (error) {
      console.error('Error saving subscriptions:', error);
    }
  };

  const getSubscriptions = async () => {
    try {
      const res = localStorage.getItem('subscriptions');
      return res ? JSON.parse(res) : {};
    } catch (err) {
      console.error('Error loading subscriptions', err);
    }
    return {};
  };

  const subscribeToArea = async (userId, area) => {
    if (!userId) {
      openAuthModal('renter');
      return;
    }
    if (!area || area.trim() === '') {
      alert('Please enter a location to subscribe to.');
      return;
    }
    try {
      const subs = await getSubscriptions();
      subs[userId] = subs[userId] || [];
      if (!subs[userId].includes(area)) {
        subs[userId].push(area);
        await saveSubscriptions(subs);
        alert(`Subscribed to updates for ${area}`);
      } else {
        alert(`You are already subscribed to ${area}`);
      }
    } catch (err) {
      console.error('Subscribe failed', err);
      alert('Could not subscribe. Please try again.');
    }
  };

  

const handleProfileSetup = async (profileData) => {
  try {
    // Duplicate guard
    if (isDuplicateContact(profileData.phone, profileData.email)) {
      showToast('Phone or email already registered', 'error', 'Duplicate');
      return;
    }
    const userId = `user-${Date.now()}`;
    const user = { 
      id: userId, 
      type: userType, 
      ...profileData,
      whatsapp: profileData.whatsapp || '',
      notificationPrefs: { updates: true, marketing: false },
      createdAt: new Date().toISOString()
    };
    
    localStorage.setItem('current-user', JSON.stringify(user));
    setCurrentUser(user);
    // Update users registry
    const existingUsersRaw = localStorage.getItem('users');
    let existingUsers = [];
    if (existingUsersRaw) {
      try { existingUsers = JSON.parse(existingUsersRaw); } catch { existingUsers = []; }
    }
    existingUsers.push(user);
    localStorage.setItem('users', JSON.stringify(existingUsers));
    setUsers(existingUsers);
    showToast('Profile created successfully!', 'success', 'Welcome!');
    setCurrentView('browse');
  } catch (error) {
    console.error('Error saving profile:', error);
    // Still set the user locally even if storage fails
    const userId = `user-${Date.now()}`;
    const user = { 
      id: userId, 
      type: userType, 
      ...profileData,
      whatsapp: profileData.whatsapp || '',
      createdAt: new Date().toISOString()
    };
    setCurrentUser(user);
    const existingUsersRaw = localStorage.getItem('users');
    let existingUsers = [];
    if (existingUsersRaw) {
      try { existingUsers = JSON.parse(existingUsersRaw); } catch { existingUsers = []; }
    }
    existingUsers.push(user);
    try { localStorage.setItem('users', JSON.stringify(existingUsers)); } catch {}
    setUsers(existingUsers);
    showToast('Profile created (data may not be persisted)', 'error');
    setCurrentView('browse');
  }
};

const handleUpdateProfile = async (profileData) => {
  try {
    // Duplicate guard (exclude current user id)
    if (isDuplicateContact(profileData.phone, profileData.email, currentUser?.id)) {
      showToast('Phone or email already used by another account', 'error', 'Duplicate');
      return;
    }
    const updatedUser = { ...currentUser, ...profileData };
    
    localStorage.setItem('current-user', JSON.stringify(updatedUser));
    setCurrentUser(updatedUser);
    // Update registry entry
    const existingUsersRaw = localStorage.getItem('users');
    let existingUsers = [];
    if (existingUsersRaw) {
      try { existingUsers = JSON.parse(existingUsersRaw); } catch { existingUsers = []; }
    }
    const idx = existingUsers.findIndex(u => u.id === updatedUser.id);
    if (idx !== -1) {
      existingUsers[idx] = updatedUser;
    } else {
      existingUsers.push(updatedUser); // ensure presence
    }
    localStorage.setItem('users', JSON.stringify(existingUsers));
    setUsers(existingUsers);
    showToast('Profile updated successfully!', 'success');
    setCurrentView('browse');
  } catch (error) {
    console.error('Error updating profile:', error);
    const updatedUser = { ...currentUser, ...profileData };
    setCurrentUser(updatedUser);
    const existingUsersRaw = localStorage.getItem('users');
    let existingUsers = [];
    if (existingUsersRaw) {
      try { existingUsers = JSON.parse(existingUsersRaw); } catch { existingUsers = []; }
    }
    const idx = existingUsers.findIndex(u => u.id === updatedUser.id);
    if (idx !== -1) {
      existingUsers[idx] = updatedUser;
    } else {
      existingUsers.push(updatedUser);
    }
    try { localStorage.setItem('users', JSON.stringify(existingUsers)); } catch {}
    setUsers(existingUsers);
    showToast('Profile updated (data may not be persisted)', 'error');
    setCurrentView('browse');
  }
};

// Sign out using Firebase
const handleSignOut = async () => {
  try {
    await firebaseSignOut();
    setCurrentUser(null);
    setUserProfile(null);
    setUserType(null);
    setCurrentView('browse');
    showToast('Signed out successfully.', 'info');
  } catch (e) {
    console.error('Sign out error:', e);
    showToast('Error signing out. Please try again.', 'error');
  }
};

const handleCompleteOnboarding = async (onboardData) => {
  try {
    if (currentUser?.uid) {
      await saveUserProfile(currentUser.uid, { 
        landlordComplete: true, 
        landlordInfo: onboardData 
      });
      setUserProfile(prev => ({ ...prev, landlordComplete: true, landlordInfo: onboardData }));
    }
    setCurrentView('browse');
    showToast('Profile complete! You can now create listings.', 'success');
  } catch (err) {
    console.error('Onboarding save failed', err);
    setCurrentView('browse');
  }
};

const handleAddListing = async (listingData) => {
  // Combine streetAddress and location into fullAddress for complete address storage
  const fullAddress = [listingData.streetAddress, listingData.location]
    .filter(Boolean)
    .join(', ');
  
  const newListingData = {
    title: listingData.title,
    price: listingData.price,
    location: listingData.location,
    streetAddress: listingData.streetAddress || '',
    fullAddress: fullAddress || listingData.location || '', // Store complete address
    description: listingData.description,
    photos: listingData.photos || [],
    status: listingData.status || 'available',
    availableDate: listingData.availableDate || new Date().toISOString(),
    amenities: listingData.amenities || [],
    latitude: listingData.latitude ?? null,
    longitude: listingData.longitude ?? null,
    paymentMethod: listingData.paymentMethod || 'Bank and Cash',
    premium: !!listingData.premium,
    // Use Firebase UID for landlordId
    landlordId: currentUser?.uid || currentUser?.id,
    landlordName: userProfile?.displayName || currentUser?.displayName || '',
    landlordPhone: userProfile?.phone || '',
    landlordEmail: currentUser?.email || '',
    landlordPhoto: userProfile?.photoURL || currentUser?.photoURL || '',
  };

  try {
    // Try to save to Firestore first
    const firestoreId = await addListing(newListingData);
    if (firestoreId) {
      // Successfully saved to Firestore
      const newListing = { ...newListingData, id: firestoreId, createdAt: new Date().toISOString() };
      const updatedListings = [...listings, newListing];
      setListings(updatedListings);
      // Also cache locally
      localStorage.setItem('listings', JSON.stringify(updatedListings));
      showToast('Listing created and shared online!', 'success', 'Success!');
    } else {
      // Firestore not available, save locally only
      const newListing = { ...newListingData, id: `listing-${Date.now()}`, createdAt: new Date().toISOString() };
      const updatedListings = [...listings, newListing];
      await saveListings(updatedListings);
      showToast('Listing saved locally (offline mode)', 'info', 'Saved');
    }
  } catch (error) {
    console.error('Error adding listing:', error);
    // Fall back to local save
    const newListing = { ...newListingData, id: `listing-${Date.now()}`, createdAt: new Date().toISOString() };
    const updatedListings = [...listings, newListing];
    await saveListings(updatedListings);
    showToast('Listing saved locally', 'info', 'Saved');
  }
  
  setCurrentView('browse');
  // Scroll to top to see new listing
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

  // Messaging removed

const filteredListings = listings
  .filter(listing => {
    const matchesLocation = !searchLocation || 
      (listing.location || '').toLowerCase().includes(searchLocation.toLowerCase());
    const price = parseFloat(listing.price);
    const matchesPrice = price >= priceRange[0] && price <= priceRange[1];
    const matchesAmenities = selectedAmenities.length === 0 || 
      selectedAmenities.every(amenity => listing.amenities?.includes(amenity));

    return matchesLocation && matchesPrice && matchesAmenities;
  })
  .sort((a, b) => {
    if (a.premium && !b.premium) return -1;
    if (!a.premium && b.premium) return 1;
    if (sortBy === 'newest') {
      return new Date(b.createdAt) - new Date(a.createdAt);
    } else if (sortBy === 'cheapest') {
      return parseFloat(a.price) - parseFloat(b.price);
    } else if (sortBy === 'expensive') {
      return parseFloat(b.price) - parseFloat(a.price);
    }
    return 0;
  });

  // Allow guests to land on Browse by default. If userType isn't set,
  // show a gentle callout in the header (below) so users can pick a role
  // when they want to post or set up their profile.

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-gray-100">
      {/* Offline Indicator */}
      <OfflineIndicator />
      
      {/* PWA Install Banner */}
      {showInstallBanner && (
        <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50 bg-gradient-to-r from-teal-600 to-cyan-600 rounded-2xl shadow-2xl p-4 fade-in border border-teal-400/30">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0">
              <Smartphone className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-white text-sm">Install Room24</h4>
              <p className="text-teal-100 text-xs mt-0.5">Add to your home screen for the best experience!</p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleInstallClick}
                  className="flex items-center gap-1.5 px-4 py-2 bg-white text-teal-700 font-semibold text-xs rounded-lg hover:bg-teal-50 transition-colors shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  Install
                </button>
                <button
                  onClick={dismissInstallBanner}
                  className="px-3 py-2 text-white/80 hover:text-white text-xs font-medium transition-colors"
                >
                  Maybe Later
                </button>
              </div>
            </div>
            <button
              onClick={dismissInstallBanner}
              className="text-white/60 hover:text-white transition-colors p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      
      {/* Back to Top Button */}
      <BackToTop />
      
      <Header
        currentUser={currentUser}
        previewAsRenter={previewAsRenter}
        setPreviewAsRenter={setPreviewAsRenter}
        openAuthModal={openAuthModal}
        handleSignOut={handleSignOut}
        setCurrentView={setCurrentView}
        unreadCount={unreadCount}
        onOpenNotifications={() => setShowNotificationsPanel(true)}
      />

      {/* Notification Banner (Push Notifications) */}
      {notificationBanner && (
        <NotificationBanner
          title={notificationBanner.title}
          body={notificationBanner.body}
          onClose={() => setNotificationBanner(null)}
        />
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-20 right-4 z-50 max-w-sm w-full transition-all duration-300 ${
          toast.type === 'error' ? 'bg-gradient-to-r from-rose-50 to-red-50 border-rose-400' :
          toast.type === 'success' ? 'bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-400' :
          toast.type === 'warning' ? 'bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-400' :
          'bg-gradient-to-r from-sky-50 to-blue-50 border-sky-400'
        } border-l-4 rounded-xl shadow-2xl p-4 fade-in backdrop-blur-sm`}>
          <div className="flex items-start gap-3">
            <div className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center shadow-sm ${
              toast.type === 'error' ? 'bg-rose-500' :
              toast.type === 'success' ? 'bg-emerald-500' :
              toast.type === 'warning' ? 'bg-amber-500' :
              'bg-sky-500'
            }`}>
              {toast.type === 'success' && <CheckCircle className="w-5 h-5 text-white" />}
              {toast.type === 'error' && <span className="text-white font-bold text-sm">✕</span>}
              {toast.type === 'warning' && <span className="text-white font-bold text-sm">!</span>}
              {toast.type === 'info' && <span className="text-white font-bold text-sm">i</span>}
            </div>
            <div className="flex-1 min-w-0">
              {toast.title && <p className={`font-bold mb-0.5 ${
                toast.type === 'error' ? 'text-rose-800' :
                toast.type === 'success' ? 'text-emerald-800' :
                toast.type === 'warning' ? 'text-amber-800' :
                'text-sky-800'
              }`}>{toast.title}</p>}
              <p className={`text-sm ${
                toast.type === 'error' ? 'text-rose-700' :
                toast.type === 'success' ? 'text-emerald-700' :
                toast.type === 'warning' ? 'text-amber-700' :
                'text-sky-700'
              }`}>{toast.message}</p>
            </div>
            <button 
              onClick={() => setToast(null)}
              className={`flex-shrink-0 p-1.5 rounded-lg hover:bg-white/50 transition ${
                toast.type === 'error' ? 'text-rose-500 hover:text-rose-700' :
                toast.type === 'success' ? 'text-emerald-500 hover:text-emerald-700' :
                toast.type === 'warning' ? 'text-amber-500 hover:text-amber-700' :
                'text-sky-500 hover:text-sky-700'
              }`}
              aria-label="Close notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div id="main-content" className="max-w-7xl mx-auto pb-24 px-4 sm:px-6 lg:px-8" role="main">
        {currentView === 'setup-profile' && (
          <ProfileSetupView onSubmit={handleProfileSetup} userType={userType} />
        )}

        {currentView === 'profile' && currentUser && (
          <ProfileView 
            user={{
              name: userProfile?.displayName || currentUser?.displayName || '',
              email: currentUser?.email || '',
              phone: userProfile?.phone || '',
              photo: userProfile?.photoURL || currentUser?.photoURL || '',
              type: userProfile?.userType || userType || 'renter',
              notificationPrefs: userProfile?.notificationPrefs || { updates: true, marketing: false },
            }}
            onEdit={() => setCurrentView('edit-profile')} 
            onSignOut={handleSignOut}
            linkedProviders={getLinkedProviders()}
            onLinkGoogle={async () => {
              await linkGoogleAccount();
              // Refresh to show updated providers
              window.location.reload();
            }}
            onLinkPhone={() => {
              // Open auth modal for phone linking
              showToast('Phone linking coming soon!', 'info');
            }}
            onUpdatePrefs={async (prefs) => {
              if (currentUser?.uid) {
                try {
                  await saveUserProfile(currentUser.uid, { notificationPrefs: prefs });
                  setUserProfile(prev => ({ ...prev, notificationPrefs: prefs }));
                  showToast('Preferences updated', 'success');
                } catch (err) {
                  console.error('Failed to update prefs:', err);
                  showToast('Failed to update preferences', 'error');
                }
              }
            }}
          />
        )}

        {currentView === 'edit-profile' && currentUser && (
          <EditProfileView user={currentUser} onSubmit={handleUpdateProfile} onCancel={() => setCurrentView('profile')} />
        )}

        {currentView === 'landlord-onboarding' && currentUser && userType === 'landlord' && (
          <LandlordOnboardingView onComplete={handleCompleteOnboarding} onCancel={() => setCurrentView('browse')} currentUser={currentUser} />
        )}

        {currentView === 'browse' && (
                    <BrowseView 
                      listings={filteredListings}
                      searchLocation={searchLocation}
                      setSearchLocation={setSearchLocation}
                      priceRange={priceRange}
                      setPriceRange={setPriceRange}
                      selectedAmenities={selectedAmenities}
                      setSelectedAmenities={setSelectedAmenities}
                      sortBy={sortBy}
                      setSortBy={setSortBy}
                      onSelectListing={setSelectedListing}
                      setCurrentView={setCurrentView}
                      currentUser={currentUser}
                      onRequireAuth={openAuthModal}
                      subscribeToArea={subscribeToArea}
                      previewMode={previewAsRenter}
                    />
        )}

        {/* Messages view removed */}

        {currentView === 'add' && (
          <AddListingView
            onSubmit={handleAddListing}
            onCancel={() => setCurrentView('browse')}
            currentUser={currentUser}
            userType={userType}
            onRequireAuth={openAuthModal}
            onRequireOnboarding={() => setCurrentView('landlord-onboarding')}
          />
        )}

        {currentView === 'my-listings' && currentUser && userType === 'landlord' && (
          <MyListingsView 
            listings={listings.filter(l => l.landlordId === currentUser.uid || l.landlordId === currentUser.id)}
            onDelete={async (id) => {
              try {
                // Try to delete from Firestore first
                const deleted = await deleteListing(id);
                if (deleted) {
                  showToast('Listing deleted', 'success');
                }
              } catch (error) {
                console.error('Firestore delete failed:', error);
              }
              // Also update local state and localStorage
              const updated = listings.filter(l => l.id !== id);
              setListings(updated);
              localStorage.setItem('listings', JSON.stringify(updated));
            }}
          />
        )}

        {currentView === 'favorites' && (
          <FavoritesView
            listings={listings}
            onSelectListing={setSelectedListing}
          />
        )}
      </div>

      {selectedListing && (
        <ListingDetailModal 
          listing={selectedListing}
          landlord={{
            name: selectedListing.landlordName,
            phone: selectedListing.landlordPhone,
            email: selectedListing.landlordEmail,
            photo: selectedListing.landlordPhoto
          }}
          onClose={() => setSelectedListing(null)}
          userType={userType}
          currentUser={currentUser}
          onRequireAuth={openAuthModal}
          previewMode={previewAsRenter}
          showToast={showToast}
        />
      )}

      {/* Conversation modal removed */}

      {showAuthModal && (
        <AuthModal
          defaultType={authDefaultType}
          defaultMode={authDefaultMode}
          onClose={() => setShowAuthModal(false)}
          onSuccess={() => {
            showToast('Signed in successfully!', 'success', 'Welcome!');
          }}
          authFunctions={authFunctions}
        />
      )}

      <BottomNav 
        currentView={currentView}
        setCurrentView={setCurrentView}
        userType={userType}
      />

      {showPrivacyPolicy && (
        <PrivacyPolicyModal onClose={() => setShowPrivacyPolicy(false)} />
      )}

      {showAnalyticsConsent && (
        <AnalyticsConsentModal
          onAccept={handleAnalyticsConsentAccept}
          onDecline={handleAnalyticsConsentDecline}
        />
      )}

      {showNotificationsPanel && (
        <NotificationsPanel
          onClose={() => {
            setShowNotificationsPanel(false);
            setUnreadCount(getNotifications().filter(n => !n.read).length);
          }}
          onSelectListing={(listingId) => {
            const listing = listings.find(l => (l.id || `${l.title}-${l.createdAt}`) === listingId);
            if (listing) {
              setSelectedListing(listing);
            }
            setShowNotificationsPanel(false);
          }}
        />
      )}

      <Footer 
        onOpenPrivacy={() => setShowPrivacyPolicy(true)} 
        onInstallApp={handleInstallClick}
      />
    </div>
  );
}



function ProfileSetupView({ onSubmit, userType }) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    whatsapp: '',
    photo: ''
  });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const validateField = (name, value, extras = {}) => {
    const newErrors = { ...errors };
    switch (name) {
      case 'name':
        if (!value || value.trim().length < 2) {
          newErrors.name = 'Name must be at least 2 characters';
        } else {
          delete newErrors.name;
        }
        break;
      case 'phone':
        if (!value || !/^[+]?[-0-9()\s]{7,}$/.test(value.trim())) {
          newErrors.phone = 'Enter a valid phone number (min 7 digits)';
        } else {
          delete newErrors.phone;
        }
        break;
      case 'email':
        if (!value || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value.trim())) {
          newErrors.email = 'Enter a valid email address';
        } else {
          delete newErrors.email;
        }
        break;
      case 'photo':
        if (value === 'FILE_TOO_LARGE') {
          newErrors.photo = 'Photo is too large (max 2MB)';
        } else {
          delete newErrors.photo;
        }
        break;
      default:
        break;
    }
    setErrors(newErrors);
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        setFormData({ ...formData, photo: '' });
        validateField('photo', 'FILE_TOO_LARGE');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, photo: reader.result });
        validateField('photo', reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = () => {
    // Touch all fields
    const allTouched = { name: true, phone: true, email: true, photo: true };
    setTouched(allTouched);
    validateField('name', formData.name);
    validateField('phone', formData.phone);
    validateField('email', formData.email);
    if (Object.keys(errors).length === 0 && formData.name && formData.phone && formData.email) {
      onSubmit(formData);
    }
  };

  return (
    <div className="p-4 min-h-screen bg-gradient-to-b from-slate-50 to-gray-100 pb-24">
      <div className="max-w-2xl mx-auto mt-8">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-extrabold text-gray-900 mb-2">Complete Your Profile</h2>
            <p className="text-gray-600">Help others know who you are</p>
          </div>

          <div className="space-y-6">
            {/* Photo Upload */}
            <div className="flex justify-center mb-8">
              <div className="relative">
                {formData.photo ? (
                  <img 
                    src={formData.photo} 
                    alt="Profile" 
                    className="w-32 h-32 rounded-full object-cover border-4 border-blue-200 shadow-lg" 
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center border-4 border-blue-200 shadow-lg">
                    <User className="w-16 h-16 text-blue-600" />
                  </div>
                )}
                <label className="absolute bottom-0 right-0 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full cursor-pointer shadow-lg transition group" aria-label="Upload profile photo">
                  <Edit className="w-5 h-5" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Form Fields */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">Full Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => { setFormData({ ...formData, name: e.target.value }); if (touched.name) validateField('name', e.target.value); }}
                onBlur={(e) => { setTouched({ ...touched, name: true }); validateField('name', e.target.value); }}
                placeholder="Enter your full name"
                aria-invalid={errors.name ? 'true' : 'false'}
                aria-describedby={errors.name ? 'profile-name-error' : undefined}
                className={`w-full px-4 py-3 border-2 ${errors.name ? 'border-red-400' : 'border-gray-200'} bg-white text-gray-800 rounded-xl focus:ring-2 focus:ring-teal-400 focus:border-transparent transition placeholder-gray-400`}
              />
              {errors.name && touched.name && <p id="profile-name-error" className="mt-1 text-xs text-red-600">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">Phone Number *</label>
              <div className="relative">
                <Phone className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => { setFormData({ ...formData, phone: e.target.value }); if (touched.phone) validateField('phone', e.target.value); }}
                  onBlur={(e) => { setTouched({ ...touched, phone: true }); validateField('phone', e.target.value); }}
                  placeholder="e.g., +27 12 345 6789"
                  aria-invalid={errors.phone ? 'true' : 'false'}
                  aria-describedby={errors.phone ? 'profile-phone-error' : undefined}
                  className={`w-full pl-11 pr-4 py-3 border-2 ${errors.phone ? 'border-red-400' : 'border-gray-200'} bg-white text-gray-800 rounded-xl focus:ring-2 focus:ring-teal-400 focus:border-transparent transition placeholder-gray-400`}
                />
              </div>
              {errors.phone && touched.phone && <p id="profile-phone-error" className="mt-1 text-xs text-red-600">{errors.phone}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">Email Address *</label>
              <div className="relative">
                <Mail className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => { setFormData({ ...formData, email: e.target.value }); if (touched.email) validateField('email', e.target.value); }}
                  onBlur={(e) => { setTouched({ ...touched, email: true }); validateField('email', e.target.value); }}
                  placeholder="your.email@example.com"
                  aria-invalid={errors.email ? 'true' : 'false'}
                  aria-describedby={errors.email ? 'profile-email-error' : undefined}
                  className={`w-full pl-11 pr-4 py-3 border-2 ${errors.email ? 'border-red-400' : 'border-gray-200'} bg-white text-gray-800 rounded-xl focus:ring-2 focus:ring-teal-400 focus:border-transparent transition placeholder-gray-400`}
                />
              </div>
              {errors.email && touched.email && <p id="profile-email-error" className="mt-1 text-xs text-red-600">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">WhatsApp (optional)</label>
              <div className="relative">
                <Phone className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                <input
                  type="tel"
                  value={formData.whatsapp}
                  onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                  placeholder="e.g., +27 71 234 5678"
                  className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 bg-white text-gray-800 rounded-xl focus:ring-2 focus:ring-teal-400 focus:border-transparent transition placeholder-gray-400"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Used to create a WhatsApp chat link on your listings.</p>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-semibold py-3 rounded-xl transition mt-8 shadow-lg hover:shadow-xl"
            >
              Complete Setup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfileView({ user, onEdit, onUpdatePrefs, onSignOut, linkedProviders, onLinkGoogle, onLinkPhone }) {
  const prefs = user.notificationPrefs || { updates: true, marketing: false };
  const [localPrefs, setLocalPrefs] = React.useState(prefs);
  const [linkingInProgress, setLinkingInProgress] = React.useState(null);
  const [linkError, setLinkError] = React.useState('');
  const [linkSuccess, setLinkSuccess] = React.useState('');

  const togglePref = (key) => {
    const next = { ...localPrefs, [key]: !localPrefs[key] };
    setLocalPrefs(next);
    onUpdatePrefs && onUpdatePrefs(next);
  };

  const handleLinkGoogle = async () => {
    if (!onLinkGoogle) return;
    setLinkingInProgress('google');
    setLinkError('');
    setLinkSuccess('');
    try {
      await onLinkGoogle();
      setLinkSuccess('Google account linked successfully!');
    } catch (err) {
      setLinkError(err.message || 'Failed to link Google account');
    } finally {
      setLinkingInProgress(null);
    }
  };

  const handleLinkPhone = () => {
    if (!onLinkPhone) return;
    onLinkPhone();
  };

  const hasGoogle = linkedProviders?.includes('google.com');
  const hasPhone = linkedProviders?.includes('phone');
  const hasPassword = linkedProviders?.includes('password');

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-gray-100 pb-24">
      {/* Profile Header with Gradient */}
      <div className="bg-gradient-to-br from-teal-600 via-teal-500 to-cyan-500 pt-8 pb-20 px-4">
        <div className="max-w-xl mx-auto flex justify-between items-start">
          <h2 className="text-2xl font-bold text-white">My Profile</h2>
          <button
            onClick={onEdit}
            className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white px-4 py-2 rounded-xl transition-all duration-200 flex items-center gap-2 border border-white/30"
          >
            <Edit className="w-4 h-4" />
            Edit
          </button>
        </div>
      </div>

      {/* Profile Card - Overlapping Header */}
      <div className="px-4 -mt-16">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 max-w-xl mx-auto">
          {/* Avatar & Name */}
          <div className="flex flex-col items-center -mt-16 mb-6">
            {user.photo ? (
              <img 
                src={user.photo} 
                alt="Profile" 
                className="w-28 h-28 rounded-2xl object-cover border-4 border-white shadow-lg mb-4" 
              />
            ) : (
              <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center border-4 border-white shadow-lg mb-4">
                <span className="text-4xl font-bold text-white">
                  {user.name?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              </div>
            )}
            <h3 className="text-2xl font-bold text-gray-900">{user.name}</h3>
            <span className="inline-flex items-center mt-2 px-4 py-1.5 bg-gradient-to-r from-teal-50 to-cyan-50 text-teal-700 rounded-full text-sm font-semibold border border-teal-100">
              {user.type === 'landlord' ? (
                <>
                  <Home className="w-4 h-4 mr-1.5" />
                  Landlord
                </>
              ) : (
                <>
                  <User className="w-4 h-4 mr-1.5" />
                  Renter
                </>
              )}
            </span>
          </div>

          {/* Contact Info Cards */}
          <div className="space-y-3 mb-6">
            <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl p-4 border border-gray-100 hover:border-gray-200 transition-colors">
              <div className="flex items-center">
                <div className="w-11 h-11 bg-gradient-to-br from-teal-100 to-cyan-100 rounded-xl flex items-center justify-center mr-4 shadow-sm">
                  <Phone className="w-5 h-5 text-teal-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-0.5">Phone Number</p>
                  <p className="font-semibold text-gray-800">{user.phone}</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl p-4 border border-gray-100 hover:border-gray-200 transition-colors">
              <div className="flex items-center">
                <div className="w-11 h-11 bg-gradient-to-br from-cyan-100 to-blue-100 rounded-xl flex items-center justify-center mr-4 shadow-sm">
                  <Mail className="w-5 h-5 text-cyan-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-0.5">Email Address</p>
                  <p className="font-semibold text-gray-800">{user.email}</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl p-4 border border-gray-100 hover:border-gray-200 transition-colors">
              <div className="flex items-center">
                <div className="w-11 h-11 bg-gradient-to-br from-violet-100 to-purple-100 rounded-xl flex items-center justify-center mr-4 shadow-sm">
                  <Calendar className="w-5 h-5 text-violet-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-0.5">Member Since</p>
                  <p className="font-semibold text-gray-800">
                    {new Date(user.createdAt).toLocaleDateString('en-ZA', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Notification Preferences */}
          <div className="bg-gradient-to-br from-teal-50 via-cyan-50 to-sky-50 rounded-xl p-5 border border-teal-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-sm">
                <Bell className="w-5 h-5 text-white" />
              </div>
              <h4 className="font-bold text-gray-800">Notification Preferences</h4>
            </div>
            <div className="space-y-3">
              <label className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-100 cursor-pointer hover:border-teal-200 transition-colors">
                <input
                  type="checkbox"
                  checked={localPrefs.updates}
                  onChange={() => togglePref('updates')}
                  className="w-5 h-5 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                <div>
                  <p className="text-sm font-medium text-gray-800">Room Alerts</p>
                  <p className="text-xs text-gray-500">Get notified about new rooms in your saved areas</p>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-100 cursor-pointer hover:border-teal-200 transition-colors">
                <input
                  type="checkbox"
                  checked={localPrefs.marketing}
                  onChange={() => togglePref('marketing')}
                  className="w-5 h-5 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                <div>
                  <p className="text-sm font-medium text-gray-800">Tips & Updates</p>
                  <p className="text-xs text-gray-500">Occasional features and helpful content</p>
                </div>
              </label>
            </div>
            <p className="text-[11px] text-gray-500 mt-3 text-center">Changes save automatically • You can opt out anytime</p>
          </div>

          {/* Account Linking Section */}
          <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-violet-50 rounded-xl p-5 border border-blue-100 mt-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-sm">
                <Link2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h4 className="font-bold text-gray-800">Linked Accounts</h4>
                <p className="text-xs text-gray-500">Connect multiple sign-in methods</p>
              </div>
            </div>

            {/* Success/Error Messages */}
            {linkSuccess && (
              <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                {linkSuccess}
              </div>
            )}
            {linkError && (
              <div className="mb-3 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                {linkError}
              </div>
            )}

            <div className="space-y-2">
              {/* Google */}
              <div className={`flex items-center justify-between p-3 bg-white rounded-lg border ${hasGoogle ? 'border-green-200' : 'border-gray-100'}`}>
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span className="font-medium text-gray-700">Google</span>
                </div>
                {hasGoogle ? (
                  <span className="text-xs font-medium text-green-600 flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" /> Linked
                  </span>
                ) : (
                  <button
                    onClick={handleLinkGoogle}
                    disabled={linkingInProgress === 'google'}
                    className="text-xs font-medium text-blue-600 hover:text-blue-700 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {linkingInProgress === 'google' ? 'Linking...' : 'Link'}
                  </button>
                )}
              </div>

              {/* Phone */}
              <div className={`flex items-center justify-between p-3 bg-white rounded-lg border ${hasPhone ? 'border-green-200' : 'border-gray-100'}`}>
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-gray-700">Phone</span>
                </div>
                {hasPhone ? (
                  <span className="text-xs font-medium text-green-600 flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" /> Linked
                  </span>
                ) : (
                  <button
                    onClick={handleLinkPhone}
                    className="text-xs font-medium text-blue-600 hover:text-blue-700 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                  >
                    Link
                  </button>
                )}
              </div>

              {/* Email/Password */}
              <div className={`flex items-center justify-between p-3 bg-white rounded-lg border ${hasPassword ? 'border-green-200' : 'border-gray-100'}`}>
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-blue-600" />
                  <span className="font-medium text-gray-700">Email & Password</span>
                </div>
                {hasPassword ? (
                  <span className="text-xs font-medium text-green-600 flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" /> Linked
                  </span>
                ) : (
                  <span className="text-xs text-gray-400">Coming soon</span>
                )}
              </div>
            </div>

            <p className="text-[11px] text-gray-500 mt-3 text-center">Link accounts to sign in with any method</p>
          </div>

          {/* Sign Out Button */}
          {onSignOut && (
            <button
              onClick={onSignOut}
              className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function LandlordOnboardingView({ onComplete, onCancel, currentUser }) {
  const [form, setForm] = useState({ businessName: currentUser?.name || '', bankDetails: '', idNumber: '', agree: false });

  const handleSubmit = () => {
    if (!form.businessName || !form.agree) {
      alert('Please provide a display name and agree to the terms.');
      return;
    }
    onComplete(form);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-gray-100 pb-24">
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-teal-600 via-teal-500 to-cyan-500 pt-8 pb-16 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/30">
            <span className="text-4xl font-bold text-white">
              {currentUser?.name?.charAt(0)?.toUpperCase() || 'L'}
            </span>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Welcome, {currentUser?.name || 'Landlord'}!</h2>
          <p className="text-teal-100">Complete your profile to start listing properties</p>
        </div>
      </div>

      {/* Form Card */}
      <div className="px-4 -mt-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
            {/* Progress Steps */}
            <div className="flex items-center justify-center gap-2 mb-8">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-teal-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
                <span className="text-sm font-medium text-gray-700">Profile Details</span>
              </div>
              <div className="w-8 h-0.5 bg-gray-200"></div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gray-200 text-gray-500 rounded-full flex items-center justify-center text-sm font-bold">2</div>
                <span className="text-sm text-gray-400">Start Listing</span>
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">Display Name *</label>
                <input 
                  value={form.businessName} 
                  onChange={(e) => setForm({ ...form, businessName: e.target.value })} 
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all" 
                  placeholder="Your name or business name"
                />
                <p className="text-xs text-gray-500 mt-1.5">This name is shown to renters on your listings and messages.</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">Payment Details (Optional)</label>
                <input 
                  value={form.bankDetails} 
                  onChange={(e) => setForm({ ...form, bankDetails: e.target.value })} 
                  placeholder="Bank account or preferred payment method" 
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all" 
                />
                <p className="text-xs text-gray-500 mt-1.5">Private - only shown to confirmed renters.</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">ID Number (Optional)</label>
                <input 
                  value={form.idNumber} 
                  onChange={(e) => setForm({ ...form, idNumber: e.target.value })} 
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all" 
                  placeholder="For verification purposes"
                />
                <p className="text-xs text-gray-500 mt-1.5">Verified landlords get a trust badge on their listings.</p>
              </div>

              <div className="bg-gradient-to-r from-teal-50 to-cyan-50 rounded-xl p-4 border border-teal-100">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={form.agree} 
                    onChange={(e) => setForm({ ...form, agree: e.target.checked })} 
                    className="mt-1 w-5 h-5 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                  />
                  <span className="text-sm text-gray-700">
                    I confirm I am authorised to list these properties and agree to the{' '}
                    <button type="button" onClick={(e) => e.preventDefault()} className="text-teal-600 hover:text-teal-700 font-medium underline">
                      terms of service
                    </button>.
                  </span>
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  onClick={onCancel} 
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3.5 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSubmit} 
                  className="flex-1 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white font-semibold py-3.5 rounded-xl transition-all shadow-md hover:shadow-lg"
                >
                  Complete & Start Listing
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EditProfileView({ user, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    name: user.name || '',
    phone: user.phone || '',
    email: user.email || '',
    whatsapp: user.whatsapp || '',
    photo: user.photo || ''
  });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const validateField = (name, value, extras = {}) => {
    const newErrors = { ...errors };
    switch (name) {
      case 'name':
        if (!value || value.trim().length < 2) {
          newErrors.name = 'Name must be at least 2 characters';
        } else {
          delete newErrors.name;
        }
        break;
      case 'phone':
        if (!value || !/^[+]?[-0-9()\s]{7,}$/.test(value.trim())) {
          newErrors.phone = 'Enter a valid phone number';
        } else {
          delete newErrors.phone;
        }
        break;
      case 'email':
        if (!value || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value.trim())) {
          newErrors.email = 'Enter a valid email';
        } else {
          delete newErrors.email;
        }
        break;
      default:
        break;
    }
    setErrors(newErrors);
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, photo: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = () => {
    setTouched({ name: true, phone: true, email: true });
    validateField('name', formData.name);
    validateField('phone', formData.phone);
    validateField('email', formData.email);
    if (Object.keys(errors).length === 0 && formData.name && formData.phone && formData.email) {
      onSubmit(formData);
    }
  };

  return (
    <div className="p-4 min-h-screen bg-gradient-to-b from-slate-50 to-gray-100 pb-24">
      <div className="max-w-2xl mx-auto mt-8">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-extrabold text-gray-900">Edit Profile</h2>
            <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 transition">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-6">
            {/* Photo Upload */}
            <div className="flex justify-center mb-8">
              <div className="relative">
                {formData.photo ? (
                  <img src={formData.photo} alt="Profile" className="w-32 h-32 rounded-full object-cover border-4 border-blue-200 shadow-lg" />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center border-4 border-blue-200 shadow-lg">
                    <User className="w-16 h-16 text-blue-600" />
                  </div>
                )}
                <label className="absolute bottom-0 right-0 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full cursor-pointer shadow-lg transition" aria-label="Upload new profile photo">
                  <Edit className="w-5 h-5" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Form Fields */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">Full Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => { setFormData({ ...formData, name: e.target.value }); if (touched.name) validateField('name', e.target.value); }}
                onBlur={(e) => { setTouched({ ...touched, name: true }); validateField('name', e.target.value); }}
                aria-invalid={errors.name ? 'true' : 'false'}
                aria-describedby={errors.name ? 'edit-name-error' : undefined}
                className={`w-full px-4 py-3 border-2 ${errors.name ? 'border-red-400' : 'border-gray-200'} bg-white text-gray-800 rounded-xl focus:ring-2 focus:ring-teal-400 focus:border-transparent transition placeholder-gray-400`}
              />
              {errors.name && touched.name && <p id="edit-name-error" className="mt-1 text-xs text-red-600">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => { setFormData({ ...formData, phone: e.target.value }); if (touched.phone) validateField('phone', e.target.value); }}
                  onBlur={(e) => { setTouched({ ...touched, phone: true }); validateField('phone', e.target.value); }}
                  aria-invalid={errors.phone ? 'true' : 'false'}
                  aria-describedby={errors.phone ? 'edit-phone-error' : undefined}
                  className={`w-full pl-11 pr-4 py-3 border-2 ${errors.phone ? 'border-red-400' : 'border-gray-200'} bg-white text-gray-800 rounded-xl focus:ring-2 focus:ring-teal-400 focus:border-transparent transition placeholder-gray-400`}
                />
              </div>
              {errors.phone && touched.phone && <p id="edit-phone-error" className="mt-1 text-xs text-red-600">{errors.phone}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => { setFormData({ ...formData, email: e.target.value }); if (touched.email) validateField('email', e.target.value); }}
                  onBlur={(e) => { setTouched({ ...touched, email: true }); validateField('email', e.target.value); }}
                  aria-invalid={errors.email ? 'true' : 'false'}
                  aria-describedby={errors.email ? 'edit-email-error' : undefined}
                  className={`w-full pl-11 pr-4 py-3 border-2 ${errors.email ? 'border-red-400' : 'border-gray-200'} bg-white text-gray-800 rounded-xl focus:ring-2 focus:ring-teal-400 focus:border-transparent transition placeholder-gray-400`}
                />
              </div>
              {errors.email && touched.email && <p id="edit-email-error" className="mt-1 text-xs text-red-600">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">WhatsApp (optional)</label>
              <div className="relative">
                <Phone className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                <input
                  type="tel"
                  value={formData.whatsapp}
                  onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                  placeholder="e.g., +27 71 234 5678"
                  className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 bg-white text-gray-800 rounded-xl focus:ring-2 focus:ring-teal-400 focus:border-transparent transition placeholder-gray-400"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Used to create a WhatsApp chat link on your listings.</p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-6 border-t border-gray-200">
              <button
                onClick={onCancel}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-3 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-semibold py-3 rounded-xl transition shadow-lg"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* BrowseView extracted to components/BrowseView.jsx */

function FavoritesView({ listings, onSelectListing }) {
  const [favorites, setFavorites] = useState([]);

  useEffect(() => {
    try {
      const rawFavorites = localStorage.getItem('favorites');
      if (rawFavorites) {
        const arr = JSON.parse(rawFavorites);
        if (Array.isArray(arr)) setFavorites(arr);
      }
    } catch {}
  }, []);

  const toggleFavorite = (listingId) => {
    setFavorites(prev => {
      const updated = prev.filter(id => id !== listingId);
      try {
        localStorage.setItem('favorites', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const favoriteListings = listings.filter(l => favorites.includes(l.id));

  return (
    <div className="p-4 min-h-screen bg-gradient-to-b from-slate-50 to-gray-100 pb-24">
      <div className="max-w-7xl mx-auto mt-8">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-3">
            <div className="w-14 h-14 bg-gradient-to-br from-rose-100 to-pink-100 rounded-2xl flex items-center justify-center shadow-sm">
              <Heart className="w-7 h-7 text-rose-500 fill-rose-500" />
            </div>
            <div>
              <h2 className="text-3xl font-extrabold text-gray-900">Saved Listings</h2>
              <p className="text-gray-600">
                {favoriteListings.length === 0
                  ? 'Your favorites will appear here'
                  : `${favoriteListings.length} saved ${favoriteListings.length === 1 ? 'listing' : 'listings'}`}
              </p>
            </div>
          </div>
        </div>

        {favoriteListings.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
            <div className="w-24 h-24 bg-gradient-to-br from-rose-50 to-pink-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Heart className="w-12 h-12 text-rose-300" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">No saved listings yet</h3>
            <p className="text-gray-500 text-sm mb-6 max-w-md mx-auto">
              Browse rooms and tap the heart icon to save your favorites. They'll appear here for easy access.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {favoriteListings.map(listing => {
              const ListingCard = require('./components/ListingCard').default;
              return (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  onClick={() => onSelectListing(listing)}
                  isFavorite={true}
                  onToggleFavorite={toggleFavorite}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const createDefaultListingForm = () => ({
  title: '',
  price: '',
  location: '',
  streetAddress: '',
  description: '',
  photos: [],
  status: 'available',
  availableDate: new Date().toISOString().split('T')[0],
  amenities: [],
  latitude: null,
  longitude: null,
  paymentMethod: 'Bank and Cash',
  roomType: 'private',
  leaseDuration: '7-12',
  petFriendly: false,
  genderPreference: 'any',
  premium: false
});

function AddListingView({ onSubmit, onCancel, currentUser, userType, onRequireAuth, onRequireOnboarding }) {
  const GEOCODER_KEY = process.env.REACT_APP_GEOCODER_API_KEY;
  const GEOCODER_PROVIDER = (process.env.REACT_APP_GEOCODER_PROVIDER || '').toLowerCase();

  const landlordId = currentUser?.id;
  const [formData, setFormData] = useState(() => {
    const base = createDefaultListingForm();
    if (landlordId) {
      const saved = loadListingTemplate(landlordId);
      if (saved) {
        return {
          ...base,
          ...saved,
          amenities: Array.isArray(saved.amenities) ? saved.amenities : base.amenities,
          petFriendly: saved.petFriendly ?? base.petFriendly,
          premium: saved.premium ?? base.premium,
          photos: []
        };
      }
    }
    return base;
  });
  const [geocodingStatus, setGecodingStatus] = useState('');
  const [errors, setErrors] = useState({});
  const [showPhotoEditor, setShowPhotoEditor] = useState(false);
  const reverseGeocodeCacheRef = React.useRef({});
  const [lastGeocodeSource, setLastGeocodeSource] = useState(null); // 'cached' | 'mapbox' | 'proxy' | 'direct' | 'coords-only' | 'manual-geocode'
  const [fullAddressInput, setFullAddressInput] = useState('');
  const [isFullAddressEditing, setIsFullAddressEditing] = useState(false);

  useEffect(() => {
    if (!landlordId) return;
    const saved = loadListingTemplate(landlordId);
    if (saved) {
      setFormData(prev => ({
        ...prev,
        ...saved,
        amenities: Array.isArray(saved.amenities) ? saved.amenities : [],
        petFriendly: saved.petFriendly ?? false,
        premium: saved.premium ?? false,
        photos: []
      }));
    } else {
      setFormData(createDefaultListingForm());
    }
  }, [landlordId]);

  useEffect(() => {
    if (!landlordId || userType !== 'landlord') return;
    saveListingTemplate(landlordId, formData);
  }, [formData, landlordId, userType]);

  // Warn user before leaving if form has unsaved data
  useEffect(() => {
    const hasFormData = formData.title || formData.description || formData.photos?.length > 0;
    
    const handleBeforeUnload = (e) => {
      if (hasFormData) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };
    
    if (hasFormData) {
      window.addEventListener('beforeunload', handleBeforeUnload);
    }
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [formData.title, formData.description, formData.photos]);

  // Helper: fetch with graceful fallbacks when third-party APIs lack CORS headers
  const corsFallbackTransforms = useMemo(() => [
    (url) => url.startsWith('https://cors.isomorphic-git.org/') ? url : `https://cors.isomorphic-git.org/${url}`,
    (url) => url.startsWith('https://corsproxy.io/?') ? url : `https://corsproxy.io/?${encodeURIComponent(url)}`
  ], []);

  const fetchWithCorsFallback = useCallback(async (url, options = {}) => {
    const cloneOptions = () => {
      const base = { ...options };
      if (options.headers) base.headers = { ...options.headers };
      return base;
    };

    const attempt = async (targetUrl) => {
      const resp = await fetch(targetUrl, cloneOptions());
      if (!resp.ok) throw new Error(`Request failed with status ${resp.status}`);
      return resp;
    };

    try {
      return await attempt(url);
    } catch (err) {
      if (options.signal?.aborted) throw err;
      let lastError = err;
      for (const transform of corsFallbackTransforms) {
        try {
          const proxiedUrl = transform(url);
          return await attempt(proxiedUrl);
        } catch (proxyErr) {
          lastError = proxyErr;
          if (options.signal?.aborted) break;
        }
      }
      throw lastError;
    }
  }, [corsFallbackTransforms]);

  // Forward geocode helper for manual address lookups
  const forwardGeocodeAddress = async (query) => {
    if (!query || query.trim().length < 3) return [];

    // 1. Mapbox (if configured)
    if (GEOCODER_PROVIDER === 'mapbox' && GEOCODER_KEY) {
      try {
        const resp = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${GEOCODER_KEY}&limit=3&country=za&types=address,place,locality`);
        const data = await resp.json();
        if (data?.features?.length) {
          return data.features.map(f => ({
            lat: f.center ? f.center[1] : f.geometry?.coordinates?.[1],
            lon: f.center ? f.center[0] : f.geometry?.coordinates?.[0],
            label: f.place_name || f.text,
            source: 'mapbox'
          })).filter(entry => typeof entry.lat === 'number' && typeof entry.lon === 'number');
        }
      } catch (err) {
        console.warn('Mapbox forward geocode failed', err);
      }
    }

    // 2. maps.co (CORS-friendly)
    try {
      const mapsResp = await fetch(`https://geocode.maps.co/search?q=${encodeURIComponent(query)}&limit=3`);
      if (mapsResp.ok) {
        const mapsData = await mapsResp.json();
        if (Array.isArray(mapsData) && mapsData.length) {
          return mapsData.slice(0, 3).map(entry => ({
            lat: parseFloat(entry.lat),
            lon: parseFloat(entry.lon),
            label: entry.display_name || entry.name,
            source: 'maps.co'
          }));
        }
      }
    } catch (mapsErr) {
      console.warn('maps.co forward geocode failed', mapsErr);
    }

    // 3. Local proxy (if running)
    const API_BASE = (process.env.REACT_APP_PROXY_BASE || (window.location && window.location.port === '8443' ? 'https://localhost:4443' : ''));
    if (API_BASE) {
      try {
        const proxyResp = await fetch(`${API_BASE}/api/search?q=${encodeURIComponent(query)}`);
        if (proxyResp.ok) {
          const proxyData = await proxyResp.json();
          if (Array.isArray(proxyData) && proxyData.length) {
            return proxyData.slice(0, 3).map(entry => ({
              lat: parseFloat(entry.lat),
              lon: parseFloat(entry.lon),
              label: entry.display_name,
              source: API_BASE.includes('localhost') ? 'local-proxy' : 'proxy'
            }));
          }
        }
      } catch (proxyErr) {
        console.warn('Local proxy forward geocode failed', proxyErr);
      }
    }

    // 4. Direct Nominatim fallback (may still be blocked, but last resort)
    try {
      const directResp = await fetchWithCorsFallback(`https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&q=${encodeURIComponent(query)}`, {
        headers: {
          'User-Agent': 'room-rental-platform/1.0 (direct fallback)',
          'Accept': 'application/json'
        }
      });
      if (directResp.ok) {
        const directData = await directResp.json();
        if (Array.isArray(directData) && directData.length) {
          return directData.slice(0, 3).map(entry => ({
            lat: parseFloat(entry.lat),
            lon: parseFloat(entry.lon),
            label: entry.display_name,
            source: 'direct'
          }));
        }
      }
    } catch (directErr) {
      console.warn('Direct nominatim forward geocode failed', directErr);
    }

    return [];
  };

  const availableAmenities = [
    'WiFi', 'Parking', 'Kitchen', 'Laundry', 'Air Conditioning', 
    'Heating', 'TV', 'Furnished', 'Pet Friendly', 'Garden'
  ];

  const validateField = (name, value, extras = {}) => {
    const newErrors = { ...errors };
    
    switch (name) {
      case 'title':
        if (!value || value.trim().length < 5) {
          newErrors.title = 'Title must be at least 5 characters';
        } else {
          delete newErrors.title;
        }
        break;
      case 'price':
        if (!value || parseFloat(value) <= 0) {
          newErrors.price = 'Price must be greater than 0';
        } else if (parseFloat(value) < 500) {
          newErrors.price = 'Price seems too low (minimum R500)';
        } else if (parseFloat(value) > 50000) {
          newErrors.price = 'Price seems too high (maximum R50,000)';
        } else {
          delete newErrors.price;
        }
        break;
      case 'location': {
        const streetText = (extras.streetAddress ?? formData.streetAddress ?? '').trim();
        const areaText = (extras.location ?? value ?? '').trim();
        if (!streetText || streetText.length < 3) {
          newErrors.location = 'Add the street or stand number (e.g., 5170 Molefe St)';
        } else if (!areaText || areaText.length < 3) {
          newErrors.location = 'Add the suburb, city, and postal code (e.g., Ivory Park, Midrand, 1693)';
        } else {
          delete newErrors.location;
        }
        break;
      }
      case 'description':
        if (value && value.length > 500) {
          newErrors.description = 'Description is too long (max 500 characters)';
        } else {
          delete newErrors.description;
        }
        break;
      default:
        break;
    }
    
    setErrors(newErrors);
  };

  

  // Load persisted reverse geocode cache
  useEffect(() => {
    try {
      const raw = localStorage.getItem('reverse-geocode-cache');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          reverseGeocodeCacheRef.current = parsed;
        }
      }
    } catch (e) { /* ignore */ }
  }, []);

  // Geocode address using Nominatim (OpenStreetMap)
  const geocodeAddress = async () => {
    if (!formData.streetAddress) {
      setGecodingStatus('Please enter a street address');
      return;
    }
    
    setGecodingStatus('Finding coordinates...');
    try {
      const fullAddress = `${formData.streetAddress}, ${formData.location}, South Africa`;
      const results = await forwardGeocodeAddress(fullAddress);

      if (results.length > 0) {
        const best = results[0];
        setFormData({ 
          ...formData, 
          latitude: parseFloat(best.lat), 
          longitude: parseFloat(best.lon) 
        });
        setGecodingStatus(`✓ Address found!`);
        setTimeout(() => setGecodingStatus(''), 2000);
        setLastGeocodeSource(best.source || 'manual-geocode');
        return;
      }

      setGecodingStatus('Address not found. Trying with area only...');
      const areaResults = await forwardGeocodeAddress(`${formData.location}, South Africa`);
      if (areaResults.length > 0) {
        const bestArea = areaResults[0];
        setFormData({ 
          ...formData, 
          latitude: parseFloat(bestArea.lat), 
          longitude: parseFloat(bestArea.lon) 
        });
        setGecodingStatus('✓ Area found!');
        setTimeout(() => setGecodingStatus(''), 2000);
        setLastGeocodeSource(bestArea.source || 'manual-geocode');
      } else {
        setGecodingStatus('Could not find location');
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      setGecodingStatus('Error finding address. Check your connection.');
      setLastGeocodeSource(null);
    }
  };

  const toggleAmenity = (amenity) => {
    if (formData.amenities.includes(amenity)) {
      setFormData({ ...formData, amenities: formData.amenities.filter(a => a !== amenity) });
    } else {
      setFormData({ ...formData, amenities: [...formData.amenities, amenity] });
    }
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    // Enforce auth and onboarding checks before allowing submission
    if (!currentUser) {
      onRequireAuth && onRequireAuth('landlord');
      return;
    }
    if (userType !== 'landlord') {
      // prompt to become landlord
      onRequireAuth && onRequireAuth('landlord');
      return;
    }
    if (!currentUser.landlordComplete) {
      // send to onboarding
      onRequireOnboarding && onRequireOnboarding();
      return;
    }

    // Validate all fields
    validateField('title', formData.title);
    validateField('price', formData.price);
    validateField('location', formData.location, {
      location: formData.location,
      streetAddress: formData.streetAddress
    });
    validateField('description', formData.description);

    if (!formData.title || formData.title.trim().length < 5) {
      setErrors(prev => ({ ...prev, title: 'Title must be at least 5 characters' }));
      return;
    }
    if (!formData.price || parseFloat(formData.price) <= 0) {
      setErrors(prev => ({ ...prev, price: 'Price must be greater than 0' }));
      return;
    }
    if (!formData.location || formData.location.trim().length < 3) {
      setErrors(prev => ({ ...prev, location: 'Location is required' }));
      return;
    }
    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  const googleMapsQuery = [formData.streetAddress, formData.location, 'South Africa']
    .filter(Boolean)
    .join(', ');
  const googleMapsUrl = googleMapsQuery
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(googleMapsQuery)}`
    : '';
  const combinedFormAddress = [formData.streetAddress, formData.location]
    .map(part => (part || '').trim())
    .filter(Boolean)
    .join(', ');

  useEffect(() => {
    if (isFullAddressEditing) return;
    setFullAddressInput(prev => (prev === combinedFormAddress ? prev : combinedFormAddress));
  }, [combinedFormAddress, isFullAddressEditing]);

  const handleFullAddressChange = (value) => {
    setFullAddressInput(value);
    if (!value || value.length < 3) {
      setFormData(prev => ({ ...prev, streetAddress: '', location: '' }));
      validateField('location', '');
      return;
    }

    const parts = value
      .split(',')
      .map(part => part.trim())
      .filter(Boolean);

    if (parts.length === 0) {
      setFormData(prev => ({ ...prev, streetAddress: '', location: '' }));
      validateField('location', '');
      return;
    }

    let street = parts[0] || '';
    let derivedLocation = parts.slice(1).join(', ');

    if (!derivedLocation) {
      const words = street.split(/\s+/).filter(Boolean);
      if (words.length >= 4) {
        // Guess that the last few tokens describe the suburb/city/postal portion.
        const locationWordCount = Math.min(4, Math.ceil(words.length / 2));
        derivedLocation = words.slice(-locationWordCount).join(' ');
        street = words.slice(0, words.length - locationWordCount).join(' ');
      } else {
        derivedLocation = street;
      }
    }

    setFormData(prev => ({
      ...prev,
      streetAddress: street,
      location: derivedLocation
    }));
    validateField('location', derivedLocation || street, {
      location: derivedLocation,
      streetAddress: street
    });
  };

  const handleResetSavedTemplate = () => {
    if (!landlordId) return;
    clearListingTemplate(landlordId);
    const blank = createDefaultListingForm();
    setFormData(blank);
    setFullAddressInput('');
  };

  return (
    <div className="p-4 bg-gradient-to-b from-slate-50 to-gray-100 min-h-screen pb-24">
      <div className="max-w-3xl mx-auto mt-8">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-extrabold text-gray-900">Post a Room</h2>
            <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-full hover:bg-gray-100">
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Progress Indicator */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-600">Form Progress</span>
              <span className="text-sm font-semibold text-teal-600">
                {(() => {
                  let completed = 0;
                  const total = 5;
                  if (formData.title && formData.title.trim().length >= 5) completed++;
                  if (formData.price && parseFloat(formData.price) >= 500) completed++;
                  if (formData.streetAddress && formData.location) completed++;
                  if (formData.description && formData.description.length >= 10) completed++;
                  if (formData.photos && formData.photos.length > 0) completed++;
                  return `${completed}/${total} completed`;
                })()}
              </span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full transition-all duration-500"
                style={{
                  width: `${(() => {
                    let completed = 0;
                    if (formData.title && formData.title.trim().length >= 5) completed++;
                    if (formData.price && parseFloat(formData.price) >= 500) completed++;
                    if (formData.streetAddress && formData.location) completed++;
                    if (formData.description && formData.description.length >= 10) completed++;
                    if (formData.photos && formData.photos.length > 0) completed++;
                    return (completed / 5) * 100;
                  })()}%`
                }}
              />
            </div>
          </div>

          <div className="space-y-6">
            {currentUser?.type === 'landlord' && (
              <div className="bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-200 text-teal-800 text-sm rounded-xl p-4 flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-teal-600 mt-0.5" />
                <div className="space-y-2">
                  <p>
                    We remember your latest listing details (address, price, and more) so you only need to upload fresh photos next time.
                    Update any field below and we'll save it automatically.
                  </p>
                  <button
                    type="button"
                    onClick={handleResetSavedTemplate}
                    className="text-xs font-semibold text-teal-700 underline hover:text-teal-900 transition-colors"
                  >
                    Reset saved info
                  </button>
                </div>
              </div>
            )}
            {/* Title */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                Room Title *
                {formData.title && formData.title.trim().length >= 5 && !errors.title && (
                  <span className="ml-2 text-green-600 text-xs">✓ Looks good</span>
                )}
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => {
                    setFormData({ ...formData, title: e.target.value });
                    validateField('title', e.target.value);
                  }}
                  onBlur={(e) => validateField('title', e.target.value)}
                  placeholder="e.g., Cozy backroom with private bathroom"
                  className={`w-full px-4 py-3 pr-10 border-2 ${
                    errors.title ? 'border-red-400 bg-red-50' : 
                    formData.title && formData.title.trim().length >= 5 ? 'border-teal-400 bg-teal-50/30' : 
                    'border-gray-200'
                  } text-gray-800 rounded-xl focus:ring-2 ${
                    errors.title ? 'focus:ring-red-400' : 'focus:ring-teal-400'
                  } focus:border-transparent transition-all placeholder-gray-400`}
                />
                {formData.title && formData.title.trim().length >= 5 && !errors.title && (
                  <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-teal-600" />
                )}
              </div>
              {errors.title && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><span>⚠</span> {errors.title}</p>}
            </div>

            {/* Price */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                Monthly Price (R) *
                {formData.price && parseFloat(formData.price) >= 500 && parseFloat(formData.price) <= 50000 && !errors.price && (
                  <span className="ml-2 text-green-600 text-xs">✓ Valid price</span>
                )}
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">R</span>
                <input
                  type="number"
                  required
                  value={formData.price}
                  onChange={(e) => {
                    setFormData({ ...formData, price: e.target.value });
                    validateField('price', e.target.value);
                  }}
                  onBlur={(e) => validateField('price', e.target.value)}
                  placeholder="2500"
                  min="500"
                  max="50000"
                  className={`w-full pl-10 pr-4 py-3 border-2 ${
                    errors.price ? 'border-red-400 bg-red-50' : 
                    formData.price && parseFloat(formData.price) >= 500 && parseFloat(formData.price) <= 50000 ? 'border-teal-400 bg-teal-50/30' : 
                    'border-gray-200'
                  } text-gray-800 rounded-xl focus:ring-2 ${
                    errors.price ? 'focus:ring-red-400' : 'focus:ring-teal-400'
                  } focus:border-transparent transition-all placeholder-gray-400`}
                />
                {formData.price && parseFloat(formData.price) >= 500 && parseFloat(formData.price) <= 50000 && !errors.price && (
                  <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-teal-600" />
                )}
              </div>
              {errors.price && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><span>⚠</span> {errors.price}</p>}
              {!errors.price && formData.price && (
                <p className="text-gray-500 text-xs mt-1">Suggested range: R500 - R50,000 per month</p>
              )}
            </div>

            {/* Full Address */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">Full South African Address *</label>
              <p className="text-xs text-gray-500 mb-2">Example: 5170 Molefe St, Ivory Park, Midrand, 1693</p>
              <textarea
                required
                rows="2"
                value={fullAddressInput}
                onChange={(e) => handleFullAddressChange(e.target.value)}
                onFocus={() => setIsFullAddressEditing(true)}
                onBlur={(e) => { setIsFullAddressEditing(false); handleFullAddressChange(e.target.value); }}
                placeholder="Type the full street + suburb + city + postal code"
                className={`w-full px-4 py-3 border-2 ${errors.location ? 'border-red-400' : 'border-gray-200'} bg-white text-gray-800 rounded-xl focus:ring-2 ${errors.location ? 'focus:ring-red-400' : 'focus:ring-teal-400'} focus:border-transparent transition placeholder-gray-400`}
              />
              {errors.location && <p className="text-red-500 text-xs mt-1" aria-live="assertive">{errors.location}</p>}
              {!errors.location && (
                <p className="text-gray-500 text-xs mt-1">
                  Include the street/stand number plus suburb, city, and postal code. Commas are optional; we will split it for you.
                </p>
              )}
            </div>

            {/* Geocode Section - Manual confirmation only */}
            <div className="bg-gradient-to-br from-teal-50 to-cyan-50 border-2 border-teal-200 rounded-xl p-6">
              <div className="flex items-start gap-3 mb-4">
                <MapPin className="w-6 h-6 text-teal-600 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-800 mb-1">Confirm Your Address</h3>
                  <p className="text-sm text-gray-600">
                    Type the exact street + suburb above, then tap <strong>Look Up Address</strong> if you0d like us to fetch coordinates for your Google Maps preview.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 items-start">
                <button
                  type="button"
                  onClick={geocodeAddress}
                  className="w-full md:w-auto bg-white hover:bg-gray-50 text-gray-700 border-2 border-gray-300 px-6 py-3 rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2"
                >
                  <MapPin className="w-4 h-4" />
                  Look Up Address
                </button>

                <div className="text-sm flex-1 min-w-[220px]">
                  {geocodingStatus && (
                    <span className={`${geocodingStatus.startsWith('✓') ? 'text-green-600 font-semibold' : geocodingStatus.startsWith('⚠️') ? 'text-amber-600' : 'text-gray-700'} flex items-center gap-1`}>
                      {geocodingStatus.startsWith('✓') && <CheckCircle className="w-4 h-4" />}
                      {geocodingStatus}
                      {lastGeocodeSource === 'cached' && (
                        <span className="ml-2 inline-block px-2 py-1 text-[10px] rounded bg-purple-100 text-purple-600 font-semibold">CACHED</span>
                      )}
                      {lastGeocodeSource === 'mapbox' && (
                        <span className="ml-2 inline-block px-2 py-1 text-[10px] rounded bg-blue-100 text-blue-600 font-semibold">MAPBOX</span>
                      )}
                      {lastGeocodeSource === 'maps.co' && (
                        <span className="ml-2 inline-block px-2 py-1 text-[10px] rounded bg-indigo-100 text-indigo-600 font-semibold">MAPS.CO</span>
                      )}
                      {lastGeocodeSource === 'proxy' && (
                        <span className="ml-2 inline-block px-2 py-1 text-[10px] rounded bg-green-100 text-green-600 font-semibold">PROXY</span>
                      )}
                      {lastGeocodeSource === 'direct' && (
                        <span className="ml-2 inline-block px-2 py-1 text-[10px] rounded bg-yellow-100 text-yellow-700 font-semibold">FALLBACK</span>
                      )}
                    </span>
                  )}
                  {formData.latitude && formData.longitude && !geocodingStatus && (
                    <span className="text-green-600 font-semibold flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" />
                      Coordinates saved: {formData.latitude.toFixed(4)}, {formData.longitude.toFixed(4)}
                      {lastGeocodeSource === 'cached' && (
                        <span className="ml-2 inline-block px-2 py-1 text-[10px] rounded bg-purple-100 text-purple-600 font-semibold">CACHED</span>
                      )}
                      {lastGeocodeSource === 'maps.co' && (
                        <span className="ml-2 inline-block px-2 py-1 text-[10px] rounded bg-indigo-100 text-indigo-600 font-semibold">MAPS.CO</span>
                      )}
                    </span>
                  )}
                  {googleMapsUrl && (
                    <div className="mt-3 bg-white border border-gray-200 rounded-lg p-3 text-xs text-gray-600">
                      <span className="block text-gray-800 font-semibold mb-1">Preview this address</span>
                      <a
                        href={googleMapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-teal-700 font-semibold hover:text-teal-900 underline"
                      >
                        <MapPin className="w-3 h-3" /> Open in Google Maps
                      </a>
                      <span className="block mt-2 text-[11px] text-gray-500">Renters will see the same button under your listing.</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-4 text-sm text-gray-600 bg-white border border-dashed border-gray-300 rounded-lg p-4">
                <p className="font-semibold text-gray-800 mb-1">Manual address confirmed</p>
                <p>We now rely on the address you type here. Use Google Maps above if you want to double-check directions.</p>
              </div>
            </div>

            {/* Status and Available Date - Two columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 bg-white text-gray-800 rounded-xl focus:ring-2 focus:ring-teal-400 focus:border-transparent transition"
                >
                  <option value="available">Available</option>
                  <option value="rented">Rented</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">Available Date</label>
                <input
                  type="date"
                  value={formData.availableDate}
                  onChange={(e) => setFormData({ ...formData, availableDate: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 bg-white text-gray-800 rounded-xl focus:ring-2 focus:ring-teal-400 focus:border-transparent transition"
                />
              </div>
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">Payment Method</label>
              <select
                value={formData.paymentMethod}
                onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 bg-white text-gray-800 rounded-xl focus:ring-2 focus:ring-teal-400 focus:border-transparent transition"
              >
                <option value="Bank and Cash">Bank and Cash</option>
                <option value="Cash Only">Cash Only</option>
                <option value="Bank Only">Bank Only</option>
              </select>
            </div>

            {/* Room Type and Lease Duration - Two columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">Room Type</label>
                <select
                  value={formData.roomType}
                  onChange={(e) => setFormData({ ...formData, roomType: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 bg-white text-gray-800 rounded-xl focus:ring-2 focus:ring-teal-400 focus:border-transparent transition"
                >
                  <option value="private">Private Room</option>
                  <option value="shared">Shared Room</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">Lease Duration (months)</label>
                <select
                  value={formData.leaseDuration}
                  onChange={(e) => setFormData({ ...formData, leaseDuration: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 bg-white text-gray-800 rounded-xl focus:ring-2 focus:ring-teal-400 focus:border-transparent transition"
                >
                  <option value="1-3">1-3 months</option>
                  <option value="4-6">4-6 months</option>
                  <option value="7-12">7-12 months</option>
                  <option value="12+">12+ months</option>
                </select>
              </div>
            </div>

            {/* Pet Friendly and Gender Preference */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.petFriendly}
                  onChange={(e) => setFormData({ ...formData, petFriendly: e.target.checked })}
                  id="petFriendly"
                  className="w-5 h-5 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                />
                <label htmlFor="petFriendly" className="text-sm font-medium text-gray-700">
                  🐾 Pet Friendly
                </label>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">Gender Preference</label>
                <select
                  value={formData.genderPreference}
                  onChange={(e) => setFormData({ ...formData, genderPreference: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 bg-white text-gray-800 rounded-xl focus:ring-2 focus:ring-teal-400 focus:border-transparent transition"
                >
                  <option value="any">Any</option>
                  <option value="male">Male Only</option>
                  <option value="female">Female Only</option>
                </select>
              </div>
            </div>

            {/* Premium Flag */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={!!formData.premium}
                onChange={(e) => setFormData({ ...formData, premium: e.target.checked })}
                id="premiumFlag"
              />
              <label htmlFor="premiumFlag" className="text-sm font-medium text-gray-700">
                Premium listing (highlight & priority sorting)
              </label>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                Description 
                {formData.description && (
                  <span className={`ml-2 text-xs ${formData.description.length > 500 ? 'text-red-500' : 'text-gray-500'}`}>
                    ({formData.description.length}/500 characters)
                  </span>
                )}
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => {
                  setFormData({ ...formData, description: e.target.value });
                  validateField('description', e.target.value);
                }}
                onBlur={(e) => validateField('description', e.target.value)}
                placeholder="Describe the room, amenities, rules, and any other details..."
                rows="4"
                className={`w-full px-4 py-3 border-2 ${errors.description ? 'border-red-400' : 'border-gray-200'} bg-white text-gray-800 rounded-xl focus:ring-2 ${errors.description ? 'focus:ring-red-400' : 'focus:ring-teal-400'} focus:border-transparent transition placeholder-gray-400`}
              />
              {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
            </div>

            {/* Amenities */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-3">Amenities</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {availableAmenities.map(amenity => (
                  <button
                    key={amenity}
                    type="button"
                    onClick={() => toggleAmenity(amenity)}
                    className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      formData.amenities.includes(amenity)
                        ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 border-2 border-gray-200 hover:border-teal-300 hover:bg-teal-50'
                    }`}
                  >
                    {amenity}
                  </button>
                ))}
              </div>
            </div>

            {/* Photos */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">Photos (Max 5)</label>
              <div 
                className="relative border-2 border-dashed border-gray-300 bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl p-6 hover:border-teal-400 hover:bg-teal-50/30 transition-all duration-300 cursor-pointer group"
                onClick={() => setShowPhotoEditor(true)}
              >
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-teal-100 to-cyan-100 rounded-2xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform duration-300">
                    <span className="text-3xl">📷</span>
                  </div>
                  <p className="text-gray-700 font-semibold mb-1">
                    {formData.photos.length === 0 ? 'Add Photos' : `${formData.photos.length}/5 Photos Added`}
                  </p>
                  <p className="text-xs text-gray-500">
                    Click to upload • JPG, PNG up to 5MB each
                  </p>
                  {formData.photos.length === 0 && (
                    <p className="text-xs text-teal-600 mt-2 font-medium">
                      Tip: Listings with photos get 3x more views!
                    </p>
                  )}
                </div>
              </div>
              {formData.photos.length > 0 && (
                <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
                  {formData.photos.map((photo, index) => (
                    <div key={index} className="relative group">
                      {index === 0 && (
                        <div className="absolute top-2 left-2 bg-gradient-to-r from-teal-500 to-cyan-500 text-white text-xs px-2 py-1 rounded-full font-semibold z-10">
                          Cover
                        </div>
                      )}
                      <img 
                        src={photo} 
                        alt={`Preview ${index + 1}`} 
                        className="w-full h-32 object-cover rounded-xl border-2 border-gray-200 shadow-sm" 
                      />
                    </div>
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={() => setShowPhotoEditor(true)}
                className="mt-3 text-sm text-teal-600 hover:text-teal-700 font-medium"
              >
                {formData.photos.length > 0 ? '✏️ Edit Photos' : ''}
              </button>
            </div>

            {showPhotoEditor && (
              <PhotoEditor
                photos={formData.photos}
                onPhotosChange={(newPhotos) => setFormData({ ...formData, photos: newPhotos })}
                onClose={() => setShowPhotoEditor(false)}
                maxPhotos={5}
              />
            )}

            {/* Submit Button */}
            <div className="border-t border-gray-200 pt-6">
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || Object.keys(errors).length > 0}
                className={`w-full font-semibold py-3.5 rounded-xl transition-all shadow-lg relative ${
                  isSubmitting || Object.keys(errors).length > 0
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white hover:shadow-xl hover:shadow-teal-500/25'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <span className="opacity-0">Post Room</span>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                  </>
                ) : (
                  'Post Room'
                )}
              </button>
              {Object.keys(errors).length > 0 && (
                <p className="text-red-500 text-xs mt-2 text-center">Please fix the errors above before submitting</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// MessagesView removed - using direct contact instead

function MyListingsView({ listings, onDelete }) {
  return (
    <div className="p-4 min-h-screen bg-gradient-to-b from-slate-50 to-gray-100 pb-24">
      <div className="max-w-7xl mx-auto mt-8">
        {/* Landlord reminder banner */}
        {listings.length > 0 && (
          <div className="mb-6 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-amber-800 mb-1">Found a tenant?</h3>
                <p className="text-amber-700 text-sm leading-relaxed">
                  Remember to <span className="font-medium">delete your listing</span> once you've found a tenant. 
                  This will stop new calls and messages from other renters looking at your ad.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="mb-8">
          <div className="flex items-center gap-4 mb-3">
            <div className="w-14 h-14 bg-gradient-to-br from-teal-100 to-cyan-100 rounded-2xl flex items-center justify-center shadow-sm">
              <Home className="w-7 h-7 text-teal-600" />
            </div>
            <div>
              <h2 className="text-3xl font-extrabold text-gray-900">My Listings</h2>
              <p className="text-gray-600">
                {listings.length === 0
                  ? 'Your properties will appear here'
                  : `${listings.length} active ${listings.length === 1 ? 'listing' : 'listings'}`}
              </p>
            </div>
          </div>
        </div>

        {listings.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
            <div className="w-24 h-24 bg-gradient-to-br from-teal-50 to-cyan-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Home className="w-12 h-12 text-teal-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">No Listings Yet</h3>
            <p className="text-gray-500 text-sm mb-6 max-w-md mx-auto">
              Start earning by posting your first room. It only takes a few minutes!
            </p>
            <button
              onClick={() => window.location.hash = '#add'}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white font-semibold px-6 py-3 rounded-xl transition-all shadow-md hover:shadow-lg"
            >
              <PlusCircle className="w-5 h-5" />
              Post Your First Room
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map(listing => (
              <div key={listing.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                {listing.photos && listing.photos.length > 0 && (
                  <div className="relative">
                    <img src={listing.photos[0]} alt="Room" className="w-full h-48 object-cover" />
                    {listing.photos.length > 1 && (
                      <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-white px-2.5 py-1 rounded-full text-xs font-medium">
                        {listing.photos.length} photos
                      </div>
                    )}
                    <div className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-semibold ${
                      listing.status === 'available' 
                        ? 'bg-emerald-500 text-white' 
                        : 'bg-gray-500 text-white'
                    }`}>
                      {listing.status === 'available' ? 'Active' : 'Rented'}
                    </div>
                  </div>
                )}
                <div className="p-5">
                  <h3 className="font-bold text-lg text-gray-900 mb-1 line-clamp-1">{listing.title}</h3>
                  <div className="text-teal-600 font-bold text-xl mb-2">R{listing.price?.toLocaleString()}/month</div>
                  <div className="flex items-center text-gray-500 text-sm mb-4">
                    <MapPin className="w-4 h-4 mr-1.5 text-gray-400" />
                    <span className="line-clamp-1">{listing.location}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onDelete(listing.id)}
                      className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 font-medium py-2.5 rounded-xl transition-colors text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


// Inline message box component with validation for listing detail view
// ListingInlineMessageBox removed

// ConversationModal removed

function AuthModal({ defaultType = 'renter', defaultMode = 'signin', onClose, onSuccess, authFunctions }) {
  const [mode, setMode] = useState(defaultMode); // 'signin', 'signup', 'reset'
  const [form, setForm] = useState({ 
    name: '', 
    email: '', 
    password: '',
    confirmPassword: '',
    phone: '',
    type: defaultType 
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState('');
  const [resetSent, setResetSent] = useState(false);

  const validateForm = () => {
    const newErrors = {};
    
    if (mode === 'signup') {
      if (!form.name || form.name.trim().length < 2) {
        newErrors.name = 'Name must be at least 2 characters';
      }
    }
    
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (mode !== 'reset') {
      if (!form.password || form.password.length < 6) {
        newErrors.password = 'Password must be at least 6 characters';
      }
    }
    
    if (mode === 'signup' && form.password !== form.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    setAuthError('');
    
    try {
      if (mode === 'signup') {
        await authFunctions.signUp(form.email, form.password, form.name, form.type);
        onSuccess?.();
        onClose();
      } else if (mode === 'signin') {
        await authFunctions.signIn(form.email, form.password);
        onSuccess?.();
        onClose();
      } else if (mode === 'reset') {
        await authFunctions.sendPasswordReset(form.email);
        setResetSent(true);
      }
    } catch (err) {
      console.error('Auth error:', err);
      let errorMessage = 'An error occurred. Please try again.';
      if (err.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already registered. Please sign in instead.';
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address format.';
      } else if (err.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Please use at least 6 characters.';
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        errorMessage = 'Invalid email or password. Please check and try again.';
      } else if (err.code === 'auth/too-many-requests') {
        errorMessage = 'Too many attempts. Please try again later.';
      } else if (err.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your connection.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      setAuthError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    setAuthError('');
    
    try {
      await authFunctions.signInGoogle(form.type);
      onSuccess?.();
      onClose();
    } catch (err) {
      setAuthError(err.message || 'Google sign-in failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-start sm:items-center justify-center p-4 pt-16 sm:pt-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-md p-8 my-auto shadow-2xl fade-in border border-gray-100">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
                <Home className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-extrabold">
                <span className="bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">Room</span>
                <span className="text-rose-500">24</span>
              </span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mt-4">
              {mode === 'signin' && 'Welcome back!'}
              {mode === 'signup' && 'Create your account'}
              {mode === 'reset' && 'Reset password'}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {mode === 'signin' && 'Sign in to continue'}
              {mode === 'signup' && 'Join Room24 today'}
              {mode === 'reset' && "We'll send you a reset link"}
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Auth Error */}
        {authError && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            {authError}
          </div>
        )}

        {/* Reset Success Message */}
        {resetSent && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm flex items-center gap-2">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            Password reset email sent! Check your inbox.
          </div>
        )}

        <div className="space-y-4">
          {/* Google Sign In Button */}
          {(mode === 'signin' || mode === 'signup') && (
            <>
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-gray-200 hover:border-gray-300 rounded-xl transition-all hover:bg-gray-50 font-medium text-gray-700"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500">or use email</span>
                </div>
              </div>
            </>
          )}

          {/* Reset Mode */}
          {mode === 'reset' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Email *</label>
              <input 
                type="email" 
                value={form.email} 
                onChange={(e) => { setForm({ ...form, email: e.target.value }); setErrors({ ...errors, email: '' }); setAuthError(''); }}
                className={`w-full px-4 py-3 border-2 rounded-xl transition-all focus:ring-2 focus:ring-teal-100 focus:border-teal-500 ${
                  errors.email ? 'border-rose-400 bg-rose-50' : 'border-gray-200 hover:border-gray-300'
                }`}
                placeholder="john@example.com"
              />
              {errors.email && <p className="text-rose-500 text-xs mt-1.5 flex items-center gap-1"><span>⚠</span>{errors.email}</p>}
            </div>
          )}

          {/* Email/Password Form (signin/signup) */}
          {(mode === 'signin' || mode === 'signup') && (
            <>
              {/* Name (signup only) */}
              {mode === 'signup' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Full name *</label>
                  <input 
                    type="text" 
                    value={form.name} 
                    onChange={(e) => { setForm({ ...form, name: e.target.value }); setErrors({ ...errors, name: '' }); }}
                    className={`w-full px-4 py-3 border-2 rounded-xl transition-all focus:ring-2 focus:ring-teal-100 focus:border-teal-500 ${
                      errors.name ? 'border-rose-400 bg-rose-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                    placeholder="John Doe"
                  />
                  {errors.name && <p className="text-rose-500 text-xs mt-1.5 flex items-center gap-1"><span>⚠</span>{errors.name}</p>}
                </div>
              )}

              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Email *</label>
                <input 
                  type="email" 
                  value={form.email} 
                  onChange={(e) => { setForm({ ...form, email: e.target.value }); setErrors({ ...errors, email: '' }); setAuthError(''); }}
                  className={`w-full px-4 py-3 border-2 rounded-xl transition-all focus:ring-2 focus:ring-teal-100 focus:border-teal-500 ${
                    errors.email ? 'border-rose-400 bg-rose-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                  placeholder="john@example.com"
                />
                {errors.email && <p className="text-rose-500 text-xs mt-1.5 flex items-center gap-1"><span>⚠</span>{errors.email}</p>}
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Password *</label>
                <input 
                  type="password" 
                  value={form.password} 
                  onChange={(e) => { setForm({ ...form, password: e.target.value }); setErrors({ ...errors, password: '' }); setAuthError(''); }}
                  className={`w-full px-4 py-3 border-2 rounded-xl transition-all focus:ring-2 focus:ring-teal-100 focus:border-teal-500 ${
                    errors.password ? 'border-rose-400 bg-rose-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                  placeholder="••••••••"
                />
                {errors.password && <p className="text-rose-500 text-xs mt-1.5 flex items-center gap-1"><span>⚠</span>{errors.password}</p>}
              </div>

              {/* Confirm Password (signup only) */}
              {mode === 'signup' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Confirm Password *</label>
                  <input 
                    type="password" 
                    value={form.confirmPassword} 
                    onChange={(e) => { setForm({ ...form, confirmPassword: e.target.value }); setErrors({ ...errors, confirmPassword: '' }); }}
                    className={`w-full px-4 py-3 border-2 rounded-xl transition-all focus:ring-2 focus:ring-teal-100 focus:border-teal-500 ${
                      errors.confirmPassword ? 'border-rose-400 bg-rose-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                    placeholder="••••••••"
                  />
                  {errors.confirmPassword && <p className="text-rose-500 text-xs mt-1.5 flex items-center gap-1"><span>⚠</span>{errors.confirmPassword}</p>}
                </div>
              )}

              {/* User Type (signup only) */}
              {mode === 'signup' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">I am a</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, type: 'renter' })}
                      className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${
                        form.type === 'renter' 
                          ? 'border-teal-500 bg-gradient-to-br from-teal-50 to-cyan-50 text-teal-700 shadow-md' 
                          : 'border-gray-200 hover:border-gray-300 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <Search className={`w-5 h-5 ${form.type === 'renter' ? 'text-teal-500' : ''}`} />
                      <span className="text-xs font-semibold">Looking for a room</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, type: 'landlord' })}
                      className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${
                        form.type === 'landlord' 
                          ? 'border-rose-500 bg-gradient-to-br from-rose-50 to-pink-50 text-rose-700 shadow-md' 
                          : 'border-gray-200 hover:border-gray-300 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <Home className={`w-5 h-5 ${form.type === 'landlord' ? 'text-rose-500' : ''}`} />
                      <span className="text-xs font-semibold">Listing rooms</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Forgot Password Link (signin only) */}
              {mode === 'signin' && (
                <button
                  type="button"
                  onClick={() => { setMode('reset'); setAuthError(''); setResetSent(false); }}
                  className="text-sm text-teal-600 hover:text-teal-700 font-medium"
                >
                  Forgot your password?
                </button>
              )}
            </>
          )}

          {/* Submit Button */}
          <button 
            id="phone-sign-in-button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className={`w-full font-bold py-3 rounded-xl transition-all relative ${
              isSubmitting 
                ? 'bg-teal-400 cursor-not-allowed' 
                : 'bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white shadow-lg hover:shadow-xl hover:shadow-teal-500/25'
            }`}
          >
            {isSubmitting ? (
              <>
                <span className="opacity-0">Submit</span>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              </>
            ) : (
              <>
                {mode === 'signin' && 'Sign In'}
                {mode === 'signup' && 'Create Account'}
                {mode === 'reset' && 'Send Reset Link'}
              </>
            )}
          </button>

          {/* Toggle Mode */}
          <div className="text-center text-sm text-gray-600">
            {mode === 'signin' && (
              <>
                Don't have an account?{' '}
                <button 
                  onClick={() => { setMode('signup'); setAuthError(''); }} 
                  className="text-teal-600 hover:text-teal-700 font-semibold"
                >
                  Sign up
                </button>
              </>
            )}
            {mode === 'signup' && (
              <>
                Already have an account?{' '}
                <button 
                  onClick={() => { setMode('signin'); setAuthError(''); }} 
                  className="text-teal-600 hover:text-teal-700 font-semibold"
                >
                  Sign in
                </button>
              </>
            )}
            {mode === 'reset' && (
              <button 
                onClick={() => { setMode('signin'); setAuthError(''); setResetSent(false); }} 
                className="text-teal-600 hover:text-teal-700 font-semibold"
              >
                ← Back to sign in
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-xs text-gray-400 text-center mt-6">
          By continuing, you agree to our <button className="text-teal-600 hover:underline">Terms of Service</button> and <button className="text-teal-600 hover:underline">Privacy Policy</button>
        </p>
      </div>
    </div>
  );
}

function BottomNav({ currentView, setCurrentView, userType }) {
  const navItems = [
    { id: 'browse', label: 'Browse', icon: <Search className="w-5 h-5" />, activeColor: 'teal' },
    { id: 'add', label: 'List', icon: <PlusCircle className="w-5 h-5" />, requiresLandlord: true, activeColor: 'rose' },
    { id: 'favorites', label: 'Saved', icon: <Heart className="w-5 h-5" />, activeColor: 'rose' },
    { id: 'profile', label: 'Profile', icon: <User className="w-5 h-5" />, activeColor: 'blue' }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-100 px-4 py-2 z-20 md:hidden safe-area-bottom">
      <div className="grid grid-cols-4 gap-1 max-w-md mx-auto">
        {navItems.map(item => {
          const disabled = item.requiresLandlord && userType !== 'landlord';
          const isActive = currentView === item.id;
          const colorClasses = {
            teal: 'text-teal-600 bg-teal-50',
            rose: 'text-rose-600 bg-rose-50',
            blue: 'text-blue-600 bg-blue-50'
          };
          return (
            <button
              key={item.id}
              type="button"
              disabled={disabled}
              onClick={() => !disabled && setCurrentView(item.id)}
              className={`flex flex-col items-center gap-0.5 py-2 px-1 rounded-xl transition-all duration-200 ${
                disabled 
                  ? 'opacity-40 cursor-not-allowed' 
                  : 'active:scale-95'
              } ${
                isActive 
                  ? `${colorClasses[item.activeColor]} font-semibold` 
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span className={`transition-transform duration-200 ${isActive ? 'scale-110' : ''}`}>
                {item.icon}
              </span>
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}