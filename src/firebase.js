// Firebase client initialization for Room24
// Replace placeholder environment variables with real Firebase project config.
// Ensure you have added a web app in Firebase console and enabled Cloud Messaging.

import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { getAnalytics, logEvent } from 'firebase/analytics';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  setDoc,
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  onSnapshot,
  serverTimestamp 
} from 'firebase/firestore';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  PhoneAuthProvider,
  linkWithCredential,
  linkWithPopup,
  EmailAuthProvider,
  fetchSignInMethodsForEmail
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID,
};

let messagingInstance;
let analyticsInstance;
let firestoreInstance;
let authInstance;
let firebaseApp;

export function initFirebase() {
  firebaseApp = initializeApp(firebaseConfig);
  try {
    messagingInstance = getMessaging(firebaseApp);
  } catch (e) {
    console.warn('Messaging not available', e);
  }
  // Initialize Firestore
  try {
    firestoreInstance = getFirestore(firebaseApp);
    console.log('Firestore initialized');
  } catch (e) {
    console.warn('Firestore not available', e);
  }
  // Initialize Auth
  try {
    authInstance = getAuth(firebaseApp);
    console.log('Auth initialized');
  } catch (e) {
    console.warn('Auth not available', e);
  }
  return firebaseApp;
}

// Get Auth instance
export function getAuthInstance() {
  if (!authInstance && firebaseApp) {
    authInstance = getAuth(firebaseApp);
  }
  return authInstance;
}

// Get Firestore instance
export function getDb() {
  if (!firestoreInstance && firebaseApp) {
    firestoreInstance = getFirestore(firebaseApp);
  }
  return firestoreInstance;
}

// ===========================
// AUTHENTICATION FUNCTIONS
// ===========================

// Sign up with email and password
export async function signUpWithEmail(email, password, displayName) {
  const auth = getAuthInstance();
  if (!auth) throw new Error('Auth not initialized');
  
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  
  // Update display name in background (don't block signup)
  if (displayName) {
    updateProfile(userCredential.user, { displayName })
      .then(() => console.log('Display name updated'))
      .catch(err => console.warn('Could not update display name:', err));
  }
  
  return userCredential.user;
}

// Sign in with email and password
export async function signInWithEmail(email, password) {
  const auth = getAuthInstance();
  if (!auth) throw new Error('Auth not initialized');
  
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
}

// Sign in with Google
export async function signInWithGoogle() {
  const auth = getAuthInstance();
  if (!auth) throw new Error('Auth not initialized');
  
  const provider = new GoogleAuthProvider();
  const userCredential = await signInWithPopup(auth, provider);
  return userCredential.user;
}

// Sign out
export async function signOut() {
  const auth = getAuthInstance();
  if (!auth) throw new Error('Auth not initialized');
  
  await firebaseSignOut(auth);
}

// Listen to auth state changes
export function subscribeToAuthState(callback) {
  const auth = getAuthInstance();
  if (!auth) {
    console.warn('Auth not initialized');
    return () => {};
  }
  
  return onAuthStateChanged(auth, callback);
}

// Send password reset email
export async function resetPassword(email) {
  const auth = getAuthInstance();
  if (!auth) throw new Error('Auth not initialized');
  
  await sendPasswordResetEmail(auth, email);
}

// ===========================
// PHONE AUTHENTICATION
// ===========================

// Store reCAPTCHA verifier instance
let recaptchaVerifier = null;
let confirmationResult = null;

// Initialize reCAPTCHA verifier for phone auth
export function initRecaptcha(buttonId) {
  const auth = getAuthInstance();
  if (!auth) throw new Error('Auth not initialized');
  
  // Clear any existing verifier
  if (recaptchaVerifier) {
    try {
      recaptchaVerifier.clear();
    } catch (e) {
      console.warn('Could not clear recaptcha:', e);
    }
  }
  
  recaptchaVerifier = new RecaptchaVerifier(auth, buttonId, {
    size: 'invisible',
    callback: () => {
      console.log('reCAPTCHA verified');
    },
    'expired-callback': () => {
      console.log('reCAPTCHA expired');
    }
  });
  
  return recaptchaVerifier;
}

// Send OTP to phone number
export async function sendPhoneOTP(phoneNumber) {
  const auth = getAuthInstance();
  if (!auth) throw new Error('Auth not initialized');
  
  if (!recaptchaVerifier) {
    throw new Error('reCAPTCHA not initialized. Call initRecaptcha first.');
  }
  
  // Format phone number for South Africa if not already formatted
  let formattedNumber = phoneNumber.trim();
  if (formattedNumber.startsWith('0')) {
    formattedNumber = '+27' + formattedNumber.slice(1);
  } else if (!formattedNumber.startsWith('+')) {
    formattedNumber = '+27' + formattedNumber;
  }
  
  try {
    confirmationResult = await signInWithPhoneNumber(auth, formattedNumber, recaptchaVerifier);
    console.log('OTP sent successfully');
    return { success: true, formattedNumber };
  } catch (error) {
    console.error('Error sending OTP:', error);
    // Reset reCAPTCHA on error
    if (recaptchaVerifier) {
      try {
        recaptchaVerifier.clear();
        recaptchaVerifier = null;
      } catch (e) {}
    }
    throw error;
  }
}

