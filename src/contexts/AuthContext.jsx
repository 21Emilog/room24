import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  initFirebase,
  subscribeToAuthState,
  signUpWithEmail,
  signInWithEmail,
  signInWithGoogle,
  signOut as firebaseSignOut,
  resetPassword,
  getUserProfile,
  saveUserProfile
} from '../firebase';

// Create the context
const AuthContext = createContext(null);

// Custom hook to use the auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Auth Provider component
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // Firebase user
  const [userProfile, setUserProfile] = useState(null); // Extended profile from Firestore
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize Firebase and listen to auth state
  useEffect(() => {
    initFirebase();
    
    const unsubscribe = subscribeToAuthState(async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        // Fetch extended profile from Firestore
        try {
          const profile = await getUserProfile(firebaseUser.uid);
          setUserProfile(profile);
        } catch (err) {
          console.error('Error fetching user profile:', err);
        }
      } else {
        setUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Sign up with email/password
  const signUp = async (email, password, displayName, userType = 'renter', phone = '') => {
    setError(null);
    try {
      const firebaseUser = await signUpWithEmail(email, password, displayName);
      
      // Create user profile in Firestore
      const profileData = {
        email: firebaseUser.email,
        displayName: displayName || firebaseUser.displayName,
        userType,
        phone,
        photoURL: firebaseUser.photoURL || '',
        createdAt: new Date().toISOString(),
        landlordComplete: userType === 'renter', // Renters don't need onboarding
      };
      
      await saveUserProfile(firebaseUser.uid, profileData);
      setUserProfile({ id: firebaseUser.uid, ...profileData });
      
      return firebaseUser;
    } catch (err) {
      console.error('Sign up error:', err);
      setError(getAuthErrorMessage(err.code));
      throw err;
    }
  };

  // Sign in with email/password
  const signIn = async (email, password) => {
    setError(null);
    try {
      const firebaseUser = await signInWithEmail(email, password);
      
      // Fetch profile
      const profile = await getUserProfile(firebaseUser.uid);
      setUserProfile(profile);
      
      return firebaseUser;
    } catch (err) {
      console.error('Sign in error:', err);
      setError(getAuthErrorMessage(err.code));
      throw err;
    }
  };

  // Sign in with Google
  const signInGoogle = async (userType = 'renter') => {
    setError(null);
    try {
      const firebaseUser = await signInWithGoogle();
      
      // Check if user profile exists
      let profile = await getUserProfile(firebaseUser.uid);
      
      if (!profile) {
        // Create new profile for Google user
        const profileData = {
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || '',
          userType,
          phone: firebaseUser.phoneNumber || '',
          photoURL: firebaseUser.photoURL || '',
          createdAt: new Date().toISOString(),
          landlordComplete: userType === 'renter',
        };
        
        await saveUserProfile(firebaseUser.uid, profileData);
        profile = { id: firebaseUser.uid, ...profileData };
      }
      
      setUserProfile(profile);
      return firebaseUser;
    } catch (err) {
      console.error('Google sign in error:', err);
      setError(getAuthErrorMessage(err.code));
      throw err;
    }
  };

  // Sign out
  const signOut = async () => {
    setError(null);
    try {
      await firebaseSignOut();
      setUser(null);
      setUserProfile(null);
    } catch (err) {
      console.error('Sign out error:', err);
      setError(getAuthErrorMessage(err.code));
      throw err;
    }
  };

  // Update user profile
  const updateUserProfile = async (updates) => {
    if (!user) throw new Error('No user logged in');
    
    try {
      await saveUserProfile(user.uid, updates);
      setUserProfile(prev => ({ ...prev, ...updates }));
    } catch (err) {
      console.error('Update profile error:', err);
      throw err;
    }
  };

  // Reset password
  const sendPasswordReset = async (email) => {
    setError(null);
    try {
      await resetPassword(email);
    } catch (err) {
      console.error('Password reset error:', err);
      setError(getAuthErrorMessage(err.code));
      throw err;
    }
  };

  // Helper to get user-friendly error messages
  function getAuthErrorMessage(code) {
    const messages = {
      'auth/email-already-in-use': 'This email is already registered. Try signing in instead.',
      'auth/invalid-email': 'Please enter a valid email address.',
      'auth/operation-not-allowed': 'This sign-in method is not enabled.',
      'auth/weak-password': 'Password should be at least 6 characters.',
      'auth/user-disabled': 'This account has been disabled.',
      'auth/user-not-found': 'No account found with this email.',
      'auth/wrong-password': 'Incorrect password. Please try again.',
      'auth/invalid-credential': 'Invalid email or password.',
      'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
      'auth/popup-closed-by-user': 'Sign-in popup was closed. Please try again.',
      'auth/network-request-failed': 'Network error. Please check your connection.',
    };
    return messages[code] || 'An error occurred. Please try again.';
  }

  const value = {
    user,
    userProfile,
    loading,
    error,
    isAuthenticated: !!user,
    isLandlord: userProfile?.userType === 'landlord',
    isRenter: userProfile?.userType === 'renter',
    signUp,
    signIn,
    signInGoogle,
    signOut,
    updateUserProfile,
    sendPasswordReset,
    clearError: () => setError(null),
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthContext;
