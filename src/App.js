import React, { useState, useEffect, useMemo, useCallback, useRef, Suspense } from 'react';
import { Home, PlusCircle, Search, MapPin, X, User, Phone, Mail, Edit, CheckCircle, Heart, Calendar, Bell, AlertTriangle, LogOut, Link2, Download, Smartphone, Sparkles, TrendingUp, ShieldCheck, ChevronDown, ArrowLeft, RefreshCw, AlertCircle } from 'lucide-react';
import Header from './components/Header';
import Footer from './components/Footer';
import BrowseView from './components/BrowseView';
import NotificationBanner from './components/NotificationBanner';
import OfflineIndicator from './components/OfflineIndicator';
import BackToTop from './components/BackToTop';
import TurnstileWidget from './components/TurnstileWidget';
import { getNotifications } from './utils/notificationEngine';
import { loadListingTemplate, saveListingTemplate, clearListingTemplate } from './utils/listingTemplateStorage';
import { 
  fetchAllListings, 
  createListing, 
  deleteListing as supabaseDeleteListing,
  updateListing as supabaseUpdateListing,
  subscribeToListings,
  // Auth functions from Supabase
  signUpWithEmail,
  signInWithEmail,
  signInWithGoogle,
  signOut,
  resetPassword,
  onAuthStateChange,
  getSession,
  // Profile functions
  getProfile,
  saveProfile,
  getUserType,
  isLandlordComplete,
  syncProfileToSupabase
} from './supabase';

const ListingDetailModal = React.lazy(() => import('./components/ListingDetailModal'));
const PrivacyPolicyModal = React.lazy(() => import('./components/PrivacyPolicyModal'));
const AnalyticsConsentModal = React.lazy(() => import('./components/AnalyticsConsentModal'));
const NotificationsPanel = React.lazy(() => import('./components/NotificationsPanel'));
const PhotoEditor = React.lazy(() => import('./components/PhotoEditor'));

// Cloudflare Turnstile site key - set in Vercel env vars
const TURNSTILE_SITE_KEY = process.env.REACT_APP_TURNSTILE_SITE_KEY || '';

const ModalLoader = ({ label }) => (
  <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/20 backdrop-blur-sm">
    <div className="bg-white border border-slate-100 rounded-2xl px-6 py-4 shadow-2xl flex flex-col items-center gap-3">
      <div className="relative">
        <div className="w-10 h-10 rounded-full border-3 border-teal-100" />
        <div className="absolute inset-0 w-10 h-10 rounded-full border-3 border-transparent border-t-teal-500 animate-spin" />
      </div>
      <span className="text-sm font-semibold text-slate-600">{label}</span>
    </div>
  </div>
);