// Verify OTP code
export async function verifyPhoneOTP(otpCode) {
  if (!confirmationResult) {
    throw new Error('No OTP request pending. Send OTP first.');
  }
  
  try {
    const userCredential = await confirmationResult.confirm(otpCode);
    confirmationResult = null; // Clear after successful verification
    return userCredential.user;
  } catch (error) {
    console.error('Error verifying OTP:', error);
    throw error;
  }
}

// Link phone number to existing account
export async function linkPhoneToAccount(otpCode) {
  const auth = getAuthInstance();
  if (!auth || !auth.currentUser) throw new Error('No user logged in');
  if (!confirmationResult) throw new Error('No OTP request pending');
  
  try {
    const credential = PhoneAuthProvider.credential(
      confirmationResult.verificationId,
      otpCode
    );
    await linkWithCredential(auth.currentUser, credential);
    confirmationResult = null;
    return true;
  } catch (error) {
    console.error('Error linking phone:', error);
    throw error;
  }
}

// Clear reCAPTCHA (useful for cleanup)
export function clearRecaptcha() {
  if (recaptchaVerifier) {
    try {
      recaptchaVerifier.clear();
    } catch (e) {}
    recaptchaVerifier = null;
  }
  confirmationResult = null;
}

// ===========================
// ACCOUNT LINKING FUNCTIONS
// ===========================

// Get linked providers for current user
export function getLinkedProviders() {
  const auth = getAuthInstance();
  if (!auth?.currentUser) return [];
  
  return auth.currentUser.providerData.map(provider => provider.providerId);
}

// Link Google account to existing user
export async function linkGoogleAccount() {
  const auth = getAuthInstance();
  if (!auth?.currentUser) throw new Error('No user logged in');
  
  try {
    const provider = new GoogleAuthProvider();
    const result = await linkWithPopup(auth.currentUser, provider);
    console.log('Google account linked successfully');
    return result.user;
  } catch (error) {
    console.error('Error linking Google account:', error);
    if (error.code === 'auth/credential-already-in-use') {
      throw new Error('This Google account is already linked to another user');
    }
    throw error;
  }
}

// Link email/password to existing user (e.g., if they signed up with Google/Phone)
export async function linkEmailPassword(email, password) {
  const auth = getAuthInstance();
  if (!auth?.currentUser) throw new Error('No user logged in');
  
  try {
    const credential = EmailAuthProvider.credential(email, password);
    const result = await linkWithCredential(auth.currentUser, credential);
    console.log('Email/password linked successfully');
    return result.user;
  } catch (error) {
    console.error('Error linking email/password:', error);
    if (error.code === 'auth/email-already-in-use') {
      throw new Error('This email is already linked to another account');
    }
    throw error;
  }
}

// Check what sign-in methods are available for an email
export async function getSignInMethodsForEmail(email) {
  const auth = getAuthInstance();
  if (!auth) return [];
  
  try {
    const methods = await fetchSignInMethodsForEmail(auth, email);
    return methods;
  } catch (error) {
    console.error('Error fetching sign-in methods:', error);
    return [];
  }
}

// Get current user
export function getCurrentUser() {
  const auth = getAuthInstance();
  return auth?.currentUser || null;
}

// ===========================
// USER PROFILE FUNCTIONS
// ===========================

// Get user profile from Firestore
export async function getUserProfile(userId) {
  const db = getDb();
  if (!db) return null;
  
  try {
    const userRef = doc(db, 'users', userId);
    const snapshot = await getDoc(userRef);
    if (snapshot.exists()) {
      return { id: snapshot.id, ...snapshot.data() };
    }
    return null;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
}

// Create or update user profile in Firestore
export async function saveUserProfile(userId, profileData) {
  const db = getDb();
  if (!db) throw new Error('Firestore not initialized');
  
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, {
      ...profileData,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    console.log('User profile saved:', userId);
    return true;
  } catch (error) {
    console.error('Error saving user profile:', error);
    throw error;
  }
}

// ===========================
// LISTINGS FIRESTORE FUNCTIONS
// ===========================

// Fetch all listings from Firestore
export async function fetchListings() {
  const db = getDb();
  if (!db) {
    console.warn('Firestore not initialized, using localStorage');
    return null; // Fall back to localStorage
  }
  try {
    const listingsRef = collection(db, 'listings');
    const q = query(listingsRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    const listings = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      // Convert Firestore timestamps to ISO strings
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
      availableDate: doc.data().availableDate?.toDate?.()?.toISOString() || doc.data().availableDate,
    }));
    console.log(`Fetched ${listings.length} listings from Firestore`);
    return listings;
  } catch (error) {
    console.error('Error fetching listings from Firestore:', error);
    return null; // Fall back to localStorage
  }
}

