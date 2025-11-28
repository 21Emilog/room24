import React, { useState, useEffect } from 'react';
import { Home, MessageSquare, PlusCircle, Search, MapPin, X, Send, ArrowLeft, User, Phone, Mail, Edit } from 'lucide-react';
import MapView from './MapView';
export default function RentalPlatform() {
  const [currentView, setCurrentView] = useState('browse');
  const [mapView, setMapView] = useState(false);
  const [userType, setUserType] = useState(null);
  const [listings, setListings] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [selectedListing, setSelectedListing] = useState(null);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [searchLocation, setSearchLocation] = useState('');
  const [priceRange, setPriceRange] = useState([0, 10000]);
  const [selectedAmenities, setSelectedAmenities] = useState([]);
  const [sortBy, setSortBy] = useState('newest');
  const [currentUser, setCurrentUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authDefaultType, setAuthDefaultType] = useState('renter');
  const [nearbyMode, setNearbyMode] = useState(false);
  const [nearbyRadius, setNearbyRadius] = useState(5); // km
  const [userLocation, setUserLocation] = useState(null);
  const [nearbyStatus, setNearbyStatus] = useState('');

  const openAuthModal = (type = 'renter') => {
    setAuthDefaultType(type);
    setShowAuthModal(true);
  };
  

  useEffect(() => {
    loadData();
  }, []);

  // Guard: if someone navigates to 'add' without landlord auth, prompt to sign in
  useEffect(() => {
    if (currentView === 'add') {
      if (!currentUser) {
        openAuthModal('landlord');
        setCurrentView('browse');
      } else if (userType !== 'landlord') {
        // Not a landlord - prompt to become one
        openAuthModal('landlord');
        setCurrentView('browse');
      } else if (!currentUser.landlordComplete) {
        // Landlord but hasn't completed onboarding
        setCurrentView('landlord-onboarding');
      }
    }
  }, [currentView, currentUser, userType]);

  const loadData = async () => {
    try {
      const listingsResult = localStorage.getItem('listings');
      const conversationsResult = localStorage.getItem('conversations');
      const userResult = localStorage.getItem('current-user');
      
      if (listingsResult) setListings(JSON.parse(listingsResult));
      if (conversationsResult) setConversations(JSON.parse(conversationsResult));
      if (userResult) {
        const user = JSON.parse(userResult);
        setCurrentUser(user);
        setUserType(user.type);
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

  // Haversine formula to compute distance in kilometers between two coords
  const haversineDistance = (lat1, lon1, lat2, lon2) => {
    const toRad = (v) => (v * Math.PI) / 180;
    const R = 6371; // km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const handleFindNearby = () => {
    if (!navigator.geolocation) {
      setNearbyStatus('Geolocation not supported');
      return;
    }
    setNearbyStatus('Locating...');
    navigator.geolocation.getCurrentPosition((pos) => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      setUserLocation({ lat, lon });
      setNearbyMode(true);
      setNearbyStatus('Nearby mode enabled');
      setTimeout(() => setNearbyStatus(''), 2000);
    }, (err) => {
      console.error('Geolocation error', err);
      setNearbyStatus('Could not get location');
    }, { enableHighAccuracy: true, timeout: 10000 });
  };

  const clearNearby = () => {
    setNearbyMode(false);
    setUserLocation(null);
    setNearbyStatus('');
  };

  const saveListings = async (newListings) => {
    try {
      localStorage.setItem('listings', JSON.stringify(newListings));
      setListings(newListings);
    } catch (error) {
      console.error('Error saving listings:', error);
    }
  };

  const saveConversations = async (newConversations) => {
    try {
      localStorage.setItem('conversations', JSON.stringify(newConversations));
      setConversations(newConversations);
    } catch (error) {
      console.error('Error saving conversations:', error);
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
    const userId = `user-${Date.now()}`;
    const user = { 
      id: userId, 
      type: userType, 
      ...profileData,
      createdAt: new Date().toISOString()
    };
    
    localStorage.setItem('current-user', JSON.stringify(user));
    setCurrentUser(user);
    setCurrentView('browse');
  } catch (error) {
    console.error('Error saving profile:', error);
    // Still set the user locally even if storage fails
    const userId = `user-${Date.now()}`;
    const user = { 
      id: userId, 
      type: userType, 
      ...profileData,
      createdAt: new Date().toISOString()
    };
    setCurrentUser(user);
    setCurrentView('browse');
  }
};

const handleUpdateProfile = async (profileData) => {
  try {
    const updatedUser = { ...currentUser, ...profileData };
    
    localStorage.setItem('current-user', JSON.stringify(updatedUser));
    setCurrentUser(updatedUser);
    setCurrentView('browse');
  } catch (error) {
    console.error('Error updating profile:', error);
    const updatedUser = { ...currentUser, ...profileData };
    setCurrentUser(updatedUser);
    setCurrentView('browse');
  }
};

const handleQuickAuth = async (profileData) => {
  // Lightweight auth (used by AuthModal) - create and persist a user
  try {
    const userId = `user-${Date.now()}`;
    const user = {
      id: userId,
      type: profileData.type || 'renter',
      name: profileData.name,
      phone: profileData.phone || '',
      email: profileData.email || '',
      photo: profileData.photo || '',
      createdAt: new Date().toISOString()
    };
    localStorage.setItem('current-user', JSON.stringify(user));
    setCurrentUser(user);
    setUserType(user.type);
    setShowAuthModal(false);
    // If landlord, route to onboarding to complete setup before posting
    if (user.type === 'landlord') {
      setCurrentView('landlord-onboarding');
    } else {
      setCurrentView('browse');
    }
  } catch (err) {
    console.error('Auth failed', err);
  }
};

const handleCompleteOnboarding = async (onboardData) => {
  try {
    const updated = { ...currentUser, landlordComplete: true, landlordInfo: onboardData };
    localStorage.setItem('current-user', JSON.stringify(updated));
    setCurrentUser(updated);
    setCurrentView('browse');
  } catch (err) {
    console.error('Onboarding save failed', err);
    setCurrentUser({ ...currentUser, landlordComplete: true, landlordInfo: onboardData });
    setCurrentView('browse');
  }
};

const handleAddListing = async (listingData) => {
  const newListing = {
    id: `listing-${Date.now()}`,
    title: listingData.title,
    price: listingData.price,
    location: listingData.location,
    description: listingData.description,
    photos: listingData.photos || [],
    status: listingData.status || 'available',
    availableDate: listingData.availableDate || new Date().toISOString(),
    amenities: listingData.amenities || [],
    latitude: listingData.latitude ?? null,
    longitude: listingData.longitude ?? null,
    landlordId: currentUser.id,
    landlordName: currentUser.name,
    landlordPhone: currentUser.phone,
    landlordEmail: currentUser.email,
    landlordPhoto: currentUser.photo,
    createdAt: new Date().toISOString()
  };

    const updatedListings = [...listings, newListing];
    await saveListings(updatedListings);
    setCurrentView('browse');
  };

  const handleSendMessage = async (listingId, message) => {
    const conversationId = `${currentUser.id}-${listingId}`;
    const existingConv = conversations.find(c => c.id === conversationId);
    
    const newMessage = {
      id: `msg-${Date.now()}`,
      sender: currentUser.type,
      text: message,
      timestamp: new Date().toISOString()
    };

    let updatedConversations;
    if (existingConv) {
      updatedConversations = conversations.map(c => 
        c.id === conversationId 
          ? { ...c, messages: [...c.messages, newMessage] }
          : c
      );
    } else {
      const newConv = {
        id: conversationId,
        listingId,
        renterId: currentUser.id,
        messages: [newMessage]
      };
      updatedConversations = [...conversations, newConv];
    }
    
    await saveConversations(updatedConversations);
  };

const filteredListings = listings
  .map(listing => {
    // attach distance if we have userLocation
    if (userLocation && listing.latitude != null && listing.longitude != null) {
      const d = haversineDistance(userLocation.lat, userLocation.lon, listing.latitude, listing.longitude);
      return { ...listing, __distanceKm: d };
    }
    if (userLocation && (listing.latitude == null || listing.longitude == null)) {
      // try to geocode-less accurate: leave distance undefined
      return { ...listing };
    }
    return { ...listing };
  })
  .filter(listing => {
    const matchesLocation = !searchLocation || 
      (listing.location || '').toLowerCase().includes(searchLocation.toLowerCase());
    const price = parseFloat(listing.price);
    const matchesPrice = price >= priceRange[0] && price <= priceRange[1];
    const matchesAmenities = selectedAmenities.length === 0 || 
      selectedAmenities.every(amenity => listing.amenities?.includes(amenity));

    let passesNearby = true;
    if (nearbyMode && userLocation) {
      // require listing to have coordinates to be included
      if (listing.latitude != null && listing.longitude != null) {
        const d = listing.__distanceKm ?? haversineDistance(userLocation.lat, userLocation.lon, listing.latitude, listing.longitude);
        passesNearby = d <= nearbyRadius;
      } else {
        passesNearby = false;
      }
    }

    return matchesLocation && matchesPrice && matchesAmenities && passesNearby;
  })
  .sort((a, b) => {
    if (nearbyMode && userLocation) {
      const da = a.__distanceKm ?? Infinity;
      const db = b.__distanceKm ?? Infinity;
      return da - db;
    }
    if (sortBy === 'newest') {
      return new Date(b.createdAt) - new Date(a.createdAt);
    } else if (sortBy === 'cheapest') {
      return parseFloat(a.price) - parseFloat(b.price);
    } else if (sortBy === 'expensive') {
      return parseFloat(b.price) - parseFloat(a.price);
    }
    return 0;
  });

  const userConversations = currentUser
    ? conversations.filter(conv => {
        if (userType === 'landlord') {
          const listing = listings.find(l => l.id === conv.listingId);
          return listing && listing.landlordId === currentUser.id;
        }
        return conv.renterId === currentUser.id;
      })
    : [];

  // Allow guests to land on Browse by default. If userType isn't set,
  // show a gentle callout in the header (below) so users can pick a role
  // when they want to post or set up their profile.

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Modern Professional Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-8">
            {!currentUser && (
              <div className="flex items-center gap-3">
                <button onClick={() => openAuthModal('renter')} className="text-gray-600 hover:text-gray-800 px-3 py-2 rounded-lg">Sign in</button>
                <button onClick={() => openAuthModal('landlord')} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg">List Your Room</button>
              </div>
            )}
            <h1 className="text-2xl font-bold">
              <span className="text-blue-600">Room</span><span className="text-red-500">24</span>
            </h1>
            {currentUser && (
              <div className="hidden md:flex items-center gap-2 text-sm">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold">
                  {currentUser.name.charAt(0)}
                </div>
                <div>
                  <p className="font-medium text-gray-800">{currentUser.name}</p>
                  <p className="text-xs text-gray-500">{currentUser.type === 'landlord' ? 'Property Owner' : 'Looking for a Room'}</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            {userConversations.length > 0 && (
              <button 
                onClick={() => setCurrentView('messages')}
                className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                <MessageSquare className="w-6 h-6" />
                {userConversations.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                    {userConversations.length}
                  </span>
                )}
              </button>
            )}
            <button 
              onClick={() => setCurrentView('profile')}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
            >
              <User className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto pb-20">
        {currentView === 'setup-profile' && (
          <ProfileSetupView onSubmit={handleProfileSetup} userType={userType} />
        )}

        {currentView === 'profile' && currentUser && (
          <ProfileView user={currentUser} onEdit={() => setCurrentView('edit-profile')} />
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
            mapView={mapView}
            setMapView={setMapView}
            onSelectListing={setSelectedListing}
            setCurrentView={setCurrentView}
            currentUser={currentUser}
            onRequireAuth={openAuthModal}
            subscribeToArea={subscribeToArea}
            onFindNearby={handleFindNearby}
            nearbyRadius={nearbyRadius}
            setNearbyRadius={setNearbyRadius}
            nearbyMode={nearbyMode}
            clearNearby={clearNearby}
            userLocation={userLocation}
            nearbyStatus={nearbyStatus}
          />
        )}

        {currentView === 'messages' && (
          <MessagesView 
            conversations={userConversations}
            listings={listings}
            userType={userType}
            onSelectConversation={setSelectedConversation}
          />
        )}

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
            listings={listings.filter(l => l.landlordId === currentUser.id)}
            onDelete={async (id) => {
              const updated = listings.filter(l => l.id !== id);
              await saveListings(updated);
            }}
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
          onSendMessage={handleSendMessage}
          userType={userType}
          currentUser={currentUser}
          onRequireAuth={openAuthModal}
        />
      )}

      {selectedConversation && (
        <ConversationModal
          conversation={selectedConversation}
          listing={listings.find(l => l.id === selectedConversation.listingId)}
          onClose={() => setSelectedConversation(null)}
          onSendMessage={handleSendMessage}
        />
      )}

      {showAuthModal && (
        <AuthModal
          defaultType={authDefaultType}
          onClose={() => setShowAuthModal(false)}
          onSubmit={handleQuickAuth}
        />
      )}

      <BottomNav 
        currentView={currentView}
        setCurrentView={setCurrentView}
        userType={userType}
        messageCount={userConversations.length}
      />
    </div>
  );
}



