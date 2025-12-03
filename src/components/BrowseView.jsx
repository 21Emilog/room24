import React, { useState, useEffect } from 'react';
import { Search, PlusCircle, Home, User, MapPin, Clock, Sparkles, ArrowRight, Building2, Shield, Zap } from 'lucide-react';
import ListingCard from './ListingCard';
import ListingSkeletonCard from './ListingSkeletonCard';
import { SidebarAd, InFeedAd } from './AdBanner';
import { getSavedSearches, checkNewListings, checkPriceDrops, addNotification, saveSearch as saveSearchToEngine } from '../utils/notificationEngine';

export default function BrowseView({
  listings,
  searchLocation,
  setSearchLocation,
  priceRange,
  setPriceRange,
  selectedAmenities,
  setSelectedAmenities,
  sortBy,
  setSortBy,
  onSelectListing,
  setCurrentView,
  currentUser,
  onRequireAuth,
  subscribeToArea,
  previewMode
}) {
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [isDesktop, setIsDesktop] = useState(typeof window !== 'undefined' ? window.innerWidth >= 1024 : false);
  const [paymentFilter, setPaymentFilter] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [locationLoading, setLocationLoading] = useState(false);
  const [savedSearches, setSavedSearches] = useState([]);
  const [initialLoad, setInitialLoad] = useState(true);
  const [favorites, setFavorites] = useState([]);
  const [roomType, setRoomType] = useState(''); // '', 'private', 'shared'
  const [leaseDuration, setLeaseDuration] = useState(''); // '', '1-3', '4-6', '7-12', '12+'
  const [petFriendly, setPetFriendly] = useState(false);
  const [genderPreference, setGenderPreference] = useState(''); // '', 'male', 'female', 'any'
  const [recentSearches, setRecentSearches] = useState([]);
  const [showWelcomeHero, setShowWelcomeHero] = useState(true);
  const suggestionCacheRef = React.useRef({}); // cache: { queryLower: { data: [...], ts } }
  const SUGGESTION_TTL_MS = 15 * 60 * 1000; // 15 minutes

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('recent-searches');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) setRecentSearches(parsed.slice(0, 5));
      }
      // Check if user has dismissed hero before
      const heroDismissed = localStorage.getItem('hero-dismissed');
      if (heroDismissed === 'true') setShowWelcomeHero(false);
    } catch {}
  }, []);

  // Save recent search when location changes
  const addRecentSearch = (location) => {
    if (!location || location.trim().length < 2) return;
    const trimmed = location.trim();
    setRecentSearches(prev => {
      const filtered = prev.filter(s => s.toLowerCase() !== trimmed.toLowerCase());
      const updated = [trimmed, ...filtered].slice(0, 5);
      try {
        localStorage.setItem('recent-searches', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const dismissHero = () => {
    setShowWelcomeHero(false);
    try {
      localStorage.setItem('hero-dismissed', 'true');
    } catch {}
  };

  const toggleFavorite = (listingId) => {
    setFavorites(prev => {
      const updated = prev.includes(listingId)
        ? prev.filter(id => id !== listingId)
        : [...prev, listingId];
      try {
        localStorage.setItem('favorites', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Restore persisted lightweight filters
  useEffect(() => {
    try {
      const storedPayment = localStorage.getItem('filter-payment');
      if (storedPayment) setPaymentFilter(storedPayment);
      const storedPriceMin = localStorage.getItem('filter-price-min');
      const storedPriceMax = localStorage.getItem('filter-price-max');
      if (storedPriceMin && !isNaN(parseInt(storedPriceMin)) && storedPriceMax && !isNaN(parseInt(storedPriceMax))) {
        setPriceRange([parseInt(storedPriceMin), parseInt(storedPriceMax)]);
      }
      const storedAmenities = localStorage.getItem('filter-amenities');
      if (storedAmenities) {
        try {
          const arr = JSON.parse(storedAmenities);
          if (Array.isArray(arr)) setSelectedAmenities(arr);
        } catch {}
      }
      const rawSaved = localStorage.getItem('saved-searches');
      if (rawSaved) {
        try {
          const arr = JSON.parse(rawSaved);
          if (Array.isArray(arr)) setSavedSearches(arr);
        } catch {}
      }
      const rawFavorites = localStorage.getItem('favorites');
      if (rawFavorites) {
        try {
          const arr = JSON.parse(rawFavorites);
          if (Array.isArray(arr)) setFavorites(arr);
        } catch {}
      }
      const storedRoomType = localStorage.getItem('filter-room-type');
      if (storedRoomType) setRoomType(storedRoomType);
      const storedLease = localStorage.getItem('filter-lease-duration');
      if (storedLease) setLeaseDuration(storedLease);
      const storedPets = localStorage.getItem('filter-pet-friendly');
      if (storedPets === 'true') setPetFriendly(true);
      const storedGender = localStorage.getItem('filter-gender-preference');
      if (storedGender) setGenderPreference(storedGender);
    } catch (e) {
      // ignore storage errors
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setInitialLoad(false), 600);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Persist changes
  useEffect(() => {
    try { localStorage.setItem('filter-payment', paymentFilter); } catch {}
  }, [paymentFilter]);
  useEffect(() => {
    try {
      localStorage.setItem('filter-price-min', String(priceRange[0]));
      localStorage.setItem('filter-price-max', String(priceRange[1]));
    } catch {}
  }, [priceRange]);
  useEffect(() => {
    try { localStorage.setItem('filter-amenities', JSON.stringify(selectedAmenities)); } catch {}
  }, [selectedAmenities]);
  useEffect(() => {
    try { localStorage.setItem('filter-room-type', roomType); } catch {}
  }, [roomType]);
  useEffect(() => {
    try { localStorage.setItem('filter-lease-duration', leaseDuration); } catch {}
  }, [leaseDuration]);
  useEffect(() => {
    try { localStorage.setItem('filter-pet-friendly', String(petFriendly)); } catch {}
  }, [petFriendly]);
  useEffect(() => {
    try { localStorage.setItem('filter-gender-preference', genderPreference); } catch {}
  }, [genderPreference]);

  // Check for new listings and price drops
  useEffect(() => {
    if (!listings || listings.length === 0) return;
    
    // Check new listings against saved searches
    const searches = getSavedSearches();
    if (searches.length > 0) {
      const newListingNotifs = checkNewListings(listings, searches);
      newListingNotifs.forEach(n => addNotification(n));
    }
    
    // Check price drops on favorites
    if (favorites.length > 0) {
      const priceDropNotifs = checkPriceDrops(listings, favorites);
      priceDropNotifs.forEach(n => addNotification(n));
    }
  }, [listings, favorites]);

  // Debounced provider-aware suggestions with caching
  useEffect(() => {
    const raw = (searchLocation || '').trim();
    if (raw.length < 3) {
      setLocationSuggestions([]);
      setLocationLoading(false);
      return;
    }

    const key = (process.env.REACT_APP_GEOCODER_API_KEY || '').trim();
    const provider = (process.env.REACT_APP_GEOCODER_PROVIDER || '').toLowerCase();
    const qLower = raw.toLowerCase();
    const cached = suggestionCacheRef.current[qLower];
    if (cached && (Date.now() - cached.ts) < SUGGESTION_TTL_MS) {
      setLocationSuggestions(cached.data);
      return; // serve cache, skip network
    }

    const controller = new AbortController();
    setLocationLoading(true);
    const t = setTimeout(async () => {
      try {
        let suggestions = [];
        if (provider === 'mapbox' && key) {
          const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(raw)}.json?access_token=${key}&limit=5&country=ZA&language=en&types=place,locality,neighborhood`;
          const resp = await fetch(url, { signal: controller.signal });
          const data = await resp.json();
          if (data && Array.isArray(data.features)) {
            suggestions = data.features.map(f => f.place_name).filter(Boolean);
          }
        } else {
          const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(raw + ', South Africa')}&limit=5`;
          const resp = await fetch(url, { signal: controller.signal, headers: { 'Accept-Language': 'en' } });
          const data = await resp.json();
          const uniq = [];
          data.forEach(item => {
            const display = item.display_name || '';
            const parts = display.split(',').map(p => p.trim());
            const area = parts.slice(0, 2).join(', ');
            if (area && !uniq.includes(area)) uniq.push(area);
          });
          suggestions = uniq.slice(0, 5);
        }
        suggestionCacheRef.current[qLower] = { data: suggestions, ts: Date.now() };
        setLocationSuggestions(suggestions);
      } catch (e) {
        setLocationSuggestions([]);
      } finally {
        setLocationLoading(false);
      }
    }, 450);
    return () => { clearTimeout(t); controller.abort(); };
  }, [searchLocation, SUGGESTION_TTL_MS]);

  // Sidebar navigation items (desktop only)
  const desktopNavItems = [
    { id: 'browse', label: 'Browse', icon: Search },
    { id: 'add', label: 'List Room', icon: PlusCircle, show: currentUser && currentUser.type === 'landlord' && !previewMode },
    { id: 'my-listings', label: 'My Rooms', icon: Home, show: currentUser && currentUser.type === 'landlord' && !previewMode },
    { id: 'profile', label: 'Profile', icon: User }
  ];

  const amenityOptions = ['WiFi', 'Parking', 'Kitchen', 'Laundry', 'Air Conditioning', 'Heating', 'Furnished'];

  const toggleAmenity = (amenity) => {
    if (selectedAmenities.includes(amenity)) {
      setSelectedAmenities(selectedAmenities.filter(a => a !== amenity));
    } else {
      setSelectedAmenities([...selectedAmenities, amenity]);
    }
  };

  const clearChip = (type, value) => {
    if (type === 'location') setSearchLocation('');
    if (type === 'priceMin') setPriceRange([0, priceRange[1]]);
    if (type === 'priceMax') setPriceRange([priceRange[0], 10000]);
    if (type === 'amenity') setSelectedAmenities(selectedAmenities.filter(a => a !== value));
    if (type === 'sort') setSortBy('newest');
    if (type === 'roomType') setRoomType('');
    if (type === 'lease') setLeaseDuration('');
    if (type === 'pets') setPetFriendly(false);
    if (type === 'gender') setGenderPreference('');
  };

  const renderFilterChips = () => {
    const chips = [];
    if (searchLocation) chips.push({ type: 'location', label: searchLocation });
    if (priceRange[0] > 0) chips.push({ type: 'priceMin', label: `Min R${priceRange[0]}` });
    if (priceRange[1] < 10000) chips.push({ type: 'priceMax', label: `Max R${priceRange[1]}` });
    selectedAmenities.forEach(a => chips.push({ type: 'amenity', label: a, value: a }));
    if (sortBy !== 'newest') chips.push({ type: 'sort', label: `Sort: ${sortBy}` });
    if (paymentFilter) chips.push({ type: 'payment', label: `Pay: ${paymentFilter}` });
    if (roomType) chips.push({ type: 'roomType', label: `${roomType.charAt(0).toUpperCase() + roomType.slice(1)} room` });
    if (leaseDuration) chips.push({ type: 'lease', label: `${leaseDuration} months` });
    if (petFriendly) chips.push({ type: 'pets', label: '🐾 Pet friendly' });
    if (genderPreference) chips.push({ type: 'gender', label: `${genderPreference.charAt(0).toUpperCase() + genderPreference.slice(1)} only` });
    if (chips.length === 0) return null;
    return (
      <div className="filter-chip-bar" aria-label="Active filters">
        {chips.map((chip, idx) => (
          <button
            key={idx}
            onClick={() => clearChip(chip.type, chip.value)}
            className="filter-chip"
            aria-label={`Remove ${chip.label} filter`}
          >
            <span>{chip.label}</span>
            <span aria-hidden="true">✕</span>
          </button>
        ))}
        <button
          onClick={() => {
            setSearchLocation('');
            setPriceRange([0, 10000]);
            setSelectedAmenities([]);
            setSortBy('newest');
            setPaymentFilter('');
            setRoomType('');
            setLeaseDuration('');
            setPetFriendly(false);
            setGenderPreference('');
            setLocationSuggestions([]);
            try { localStorage.removeItem('filter-payment'); } catch {}
            try { localStorage.removeItem('filter-price-min'); localStorage.removeItem('filter-price-max'); } catch {}
            try { localStorage.removeItem('filter-amenities'); } catch {}
            try { localStorage.removeItem('filter-room-type'); } catch {}
            try { localStorage.removeItem('filter-lease-duration'); } catch {}
            try { localStorage.removeItem('filter-pet-friendly'); } catch {}
            try { localStorage.removeItem('filter-gender-preference'); } catch {}
          }}
          className="filter-chip bg-red-50 text-red-700 hover:bg-red-100"
        >Clear All</button>
      </div>
    );
  };

  const saveCurrentSearch = () => {
    const criteria = {
      location: searchLocation || '',
      priceMin: priceRange[0],
      priceMax: priceRange[1],
      priceRange: [...priceRange],
      amenities: [...selectedAmenities],
    };
    const saved = saveSearchToEngine(criteria);
    if (saved) {
      // Also update local state for UI
      setSavedSearches(getSavedSearches());
      alert('Search saved! You\'ll be notified of new listings matching this criteria.');
    }
  };

  const loadSearch = (s) => {
    setSearchLocation(s.location);
    setPriceRange(s.priceRange);
    setSelectedAmenities(s.amenities);
    setPaymentFilter(s.payment);
    setSortBy(s.sort || 'newest');
  };

  const renderFiltersBox = () => (
    <div className="filters-box" aria-label="Filters panel">
      <div className="flex items-center gap-2 mb-2">
        <MapPin className="w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search location..."
          value={searchLocation}
          onChange={(e) => setSearchLocation(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-teal-600 focus:border-transparent"
          aria-label="Location search"
        />
        {locationLoading && (
          <span className="text-xs text-teal-600 animate-pulse" aria-live="polite">Loading...</span>
        )}
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-600">Price Range</label>
          <div className="flex items-center gap-2 text-xs bg-gray-50 px-2 py-1 rounded border border-gray-200">
            <span>R{priceRange[0].toLocaleString()} - R{priceRange[1].toLocaleString()}</span>
            <select
              value={priceRange[0]}
              onChange={(e) => setPriceRange([parseInt(e.target.value), priceRange[1]])}
              className="bg-transparent border-l border-gray-300 pl-2 focus:outline-none"
              aria-label="Minimum price"
            >
              <option value="0">Min</option>
              <option value="500">R500</option>
              <option value="1000">R1000</option>
              <option value="1500">R1500</option>
            </select>
            <select
              value={priceRange[1]}
              onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
              className="bg-transparent border-l border-gray-300 pl-2 focus:outline-none"
              aria-label="Maximum price"
            >
              <option value="10000">R10,000</option>
              <option value="5000">R5,000</option>
              <option value="3000">R3,000</option>
              <option value="2000">R2,000</option>
            </select>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-600">Sort</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="text-sm bg-white border border-gray-300 px-2 py-1 rounded focus:ring-2 focus:ring-teal-600"
            aria-label="Sort order"
          >
            <option value="newest">Newest</option>
            <option value="cheapest">Cheapest</option>
            <option value="expensive">Most Expensive</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-600">Payment Method</label>
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="text-sm bg-white border border-gray-300 px-2 py-1 rounded focus:ring-2 focus:ring-teal-600"
            aria-label="Payment method"
          >
            <option value="">Any</option>
            <option value="Bank and Cash">Bank and Cash</option>
            <option value="Cash Only">Cash Only</option>
            <option value="Bank Only">Bank Only</option>
          </select>
        </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-600">Saved Searches</label>
              <div className="flex flex-wrap gap-1">
                {savedSearches.length === 0 && (
                  <span className="text-[11px] text-gray-500">None saved</span>
                )}
                {savedSearches.map(s => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => loadSearch(s)}
                    className="px-2 py-1 rounded-md text-[11px] font-medium bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100"
                  >{s.location || 'Any'} • {s.priceRange[0]}-{s.priceRange[1]}</button>
                ))}
              </div>
              <button
                type="button"
                onClick={saveCurrentSearch}
                className="mt-1 text-xs text-purple-700 hover:text-purple-800 font-medium underline"
              >Save Current Search</button>
            </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 mb-1 block">Amenities</label>
          <div className="flex flex-wrap gap-1">
            {amenityOptions.map(a => (
              <button
                key={a}
                type="button"
                onClick={() => toggleAmenity(a)}
                className={`px-2 py-1 rounded-md text-[11px] font-medium border transition ${selectedAmenities.includes(a) ? 'bg-teal-600 text-white border-teal-600 shadow-sm' : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'}`}
                aria-pressed={selectedAmenities.includes(a)}
              >{a}</button>
            ))}
          </div>
        </div>
        <button
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          className="mt-2 text-xs text-teal-700 hover:text-teal-800 font-semibold px-2 py-1 rounded hover:bg-teal-50 transition"
          aria-expanded={showAdvancedFilters}
        >{showAdvancedFilters ? 'Close Advanced' : 'More Filters'}</button>
        {showAdvancedFilters && (
          <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded" aria-label="Advanced filters"><p className="text-xs text-gray-600">(Advanced filters placeholder)</p></div>
        )}
      </div>
    </div>
  );

  // Desktop layout
  if (isDesktop) {
    return (
      <div className="bg-gradient-to-b from-slate-50 to-gray-100 min-h-screen pb-4" aria-labelledby="results-heading">
        <div className="layout-desktop">
          <aside className="sidebar-nav" role="navigation" aria-label="Desktop navigation and filters">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2 mb-4"><span className="bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">Room</span><span className="text-amber-500">24</span></h2>
              <div className="sidebar-section-title mb-2">Navigation</div>
              <div className="sidebar-menu">
                {desktopNavItems.filter(i => i.show === undefined || i.show).map(item => {
                  const Icon = item.icon;
                  const isActive = item.id === 'browse';
                  return (
                    <button
                      key={item.id}
                      onClick={() => setCurrentView(item.id)}
                      className={isActive ? 'active' : ''}
                      aria-label={item.label}
                    >
                      <Icon className="w-4 h-4" /> {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <div className="sidebar-section-title mb-2">Filters</div>
              {renderFiltersBox()}
            </div>
            {/* Sidebar Ad */}
            <SidebarAd />
            {!currentUser && (
              <div className="mt-auto pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500 mb-2">Join to list rooms.</p>
                <div className="flex gap-2">
                  <button onClick={() => onRequireAuth && onRequireAuth('renter')} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs py-2 rounded">Sign In</button>
                  <button onClick={() => onRequireAuth && onRequireAuth('landlord')} className="flex-1 bg-red-500 hover:bg-red-600 text-white text-xs py-2 rounded">List Room</button>
                </div>
              </div>
            )}
          </aside>
          <main className="desktop-split" role="main">
            <div className="list-pane">
              <div className="flex items-center justify-between mb-3">
                <h2 id="results-heading" className="text-lg font-semibold text-gray-800">{listings.length === 0 ? 'No rooms' : `${listings.length} rooms`}</h2>
              </div>
              {renderFilterChips()}
              {initialLoad ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6" aria-label="Loading listings">
                  {Array.from({ length: 8 }).map((_, i) => <ListingSkeletonCard key={i} />)}
                </div>
              ) : (
                (paymentFilter ? listings.filter(l => l.paymentMethod === paymentFilter) : listings).length === 0 ? (
                  <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center shadow-sm">
                    <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Search className="w-10 h-10 text-gray-300" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">No rooms found</h3>
                    <p className="text-gray-500 text-sm mb-6 max-w-md mx-auto">
                      We couldn't find any rooms matching your filters. Try adjusting your search or explore popular areas.
                    </p>
                    <div className="flex flex-wrap justify-center gap-2 mb-6">
                      <span className="text-xs text-gray-500">Try:</span>
                      {['Sandton', 'Soweto', 'Pretoria', 'Cape Town'].map(area => (
                        <button
                          key={area}
                          onClick={() => setSearchLocation(area)}
                          className="text-xs px-3 py-1.5 rounded-full bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200 transition-all"
                        >
                          {area}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => {
                        setSearchLocation('');
                        setPriceRange([0, 10000]);
                        setSelectedAmenities([]);
                        setPaymentFilter('');
                      }}
                      className="text-sm text-teal-600 hover:text-teal-700 font-semibold"
                    >
                      Clear all filters
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                    {(paymentFilter ? listings.filter(l => l.paymentMethod === paymentFilter) : listings).map((listing, idx) => (
                      <React.Fragment key={listing.id}>
                        <ListingCard listing={listing} onClick={() => onSelectListing(listing)} />
                        {(idx + 1) % 6 === 0 && idx !== listings.length - 1 && (
                          <div className="md:col-span-2 xl:col-span-3 2xl:col-span-4">
                            <InFeedAd />
                          </div>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                )
              )}
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Mobile / tablet layout
  return (
    <div className="bg-gradient-to-b from-slate-50 to-gray-100 min-h-screen pb-24" role="main" aria-labelledby="results-heading">
      {/* Welcome Hero Section */}
      {showWelcomeHero && !currentUser && listings.length > 0 && (
        <div className="bg-gradient-to-r from-teal-600 via-cyan-600 to-teal-700 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRoLTJ2LTRoMnYtMmgtMnYtMmgydi0ySDI0djJoMnYyaC0ydjJoMnY0aC0ydjJoMTJ2LTJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
          <div className="max-w-7xl mx-auto px-4 py-8 relative">
            <button 
              onClick={dismissHero}
              className="absolute top-2 right-2 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
              aria-label="Dismiss welcome message"
            >
              <span className="text-xl">×</span>
            </button>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-amber-300" />
              <span className="text-sm font-medium text-teal-100">Find your perfect room in South Africa</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold mb-3">
              Welcome to Room<span className="text-amber-300">24</span>
            </h1>
            <p className="text-teal-100 mb-6 max-w-lg">
              Discover affordable rooms for rent across South Africa. Connect directly with verified landlords - no middleman fees.
            </p>
            <div className="flex flex-wrap gap-4 mb-4">
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3 py-2 rounded-lg">
                <Building2 className="w-4 h-4 text-amber-300" />
                <span className="text-sm">{listings.length}+ Rooms</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3 py-2 rounded-lg">
                <Shield className="w-4 h-4 text-amber-300" />
                <span className="text-sm">Verified Listings</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3 py-2 rounded-lg">
                <Zap className="w-4 h-4 text-amber-300" />
                <span className="text-sm">Instant Contact</span>
              </div>
            </div>
            <button
              onClick={() => onRequireAuth && onRequireAuth('renter')}
              className="inline-flex items-center gap-2 bg-white text-teal-700 font-semibold px-5 py-2.5 rounded-xl hover:bg-teal-50 transition-colors shadow-lg"
            >
              Get Started
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="mb-4 space-y-3">
            <div className="relative">
              <MapPin className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by location, suburb, or area..."
                value={searchLocation}
                onChange={(e) => setSearchLocation(e.target.value)}
                onBlur={() => { if (searchLocation) addRecentSearch(searchLocation); }}
                className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl text-gray-700 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 shadow-sm transition-all duration-200 hover:border-gray-400"
                aria-label="Location search"
              />
              {locationLoading && (
                <div className="absolute right-3 top-3 flex items-center gap-1 text-teal-600" aria-live="polite">
                  <div className="w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {!locationLoading && searchLocation && (
                <button 
                  onClick={() => { setSearchLocation(''); setLocationSuggestions([]); }}
                  className="absolute right-3 top-3 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                  aria-label="Clear search"
                >
                  <span className="text-lg">×</span>
                </button>
              )}
              {/* Location suggestions dropdown */}
              {locationSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden animate-fadeIn">
                  <div className="text-xs text-gray-500 px-3 py-2 bg-gray-50 border-b border-gray-100 font-medium">📍 Suggestions</div>
                  {locationSuggestions.map((s, i) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => { setSearchLocation(s); setLocationSuggestions([]); addRecentSearch(s); }}
                      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-teal-50 flex items-center gap-2 transition-colors ${i > 0 ? 'border-t border-gray-50' : ''}`}
                    >
                      <MapPin className="w-3.5 h-3.5 text-teal-500 flex-shrink-0" />
                      <span className="text-gray-700">{s}</span>
                    </button>
                  ))}
                </div>
              )}
              {/* Recent searches dropdown - show when input focused and no suggestions */}
              {!searchLocation && recentSearches.length > 0 && locationSuggestions.length === 0 && (
                <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden">
                  <div className="text-xs text-gray-500 px-3 py-2 bg-gray-50 border-b border-gray-100 font-medium flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Recent Searches
                  </div>
                  {recentSearches.map((s, i) => (
                    <button
                      key={`recent-${i}`}
                      type="button"
                      onClick={() => { setSearchLocation(s); }}
                      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-teal-50 flex items-center gap-2 transition-colors ${i > 0 ? 'border-t border-gray-50' : ''}`}
                    >
                      <Clock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      <span className="text-gray-700">{s}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white px-5 py-2.5 rounded-xl transition-all duration-200 font-semibold shadow-md hover:shadow-lg text-sm flex items-center gap-2 active:scale-95" onClick={() => { if (searchLocation) addRecentSearch(searchLocation); }} aria-label="Search submit">
              <Search className="w-4 h-4" />
              Search
            </button>
              <button
                onClick={() => {
                  if (!searchLocation || searchLocation.trim() === '') {
                    alert('Enter a location to subscribe.');
                    return;
                  }
                  if (!currentUser) {
                    onRequireAuth && onRequireAuth('renter');
                    return;
                  }
                  subscribeToArea && subscribeToArea(currentUser.id, searchLocation.trim());
                }}
                className="bg-white border border-gray-200 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-50 transition text-sm"
              >Subscribe</button>
              <button
                type="button"
                onClick={saveCurrentSearch}
                className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg text-sm font-semibold shadow-sm"
              >Save Search</button>
            </div>
            
            {/* Popular Areas Quick Select */}
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs text-gray-500 font-medium">Popular:</span>
              {['Sandton', 'Soweto', 'Pretoria', 'Cape Town', 'Durban', 'Johannesburg'].map(area => (
                <button
                  key={area}
                  onClick={() => { setSearchLocation(area); addRecentSearch(area); }}
                  className={`text-xs px-3 py-1.5 rounded-full transition-all duration-200 ${
                    searchLocation.toLowerCase() === area.toLowerCase()
                      ? 'bg-teal-600 text-white shadow-md'
                      : 'bg-white text-gray-700 hover:bg-teal-50 hover:text-teal-700 border border-gray-300 shadow-sm'
                  }`}
                >
                  {area}
                </button>
              ))}
            </div>

            {/* Quick Filter Chips */}
            <div className="flex flex-wrap gap-2 items-center pt-2 border-t border-gray-100">
              <span className="text-xs text-gray-500 font-medium">Quick filters:</span>
              <button
                onClick={() => setPriceRange([0, 3000])}
                className={`text-xs px-3 py-1.5 rounded-full transition-all duration-200 flex items-center gap-1 ${
                  priceRange[1] === 3000 && priceRange[0] === 0
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                }`}
              >
                💰 Under R3,000
              </button>
              <button
                onClick={() => setPetFriendly(!petFriendly)}
                className={`text-xs px-3 py-1.5 rounded-full transition-all duration-200 flex items-center gap-1 ${
                  petFriendly
                    ? 'bg-amber-500 text-white shadow-md'
                    : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                }`}
              >
                🐾 Pet Friendly
              </button>
              <button
                onClick={() => {
                  // Visual indicator for available now - just scroll to see results
                  window.scrollTo({ top: 400, behavior: 'smooth' });
                }}
                className="text-xs px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-all duration-200 flex items-center gap-1"
              >
                🏠 Available Now
              </button>
              <button
                onClick={() => toggleAmenity('WiFi')}
                className={`text-xs px-3 py-1.5 rounded-full transition-all duration-200 flex items-center gap-1 ${
                  selectedAmenities.includes('WiFi')
                    ? 'bg-violet-600 text-white shadow-md'
                    : 'bg-violet-50 text-violet-700 hover:bg-violet-100 border border-violet-200'
                }`}
              >
                📶 WiFi
              </button>
              <button
                onClick={() => toggleAmenity('Parking')}
                className={`text-xs px-3 py-1.5 rounded-full transition-all duration-200 flex items-center gap-1 ${
                  selectedAmenities.includes('Parking')
                    ? 'bg-slate-600 text-white shadow-md'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                🚗 Parking
              </button>
            </div>

            {savedSearches.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2" aria-label="Saved searches">
                {savedSearches.map(s => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => loadSearch(s)}
                    className="text-[11px] px-2 py-1 rounded bg-purple-50 text-purple-700 border border-purple-200"
                  >{s.location || 'Any'} • {s.priceRange[0]}-{s.priceRange[1]}</button>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-2 mb-3 flex-wrap items-center">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-200 border border-gray-300">
              <span className="text-sm font-medium text-gray-700">R{priceRange[0].toLocaleString()} - R{priceRange[1].toLocaleString()}</span>
              <select
                value={priceRange[0]}
                onChange={(e) => setPriceRange([parseInt(e.target.value), priceRange[1]])}
                className="text-xs bg-transparent border-l border-gray-400 pl-2 focus:outline-none text-gray-700"
                aria-label="Minimum price"
              >
                <option value="0">Min</option>
                <option value="500">R500</option>
                <option value="1000">R1000</option>
                <option value="1500">R1500</option>
              </select>
              <select
                value={priceRange[1]}
                onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                className="text-xs bg-transparent border-l border-gray-400 pl-2 focus:outline-none text-gray-700"
                aria-label="Maximum price"
              >
                <option value="10000">R10k</option>
                <option value="5000">R5k</option>
                <option value="3000">R3k</option>
                <option value="2000">R2k</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="text-sm px-3 py-2 rounded-lg bg-gray-200 border border-gray-300 text-gray-700 focus:ring-2 focus:ring-teal-600"
                aria-label="Sort order"
              >
                <option value="newest">Newest</option>
                <option value="cheapest">Cheapest</option>
                <option value="expensive">Most Expensive</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Payment:</span>
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="text-sm px-3 py-2 rounded-lg bg-gray-200 border border-gray-300 text-gray-700 focus:ring-2 focus:ring-teal-600"
                aria-label="Payment method filter"
              >
                <option value="">Any</option>
                <option value="Bank and Cash">Bank & Cash</option>
                <option value="Cash Only">Cash Only</option>
                <option value="Bank Only">Bank Only</option>
              </select>
            </div>
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="text-sm text-teal-700 hover:text-teal-800 font-medium px-3 py-2 rounded-lg hover:bg-teal-50 transition"
              aria-expanded={showAdvancedFilters}
            >{showAdvancedFilters ? '✕ Filters' : '⚙️ Filters'}</button>
          </div>
          {showAdvancedFilters && (
            <div className="mt-3 p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-4">
              {/* Room Type */}
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-2 block">Room Type</label>
                <div className="flex gap-2">
                  {['Private', 'Shared'].map(type => (
                    <button
                      key={type}
                      onClick={() => setRoomType(roomType === type.toLowerCase() ? '' : type.toLowerCase())}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium border transition ${ 
                        roomType === type.toLowerCase()
                          ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >{type}</button>
                  ))}
                </div>
              </div>

              {/* Lease Duration */}
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-2 block">Lease Duration (months)</label>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { label: '1-3', value: '1-3' },
                    { label: '4-6', value: '4-6' },
                    { label: '7-12', value: '7-12' },
                    { label: '12+', value: '12+' }
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setLeaseDuration(leaseDuration === opt.value ? '' : opt.value)}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium border transition ${
                        leaseDuration === opt.value
                          ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >{opt.label}</button>
                  ))}
                </div>
              </div>

              {/* Pet Friendly */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={petFriendly}
                    onChange={(e) => setPetFriendly(e.target.checked)}
                    className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                  />
                  <span className="text-sm font-medium text-gray-700">🐾 Pet Friendly</span>
                </label>
              </div>

              {/* Gender Preference */}
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-2 block">Gender Preference</label>
                <div className="flex gap-2">
                  {[
                    { label: 'Male', value: 'male' },
                    { label: 'Female', value: 'female' },
                    { label: 'Any', value: 'any' }
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setGenderPreference(genderPreference === opt.value ? '' : opt.value)}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium border transition ${
                        genderPreference === opt.value
                          ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >{opt.label}</button>
                  ))}
                </div>
              </div>

              {/* Amenities */}
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-2 block">Amenities</label>
                <div className="flex flex-wrap gap-1" aria-label="Amenities">
                  {amenityOptions.map(a => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => toggleAmenity(a)}
                      className={`px-2 py-1 rounded-md text-[11px] font-medium border transition ${selectedAmenities.includes(a) ? 'bg-teal-600 text-white border-teal-600 shadow-sm' : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'}`}
                      aria-pressed={selectedAmenities.includes(a)}
                    >{a}</button>
                  ))}
                </div>
              </div>
            </div>
          )}
          {renderFilterChips()}
        </div>
      </div>
      {/* Mobile Banner Ad */}
      <div className="max-w-7xl mx-auto px-4 pt-3">
        <InFeedAd />
      </div>
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center mt-4 mb-4">
          <h2 id="results-heading" className="text-2xl font-bold text-gray-800">
            {listings.length === 0 ? (
              'No rooms available'
            ) : (
              <span className="flex items-center gap-2">
                <span className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white text-lg font-bold px-3 py-1 rounded-lg shadow-sm">{listings.length}</span>
                <span>Rooms Available</span>
              </span>
            )}
          </h2>
        </div>
        {initialLoad ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12 justify-items-center" aria-label="Loading listings">
            {Array.from({ length: 8 }).map((_, i) => <ListingSkeletonCard key={i} />)}
          </div>
        ) : (
          (paymentFilter ? listings.filter(l => l.paymentMethod === paymentFilter) : listings).length === 0 ? (
            <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl border-2 border-dashed border-gray-300 p-16 text-center">
              <div className="bg-white w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Search className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-3">No Rooms Found</h3>
              <p className="text-gray-600 mb-2">We couldn't find any rooms matching your criteria</p>
              <p className="text-gray-500 text-sm mb-8 max-w-md mx-auto">
                Try adjusting your filters, expanding your search area, or checking back later for new listings
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
                <button
                  onClick={() => {
                    setSearchLocation('');
                    setPriceRange([0, 10000]);
                    setSelectedAmenities([]);
                    setSortBy('newest');
                    setRoomType('');
                    setLeaseDuration('');
                    setPetFriendly(false);
                    setGenderPreference('');
                    setPaymentFilter('');
                  }}
                  className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-medium px-6 py-2.5 rounded-lg transition shadow-sm"
                >
                  Clear All Filters
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12 justify-items-center">
                {(paymentFilter ? listings.filter(l => l.paymentMethod === paymentFilter) : listings).map((listing, idx) => (
                  <React.Fragment key={listing.id}>
                    <ListingCard
                      listing={listing}
                      onClick={() => onSelectListing(listing)}
                      isFavorite={favorites.includes(listing.id)}
                      onToggleFavorite={toggleFavorite}
                    />
                    {(idx + 1) % 8 === 0 && idx !== listings.length - 1 && (
                      <div className="sm:col-span-2 lg:col-span-3 xl:col-span-4">
                        <InFeedAd />
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>
              
              {/* How It Works Section - show for non-logged in users */}
              {!currentUser && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 mb-8">
                  <div className="text-center mb-8">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">How Room24 Works</h3>
                    <p className="text-gray-600">Find your perfect room in 3 simple steps</p>
                  </div>
                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="text-center p-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-teal-100 to-cyan-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Search className="w-8 h-8 text-teal-600" />
                      </div>
                      <div className="bg-teal-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center mx-auto -mt-8 mb-2 relative z-10 shadow-md">1</div>
                      <h4 className="font-semibold text-gray-900 mb-2">Search & Filter</h4>
                      <p className="text-sm text-gray-600">Browse rooms by location, price, and amenities. Use filters to find exactly what you need.</p>
                    </div>
                    <div className="text-center p-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-cyan-100 to-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Home className="w-8 h-8 text-cyan-600" />
                      </div>
                      <div className="bg-cyan-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center mx-auto -mt-8 mb-2 relative z-10 shadow-md">2</div>
                      <h4 className="font-semibold text-gray-900 mb-2">View Details</h4>
                      <p className="text-sm text-gray-600">Check photos, virtual tours, reviews, and landlord verification status.</p>
                    </div>
                    <div className="text-center p-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <User className="w-8 h-8 text-blue-600" />
                      </div>
                      <div className="bg-blue-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center mx-auto -mt-8 mb-2 relative z-10 shadow-md">3</div>
                      <h4 className="font-semibold text-gray-900 mb-2">Contact Landlord</h4>
                      <p className="text-sm text-gray-600">Connect directly via phone, email, or WhatsApp. No middleman fees.</p>
                    </div>
                  </div>
                  <div className="text-center mt-6 pt-6 border-t border-gray-100">
                    <button
                      onClick={() => onRequireAuth && onRequireAuth('renter')}
                      className="inline-flex items-center gap-2 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all"
                    >
                      Create Free Account
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )
        )}
      </div>
    </div>
  );
}