// Add a new listing to Firestore
export async function addListing(listingData) {
  const db = getDb();
  if (!db) {
    console.warn('Firestore not initialized');
    return null;
  }
  try {
    const listingsRef = collection(db, 'listings');
    const docRef = await addDoc(listingsRef, {
      ...listingData,
      createdAt: serverTimestamp(),
      status: 'available',
    });
    console.log('Listing added with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error adding listing to Firestore:', error);
    throw error;
  }
}

// Update an existing listing
export async function updateListing(listingId, updates) {
  const db = getDb();
  if (!db) {
    console.warn('Firestore not initialized');
    return false;
  }
  try {
    const listingRef = doc(db, 'listings', listingId);
    await updateDoc(listingRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
    console.log('Listing updated:', listingId);
    return true;
  } catch (error) {
    console.error('Error updating listing in Firestore:', error);
    throw error;
  }
}

// Delete a listing
export async function deleteListing(listingId) {
  const db = getDb();
  if (!db) {
    console.warn('Firestore not initialized');
    return false;
  }
  try {
    const listingRef = doc(db, 'listings', listingId);
    await deleteDoc(listingRef);
    console.log('Listing deleted:', listingId);
    return true;
  } catch (error) {
    console.error('Error deleting listing from Firestore:', error);
    throw error;
  }
}

// Get listings by landlord ID
export async function fetchListingsByLandlord(landlordId) {
  const db = getDb();
  if (!db) return null;
  try {
    const listingsRef = collection(db, 'listings');
    const q = query(listingsRef, where('landlordId', '==', landlordId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
      availableDate: doc.data().availableDate?.toDate?.()?.toISOString() || doc.data().availableDate,
    }));
  } catch (error) {
    console.error('Error fetching landlord listings:', error);
    return null;
  }
}

// Subscribe to real-time listing updates
export function subscribeToListings(callback) {
  const db = getDb();
  if (!db) {
    console.warn('Firestore not initialized for real-time updates');
    return null;
  }
  try {
    const listingsRef = collection(db, 'listings');
    const q = query(listingsRef, orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const listings = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
        availableDate: doc.data().availableDate?.toDate?.()?.toISOString() || doc.data().availableDate,
      }));
      console.log(`Real-time update: ${listings.length} listings`);
      callback(listings);
    }, (error) => {
      console.error('Real-time listener error:', error);
    });
    
    return unsubscribe;
  } catch (error) {
    console.error('Error setting up real-time listener:', error);
    return null;
  }
}

// Check if Firestore is available and configured
export function isFirestoreEnabled() {
  return !!process.env.REACT_APP_FIREBASE_PROJECT_ID && !!getDb();
}

export function initAnalytics(app) {
  if (process.env.REACT_APP_ENABLE_ANALYTICS !== 'true') return;
  const consent = localStorage.getItem('analytics-consent');
  if (consent !== 'yes') return;
  try {
    analyticsInstance = getAnalytics(app);
    console.log('Analytics initialized');
  } catch (e) {
    console.warn('Analytics not available', e);
  }
}

export function trackEvent(eventName, params = {}) {
  if (!analyticsInstance) return;
  try {
    logEvent(analyticsInstance, eventName, params);
  } catch (e) {
    console.warn('Event tracking failed', e);
  }
}

// Request notification permission and fetch token
export async function requestFcmToken() {
  if (!messagingInstance) return null;
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    console.log('Notification permission denied');
    return null;
  }
  try {
    const vapidKey = process.env.REACT_APP_FIREBASE_VAPID_KEY; // Public VAPID key
    const currentToken = await getToken(messagingInstance, { vapidKey });
    if (currentToken) {
      console.log('FCM token:', currentToken);
      // Persist token to backend if configured
      try {
        const backend = process.env.REACT_APP_BACKEND_URL;
        if (backend) {
          await fetch(`${backend.replace(/\/$/, '')}/api/push/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: currentToken })
          });
        }
      } catch (e) {
        console.warn('Token persistence failed', e);
      }
      return currentToken;
    } else {
      console.log('No registration token available.');
      return null;
    }
  } catch (err) {
    console.error('An error occurred while retrieving token.', err);
    return null;
  }
}

export function listenForegroundMessages(callback) {
  if (!messagingInstance) return;
  onMessage(messagingInstance, payload => {
    console.log('Foreground message received', payload);
    if (callback) callback(payload);
  });
}