const LazyModalBoundary = ({ children, label }) => (
  <Suspense fallback={<ModalLoader label={label || 'Loading...'} />}>
    {children}
  </Suspense>
);

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
  const justCompletedOnboarding = useRef(false); // Flag to skip guard after onboarding
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPulsePanel, setShowPulsePanel] = useState(false);
  const [editingListing, setEditingListing] = useState(null); // Listing being edited

  const composedProfile = useMemo(() => {
    if (!currentUser) return null;
    return {
      id: currentUser.id,
      name: userProfile?.displayName || currentUser?.user_metadata?.full_name || currentUser?.email?.split('@')[0] || '',
      email: userProfile?.email || currentUser?.email || '',
      phone: userProfile?.phone || '',
      whatsapp: userProfile?.whatsapp || '',
      photo: userProfile?.photoURL || currentUser?.user_metadata?.avatar_url || '',
      type: userProfile?.userType || userType || 'renter',
      notificationPrefs: userProfile?.notificationPrefs || { updates: true, marketing: false },
      createdAt: userProfile?.createdAt || currentUser?.created_at || new Date().toISOString(),
    };
  }, [currentUser, userProfile, userType]);

  const openAuthModal = (type = 'renter', mode = 'signin') => {
    setAuthDefaultType(type);
    setAuthDefaultMode(mode);
    setShowAuthModal(true);
  };

  // Auth functions to pass to AuthModal - Uses Supabase
  const authFunctions = {
    signUp: async (email, password, displayName, userTypeParam = 'renter', captchaToken = '') => {
      const user = await signUpWithEmail(email, password, captchaToken);
      
      // Create user profile data
      const profileData = {
        email: user.email,
        displayName: displayName || '',
        userType: userTypeParam,
        phone: '',
        photoURL: '',
        createdAt: new Date().toISOString(),
        landlordComplete: userTypeParam === 'renter',
      };
      
      // Store in localStorage
      saveProfile(user.id, profileData);
      
      // Update local state
      setUserProfile(profileData);
      setUserType(userTypeParam);
      
      return user;
    },
    signIn: async (email, password, captchaToken = '') => {
      const user = await signInWithEmail(email, password, captchaToken);
      
      // Load profile from localStorage
      const localProfile = getProfile(user.id);
      const localUserType = getUserType(user.id);
      
      if (localProfile) {
        setUserProfile(localProfile);
        setUserType(localProfile.userType || localUserType || 'renter');
      } else {
        // Create minimal profile
        const profileData = {
          email: user.email,
          displayName: user.user_metadata?.full_name || '',
          userType: 'renter',
          createdAt: new Date().toISOString(),
        };
        saveProfile(user.id, profileData);
        setUserProfile(profileData);
        setUserType('renter');
      }
      
      return user;
    },
    signInGoogle: async (userTypeParam = 'renter') => {
      await signInWithGoogle(userTypeParam);
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
    // Load listings from Supabase
    const loadListings = async () => {
      try {
        const supabaseListings = await fetchAllListings();
        if (supabaseListings.length > 0) {
          setListings(supabaseListings);
          // Cache in localStorage for offline access
          localStorage.setItem('listings', JSON.stringify(supabaseListings));
          console.log('Loaded', supabaseListings.length, 'listings from Supabase');
        } else {
          // Fall back to localStorage cache
          const cached = localStorage.getItem('listings');
          if (cached) {
            setListings(JSON.parse(cached));
            console.log('Using cached listings from localStorage');
          }
        }
      } catch (err) {
        console.warn('Failed to load from Supabase, using cache:', err);
        const cached = localStorage.getItem('listings');
        if (cached) {
          setListings(JSON.parse(cached));
        }
      }
    };
    
    loadListings();
    
    // Subscribe to real-time listing updates
    const unsubscribeListings = subscribeToListings((updatedListings) => {
      setListings(updatedListings);
      localStorage.setItem('listings', JSON.stringify(updatedListings));
    });
    
    // Set up Supabase Auth listener
    const { data: { subscription: authSubscription } } = onAuthStateChange((user, event) => {
      console.log('Auth state changed:', event, user?.id);
      
      if (user) {
        setCurrentUser(user);
        
        // Load profile from localStorage
        const localProfile = getProfile(user.id);
        const localUserType = getUserType(user.id);
        const localOnboardingComplete = isLandlordComplete(user.id);
        
        if (localProfile) {
          if (localOnboardingComplete) {
            localProfile.landlordComplete = true;
          }
          setUserProfile(localProfile);
          setUserType(localProfile.userType || localUserType || 'renter');
        } else {
          // No profile - create minimal one
          const newProfile = {
            displayName: user.user_metadata?.full_name || user.email?.split('@')[0] || '',
            email: user.email || '',
            userType: localUserType || 'renter',
            createdAt: new Date().toISOString(),
            landlordComplete: localOnboardingComplete,
          };
          saveProfile(user.id, newProfile);
          setUserProfile(newProfile);
          setUserType(localUserType || 'renter');
        }
      } else {
        setCurrentUser(null);
        setUserProfile(null);
        setUserType(null);
      }
      setAuthLoading(false);
    });
    
    // Check for existing session on load
    getSession().then(({ data: { session } }) => {
      if (session?.user) {
        // Trigger the auth state handler
        const user = session.user;
        setCurrentUser(user);
        
        const localProfile = getProfile(user.id);
        const localUserType = getUserType(user.id);
        const localOnboardingComplete = isLandlordComplete(user.id);
        
        if (localProfile) {
          if (localOnboardingComplete) {
            localProfile.landlordComplete = true;
          }
          setUserProfile(localProfile);
          setUserType(localProfile.userType || localUserType || 'renter');
        } else {
          const newProfile = {
            displayName: user.user_metadata?.full_name || user.email?.split('@')[0] || '',
            email: user.email || '',
            userType: localUserType || 'renter',
            createdAt: new Date().toISOString(),
            landlordComplete: localOnboardingComplete,
          };
          saveProfile(user.id, newProfile);
          setUserProfile(newProfile);
          setUserType(localUserType || 'renter');
        }
      }
      setAuthLoading(false);
    });
    
    // Cleanup
    return () => {
      if (authSubscription) authSubscription.unsubscribe();
      if (unsubscribeListings) unsubscribeListings();
    };
  }, []);

  // Guard: require authentication before entering the Add Listing view
  useEffect(() => {
    if (authLoading) return;

    if (currentView === 'add' && !currentUser) {
      openAuthModal('landlord');
      setCurrentView('browse');
    }
  }, [currentView, currentUser, authLoading]);

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
    showToast('Analytics enabled', 'success', 'Thank you!');
  };

  const handleAnalyticsConsentDecline = () => {
    localStorage.setItem('analytics-consent', 'no');
    setShowAnalyticsConsent(false);
    showToast('Analytics disabled', 'info');
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
  if (!currentUser?.id) {
    showToast('Please sign in again to update your profile.', 'error');
    return;
  }

  const trimmedPhone = profileData.phone?.trim() || '';
  const trimmedEmail = profileData.email?.trim() || currentUser.email || '';

  try {
    if (isDuplicateContact(trimmedPhone, trimmedEmail, currentUser.id)) {
      showToast('Phone or email already used by another account', 'error', 'Duplicate');
      return;
    }

    const updatedProfile = {
      ...(userProfile || {}),
      displayName: profileData.name?.trim() || '',
      phone: trimmedPhone,
      email: trimmedEmail,
      whatsapp: profileData.whatsapp?.trim() || '',
      photoURL: profileData.photo || '',
      userType: profileData.userType || userProfile?.userType || userType || 'renter',
      notificationPrefs: userProfile?.notificationPrefs || { updates: true, marketing: false },
      createdAt: userProfile?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveProfile(currentUser.id, updatedProfile);
    try {
      await syncProfileToSupabase(currentUser.id, updatedProfile);
    } catch (syncErr) {
      console.warn('Supabase profile sync failed, will retry later:', syncErr);
      showToast('Profile saved offline. We will sync once you are back online.', 'warning', 'Cloud sync delayed');
    }
    setUserProfile(updatedProfile);
    setUserType(updatedProfile.userType);

    const registryEntry = {
      id: currentUser.id,
      type: updatedProfile.userType,
      name: updatedProfile.displayName,
      phone: updatedProfile.phone,
      email: updatedProfile.email,
      whatsapp: updatedProfile.whatsapp,
      photo: updatedProfile.photoURL,
      createdAt: updatedProfile.createdAt,
    };

    try {
      localStorage.setItem('current-user', JSON.stringify(registryEntry));
    } catch (storageErr) {
      console.warn('Failed to cache current user profile', storageErr);
    }

    const existingUsersRaw = localStorage.getItem('users');
    let existingUsers = [];
    if (existingUsersRaw) {
      try { existingUsers = JSON.parse(existingUsersRaw); } catch { existingUsers = []; }
    }
    const idx = existingUsers.findIndex(u => u.id === registryEntry.id);
    if (idx !== -1) {
      existingUsers[idx] = registryEntry;
    } else {
      existingUsers.push(registryEntry);
    }
    localStorage.setItem('users', JSON.stringify(existingUsers));
    setUsers(existingUsers);

    showToast('Profile updated successfully!', 'success');
    setCurrentView('profile');
  } catch (error) {
    console.error('Error updating profile:', error);
    const fallbackProfile = {
      displayName: profileData.name?.trim() || userProfile?.displayName || '',
      phone: trimmedPhone,
      email: trimmedEmail,
      whatsapp: profileData.whatsapp?.trim() || userProfile?.whatsapp || '',
      photoURL: profileData.photo || userProfile?.photoURL || '',
      userType: profileData.userType || userProfile?.userType || userType || 'renter',
    };
    setUserProfile(prev => ({ ...(prev || {}), ...fallbackProfile }));
    setUserType(fallbackProfile.userType);
    showToast('Profile updated (data may not be persisted)', 'error');
    setCurrentView('profile');
  }
};

// Sign out using Supabase
const handleSignOut = async () => {
  try {
    await signOut();
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
  const userId = currentUser?.id;
  console.log('Completing onboarding for user:', userId);
  
  if (!userId) {
    console.error('No user ID found!');
    return;
  }
  
  // SET LANDLORD COMPLETE FIRST - this is what the guard checks
  localStorage.setItem(`landlord-complete-${userId}`, 'true');
  console.log('Saved landlord-complete:', localStorage.getItem(`landlord-complete-${userId}`));
  
  // Update local state
  const updatedProfile = { ...userProfile, landlordComplete: true, landlordInfo: onboardData };
  setUserProfile(updatedProfile);
  
  // Save full profile
  localStorage.setItem(`landlord-info-${userId}`, JSON.stringify(onboardData));
  saveProfile(userId, updatedProfile);
  try {
    await syncProfileToSupabase(userId, { ...updatedProfile, landlordComplete: true, landlordInfo: onboardData });
  } catch (err) {
    console.warn('Failed to sync onboarding profile to Supabase', err);
    showToast('Onboarding saved locally. We will sync to the cloud soon.', 'warning', 'Cloud sync delayed');
  }
  
  // Set flag to skip guard
  justCompletedOnboarding.current = true;
  
  // Navigate to add view
  setCurrentView('add');
  showToast('Profile complete! You can now create listings.', 'success');
  
  // Reset flag after a delay
  setTimeout(() => {
    justCompletedOnboarding.current = false;
  }, 500);
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
    fullAddress: fullAddress || listingData.location || '',
    description: listingData.description,
    photos: listingData.photos || [],
    status: listingData.status || 'available',
    availableDate: listingData.availableDate || new Date().toISOString(),
    amenities: listingData.amenities || [],
    latitude: listingData.latitude ?? null,
    longitude: listingData.longitude ?? null,
    paymentMethod: listingData.paymentMethod || 'Bank and Cash',
    premium: !!listingData.premium,
    landlordId: currentUser?.uid || currentUser?.id,
    landlordName: userProfile?.displayName || currentUser?.displayName || '',
    landlordPhone: userProfile?.phone || '',
    landlordEmail: currentUser?.email || '',
    landlordPhoto: userProfile?.photoURL || currentUser?.photoURL || '',
  };

  try {
    // Save to Supabase
    const createdListing = await createListing(newListingData);
    
    // Update local state immediately
    const updatedListings = [...listings, createdListing];
    setListings(updatedListings);
    
    // Update localStorage cache
    localStorage.setItem('listings', JSON.stringify(updatedListings));
    
    showToast('Listing created successfully!', 'success', 'Success!');
    console.log('Listing saved to Supabase:', createdListing.id);
  } catch (err) {
    console.error('Failed to save to Supabase:', err);
    
    // Fallback: save to localStorage only
    const localListing = { 
      ...newListingData, 
      id: `local-${Date.now()}`, 
      createdAt: new Date().toISOString() 
    };
    const updatedListings = [...listings, localListing];
    setListings(updatedListings);
    localStorage.setItem('listings', JSON.stringify(updatedListings));
    
    showToast('Listing saved locally (will sync when online)', 'warning', 'Saved Locally');
  }
  
  setCurrentView('browse');
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

// Handle updating an existing listing
const handleUpdateListing = async (listingId, listingData) => {
  const fullAddress = [listingData.streetAddress, listingData.location]
    .filter(Boolean)
    .join(', ');
  
  const updates = {
    title: listingData.title,
    price: listingData.price,
    location: listingData.location,
    streetAddress: listingData.streetAddress || '',
    fullAddress: fullAddress || listingData.location || '',
    description: listingData.description,
    photos: listingData.photos || [],
    status: listingData.status || 'available',
    availableDate: listingData.availableDate,
    amenities: listingData.amenities || [],
  };

  try {
    await supabaseUpdateListing(listingId, updates);
    
    // Update local state
    const updatedListings = listings.map(l => 
      l.id === listingId ? { ...l, ...updates } : l
    );
    setListings(updatedListings);
    localStorage.setItem('listings', JSON.stringify(updatedListings));
    
    showToast('Listing updated successfully!', 'success');
    setEditingListing(null);
    setCurrentView('my-listings');
  } catch (err) {
    console.error('Failed to update listing:', err);
    showToast('Failed to update listing. Please try again.', 'error');
  }
};

// Handle toggling listing status (available/rented)
const handleToggleListingStatus = async (listingId) => {
  const listing = listings.find(l => l.id === listingId);
  if (!listing) return;
  
  const newStatus = listing.status === 'available' ? 'rented' : 'available';
  
  try {
    await supabaseUpdateListing(listingId, { status: newStatus });
    
    const updatedListings = listings.map(l => 
      l.id === listingId ? { ...l, status: newStatus } : l
    );
    setListings(updatedListings);
    localStorage.setItem('listings', JSON.stringify(updatedListings));
    
    showToast(
      newStatus === 'rented' 
        ? 'Listing marked as rented!' 
        : 'Listing marked as available!', 
      'success'
    );
  } catch (err) {
    console.error('Failed to toggle status:', err);
    showToast('Failed to update status. Please try again.', 'error');
  }
};

  // Messaging removed

const filteredListings = listings
  .filter(listing => {
    // Hide rented listings from browse view
    if (listing.status === 'rented') return false;
    
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

  const marketplaceStats = useMemo(() => {
    const now = Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    let availableNow = 0;
    let newThisWeek = 0;
    const premiumLandlords = new Set();

    listings.forEach(listing => {
      if (listing.status === 'available') {
        availableNow += 1;
      }
      if (listing.premium && listing.landlordId) {
        premiumLandlords.add(listing.landlordId);
      }
      if (listing.createdAt) {
        const created = new Date(listing.createdAt).getTime();
        if (!Number.isNaN(created) && (now - created) <= sevenDaysMs) {
          newThisWeek += 1;
        }
      }
    });

    return {
      total: listings.length,
      availableNow,
      newThisWeek,
      premiumHosts: premiumLandlords.size,
    };
  }, [listings]);

  return (
    <div className="relative min-h-screen overflow-hidden app-container" style={{ backgroundColor: 'var(--c-bg)' }}>
      {/* Decorative background blobs - adds personality */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-50">
        <div className="absolute -top-32 left-6 w-72 h-72 bg-teal-500/20 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute top-20 right-0 w-96 h-96 bg-violet-500/15 blur-[140px] rounded-full animate-[pulse_6s_ease-in-out_infinite]" />
        <div className="absolute bottom-[-120px] left-1/2 -translate-x-1/2 w-[520px] h-[520px] bg-rose-500/10 blur-[200px] rounded-full" />
      </div>
      <div className="relative min-h-screen" style={{ backgroundColor: 'transparent' }}>
      {/* Offline Indicator */}
      <OfflineIndicator />
      
      {/* PWA Install Banner */}
      {showInstallBanner && (
        <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50 bg-gradient-to-br from-teal-600 via-teal-500 to-cyan-500 rounded-2xl shadow-2xl p-4 fade-in border border-white/20 ring-1 ring-black/5">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 bg-white/25 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0 shadow-inner">
              <Smartphone className="w-6 h-6 text-white drop-shadow" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-white text-sm flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                Install Room24
              </h4>
              <p className="text-teal-50/90 text-xs mt-0.5">Add to home screen for instant access!</p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleInstallClick}
                  className="flex items-center gap-1.5 px-4 py-2 bg-white text-teal-700 font-bold text-xs rounded-xl hover:bg-teal-50 transition-all shadow-md hover:shadow-lg active:scale-95"
                >
                  <Download className="w-4 h-4" />
                  Install Now
                </button>
                <button
                  onClick={dismissInstallBanner}
                  className="px-3 py-2 text-white/80 hover:text-white text-xs font-medium transition-colors hover:bg-white/10 rounded-lg"
                >
                  Later
                </button>
              </div>
            </div>
            <button
              onClick={dismissInstallBanner}
              className="text-white/50 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-lg"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      
      {/* Back to Top Button */}
      <BackToTop />
      
      <Header
        currentUser={currentUser ? {
          ...currentUser,
          name: userProfile?.displayName || currentUser.displayName || 'User',
          type: userType || 'renter',
          photo: userProfile?.photoURL || currentUser.photoURL || null
        } : null}
        previewAsRenter={previewAsRenter}
        setPreviewAsRenter={setPreviewAsRenter}
        openAuthModal={openAuthModal}
        handleSignOut={handleSignOut}
        setCurrentView={setCurrentView}
        unreadCount={unreadCount}
        onOpenNotifications={() => setShowNotificationsPanel(true)}
      />

      {currentView === 'browse' && (
        <div className="px-4 sm:px-6 lg:px-8 mt-4">
          <div className="max-w-7xl mx-auto space-y-3">
            <button
              type="button"
              onClick={() => setShowPulsePanel(prev => !prev)}
              className="w-full flex items-center justify-between rounded-2xl border border-white/60 bg-white/80 backdrop-blur-lg shadow-md px-4 py-3 text-left transition-all hover:border-teal-200"
              aria-expanded={showPulsePanel ? 'true' : 'false'}
            >
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Marketplace pulse</p>
                <p className="text-base font-bold text-slate-900">See how Room24 is performing</p>
              </div>
              <ChevronDown className={`w-5 h-5 text-slate-500 transition-transform ${showPulsePanel ? 'rotate-180' : ''}`} />
            </button>
            {showPulsePanel && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-fadeIn">
                <div className="relative overflow-hidden rounded-2xl border border-white/70 bg-white/80 backdrop-blur-xl shadow-lg p-4 sm:p-5">
                  <div className="absolute inset-0 bg-gradient-to-br from-teal-500/10 to-cyan-500/5" />
                  <div className="relative flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-teal-600">Active rooms</p>
                      <p className="text-2xl sm:text-3xl font-extrabold text-slate-900">{marketplaceStats.availableNow}</p>
                      <p className="text-xs text-slate-500">of {marketplaceStats.total} total</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-teal-500/15 flex items-center justify-center text-teal-600">
                      <Home className="w-5 h-5" />
                    </div>
                  </div>
                </div>
                <div className="relative overflow-hidden rounded-2xl border border-white/70 bg-white/80 backdrop-blur-xl shadow-lg p-4 sm:p-5">
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-orange-500/5" />
                  <div className="relative flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-amber-600">New this week</p>
                      <p className="text-2xl sm:text-3xl font-extrabold text-slate-900">{marketplaceStats.newThisWeek}</p>
                      <p className="text-xs text-slate-500">freshly listed rooms</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/15 flex items-center justify-center text-amber-600">
                      <Sparkles className="w-5 h-5" />
                    </div>
                  </div>
                </div>
                <div className="relative overflow-hidden rounded-2xl border border-white/70 bg-white/80 backdrop-blur-xl shadow-lg p-4 sm:p-5">
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-blue-500/5" />
                  <div className="relative flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">Premium hosts</p>
                      <p className="text-2xl sm:text-3xl font-extrabold text-slate-900">{marketplaceStats.premiumHosts}</p>
                      <p className="text-xs text-slate-500">standout landlords</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 flex items-center justify-center text-indigo-600">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                  </div>
                </div>
                <div className="relative overflow-hidden rounded-2xl border border-white/70 bg-white/80 backdrop-blur-xl shadow-lg p-4 sm:p-5">
                  <div className="absolute inset-0 bg-gradient-to-br from-rose-500/10 to-pink-500/5" />
                  <div className="relative flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-rose-600">Momentum</p>
                      <p className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                        {marketplaceStats.total > 0 ? `${Math.max(1, Math.round((marketplaceStats.newThisWeek / Math.max(1, marketplaceStats.total)) * 100))}%` : '—'}
                      </p>
                      <p className="text-xs text-slate-500">new inventory share</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-rose-500/15 flex items-center justify-center text-rose-600">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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
        <div className={`fixed top-20 right-4 z-50 max-w-sm w-full toast-enter ${
          toast.type === 'error' ? 'bg-gradient-to-r from-rose-50 to-red-50 border-rose-400' :
          toast.type === 'success' ? 'bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-400' :
          toast.type === 'warning' ? 'bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-400' :
          'bg-gradient-to-r from-sky-50 to-blue-50 border-sky-400'
        } border-l-4 rounded-2xl shadow-xl p-4 backdrop-blur-sm ring-1 ring-black/5`} role="alert" aria-live="polite">
          <div className="flex items-start gap-3">
            <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center shadow-md ${
              toast.type === 'error' ? 'bg-gradient-to-br from-rose-500 to-red-600' :
              toast.type === 'success' ? 'bg-gradient-to-br from-emerald-500 to-green-600' :
              toast.type === 'warning' ? 'bg-gradient-to-br from-amber-500 to-orange-500' :
              'bg-gradient-to-br from-sky-500 to-blue-600'
            }`}>
              {toast.type === 'success' && <CheckCircle className="w-5 h-5 text-white" />}
              {toast.type === 'error' && <AlertTriangle className="w-5 h-5 text-white" />}
              {toast.type === 'warning' && <AlertTriangle className="w-5 h-5 text-white" />}
              {toast.type === 'info' && <Bell className="w-5 h-5 text-white" />}
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              {toast.title && <p className={`font-bold text-sm mb-0.5 ${
                toast.type === 'error' ? 'text-rose-900' :
                toast.type === 'success' ? 'text-emerald-900' :
                toast.type === 'warning' ? 'text-amber-900' :
                'text-sky-900'
              }`}>{toast.title}</p>}
              <p className={`text-sm leading-snug ${
                toast.type === 'error' ? 'text-rose-700' :
                toast.type === 'success' ? 'text-emerald-700' :
                toast.type === 'warning' ? 'text-amber-700' :
                'text-sky-700'
              }`}>{toast.message}</p>
            </div>
            <button 
              onClick={() => setToast(null)}
              className={`flex-shrink-0 p-1.5 rounded-lg hover:bg-white/60 transition-colors ${
                toast.type === 'error' ? 'text-rose-400 hover:text-rose-600' :
                toast.type === 'success' ? 'text-emerald-400 hover:text-emerald-600' :
                toast.type === 'warning' ? 'text-amber-400 hover:text-amber-600' :
                'text-sky-400 hover:text-sky-600'
              }`}
              aria-label="Dismiss notification"
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

        {currentView === 'profile' && composedProfile && (
          <ProfileView 
            user={composedProfile}
            onEdit={() => setCurrentView('edit-profile')} 
            onSignOut={handleSignOut}
            linkedProviders={[currentUser?.app_metadata?.provider || 'email']}
            onLinkGoogle={() => {
              showToast('Account linking coming soon!', 'info');
            }}
            onLinkPhone={() => {
              showToast('Phone linking coming soon!', 'info');
            }}
            onBecomeLandlord={userType !== 'landlord' ? () => {
              setUserType('landlord');
              setCurrentView('landlord-onboarding');
            } : null}
            onUpdatePrefs={async (prefs) => {
              const userId = currentUser?.id;
              if (userId) {
                try {
                  setUserProfile(prev => ({ ...prev, notificationPrefs: prefs }));
                  const existingProfile = getProfile(userId);
                  if (existingProfile) {
                    existingProfile.notificationPrefs = prefs;
                    saveProfile(userId, existingProfile);
                  }
                  showToast('Preferences updated', 'success');
                } catch (err) {
                  console.error('Failed to update prefs:', err);
                  showToast('Failed to update preferences', 'error');
                }
              }
            }}
          />
        )}

        {currentView === 'edit-profile' && composedProfile && (
          <EditProfileView user={composedProfile} onSubmit={handleUpdateProfile} onCancel={() => setCurrentView('profile')} />
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
            onRequireAuth={openAuthModal}
          />
        )}

        {currentView === 'edit-listing' && editingListing && currentUser && (
          <EditListingView
            listing={editingListing}
            onSubmit={(data) => handleUpdateListing(editingListing.id, data)}
            onCancel={() => { setEditingListing(null); setCurrentView('my-listings'); }}
            currentUser={currentUser}
          />
        )}

        {currentView === 'my-listings' && currentUser && userType === 'landlord' && (
          <MyListingsView 
            listings={listings.filter(l => l.landlordId === currentUser.uid || l.landlordId === currentUser.id)}
            onCreate={() => setCurrentView('add')}
            onEdit={(listing) => {
              setEditingListing(listing);
              setCurrentView('edit-listing');
            }}
            onToggleStatus={handleToggleListingStatus}
            onDelete={async (id) => {
              try {
                // Delete from Supabase
                await supabaseDeleteListing(id);
                
                // Update local state
                const updated = listings.filter(l => l.id !== id);
                setListings(updated);
                localStorage.setItem('listings', JSON.stringify(updated));
                
                showToast('Listing deleted', 'success');
              } catch (err) {
                console.error('Failed to delete from Supabase:', err);
                
                // Still remove locally if it's a local-only listing
                if (id.startsWith('local-')) {
                  const updated = listings.filter(l => l.id !== id);
                  setListings(updated);
                  localStorage.setItem('listings', JSON.stringify(updated));
                  showToast('Listing deleted', 'success');
                } else {
                  showToast('Failed to delete listing', 'error');
                }
              }
            }}
          />
        )}

        {currentView === 'favorites' && (
          <FavoritesView
            listings={listings}
            onSelectListing={setSelectedListing}
            onBrowse={() => setCurrentView('browse')}
          />
        )}
      </div>

      {selectedListing && (
        <LazyModalBoundary label="Loading listing...">
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
        </LazyModalBoundary>
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
          turnstileSiteKey={TURNSTILE_SITE_KEY}
        />
      )}

      <BottomNav 
        currentView={currentView}
        setCurrentView={setCurrentView}
        currentUser={currentUser}
        userType={userType}
      />

      {showPrivacyPolicy && (
        <LazyModalBoundary label="Opening policy...">
          <PrivacyPolicyModal onClose={() => setShowPrivacyPolicy(false)} />
        </LazyModalBoundary>
      )}

      {showAnalyticsConsent && (
        <LazyModalBoundary label="Loading preferences...">
          <AnalyticsConsentModal
            onAccept={handleAnalyticsConsentAccept}
            onDecline={handleAnalyticsConsentDecline}
          />
        </LazyModalBoundary>
      )}

      {showNotificationsPanel && (
        <LazyModalBoundary label="Loading inbox...">
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
        </LazyModalBoundary>
      )}

      <Footer 
        onOpenPrivacy={() => setShowPrivacyPolicy(true)} 
        onInstallApp={handleInstallClick}
      />
    </div>
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

function ProfileView({ user, onEdit, onUpdatePrefs, onSignOut, linkedProviders, onLinkGoogle, onLinkPhone, onBecomeLandlord }) {
  const prefs = user.notificationPrefs || { updates: true, marketing: false };
  const [localPrefs, setLocalPrefs] = React.useState(prefs);
  const [linkingInProgress, setLinkingInProgress] = React.useState(null);
  const [linkError, setLinkError] = React.useState('');
  const [linkSuccess, setLinkSuccess] = React.useState('');
  const [showSignOutConfirm, setShowSignOutConfirm] = React.useState(false);

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

  const handleSignOut = () => {
    setShowSignOutConfirm(false);
    onSignOut?.();
  };

  const hasGoogle = linkedProviders?.includes('google.com');
  const hasPhone = linkedProviders?.includes('phone');
  const hasPassword = linkedProviders?.includes('password');

  // Calculate account completion percentage
  const completionItems = [
    !!user.name,
    !!user.email,
    !!user.phone,
    !!user.photo,
    hasGoogle || hasPhone || hasPassword
  ];
  const completionPercent = Math.round((completionItems.filter(Boolean).length / completionItems.length) * 100);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-gray-100 pb-24">
      {/* Profile Header with Wave */}
      <div className="relative bg-gradient-to-br from-teal-600 via-teal-500 to-cyan-500 pt-8 pb-24 px-4 overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        
        <div className="max-w-xl mx-auto flex justify-between items-start relative z-10">
          <div>
            <p className="text-teal-100 text-sm font-medium mb-1">Welcome back</p>
            <h2 className="text-2xl font-bold text-white">My Profile</h2>
          </div>
          <button
            onClick={onEdit}
            className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white px-4 py-2.5 rounded-xl transition-all duration-200 flex items-center gap-2 border border-white/30 hover:scale-105 active:scale-95 shadow-lg"
          >
            <Edit className="w-4 h-4" />
            Edit
          </button>
        </div>
        
        {/* Wave SVG */}
        <svg className="absolute bottom-0 left-0 right-0 text-slate-50" viewBox="0 0 1440 120" preserveAspectRatio="none">
          <path fill="currentColor" d="M0,64L60,69.3C120,75,240,85,360,80C480,75,600,53,720,48C840,43,960,53,1080,58.7C1200,64,1320,64,1380,64L1440,64L1440,120L1380,120C1320,120,1200,120,1080,120C960,120,840,120,720,120C600,120,480,120,360,120C240,120,120,120,60,120L0,120Z"></path>
        </svg>
      </div>

      {/* Profile Card - Overlapping Header */}
      <div className="px-4 -mt-20">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 max-w-xl mx-auto">
          {/* Avatar & Name */}
          <div className="flex flex-col items-center -mt-16 mb-6">
            <div className="relative group">
              {user.photo ? (
                <img 
                  src={user.photo} 
                  alt="Profile" 
                  className="w-28 h-28 rounded-2xl object-cover border-4 border-white shadow-lg mb-4 group-hover:scale-105 transition-transform duration-300" 
                />
              ) : (
                <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center border-4 border-white shadow-lg mb-4 group-hover:scale-105 transition-transform duration-300">
                  <span className="text-4xl font-bold text-white">
                    {user.name?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                </div>
              )}
              {/* Verified badge for landlords */}
              {user.type === 'landlord' && (
                <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-gradient-to-br from-emerald-400 to-green-500 rounded-full flex items-center justify-center border-2 border-white shadow-md">
                  <CheckCircle className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
            <h3 className="text-2xl font-bold text-gray-900">{user.name}</h3>
            <span className={`inline-flex items-center mt-2 px-4 py-1.5 rounded-full text-sm font-semibold border transition-all hover:scale-105 ${
              user.type === 'landlord' 
                ? 'bg-gradient-to-r from-amber-50 to-orange-50 text-amber-700 border-amber-200'
                : 'bg-gradient-to-r from-teal-50 to-cyan-50 text-teal-700 border-teal-100'
            }`}>
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

          {/* Profile Completion Bar */}
          {completionPercent < 100 && (
            <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-700">Profile Completion</span>
                <span className="text-sm font-bold text-blue-600">{completionPercent}%</span>
              </div>
              <div className="w-full h-2 bg-blue-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500"
                  style={{ width: `${completionPercent}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">Complete your profile to build trust with {user.type === 'landlord' ? 'renters' : 'landlords'}</p>
            </div>
          )}

          {user.type !== 'landlord' && onBecomeLandlord && (
            <div className="mb-6 w-full">
              <div className="bg-gradient-to-r from-amber-100 via-orange-50 to-rose-50 border border-amber-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-amber-800">List your first room</p>
                  <p className="text-xs text-amber-700">Switch to a landlord profile to unlock My Rooms, premium sorting, and priority support.</p>
                </div>
                <button
                  onClick={onBecomeLandlord}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold shadow-lg transition"
                >
                  Become a Landlord
                </button>
              </div>
            </div>
          )}

          {/* Contact Info Cards */}
          <div className="space-y-3 mb-6">
            <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl p-4 border border-gray-100 hover:border-teal-200 hover:shadow-md transition-all duration-300 group cursor-default">
              <div className="flex items-center">
                <div className="w-11 h-11 bg-gradient-to-br from-teal-100 to-cyan-100 rounded-xl flex items-center justify-center mr-4 shadow-sm group-hover:scale-110 transition-transform duration-300">
                  <Phone className="w-5 h-5 text-teal-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-gray-500 mb-0.5">Phone Number</p>
                  <p className="font-semibold text-gray-800">{user.phone || 'Not set'}</p>
                </div>
                {user.phone && (
                  <a 
                    href={`tel:${user.phone}`}
                    className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                    aria-label="Call this number"
                  >
                    <Phone className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>

            <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl p-4 border border-gray-100 hover:border-cyan-200 hover:shadow-md transition-all duration-300 group cursor-default">
              <div className="flex items-center">
                <div className="w-11 h-11 bg-gradient-to-br from-cyan-100 to-blue-100 rounded-xl flex items-center justify-center mr-4 shadow-sm group-hover:scale-110 transition-transform duration-300">
                  <Mail className="w-5 h-5 text-cyan-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-500 mb-0.5">Email Address</p>
                  <p className="font-semibold text-gray-800 truncate">{user.email}</p>
                </div>
                <a 
                  href={`mailto:${user.email}`}
                  className="p-2 text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors flex-shrink-0"
                  aria-label="Send email"
                >
                  <Mail className="w-4 h-4" />
                </a>
              </div>
            </div>

            {user.whatsapp && (
              <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl p-4 border border-gray-100 hover:border-green-200 hover:shadow-md transition-all duration-300 group cursor-default">
                <div className="flex items-center">
                  <div className="w-11 h-11 bg-gradient-to-br from-green-100 to-emerald-100 rounded-xl flex items-center justify-center mr-4 shadow-sm group-hover:scale-110 transition-transform duration-300">
                    <span className="text-lg">💬</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-gray-500 mb-0.5">WhatsApp</p>
                    <p className="font-semibold text-gray-800">{user.whatsapp}</p>
                  </div>
                  <a 
                    href={`https://wa.me/${user.whatsapp.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1"
                  >
                    Chat
                  </a>
                </div>
              </div>
            )}

            <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl p-4 border border-gray-100 hover:border-violet-200 hover:shadow-md transition-all duration-300 group cursor-default">
              <div className="flex items-center">
                <div className="w-11 h-11 bg-gradient-to-br from-violet-100 to-purple-100 rounded-xl flex items-center justify-center mr-4 shadow-sm group-hover:scale-110 transition-transform duration-300">
                  <Calendar className="w-5 h-5 text-violet-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-0.5">Member Since</p>
                  <p className="font-semibold text-gray-800">
                    {user.createdAt && !isNaN(new Date(user.createdAt).getTime())
                      ? new Date(user.createdAt).toLocaleDateString('en-ZA', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })
                      : 'Just joined!'
                    }
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
            <>
              <button
                onClick={() => setShowSignOutConfirm(true)}
                className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3.5 bg-gray-100 hover:bg-red-50 text-gray-700 hover:text-red-600 font-semibold rounded-xl transition-all duration-200 group"
              >
                <LogOut className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                Sign Out
              </button>
              
              {/* Sign Out Confirmation Modal */}
              {showSignOutConfirm && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
                  <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl">
                    <div className="w-16 h-16 bg-gradient-to-br from-red-100 to-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <LogOut className="w-8 h-8 text-red-500" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 text-center mb-2">Sign Out?</h3>
                    <p className="text-gray-500 text-center text-sm mb-6">Are you sure you want to sign out of your Room24 account?</p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowSignOutConfirm(false)}
                        className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSignOut}
                        className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white font-semibold rounded-xl transition-all shadow-md"
                      >
                        Sign Out
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
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
    photo: user.photo || '',
    userType: user.type || 'renter'
  });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSaving, setIsSaving] = useState(false);

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

  const handleSubmit = async () => {
    setTouched({ name: true, phone: true, email: true });
    validateField('name', formData.name);
    validateField('phone', formData.phone);
    validateField('email', formData.email);
    if (Object.keys(errors).length === 0 && formData.name && formData.phone && formData.email) {
      setIsSaving(true);
      await onSubmit(formData);
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-gray-100 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-600 pt-6 pb-20 px-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="max-w-2xl mx-auto flex items-center justify-between relative z-10">
          <div>
            <p className="text-purple-200 text-sm font-medium mb-1">Update your info</p>
            <h2 className="text-2xl font-bold text-white">Edit Profile</h2>
          </div>
          <button 
            onClick={onCancel} 
            className="p-2 bg-white/20 hover:bg-white/30 rounded-xl text-white transition-all hover:scale-110 active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Wave */}
        <svg className="absolute bottom-0 left-0 right-0 text-slate-50" viewBox="0 0 1440 120" preserveAspectRatio="none">
          <path fill="currentColor" d="M0,64L60,69.3C120,75,240,85,360,80C480,75,600,53,720,48C840,43,960,53,1080,58.7C1200,64,1320,64,1380,64L1440,64L1440,120L1380,120C1320,120,1200,120,1080,120C960,120,840,120,720,120C600,120,480,120,360,120C240,120,120,120,60,120L0,120Z"></path>
        </svg>
      </div>

      <div className="px-4 -mt-16">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
            <div className="space-y-6">
              {/* Photo Upload */}
              <div className="flex justify-center -mt-20 mb-4">
                <div className="relative group">
                  {formData.photo ? (
                    <img 
                      src={formData.photo} 
                      alt="Profile" 
                      className="w-32 h-32 rounded-2xl object-cover border-4 border-white shadow-xl group-hover:scale-105 transition-transform duration-300" 
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-violet-100 to-purple-200 flex items-center justify-center border-4 border-white shadow-xl group-hover:scale-105 transition-transform duration-300">
                      <User className="w-16 h-16 text-violet-500" />
                    </div>
                  )}
                  <label className="absolute -bottom-2 -right-2 bg-gradient-to-br from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white p-3 rounded-xl cursor-pointer shadow-lg transition-all hover:scale-110 active:scale-95" aria-label="Upload new profile photo">
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
              <p className="text-center text-sm text-gray-500 -mt-2 mb-4">Tap the edit icon to upload a new photo</p>

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
                  className={`w-full px-4 py-3 border-2 ${errors.name ? 'border-red-400' : 'border-gray-200'} bg-white text-gray-800 rounded-xl focus:ring-2 focus:ring-violet-400 focus:border-transparent transition placeholder-gray-400`}
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
                    className={`w-full pl-11 pr-4 py-3 border-2 ${errors.phone ? 'border-red-400' : 'border-gray-200'} bg-white text-gray-800 rounded-xl focus:ring-2 focus:ring-violet-400 focus:border-transparent transition placeholder-gray-400`}
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
                    className={`w-full pl-11 pr-4 py-3 border-2 ${errors.email ? 'border-red-400' : 'border-gray-200'} bg-white text-gray-800 rounded-xl focus:ring-2 focus:ring-violet-400 focus:border-transparent transition placeholder-gray-400`}
                  />
                </div>
                {errors.email && touched.email && <p id="edit-email-error" className="mt-1 text-xs text-red-600">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">WhatsApp (optional)</label>
                <div className="relative">
                  <span className="absolute left-4 top-3 text-lg">💬</span>
                  <input
                    type="tel"
                    value={formData.whatsapp}
                    onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                    placeholder="e.g., +27 71 234 5678"
                    className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 bg-white text-gray-800 rounded-xl focus:ring-2 focus:ring-violet-400 focus:border-transparent transition placeholder-gray-400"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Used to create a WhatsApp chat link on your listings.</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">Account Role</label>
                <div className="grid grid-cols-2 gap-3">
                  {['renter', 'landlord'].map(role => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setFormData({ ...formData, userType: role })}
                      className={`flex flex-col items-center px-4 py-4 rounded-xl border-2 transition-all font-semibold text-sm ${
                        formData.userType === role
                          ? 'border-violet-500 bg-gradient-to-br from-violet-50 to-purple-50 text-violet-700 shadow-md scale-[1.02]'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-violet-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 ${
                        formData.userType === role 
                          ? 'bg-gradient-to-br from-violet-500 to-purple-600 text-white' 
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {role === 'landlord' ? <Home className="w-5 h-5" /> : <Search className="w-5 h-5" />}
                      </div>
                      <span>{role === 'landlord' ? 'Landlord' : 'Renter'}</span>
                      <span className="text-xs font-normal text-gray-500 mt-0.5">
                        {role === 'landlord' ? 'Post rooms' : 'Find rooms'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-6 border-t border-gray-200">
                <button
                  onClick={onCancel}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-3.5 rounded-xl transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSaving}
                  className="flex-1 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white font-semibold py-3.5 rounded-xl transition-all shadow-lg hover:shadow-xl active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* BrowseView extracted to components/BrowseView.jsx */

function FavoritesView({ listings, onSelectListing, onBrowse }) {
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
            <button
              type="button"
              onClick={() => onBrowse?.()}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white font-semibold shadow-md hover:shadow-lg hover:from-rose-600 hover:to-pink-600 transition focus:outline-none focus:ring-2 focus:ring-rose-300"
            >
              <Search className="w-4 h-4" />
              Discover rooms
            </button>
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
  premium: false,
  contactPhone: '',
  contactWhatsapp: ''
});

function AddListingView({ onSubmit, onCancel, currentUser, onRequireAuth }) {
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
    if (!landlordId) return;
    saveListingTemplate(landlordId, formData);
  }, [formData, landlordId]);

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
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-teal-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-600 via-cyan-600 to-teal-700 text-white">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={onCancel} className="w-10 h-10 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all active:scale-95">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-2xl font-bold">Post a Room</h2>
                <p className="text-white/80 text-sm">List your space in minutes</p>
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
              <Home className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 -mt-4">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 md:p-8">
          {/* Progress Indicator */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-semibold text-gray-700">Form Progress</span>
              <span className="text-sm font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
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
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden shadow-inner">
              <div 
                className="h-full bg-gradient-to-r from-teal-500 via-cyan-500 to-teal-600 rounded-full transition-all duration-500 relative overflow-hidden"
                style={{
                  boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.3)',
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
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div className="space-y-2">
                  <p className="font-medium">
                    Smart Fill Active! We remember your latest listing details so you only need to upload fresh photos next time.
                  </p>
                  <button
                    type="button"
                    onClick={handleResetSavedTemplate}
                    className="text-xs font-semibold text-teal-700 hover:text-teal-900 transition-colors flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" /> Reset saved info
                  </button>
                </div>
              </div>
            )}
            {/* Section: Basic Info */}
            <div className="border-b border-gray-100 pb-2 mb-4">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
                  <Edit className="w-4 h-4 text-white" />
                </div>
                Basic Information
              </h3>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                Room Title *
                {formData.title && formData.title.trim().length >= 5 && !errors.title && (
                  <span className="ml-2 text-emerald-600 text-xs font-medium">✓ Looks good</span>
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
                  className={`w-full px-4 py-3.5 pr-10 border-2 ${
                    errors.title ? 'border-red-400 bg-red-50' : 
                    formData.title && formData.title.trim().length >= 5 ? 'border-teal-400 bg-teal-50/30' : 
                    'border-gray-200 hover:border-gray-300'
                  } text-gray-800 rounded-xl focus:ring-2 ${
                    errors.title ? 'focus:ring-red-400' : 'focus:ring-teal-400'
                  } focus:border-transparent transition-all placeholder-gray-400`}
                />
                {formData.title && formData.title.trim().length >= 5 && !errors.title && (
                  <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500" />
                )}
              </div>
              {errors.title && <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.title}</p>}
            </div>

            {/* Price */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                Monthly Price (R) *
                {formData.price && parseFloat(formData.price) >= 500 && parseFloat(formData.price) <= 50000 && !errors.price && (
                  <span className="ml-2 text-emerald-600 text-xs font-medium">✓ Valid price</span>
                )}
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                  <span className="text-white font-bold text-sm">R</span>
                </div>
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
                  className={`w-full pl-14 pr-4 py-3.5 border-2 ${
                    errors.price ? 'border-red-400 bg-red-50' : 
                    formData.price && parseFloat(formData.price) >= 500 && parseFloat(formData.price) <= 50000 ? 'border-teal-400 bg-teal-50/30' : 
                    'border-gray-200 hover:border-gray-300'
                  } text-gray-800 rounded-xl focus:ring-2 ${
                    errors.price ? 'focus:ring-red-400' : 'focus:ring-teal-400'
                  } focus:border-transparent transition-all placeholder-gray-400 text-lg font-semibold`}
                />
                {formData.price && parseFloat(formData.price) >= 500 && parseFloat(formData.price) <= 50000 && !errors.price && (
                  <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500" />
                )}
              </div>
              {errors.price && <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.price}</p>}
              {!errors.price && formData.price && (
                <p className="text-gray-500 text-xs mt-1.5">💡 Suggested range: R500 - R50,000 per month</p>
              )}
            </div>

            {/* Section: Location */}
            <div className="border-b border-gray-100 pb-2 mb-4 mt-8">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-white" />
                </div>
                Location Details
              </h3>
            </div>

            {/* Full Address */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">Full South African Address *</label>
              <p className="text-xs text-gray-500 mb-2">📍 Example: 5170 Molefe St, Ivory Park, Midrand, 1693</p>
              <textarea
                required
                rows="2"
                value={fullAddressInput}
                onChange={(e) => handleFullAddressChange(e.target.value)}
                onFocus={() => setIsFullAddressEditing(true)}
                onBlur={(e) => { setIsFullAddressEditing(false); handleFullAddressChange(e.target.value); }}
                placeholder="Type the full street + suburb + city + postal code"
                className={`w-full px-4 py-3.5 border-2 ${errors.location ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'} bg-white text-gray-800 rounded-xl focus:ring-2 ${errors.location ? 'focus:ring-red-400' : 'focus:ring-teal-400'} focus:border-transparent transition placeholder-gray-400`}
              />
              {errors.location && <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1" aria-live="assertive"><AlertCircle className="w-3 h-3" /> {errors.location}</p>}
              {!errors.location && (
                <p className="text-gray-500 text-xs mt-1.5">
                  Include the street/stand number plus suburb, city, and postal code. Commas are optional.
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
                        <span className="ml-2 inline-block px-2 py-1 text-[10px] rounded bg-teal-100 text-teal-600 font-semibold">CACHED</span>
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
                        <span className="ml-2 inline-block px-2 py-1 text-[10px] rounded bg-teal-100 text-teal-600 font-semibold">CACHED</span>
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

            {/* Section: Room Details */}
            <div className="border-b border-gray-100 pb-2 mb-4 mt-8">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
                  <Home className="w-4 h-4 text-white" />
                </div>
                Room Details
              </h3>
            </div>

            {/* Status and Available Date - Two columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">Status</label>
                <div className="grid grid-cols-2 gap-2">
                  {['available', 'rented'].map(status => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setFormData({ ...formData, status })}
                      className={`py-3 px-4 rounded-xl font-medium transition-all text-sm ${
                        formData.status === status
                          ? status === 'available' 
                            ? 'bg-emerald-500 text-white shadow-lg scale-[1.02]' 
                            : 'bg-gray-500 text-white shadow-lg scale-[1.02]'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-2 border-transparent'
                      }`}
                    >
                      {status === 'available' ? '● Available' : '○ Rented'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Available Date
                </label>
                <input
                  type="date"
                  value={formData.availableDate}
                  onChange={(e) => setFormData({ ...formData, availableDate: e.target.value })}
                  className="w-full px-4 py-3.5 border-2 border-gray-200 hover:border-gray-300 bg-white text-gray-800 rounded-xl focus:ring-2 focus:ring-teal-400 focus:border-transparent transition"
                />
              </div>
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">💳 Payment Method</label>
              <div className="grid grid-cols-3 gap-2">
                {['Bank and Cash', 'Cash Only', 'Bank Only'].map(method => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setFormData({ ...formData, paymentMethod: method })}
                    className={`py-3 px-3 rounded-xl font-medium transition-all text-xs md:text-sm text-center ${
                      formData.paymentMethod === method
                        ? 'bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-lg scale-[1.02]'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-2 border-transparent'
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>

            {/* Room Type and Lease Duration - Two columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">🚪 Room Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {[{ value: 'private', label: 'Private Room', icon: '🔒' }, { value: 'shared', label: 'Shared Room', icon: '👥' }].map(type => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, roomType: type.value })}
                      className={`py-3 px-3 rounded-xl font-medium transition-all text-sm flex items-center justify-center gap-2 ${
                        formData.roomType === type.value
                          ? 'bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-lg scale-[1.02]'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-2 border-transparent'
                      }`}
                    >
                      <span>{type.icon}</span>
                      <span className="hidden sm:inline">{type.label.split(' ')[0]}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">📅 Lease Duration</label>
                <select
                  value={formData.leaseDuration}
                  onChange={(e) => setFormData({ ...formData, leaseDuration: e.target.value })}
                  className="w-full px-4 py-3.5 border-2 border-gray-200 hover:border-gray-300 bg-white text-gray-800 rounded-xl focus:ring-2 focus:ring-teal-400 focus:border-transparent transition cursor-pointer"
                >
                  <option value="1-3">1-3 months (Short)</option>
                  <option value="4-6">4-6 months (Medium)</option>
                  <option value="7-12">7-12 months (Long)</option>
                  <option value="12+">12+ months (Extended)</option>
                </select>
              </div>
            </div>

            {/* Pet Friendly and Gender Preference */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, petFriendly: !formData.petFriendly })}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                  formData.petFriendly
                    ? 'border-teal-400 bg-teal-50 shadow-md scale-[1.02]'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${
                  formData.petFriendly ? 'bg-teal-500 text-white' : 'bg-gray-100'
                }`}>
                  🐾
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-800">Pet Friendly</p>
                  <p className="text-xs text-gray-500">{formData.petFriendly ? 'Pets welcome!' : 'No pets allowed'}</p>
                </div>
                <div className={`ml-auto w-6 h-6 rounded-full flex items-center justify-center ${
                  formData.petFriendly ? 'bg-teal-500 text-white' : 'bg-gray-200'
                }`}>
                  {formData.petFriendly && <CheckCircle className="w-4 h-4" />}
                </div>
              </button>

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">👤 Gender Preference</label>
                <div className="grid grid-cols-3 gap-2">
                  {[{ value: 'any', label: 'Any', icon: '👥' }, { value: 'male', label: 'Male', icon: '👨' }, { value: 'female', label: 'Female', icon: '👩' }].map(option => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, genderPreference: option.value })}
                      className={`py-2.5 px-3 rounded-xl font-medium transition-all text-xs flex flex-col items-center gap-1 ${
                        formData.genderPreference === option.value
                          ? 'bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-lg scale-[1.02]'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-2 border-transparent'
                      }`}
                    >
                      <span className="text-lg">{option.icon}</span>
                      <span>{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Premium Flag */}
            <button
              type="button"
              onClick={() => setFormData({ ...formData, premium: !formData.premium })}
              className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                formData.premium
                  ? 'border-amber-400 bg-gradient-to-r from-amber-50 to-yellow-50 shadow-md scale-[1.01]'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                formData.premium ? 'bg-gradient-to-br from-amber-400 to-yellow-500' : 'bg-gray-100'
              }`}>
                <Sparkles className={`w-6 h-6 ${formData.premium ? 'text-white' : 'text-gray-400'}`} />
              </div>
              <div className="text-left flex-1">
                <p className="font-bold text-gray-800">Premium Listing</p>
                <p className="text-xs text-gray-500">Highlight & priority sorting in search results</p>
              </div>
              <div className={`w-12 h-6 rounded-full transition-all relative ${
                formData.premium ? 'bg-amber-400' : 'bg-gray-300'
              }`}>
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${
                  formData.premium ? 'left-7' : 'left-1'
                }`} />
              </div>
            </button>

            {/* Section: Contact */}
            <div className="border-b border-gray-100 pb-2 mb-4 mt-8">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
                  <Phone className="w-4 h-4 text-white" />
                </div>
                Contact Details
              </h3>
              <p className="text-xs text-gray-500 mt-1 ml-9">How tenants can reach you</p>
            </div>

            {/* Contact Details */}
            <div className="bg-gradient-to-br from-teal-50 via-cyan-50 to-teal-50 border border-teal-200 rounded-2xl p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    📱 Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-teal-400" />
                    <input
                      type="tel"
                      value={formData.contactPhone}
                      onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                      placeholder="e.g., 071 234 5678"
                      className="w-full pl-11 pr-4 py-3.5 border-2 border-gray-200 hover:border-teal-300 bg-white text-gray-800 rounded-xl focus:ring-2 focus:ring-teal-400 focus:border-transparent transition placeholder-gray-400"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1.5">For direct calls from tenants</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    💬 WhatsApp Number
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xl">💬</span>
                    <input
                      type="tel"
                      value={formData.contactWhatsapp}
                      onChange={(e) => setFormData({ ...formData, contactWhatsapp: e.target.value })}
                      placeholder="e.g., 071 234 5678"
                      className="w-full pl-11 pr-4 py-3.5 border-2 border-gray-200 hover:border-teal-300 bg-white text-gray-800 rounded-xl focus:ring-2 focus:ring-teal-400 focus:border-transparent transition placeholder-gray-400"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1.5">Leave blank if same as phone</p>
                </div>
              </div>
            </div>

            {/* Section: Description & Media */}
            <div className="border-b border-gray-100 pb-2 mb-4 mt-8">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
                  <Edit className="w-4 h-4 text-white" />
                </div>
                Description & Media
              </h3>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                ✍️ Description 
                {formData.description && (
                  <span className={`ml-2 text-xs font-medium ${
                    formData.description.length > 500 
                      ? 'text-red-500' 
                      : formData.description.length >= 10 
                        ? 'text-emerald-600' 
                        : 'text-gray-500'
                  }`}>
                    {formData.description.length}/500 characters
                    {formData.description.length >= 10 && formData.description.length <= 500 && ' ✓'}
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
                placeholder="Describe the room, amenities, house rules, nearby transport, and what makes it special..."
                rows="5"
                className={`w-full px-4 py-3.5 border-2 ${
                  errors.description ? 'border-red-400 bg-red-50' : 
                  formData.description && formData.description.length >= 10 ? 'border-teal-400 bg-teal-50/30' :
                  'border-gray-200 hover:border-gray-300'
                } bg-white text-gray-800 rounded-xl focus:ring-2 ${errors.description ? 'focus:ring-red-400' : 'focus:ring-teal-400'} focus:border-transparent transition placeholder-gray-400 resize-none`}
              />
              {errors.description && <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.description}</p>}
              {!errors.description && <p className="text-gray-500 text-xs mt-1.5">💡 Include transport links, amenities, and house rules for better engagement</p>}
            </div>

            {/* Amenities */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-3">✨ Amenities</label>
              <p className="text-xs text-gray-500 mb-3">Select all that apply to your room</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {availableAmenities.map(amenity => (
                  <button
                    key={amenity}
                    type="button"
                    onClick={() => toggleAmenity(amenity)}
                    className={`px-3 py-3 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                      formData.amenities.includes(amenity)
                        ? 'bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-lg scale-[1.02]'
                        : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:border-teal-300 hover:bg-teal-50'
                    }`}
                  >
                    {formData.amenities.includes(amenity) && <CheckCircle className="w-4 h-4" />}
                    {amenity}
                  </button>
                ))}
              </div>
              {formData.amenities.length > 0 && (
                <p className="text-xs text-teal-600 font-medium mt-2">{formData.amenities.length} amenities selected</p>
              )}
            </div>

            {/* Photos */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                📸 Photos <span className="text-teal-600 font-bold">{formData.photos.length}/5</span>
              </label>
              <div 
                className="relative border-2 border-dashed border-teal-300 bg-gradient-to-br from-teal-50 via-cyan-50 to-teal-50 rounded-2xl p-8 hover:border-teal-500 hover:shadow-lg transition-all duration-300 cursor-pointer group"
                onClick={() => setShowPhotoEditor(true)}
              >
                <div className="text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <span className="text-4xl">📸</span>
                  </div>
                  <p className="text-gray-800 font-bold text-lg mb-1">
                    {formData.photos.length === 0 ? 'Add Photos' : `${formData.photos.length} Photo${formData.photos.length > 1 ? 's' : ''} Added`}
                  </p>
                  <p className="text-gray-500 text-sm">
                    Click to upload • JPG, PNG up to 5MB each
                  </p>
                  {formData.photos.length === 0 && (
                    <div className="mt-4 bg-white rounded-xl px-4 py-2 inline-block">
                      <p className="text-sm text-teal-600 font-semibold">
                        ✨ Listings with photos get 3x more views!
                      </p>
                    </div>
                  )}
                </div>
              </div>
              {formData.photos.length > 0 && (
                <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-3">
                  {formData.photos.map((photo, index) => (
                    <div key={index} className="relative group aspect-square">
                      {index === 0 && (
                        <div className="absolute top-2 left-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white text-xs px-2 py-1 rounded-full font-semibold z-10 shadow">
                          Cover
                        </div>
                      )}
                      <img 
                        src={photo} 
                        alt={`Preview ${index + 1}`} 
                        className="w-full h-full object-cover rounded-xl border-2 border-teal-200 shadow-sm group-hover:shadow-md transition-shadow" 
                      />
                    </div>
                  ))}
                </div>
              )}
              {formData.photos.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowPhotoEditor(true)}
                  className="mt-4 text-sm text-teal-600 hover:text-teal-700 font-semibold flex items-center gap-1"
                >
                  <Edit className="w-4 h-4" /> Edit Photos
                </button>
              )}
            </div>

            {showPhotoEditor && (
              <LazyModalBoundary label="Loading editor...">
                <PhotoEditor
                  photos={formData.photos}
                  onPhotosChange={(newPhotos) => setFormData({ ...formData, photos: newPhotos })}
                  onClose={() => setShowPhotoEditor(false)}
                  maxPhotos={5}
                />
              </LazyModalBoundary>
            )}

            {/* Submit Button */}
            <div className="border-t border-gray-200 pt-8 mt-8">
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || Object.keys(errors).length > 0}
                className={`w-full font-bold py-4 rounded-2xl transition-all relative text-lg ${
                  isSubmitting || Object.keys(errors).length > 0
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-teal-600 via-cyan-600 to-teal-700 hover:from-teal-700 hover:via-cyan-700 hover:to-teal-800 text-white shadow-xl hover:shadow-2xl hover:shadow-teal-500/30 active:scale-[0.98]'
                }`}
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Posting Your Room...</span>
                  </div>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <PlusCircle className="w-5 h-5" />
                    Post Your Room
                  </span>
                )}
              </button>
              {Object.keys(errors).length > 0 && (
                <div className="mt-3 bg-red-50 border border-red-200 rounded-xl p-3 text-center">
                  <p className="text-red-600 text-sm font-medium flex items-center justify-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Please fix the errors above before submitting
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Edit Listing View - allows landlords to modify their existing listings
function EditListingView({ listing, onSubmit, onCancel, currentUser }) {
  const [formData, setFormData] = useState({
    title: listing?.title || '',
    price: listing?.price || '',
    location: listing?.location || '',
    streetAddress: listing?.streetAddress || '',
    description: listing?.description || '',
    photos: listing?.photos || [],
    status: listing?.status || 'available',
    availableDate: listing?.availableDate ? listing.availableDate.split('T')[0] : new Date().toISOString().split('T')[0],
    amenities: listing?.amenities || [],
    contactPhone: listing?.contactPhone || '',
    contactWhatsapp: listing?.contactWhatsapp || '',
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPhotoEditor, setShowPhotoEditor] = useState(false);

  const amenityOptions = [
    { id: 'wifi', label: 'WiFi', icon: '📶' },
    { id: 'parking', label: 'Parking', icon: '🚗' },
    { id: 'kitchen', label: 'Kitchen', icon: '🍳' },
    { id: 'laundry', label: 'Laundry', icon: '🧺' },
    { id: 'aircon', label: 'Air Conditioning', icon: '❄️' },
    { id: 'furnished', label: 'Furnished', icon: '🛋️' },
    { id: 'security', label: 'Security', icon: '🔒' },
    { id: 'garden', label: 'Garden', icon: '🌳' },
    { id: 'pool', label: 'Pool', icon: '🏊' },
    { id: 'gym', label: 'Gym', icon: '💪' },
  ];

  const validateForm = () => {
    const newErrors = {};
    if (!formData.title?.trim()) newErrors.title = 'Title is required';
    if (!formData.price || parseFloat(formData.price) <= 0) newErrors.price = 'Valid price is required';
    if (!formData.location?.trim()) newErrors.location = 'Location is required';
    if (!formData.description?.trim()) newErrors.description = 'Description is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } catch (err) {
      console.error('Update error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleAmenity = (amenityId) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenityId)
        ? prev.amenities.filter(a => a !== amenityId)
        : [...prev.amenities, amenityId]
    }));
  };

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    files.forEach(file => {
      if (formData.photos.length >= 5) return;
      
      const reader = new FileReader();
      reader.onload = (event) => {
        setFormData(prev => ({
          ...prev,
          photos: [...prev.photos, event.target.result].slice(0, 5)
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="p-4 min-h-screen bg-gradient-to-b from-slate-50 to-gray-100 pb-24">
      <div className="max-w-2xl mx-auto mt-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={onCancel}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Edit Listing</h1>
            <p className="text-gray-500 text-sm">Update your room details</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-2">Listing Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => { setFormData({ ...formData, title: e.target.value }); setErrors({ ...errors, title: '' }); }}
              className={`w-full px-4 py-3 border-2 rounded-xl transition-all focus:ring-2 focus:ring-teal-100 focus:border-teal-500 ${
                errors.title ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'
              }`}
              placeholder="e.g., Cozy Room in Sandton"
            />
            {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
          </div>

          {/* Price */}
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-2">Monthly Rent (R) *</label>
            <input
              type="number"
              value={formData.price}
              onChange={(e) => { setFormData({ ...formData, price: e.target.value }); setErrors({ ...errors, price: '' }); }}
              className={`w-full px-4 py-3 border-2 rounded-xl transition-all focus:ring-2 focus:ring-teal-100 focus:border-teal-500 ${
                errors.price ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'
              }`}
              placeholder="3500"
            />
            {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price}</p>}
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-2">Location / Suburb *</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => { setFormData({ ...formData, location: e.target.value }); setErrors({ ...errors, location: '' }); }}
              className={`w-full px-4 py-3 border-2 rounded-xl transition-all focus:ring-2 focus:ring-teal-100 focus:border-teal-500 ${
                errors.location ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'
              }`}
              placeholder="e.g., Sandton, Johannesburg"
            />
            {errors.location && <p className="text-red-500 text-xs mt-1">{errors.location}</p>}
          </div>

          {/* Street Address */}
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-2">Street Address (Optional)</label>
            <input
              type="text"
              value={formData.streetAddress}
              onChange={(e) => setFormData({ ...formData, streetAddress: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-200 hover:border-gray-300 rounded-xl transition-all focus:ring-2 focus:ring-teal-100 focus:border-teal-500"
              placeholder="e.g., 123 Main Street"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-2">Description *</label>
            <textarea
              value={formData.description}
              onChange={(e) => { setFormData({ ...formData, description: e.target.value }); setErrors({ ...errors, description: '' }); }}
              rows={4}
              className={`w-full px-4 py-3 border-2 rounded-xl transition-all focus:ring-2 focus:ring-teal-100 focus:border-teal-500 resize-none ${
                errors.description ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'
              }`}
              placeholder="Describe your room, amenities, rules, and what makes it special..."
            />
            {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
          </div>

          {/* Available Date */}
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-2">Available From</label>
            <input
              type="date"
              value={formData.availableDate}
              onChange={(e) => setFormData({ ...formData, availableDate: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-200 hover:border-gray-300 rounded-xl transition-all focus:ring-2 focus:ring-teal-100 focus:border-teal-500"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-2">Listing Status</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, status: 'available' })}
                className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
                  formData.status === 'available'
                    ? 'bg-emerald-500 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                ● Available
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, status: 'rented' })}
                className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
                  formData.status === 'rented'
                    ? 'bg-gray-500 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                ○ Rented
              </button>
            </div>
            <p className="text-gray-500 text-xs mt-2">Rented listings won't appear in search results</p>
          </div>

          {/* Amenities */}
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-3">Amenities</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {amenityOptions.map(amenity => (
                <button
                  key={amenity.id}
                  type="button"
                  onClick={() => toggleAmenity(amenity.id)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    formData.amenities.includes(amenity.id)
                      ? 'bg-teal-50 text-teal-700 border-2 border-teal-500'
                      : 'bg-gray-50 text-gray-600 border-2 border-transparent hover:bg-gray-100'
                  }`}
                >
                  <span>{amenity.icon}</span>
                  <span>{amenity.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Contact Details */}
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
              📞 Contact Details
              <span className="text-xs font-normal text-gray-500">(How tenants can reach you)</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number (for calls)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">📱</span>
                  <input
                    type="tel"
                    value={formData.contactPhone}
                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                    placeholder="e.g., 071 234 5678"
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 bg-white text-gray-800 rounded-xl focus:ring-2 focus:ring-teal-400 focus:border-transparent transition placeholder-gray-400"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">For direct phone calls from interested tenants</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  WhatsApp Number
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-500">💬</span>
                  <input
                    type="tel"
                    value={formData.contactWhatsapp}
                    onChange={(e) => setFormData({ ...formData, contactWhatsapp: e.target.value })}
                    placeholder="e.g., 071 234 5678"
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 bg-white text-gray-800 rounded-xl focus:ring-2 focus:ring-teal-400 focus:border-transparent transition placeholder-gray-400"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Leave blank if same as phone number</p>
              </div>
            </div>
          </div>

          {/* Photos */}
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-3">Photos ({formData.photos.length}/5)</label>
            
            {formData.photos.length > 0 && (
              <div className="grid grid-cols-3 gap-3 mb-4">
                {formData.photos.map((photo, index) => (
                  <div key={index} className="relative aspect-square rounded-xl overflow-hidden group">
                    <img src={photo} alt={`Room ${index + 1}`} className="w-full h-full object-cover" />
                    <button
                      onClick={() => removePhoto(index)}
                      className="absolute top-2 right-2 w-7 h-7 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    {index === 0 && (
                      <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                        Cover
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {formData.photos.length < 5 && (
              <label className="block cursor-pointer">
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-teal-400 hover:bg-teal-50/50 transition-all">
                  <div className="text-3xl mb-2">📸</div>
                  <p className="text-gray-600 text-sm font-medium">Click to add photos</p>
                  <p className="text-gray-400 text-xs mt-1">Up to 5 photos</p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
            )}

            {formData.photos.length > 0 && (
              <button
                type="button"
                onClick={() => setShowPhotoEditor(true)}
                className="mt-3 text-sm text-teal-600 hover:text-teal-700 font-medium"
              >
                ✏️ Edit Photos
              </button>
            )}
          </div>

          {showPhotoEditor && (
            <LazyModalBoundary label="Loading editor...">
              <PhotoEditor
                photos={formData.photos}
                onPhotosChange={(newPhotos) => setFormData({ ...formData, photos: newPhotos })}
                onClose={() => setShowPhotoEditor(false)}
                maxPhotos={5}
              />
            </LazyModalBoundary>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={onCancel}
              className="flex-1 py-3 px-4 rounded-xl font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={`flex-1 py-3 px-4 rounded-xl font-semibold text-white transition-all relative ${
                isSubmitting
                  ? 'bg-teal-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 shadow-lg hover:shadow-xl'
              }`}
            >
              {isSubmitting ? (
                <>
                  <span className="opacity-0">Save Changes</span>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// MessagesView removed - using direct contact instead

function MyListingsView({ listings, onDelete, onCreate, onEdit, onToggleStatus }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-teal-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-600 via-cyan-600 to-teal-700 text-white">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                <Home className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">My Rooms</h2>
                <p className="text-white/80">
                  {listings.length === 0
                    ? 'Your properties will appear here'
                    : `${listings.length} ${listings.length === 1 ? 'room' : 'rooms'} listed`}
                </p>
              </div>
            </div>
            {listings.length > 0 && (
              <button
                onClick={() => (onCreate ? onCreate() : (window.location.hash = '#add'))}
                className="inline-flex items-center gap-2 bg-white text-teal-700 hover:bg-teal-50 font-bold px-5 py-3 rounded-xl transition-all shadow-lg hover:shadow-xl active:scale-95"
              >
                <PlusCircle className="w-5 h-5" />
                Add New Room
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 -mt-4">
        {/* Stats Cards */}
        {listings.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <p className="text-2xl font-bold text-teal-600">{listings.filter(l => l.status === 'available').length}</p>
              <p className="text-xs text-gray-500">Available</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <p className="text-2xl font-bold text-gray-600">{listings.filter(l => l.status === 'rented').length}</p>
              <p className="text-xs text-gray-500">Rented</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <p className="text-2xl font-bold text-emerald-600">{listings.length}</p>
              <p className="text-xs text-gray-500">Total</p>
            </div>
          </div>
        )}

        {/* Landlord tip banner */}
        {listings.length > 0 && (
          <div className="mb-6 bg-white border border-teal-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 mb-1">Quick Tips</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Click the <span className="font-semibold text-emerald-600">status badge</span> to toggle availability. Rented rooms won't appear in search.
                </p>
              </div>
            </div>
          </div>
        )}

        {listings.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-lg p-12 text-center">
            <div className="w-24 h-24 bg-gradient-to-br from-teal-100 to-cyan-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Home className="w-12 h-12 text-teal-400" />
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">No Rooms Yet</h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              Start earning by posting your first room. It only takes a few minutes!
            </p>
            <button
              onClick={() => (onCreate ? onCreate() : (window.location.hash = '#add'))}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-teal-600 via-cyan-600 to-teal-700 hover:from-teal-700 hover:via-cyan-700 hover:to-teal-800 text-white font-bold px-8 py-4 rounded-xl transition-all shadow-lg hover:shadow-xl active:scale-95"
            >
              <PlusCircle className="w-5 h-5" />
              Post Your First Room
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {listings.map(listing => (
              <div key={listing.id} className={`bg-white rounded-2xl shadow-sm border overflow-hidden hover:shadow-lg transition-all duration-300 group ${
                listing.status === 'rented' ? 'border-gray-200' : 'border-gray-100 hover:border-teal-200'
              }`}>
                {listing.photos && listing.photos.length > 0 ? (
                  <div className="relative overflow-hidden">
                    <img 
                      src={listing.photos[0]} 
                      alt="Room" 
                      className={`w-full h-48 object-cover group-hover:scale-105 transition-transform duration-500 ${listing.status === 'rented' ? 'grayscale' : ''}`} 
                    />
                    {listing.photos.length > 1 && (
                      <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-white px-2.5 py-1 rounded-full text-xs font-medium">
                        📷 {listing.photos.length}
                      </div>
                    )}
                    <button
                      onClick={() => onToggleStatus?.(listing.id)}
                      className={`absolute top-3 left-3 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer hover:scale-105 shadow-lg ${
                        listing.status === 'available' 
                          ? 'bg-emerald-500 hover:bg-emerald-600 text-white' 
                          : 'bg-gray-500 hover:bg-gray-600 text-white'
                      }`}
                      title="Click to toggle status"
                    >
                      {listing.status === 'available' ? '● Available' : '○ Rented'}
                    </button>
                  </div>
                ) : (
                  <div className="relative h-48 bg-gradient-to-br from-teal-100 to-cyan-100 flex items-center justify-center">
                    <Home className="w-16 h-16 text-teal-300" />
                    <button
                      onClick={() => onToggleStatus?.(listing.id)}
                      className={`absolute top-3 left-3 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer hover:scale-105 shadow-lg ${
                        listing.status === 'available' 
                          ? 'bg-emerald-500 hover:bg-emerald-600 text-white' 
                          : 'bg-gray-500 hover:bg-gray-600 text-white'
                      }`}
                      title="Click to toggle status"
                    >
                      {listing.status === 'available' ? '● Available' : '○ Rented'}
                    </button>
                  </div>
                )}
                <div className="p-5">
                  <h3 className="font-bold text-lg text-gray-800 mb-1 line-clamp-1 uppercase tracking-wide">{listing.title}</h3>
                  <div className="text-teal-600 font-bold text-xl mb-2">R{listing.price?.toLocaleString()}<span className="text-sm font-normal text-gray-500">/month</span></div>
                  <div className="flex items-center text-sm mb-4">
                    <MapPin className="w-4 h-4 mr-1.5 text-teal-500" />
                    <span className="line-clamp-1 uppercase tracking-wide font-semibold text-teal-700">{listing.location}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onEdit?.(listing)}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 font-semibold py-2.5 rounded-xl transition-colors text-sm"
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm('Are you sure you want to delete this listing? This cannot be undone.')) {
                          onDelete(listing.id);
                        }
                      }}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-600 font-medium py-2.5 rounded-xl transition-colors text-sm"
                    >
                      <X className="w-4 h-4" />
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

function AuthModal({ defaultType = 'renter', defaultMode = 'signin', onClose, onSuccess, authFunctions, turnstileSiteKey = '' }) {
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
  
  // Turnstile captcha state
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaError, setCaptchaError] = useState('');
  const [captchaRefresh, setCaptchaRefresh] = useState(0);
  
  const captchaEnabled = Boolean(turnstileSiteKey);
  const requiresCaptcha = captchaEnabled && (mode === 'signin' || mode === 'signup');

  // Reset captcha when mode changes
  useEffect(() => {
    if (!captchaEnabled) return;
    setCaptchaToken('');
    setCaptchaError('');
    setCaptchaRefresh(prev => prev + 1);
  }, [mode, captchaEnabled]);

  const handleCaptchaVerify = (token) => {
    setCaptchaToken(token);
    setCaptchaError('');
  };

  const handleCaptchaExpire = () => {
    setCaptchaToken('');
    setCaptchaError('Verification expired. Please try again.');
    setCaptchaRefresh(prev => prev + 1);
  };

  const handleCaptchaError = (err) => {
    console.error('Turnstile error:', err);
    setCaptchaToken('');
    setCaptchaError('Verification failed. Please try again.');
    setCaptchaRefresh(prev => prev + 1);
  };

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
    
    // Check captcha if required
    if (requiresCaptcha && !captchaToken) {
      setCaptchaError('Please complete the verification.');
      return;
    }
    
    setIsSubmitting(true);
    setAuthError('');
    setCaptchaError('');
    
    try {
      if (mode === 'signup') {
        await authFunctions.signUp(form.email, form.password, form.name, form.type, captchaToken);
        onSuccess?.();
        onClose();
      } else if (mode === 'signin') {
        await authFunctions.signIn(form.email, form.password, captchaToken);
        onSuccess?.();
        onClose();
      } else if (mode === 'reset') {
        await authFunctions.sendPasswordReset(form.email);
        setResetSent(true);
      }
    } catch (err) {
      console.error('Auth error:', err);
      // Reset captcha on error so user can try again
      setCaptchaToken('');
      setCaptchaRefresh(prev => prev + 1);
      
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

          {/* Turnstile Captcha Widget */}
          {captchaEnabled && (mode === 'signin' || mode === 'signup') && (
            <div className="flex flex-col items-center">
              <TurnstileWidget
                siteKey={turnstileSiteKey}
                onVerify={handleCaptchaVerify}
                onExpire={handleCaptchaExpire}
                onError={handleCaptchaError}
                refreshTrigger={captchaRefresh}
              />
              {captchaError && (
                <p className="text-rose-500 text-xs mt-2 flex items-center gap-1">
                  <span>⚠</span>{captchaError}
                </p>
              )}
            </div>
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

function BottomNav({ currentView, setCurrentView, currentUser, userType }) {
  const isLandlord = userType === 'landlord';
  const navItems = [
    { id: 'browse', label: 'Explore', icon: Search, activeColor: 'teal' },
    { id: 'add', label: 'List', icon: PlusCircle, requiresAuth: true, activeColor: 'rose', highlight: true },
    { id: 'my-listings', label: 'My Rooms', icon: Home, requiresAuth: true, activeColor: 'teal', show: isLandlord },
    { id: 'favorites', label: 'Saved', icon: Heart, activeColor: 'rose' },
    { id: 'profile', label: 'Profile', icon: User, activeColor: 'violet' }
  ];

  const visibleItems = navItems.filter(item => item && (item.show === undefined || item.show));

  const colorClasses = {
    teal: 'text-teal-600 bg-gradient-to-t from-teal-100 to-teal-50',
    rose: 'text-rose-600 bg-gradient-to-t from-rose-100 to-rose-50',
    violet: 'text-violet-600 bg-gradient-to-t from-violet-100 to-violet-50'
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/98 backdrop-blur-xl border-t border-gray-200/60 px-2 py-1.5 z-20 md:hidden safe-area-bottom shadow-[0_-4px_20px_rgba(15,23,42,0.08)]" role="navigation" aria-label="Main navigation">
      <div
        className="grid gap-0.5 max-w-md mx-auto"
        style={{ gridTemplateColumns: `repeat(${visibleItems.length}, minmax(0, 1fr))` }}
      >
        {visibleItems.map(item => {
          const Icon = item.icon;
          const disabled = item.requiresAuth && !currentUser;
          const isActive = currentView === item.id;
          
          // Special highlight style for "List" button
          if (item.highlight && !disabled) {
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setCurrentView(item.id)}
                className={`flex flex-col items-center gap-0.5 py-1.5 px-1 rounded-xl transition-all duration-200 active:scale-95 ${
                  isActive
                    ? 'text-white bg-gradient-to-br from-rose-500 to-pink-500 shadow-lg shadow-rose-500/30'
                    : 'text-rose-500 hover:bg-rose-50'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className={`p-1 rounded-lg transition-all duration-200 ${isActive ? 'bg-white/20' : ''}`}>
                  <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                </span>
                <span className="text-[10px] font-semibold">{item.label}</span>
              </button>
            );
          }
          
          return (
            <button
              key={item.id}
              type="button"
              disabled={disabled}
              onClick={() => !disabled && setCurrentView(item.id)}
              className={`flex flex-col items-center gap-0.5 py-1.5 px-1 rounded-xl transition-all duration-200 ${
                disabled ? 'opacity-35 cursor-not-allowed' : 'active:scale-95'
              } ${
                isActive
                  ? `${colorClasses[item.activeColor]} font-semibold shadow-sm`
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50/80'
              }`}
              aria-current={isActive ? 'page' : undefined}
              aria-disabled={disabled}
            >
              <span className={`transition-all duration-200 ${isActive ? 'scale-110 -translate-y-0.5' : ''}`}>
                <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 1.75} />
              </span>
              <span className={`text-[10px] transition-all ${isActive ? 'font-semibold' : 'font-medium'}`}>{item.label}</span>
              {isActive && <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-current opacity-60" />}
            </button>
          );
        })}
      </div>
    </nav>
  );
}