function ProfileSetupView({ onSubmit, userType }) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    photo: ''
  });

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
    if (formData.name && formData.phone && formData.email) {
      onSubmit(formData);
    }
  };

  return (
    <div className="p-4 min-h-screen bg-gray-50 pb-20">
      <div className="max-w-2xl mx-auto mt-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Complete Your Profile</h2>
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
                <label className="absolute bottom-0 right-0 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full cursor-pointer shadow-lg transition group">
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
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter your full name"
                className="w-full px-4 py-3 border border-gray-300 bg-white text-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition placeholder-gray-400"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">Phone Number *</label>
              <div className="relative">
                <Phone className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="e.g., +27 12 345 6789"
                  className="w-full pl-11 pr-4 py-3 border border-gray-300 bg-white text-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition placeholder-gray-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">Email Address *</label>
              <div className="relative">
                <Mail className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="your.email@example.com"
                  className="w-full pl-11 pr-4 py-3 border border-gray-300 bg-white text-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition placeholder-gray-400"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition mt-8 shadow-sm"
            >
              Complete Setup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfileView({ user, onEdit }) {
  return (
    <div className="p-4">
      <div className="bg-white rounded-lg shadow p-6 max-w-xl mx-auto">
        <div className="flex justify-between items-start mb-6">
          <h2 className="text-2xl font-bold text-gray-800">My Profile</h2>
          <button
            onClick={onEdit}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition flex items-center gap-2"
          >
            <Edit className="w-4 h-4" />
            Edit
          </button>
        </div>

        <div className="flex flex-col items-center mb-6">
          {user.photo ? (
            <img src={user.photo} alt="Profile" className="w-32 h-32 rounded-full object-cover border-4 border-blue-500 mb-4" />
          ) : (
            <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center border-4 border-gray-300 mb-4">
              <User className="w-16 h-16 text-gray-400" />
            </div>
          )}
          <h3 className="text-2xl font-bold text-gray-800">{user.name}</h3>
          <span className="inline-block mt-2 px-4 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
            {user.type === 'landlord' ? 'Landlord' : 'Renter'}
          </span>
        </div>

        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center text-gray-600">
              <Phone className="w-5 h-5 mr-3 text-blue-600" />
              <div>
                <p className="text-xs text-gray-500 mb-1">Phone Number</p>
                <p className="font-semibold text-gray-800">{user.phone}</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center text-gray-600">
              <Mail className="w-5 h-5 mr-3 text-blue-600" />
              <div>
                <p className="text-xs text-gray-500 mb-1">Email Address</p>
                <p className="font-semibold text-gray-800">{user.email}</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center text-gray-600">
              <User className="w-5 h-5 mr-3 text-blue-600" />
              <div>
                <p className="text-xs text-gray-500 mb-1">Member Since</p>
                <p className="font-semibold text-gray-800">
                  {new Date(user.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
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
    <div className="p-4 min-h-screen bg-gray-50 pb-20">
      <div className="max-w-2xl mx-auto mt-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="flex items-center gap-6 mb-6">
            <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 text-2xl font-bold">
              {currentUser && currentUser.name ? currentUser.name.charAt(0) : 'L'}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Welcome, {currentUser?.name || 'Landlord'}</h2>
              <p className="text-gray-600">A few details to get your listings live and increase trust with renters.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">Display Name *</label>
              <input value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-lg" />
              <p className="text-xs text-gray-500 mt-1">This name is shown to renters on your listings and messages.</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">How do you want to receive payments?</label>
              <input value={form.bankDetails} onChange={(e) => setForm({ ...form, bankDetails: e.target.value })} placeholder="Bank account or payment details (optional)" className="w-full px-4 py-3 border border-gray-300 rounded-lg" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">ID Number (optional)</label>
              <input value={form.idNumber} onChange={(e) => setForm({ ...form, idNumber: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-lg" />
            </div>

            <div className="flex items-start gap-2">
              <input type="checkbox" checked={form.agree} onChange={(e) => setForm({ ...form, agree: e.target.checked })} />
              <div className="text-sm text-gray-600">I confirm I am authorised to list these properties and agree to the <button type="button" onClick={(e) => e.preventDefault()} className="text-blue-600 underline p-0">terms of service</button>.</div>
            </div>

            <div className="flex gap-3 pt-4">
              <button onClick={onCancel} className="flex-1 bg-gray-100 hover:bg-gray-200 py-3 rounded">Cancel</button>
              <button onClick={handleSubmit} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded">Complete and Start Listing</button>
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
    photo: user.photo || ''
  });

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
    if (formData.name && formData.phone && formData.email) {
      onSubmit(formData);
    }
  };

  return (
    <div className="p-4 min-h-screen bg-gray-50 pb-20">
      <div className="max-w-2xl mx-auto mt-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-gray-800">Edit Profile</h2>
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
                <label className="absolute bottom-0 right-0 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full cursor-pointer shadow-lg transition">
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
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 bg-white text-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition placeholder-gray-400"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full pl-11 pr-4 py-3 border border-gray-300 bg-white text-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition placeholder-gray-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-11 pr-4 py-3 border border-gray-300 bg-white text-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition placeholder-gray-400"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-6 border-t border-gray-200">
              <button
                onClick={onCancel}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-3 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition shadow-sm"
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

function BrowseView({ 
  listings, 
  searchLocation, 
  setSearchLocation, 
  priceRange, 
  setPriceRange,
  selectedAmenities,
  setSelectedAmenities,
  sortBy,
  setSortBy,
  mapView,
  setMapView,
  onSelectListing,
  setCurrentView,
  currentUser, onRequireAuth, subscribeToArea,
  onFindNearby, nearbyRadius, setNearbyRadius, nearbyMode, clearNearby, userLocation, nearbyStatus
}) {
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  return (
    <div className="bg-gray-50 min-h-screen pb-20">
      {/* Hero Search Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Main Search Bar */}
          <div className="mb-6">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <MapPin className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by location, suburb, or area..."
                  value={searchLocation}
                  onChange={(e) => setSearchLocation(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition font-semibold shadow-sm">
                  Search
                </button>

                <button
                  onClick={() => {
                    if (!searchLocation || searchLocation.trim() === '') {
                      alert('Enter a location to subscribe to updates for that area.');
                      return;
                    }
                    if (!currentUser) {
                      onRequireAuth && onRequireAuth('renter');
                      return;
                    }
                    subscribeToArea && subscribeToArea(currentUser.id, searchLocation.trim());
                  }}
                  className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition text-sm"
                >
                  Subscribe to area
                </button>

                <button
                  type="button"
                  onClick={() => onFindNearby && onFindNearby()}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
                >
                  Find Nearby
                </button>

                <select value={nearbyRadius} onChange={(e) => setNearbyRadius(parseInt(e.target.value))} className="text-sm bg-gray-50 border border-gray-200 px-3 py-2 rounded-lg text-gray-700">
                  <option value={1}>1 km</option>
                  <option value={3}>3 km</option>
                  <option value={5}>5 km</option>
                  <option value={10}>10 km</option>
                </select>

                {nearbyMode && (
                  <button onClick={clearNearby} className="bg-white border border-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm">Clear</button>
                )}

                <div className="text-sm text-gray-600">
                  {nearbyStatus}
                </div>
              </div>
            </div>
          </div>

          {/* Smart Filters Row */}
          <div className="flex gap-2 mb-4 flex-wrap items-center">
            {/* Price Range */}
            <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
              <span className="text-sm text-gray-600 font-medium">R{priceRange[0].toLocaleString()} - R{priceRange[1].toLocaleString()}</span>
              <select
                value={priceRange[0]}
                onChange={(e) => setPriceRange([parseInt(e.target.value), priceRange[1]])}
                className="text-xs bg-transparent border-l border-gray-300 pl-2 text-gray-600 focus:outline-none"
              >
                <option value="0">Min</option>
                <option value="500">R500</option>
                <option value="1000">R1000</option>
                <option value="1500">R1500</option>
              </select>
            </div>

            {/* Sort */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="text-sm bg-gray-50 border border-gray-200 px-3 py-2 rounded-lg text-gray-700 focus:ring-2 focus:ring-blue-500"
              >
                <option value="newest">Newest</option>
                <option value="cheapest">Cheapest</option>
                <option value="expensive">Most Expensive</option>
              </select>
            </div>

            {/* More Filters Button */}
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium px-3 py-2 rounded-lg hover:bg-blue-50 transition"
            >
              {showAdvancedFilters ? '✕ Close Filters' : '⚙️ More Filters'}
            </button>
          </div>

          {/* Advanced Filters (Collapsible) */}
          {showAdvancedFilters && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-semibold text-gray-700 block mb-2">Property Type</label>
                  <select className="w-full text-sm border border-gray-300 px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500">
                    <option>Any</option>
                    <option>Room</option>
                    <option>Apartment</option>
                    <option>House</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 block mb-2">Max Price</label>
                  <select
                    value={priceRange[1]}
                    onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                    className="w-full text-sm border border-gray-300 px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="10000">Up to R10,000</option>
                    <option value="5000">Up to R5,000</option>
                    <option value="3000">Up to R3,000</option>
                    <option value="2000">Up to R2,000</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Call-to-Action Section */}
      {listings.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-6 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-1">Have a room to rent?</h3>
                <p className="text-gray-600 text-sm">Join thousands of landlords earning with Room24</p>
              </div>
              <button 
                onClick={() => setCurrentView('add')}
                className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg font-semibold transition shadow-md">
                List Your Room
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Map / List Toggle - only relevant when there are listings */}
      {listings.length > 0 && (
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setMapView(!mapView)}
              className="text-sm px-3 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50"
            >
              {mapView ? 'Show List' : 'Show Map'}
            </button>
          </div>
          {mapView && (
              <MapView
                listings={listings}
                onMarkerClick={(l) => onSelectListing(l)}
                userLocation={userLocation}
                nearbyRadius={nearbyRadius}
              />
          )}
        </div>
      )}

      {/* Results Section */}
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800">
            {listings.length === 0 ? 'No rooms available' : `${listings.length} Rooms Available`}
          </h2>
          <p className="text-sm text-gray-500 mt-1">Find your perfect room today</p>
        </div>

        {listings.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <Home className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-600 font-medium mb-2">No rooms match your search</p>
            <p className="text-gray-500 text-sm mb-4">Try adjusting your filters or search in a different location</p>
            <button
              onClick={() => {
                setSearchLocation('');
                setPriceRange([0, 10000]);
              }}
              className="text-blue-600 hover:text-blue-700 font-medium text-sm"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {listings.map(listing => (
              <ListingCard key={listing.id} listing={listing} onClick={() => onSelectListing(listing)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
function ListingCard({ listing, onClick }) {
  return (
    <div 
      onClick={onClick}
      className="bg-white rounded-lg shadow hover:shadow-xl transition-all duration-200 cursor-pointer overflow-hidden border border-gray-100 hover:border-blue-300 group"
    >
      {/* Image Container */}
      {listing.photos && listing.photos.length > 0 ? (
        <div className="relative bg-gray-200 aspect-video overflow-hidden">
          <img src={listing.photos[0]} alt="Room" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          <div className="absolute top-3 right-3 flex gap-2">
            {listing.photos.length > 1 && (
              <div className="bg-black bg-opacity-60 text-white px-2 py-1 rounded-md text-xs font-semibold">
                {listing.photos.length} 📸
              </div>
            )}
          </div>
          <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-5 transition-opacity" />
        </div>
      ) : (
        <div className="bg-gradient-to-br from-gray-200 to-gray-300 aspect-video flex items-center justify-center">
          <Home className="w-12 h-12 text-gray-400" />
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        {/* Title & Price Header */}
        <div className="mb-3">
          <h3 className="font-bold text-lg text-gray-800 group-hover:text-blue-600 transition mb-1 line-clamp-2">
            {listing.title}
          </h3>
          <p className="text-red-600 font-bold text-xl">R{listing.price.toLocaleString()}/month</p>
        </div>

        {/* Location */}
        <div className="flex items-center text-gray-600 text-sm mb-3 pb-3 border-b border-gray-100">
          <MapPin className="w-4 h-4 mr-2 text-blue-500 flex-shrink-0" />
          <span className="truncate">{listing.location}</span>
          {typeof listing.__distanceKm === 'number' && (
            <span className="ml-2 text-xs text-gray-500">• {listing.__distanceKm.toFixed(1)} km</span>
          )}
        </div>

        {/* Description */}
        <p className="text-gray-600 text-sm line-clamp-2 mb-3">
          {listing.description}
        </p>

        {/* Amenities */}
        {listing.amenities && listing.amenities.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {listing.amenities.slice(0, 3).map((amenity, index) => (
              <span key={index} className="inline-block bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-full font-medium">
                {amenity}
              </span>
            ))}
            {listing.amenities.length > 3 && (
              <span className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full font-medium">
                +{listing.amenities.length - 3}
              </span>
            )}
          </div>
        )}

        {/* CTA Button */}
        <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-semibold text-sm transition">
          View Details
        </button>
      </div>
    </div>
  );
}

function AddListingView({ onSubmit, onCancel, currentUser, userType, onRequireAuth, onRequireOnboarding }) {
  const GEOCODER_KEY = process.env.REACT_APP_GEOCODER_API_KEY;
  const GEOCODER_PROVIDER = (process.env.REACT_APP_GEOCODER_PROVIDER || '').toLowerCase();

  const [formData, setFormData] = useState({
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
    longitude: null
  });
  const [geocodingStatus, setGecodingStatus] = useState('');

  const availableAmenities = [
    'WiFi', 'Parking', 'Kitchen', 'Laundry', 'Air Conditioning', 
    'Heating', 'TV', 'Furnished', 'Pet Friendly', 'Garden'
  ];

  // Geocode address using Nominatim (OpenStreetMap)
  // Use browser geolocation and reverse-geocode to fill address/coords
  const geolocateCurrentPosition = () => {
    if (!navigator.geolocation) {
      setGecodingStatus('Geolocation not supported by your browser');
      return;
    }

    setGecodingStatus('Locating...');
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      setFormData({ ...formData, latitude: lat, longitude: lon });

      // Reverse geocode to get a readable address
      try {
        if (GEOCODER_PROVIDER === 'mapbox' && GEOCODER_KEY) {
          const rev = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${lon},${lat}.json?access_token=${GEOCODER_KEY}&limit=1&country=za`);
          const revData = await rev.json();
          if (revData && revData.features && revData.features.length > 0) {
            const place = revData.features[0].place_name || '';
            const parts = place.split(',').map(p => p.trim());
            const street = parts.slice(0, 2).join(', ');
            const area = parts.slice(2, 4).join(', ');
            setFormData(prev => ({ ...prev, streetAddress: street || prev.streetAddress, location: area || prev.location }));
            setGecodingStatus('✓ Current location set');
            setTimeout(() => setGecodingStatus(''), 2500);
            return;
          }
        } else {
          const rev = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
          const revData = await rev.json();
          if (revData) {
            const display = revData.display_name || '';
            // Try to split display name into street and area
            const parts = display.split(',').map(p => p.trim());
            const street = parts.slice(0, 2).join(', ');
            const area = parts.slice(2, 4).join(', ');
            setFormData(prev => ({ ...prev, streetAddress: street || prev.streetAddress, location: area || prev.location }));
            setGecodingStatus('✓ Current location set');
            setTimeout(() => setGecodingStatus(''), 2500);
            return;
          }
        }

      } catch (e) {
        console.error('Reverse geocode failed', e);
      }

      setGecodingStatus('✓ Coordinates obtained');
      setTimeout(() => setGecodingStatus(''), 2000);
    }, (err) => {
      console.error('Geolocation error', err);
      setGecodingStatus('Could not get your location');
    }, { enableHighAccuracy: true, timeout: 10000 });
  };

  const geocodeAddress = async () => {
    if (!formData.streetAddress) {
      setGecodingStatus('Please enter a street address');
      return;
    }
    
    setGecodingStatus('Finding coordinates...');
    try {
      const fullAddress = `${formData.streetAddress}, ${formData.location}, South Africa`;
      // Try Mapbox if configured
      if (GEOCODER_PROVIDER === 'mapbox' && GEOCODER_KEY) {
        try {
          const resp = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(fullAddress)}.json?access_token=${GEOCODER_KEY}&limit=1&country=za`);
          const data = await resp.json();
          if (data && data.features && data.features.length > 0) {
            const [lon, lat] = data.features[0].center || [];
            setFormData({ ...formData, latitude: parseFloat(lat), longitude: parseFloat(lon) });
            setGecodingStatus('✓ Address found (Mapbox)!');
            setTimeout(() => setGecodingStatus(''), 2000);
            return;
          }
        } catch (err) {
          console.warn('Mapbox geocoding failed, falling back to Nominatim', err);
        }
      }

      // Default / fallback: Nominatim
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullAddress)}`
      );
      const results = await response.json();

      if (results.length > 0) {
        const { lat, lon } = results[0];
        setFormData({ 
          ...formData, 
          latitude: parseFloat(lat), 
          longitude: parseFloat(lon) 
        });
        setGecodingStatus('✓ Address found!');
        setTimeout(() => setGecodingStatus(''), 2000);
      } else {
        setGecodingStatus('Address not found. Trying with area only...');
        // Fallback: just use the area/city
        const areaResponse = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(formData.location + ', South Africa')}`
        );
        const areaResults = await areaResponse.json();
        if (areaResults.length > 0) {
          const { lat, lon } = areaResults[0];
          setFormData({ 
            ...formData, 
            latitude: parseFloat(lat), 
            longitude: parseFloat(lon) 
          });
          setGecodingStatus('✓ Area found!');
          setTimeout(() => setGecodingStatus(''), 2000);
        } else {
          setGecodingStatus('Could not find location');
        }
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      setGecodingStatus('Error finding address. Check your connection.');
    }
  };

  // Draggable preview marker component for Add Listing
  function DraggablePreview({ lat, lng }) {
    const [pos, setPos] = useState(lat && lng ? [lat, lng] : null);
    useEffect(() => {
      if (lat && lng) setPos([lat, lng]);
    }, [lat, lng]);

    if (!pos) return null;
    return (
      <MapContainer center={pos} zoom={15} className="w-full h-48 rounded-lg" whenCreated={() => {}}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Marker
          position={pos}
          draggable={true}
          eventHandlers={{
            dragend: (e) => {
              const ll = e.target.getLatLng();
              setPos([ll.lat, ll.lng]);
              setFormData(prev => ({ ...prev, latitude: ll.lat, longitude: ll.lng }));
            }
          }}
        />
      </MapContainer>
    );
  }

  const toggleAmenity = (amenity) => {
    if (formData.amenities.includes(amenity)) {
      setFormData({ ...formData, amenities: formData.amenities.filter(a => a !== amenity) });
    } else {
      setFormData({ ...formData, amenities: [...formData.amenities, amenity] });
    }
  };

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const readers = files.map(file => new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(file);
    }));

    Promise.all(readers).then(images => {
      const combined = [...formData.photos, ...images].slice(0, 5); // cap at 5
      setFormData({ ...formData, photos: combined });
    });
  };

  const removePhoto = (index) => {
    const newPhotos = formData.photos.filter((_, i) => i !== index);
    setFormData({ ...formData, photos: newPhotos });
  };

  const handleSubmit = () => {
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

    if (formData.title && formData.price && formData.location) {
      onSubmit(formData);
    } else {
      alert('Please complete the required fields: title, price and location.');
    }
  };

  return (
    <div className="p-4 bg-gray-50 min-h-screen pb-20">
      <div className="max-w-3xl mx-auto mt-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-gray-800">Post a Room</h2>
            <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 transition">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">Room Title *</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Cozy backroom with bathroom"
                className="w-full px-4 py-3 border border-gray-300 bg-white text-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition placeholder-gray-400"
              />
            </div>

            {/* Price */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">Monthly Price (R) *</label>
              <input
                type="number"
                required
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="e.g., 2500"
                className="w-full px-4 py-3 border border-gray-300 bg-white text-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition placeholder-gray-400"
              />
            </div>

            {/* Location and Street Address */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">Area / City *</label>
                <input
                  type="text"
                  required
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g., Soweto, Johannesburg"
                  className="w-full px-4 py-3 border border-gray-300 bg-white text-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition placeholder-gray-400"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">Street Address</label>
                <input
                  type="text"
                  value={formData.streetAddress}
                  onChange={(e) => setFormData({ ...formData, streetAddress: e.target.value })}
                  placeholder="e.g., 123 Main Street"
                  className="w-full px-4 py-3 border border-gray-300 bg-white text-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition placeholder-gray-400"
                />
              </div>
            </div>

            {/* Geocode / Geolocate Buttons */}
            <div className="flex gap-2 items-center">
              <button
                type="button"
                onClick={geocodeAddress}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
              >
                Find on Map
              </button>

              <button
                type="button"
                onClick={geolocateCurrentPosition}
                className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-lg text-sm font-medium transition"
              >
                Use Current Location
              </button>

              <div className="text-sm">
                {geocodingStatus && (
                  <span className={geocodingStatus.startsWith('✓') ? 'text-green-600 font-medium' : 'text-gray-600'}>
                    {geocodingStatus}
                  </span>
                )}
                {formData.latitude && formData.longitude && (
                  <span className="text-green-600 font-medium ml-2">
                    📍 {formData.latitude.toFixed(4)}, {formData.longitude.toFixed(4)}
                  </span>
                )}
              </div>
              {/* Small draggable preview map to fine-tune the listing location */}
              <div className="mt-3">
                <label className="block text-sm font-semibold text-gray-800 mb-2">Adjust Pin (drag to fine-tune)</label>
                {(formData.latitude && formData.longitude) ? (
                  <DraggablePreview lat={formData.latitude} lng={formData.longitude} />
                ) : (
                  <div className="text-sm text-gray-500">No coordinates yet. Use 'Find on Map' or 'Use Current Location' to set a pin.</div>
                )}
              </div>
            </div>

            {/* Status and Available Date - Two columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 bg-white text-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
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
                  className="w-full px-4 py-3 border border-gray-300 bg-white text-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the room, amenities, rules, and any other details..."
                rows="4"
                className="w-full px-4 py-3 border border-gray-300 bg-white text-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition placeholder-gray-400"
              />
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
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                      formData.amenities.includes(amenity)
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
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
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoUpload}
                disabled={formData.photos.length >= 5}
                className="w-full px-4 py-3 border border-gray-300 bg-white text-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition cursor-pointer"
              />
              {formData.photos.length > 0 && (
                <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
                  {formData.photos.map((photo, index) => (
                    <div key={index} className="relative group">
                      <img 
                        src={photo} 
                        alt={`Preview ${index + 1}`} 
                        className="w-full h-32 object-cover rounded-lg border border-gray-200 shadow-sm" 
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {formData.photos.length >= 5 && (
                <p className="text-sm text-gray-500 mt-2">Maximum 5 photos reached</p>
              )}
            </div>

            {/* Submit Button */}
            <div className="border-t border-gray-200 pt-6">
              <button
                onClick={handleSubmit}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition shadow-sm"
              >
                Post Room
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MessagesView({ conversations, listings, userType, onSelectConversation }) {
  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Messages</h2>
      <div className="space-y-3">
        {conversations.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p>No messages yet.</p>
          </div>
        ) : (
          conversations.map(conv => {
            const listing = listings.find(l => l.id === conv.listingId);
            const lastMessage = conv.messages[conv.messages.length - 1];
            return (
              <div
                key={conv.id}
                onClick={() => onSelectConversation(conv)}
                className="bg-white rounded-lg shadow p-4 cursor-pointer hover:shadow-lg transition"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-gray-800">{listing?.title || 'Room'}</h3>
                  <span className="text-xs text-gray-500">
                    {new Date(lastMessage.timestamp).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-gray-600 line-clamp-2">{lastMessage.text}</p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function MyListingsView({ listings, onDelete }) {
  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">My Listings</h2>
      <div className="space-y-4">
        {listings.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            <Home className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p>You haven't posted any rooms yet.</p>
          </div>
        ) : (
          listings.map(listing => (
            <div key={listing.id} className="bg-white rounded-lg shadow p-4">
{listing.photos && listing.photos.length > 0 && (
  <div className="relative mb-3">
    <img src={listing.photos[0]} alt="Room" className="w-full h-32 object-cover rounded-lg" />
    {listing.photos.length > 1 && (
      <div className="absolute top-2 right-2 bg-black bg-opacity-60 text-white px-2 py-1 rounded text-xs">
        {listing.photos.length} photos
      </div>
    )}
  </div>
)}
              <h3 className="font-bold text-lg mb-1">{listing.title}</h3>
              <div className="text-blue-600 font-bold mb-2">R{listing.price}/month</div>
              <div className="flex items-center text-gray-600 text-sm mb-3">
                <MapPin className="w-4 h-4 mr-1" />
                {listing.location}
              </div>
              <button
                onClick={() => onDelete(listing.id)}
                className="w-full bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg transition"
              >
                Delete Listing
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ListingDetailModal({ listing, landlord, onClose, onSendMessage, userType, currentUser, onRequireAuth }) {
  const [message, setMessage] = useState('');
  const [showContact, setShowContact] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  const handleNavigate = (direction, index) => {
    if (direction === 'next' && currentPhotoIndex < listing.photos.length - 1) {
      setCurrentPhotoIndex(currentPhotoIndex + 1);
    } else if (direction === 'prev' && currentPhotoIndex > 0) {
      setCurrentPhotoIndex(currentPhotoIndex - 1);
    } else if (direction === 'goto') {
      setCurrentPhotoIndex(index);
    }
  };

  const handleSend = () => {
    if (message.trim() && userType === 'renter') {
      onSendMessage(listing.id, message);
      setMessage('');
      alert('Message sent to landlord!');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">Room Details</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-4">
{listing.photos && listing.photos.length > 0 && (
  <div className="relative mb-4 cursor-pointer" onClick={() => setShowGallery(true)}>
    <img src={listing.photos[currentPhotoIndex]} alt="Room" className="w-full h-64 object-cover rounded-lg" />
    {listing.photos.length > 1 && (
      <div className="absolute bottom-3 right-3 bg-black bg-opacity-60 text-white px-3 py-1 rounded-full text-sm flex items-center gap-1">
        <Search className="w-4 h-4" />
        View all {listing.photos.length} photos
      </div>
    )}
    {listing.photos.length > 1 && (
      <div className="absolute bottom-3 left-3 flex gap-1">
        {listing.photos.map((_, index) => (
          <div
            key={index}
            className={`w-2 h-2 rounded-full ${
              index === currentPhotoIndex ? 'bg-white' : 'bg-white bg-opacity-50'
            }`}
          />
        ))}
      </div>
    )}
  </div>
)}

{showGallery && listing.photos && (
  <PhotoGallery
    photos={listing.photos}
    currentIndex={currentPhotoIndex}
    onClose={() => setShowGallery(false)}
    onNavigate={handleNavigate}
  />
)}
          
          <h3 className="text-2xl font-bold mb-2 text-gray-800">{listing.title}</h3>
          <div className="text-blue-600 font-bold text-2xl mb-4">R{listing.price}/month</div>
          
          <div className="flex items-center text-gray-600 mb-4">
            <MapPin className="w-5 h-5 mr-2" />
            <span className="text-lg">{listing.location}</span>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <h4 className="font-semibold mb-2 text-gray-700">Description</h4>
            <p className="text-gray-600">{listing.description || 'No description provided.'}</p>
          </div>

          {userType === 'renter' && landlord && (
            <div className="bg-blue-50 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-700">Landlord Information</h4>
                {currentUser ? (
                  <button
                    onClick={() => setShowContact(!showContact)}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    {showContact ? 'Hide' : 'Show'} Contact
                  </button>
                ) : (
                  <button
                    onClick={() => onRequireAuth && onRequireAuth('renter')}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    Sign in to view contact
                  </button>
                )}
              </div>

              <div className="flex items-center mb-3">
                {landlord.photo ? (
                  <img src={landlord.photo} alt={landlord.name} className="w-12 h-12 rounded-full object-cover mr-3" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center mr-3">
                    <User className="w-6 h-6 text-gray-600" />
                  </div>
                )}
                <div>
                  <p className="font-semibold text-gray-800">{landlord.name}</p>
                  <p className="text-xs text-gray-500">Property Owner</p>
                </div>
              </div>

              {currentUser && showContact && (
                <div className="space-y-2 pt-3 border-t border-blue-100">
                  <div className="flex items-center text-sm">
                    <Phone className="w-4 h-4 mr-2 text-blue-600" />
                    <a href={`tel:${landlord.phone}`} className="text-blue-600 hover:underline">
                      {landlord.phone}
                    </a>
                  </div>
                  <div className="flex items-center text-sm">
                    <Mail className="w-4 h-4 mr-2 text-blue-600" />
                    <a href={`mailto:${landlord.email}`} className="text-blue-600 hover:underline">
                      {landlord.email}
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}

          {userType === 'renter' && (
            <div className="border-t pt-4">
              <h4 className="font-semibold mb-3 text-gray-700">Send a Message</h4>
              {currentUser ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    onClick={handleSend}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition flex items-center"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <div className="flex">
                  <button
                    onClick={() => onRequireAuth && onRequireAuth('renter')}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition"
                  >
                    Sign in to message
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ConversationModal({ conversation, listing, onClose, onSendMessage }) {
  const [message, setMessage] = useState('');

  const handleSend = () => {
    if (message.trim()) {
      onSendMessage(listing.id, message);
      setMessage('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col">
        <div className="bg-white border-b p-4 flex items-center">
          <button onClick={onClose} className="mr-3 text-gray-500 hover:text-gray-700">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h2 className="font-bold text-gray-800">{listing?.title}</h2>
            <p className="text-sm text-gray-600">{listing?.location}</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {conversation.messages.map(msg => (
            <div
              key={msg.id}
              className={`flex ${msg.sender === 'landlord' ? 'justify-start' : 'justify-end'}`}
            >
              <div
                className={`max-w-xs px-4 py-2 rounded-lg ${
                  msg.sender === 'landlord'
                    ? 'bg-gray-200 text-gray-800'
                    : 'bg-blue-600 text-white'
                }`}
              >
                <p>{msg.text}</p>
                <span className="text-xs opacity-75">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t p-4 flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={handleSend}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function AuthModal({ defaultType = 'renter', onClose, onSubmit }) {
  const [form, setForm] = useState({ name: '', phone: '', email: '', type: defaultType, photo: '' });

  const handleSubmit = () => {
    if (!form.name || !form.email) {
      alert('Please add a name and email');
      return;
    }
    onSubmit(form);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">Sign in / Create account</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Full name</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border rounded" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2 border rounded" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Phone (optional)</label>
            <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full px-3 py-2 border rounded" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">I am a</label>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full px-3 py-2 border rounded">
              <option value="renter">Looking for a room</option>
              <option value="landlord">Listing rooms</option>
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button onClick={onClose} className="flex-1 bg-gray-100 hover:bg-gray-200 py-2 rounded">Cancel</button>
            <button onClick={handleSubmit} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded">Continue</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PhotoGallery({ photos, currentIndex, onClose, onNavigate }) {
  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <div className="flex justify-between items-center p-4 text-white">
        <span className="text-sm">{currentIndex + 1} / {photos.length}</span>
        <button onClick={onClose} className="hover:bg-gray-800 p-2 rounded-full">
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center relative">
        {currentIndex > 0 && (
          <button
            onClick={() => onNavigate('prev')}
            className="absolute left-4 bg-black bg-opacity-50 text-white p-3 rounded-full hover:bg-opacity-70 z-10"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
        )}

        <img
          src={photos[currentIndex]}
          alt=""
          className="max-w-full max-h-full object-contain"
        />

        {currentIndex < photos.length - 1 && (
          <button
            onClick={() => onNavigate('next')}
            className="absolute right-4 bg-black bg-opacity-50 text-white p-3 rounded-full hover:bg-opacity-70 z-10"
          >
            <ArrowLeft className="w-6 h-6 transform rotate-180" />
          </button>
        )}
      </div>

      <div className="p-4 flex gap-2 overflow-x-auto">
        {photos.map((photo, index) => (
          <img
            key={index}
            src={photo}
            alt={`Thumbnail ${index + 1}`}
            onClick={() => onNavigate('goto', index)}
            className={`w-16 h-16 object-cover rounded cursor-pointer ${
              index === currentIndex ? 'ring-2 ring-blue-500' : 'opacity-60'
            }`}
          />
        ))}
      </div>
    </div>
  );
}



function BottomNav({ currentView, setCurrentView, userType, messageCount }) {
  const navItems = [
    { id: 'browse', label: 'Browse', icon: Search, show: true },
    { id: 'messages', label: 'Messages', icon: MessageSquare, badge: messageCount, show: true },
    { id: 'add', label: 'List Room', icon: PlusCircle, show: userType === 'landlord' },
    { id: 'my-listings', label: 'My Rooms', icon: Home, show: userType === 'landlord' },
    { id: 'profile', label: 'Profile', icon: User, show: true }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-2xl">
      <div className="max-w-7xl mx-auto flex justify-around">
        {navItems
          .filter(item => item.show)
          .map(item => {
            const Icon = item.icon;
            const isActive = currentView === item.id || (item.id === 'profile' && currentView === 'edit-profile');
            
            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={`flex-1 flex flex-col items-center justify-center py-3 px-2 transition relative border-t-2 ${
                  isActive
                    ? 'border-blue-600 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                <div className="relative">
                  <Icon className="w-6 h-6" />
                  {item.badge && item.badge > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </div>
                <span className="text-xs mt-1 font-medium">{item.label}</span>
              </button>
            );
          })}
      </div>
    </div>
  );
}