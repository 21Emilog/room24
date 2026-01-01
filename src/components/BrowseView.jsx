import React, { useState, useEffect } from 'react';
import { Search, Home, MapPin, Clock, Sparkles, ArrowRight, Building2, Shield, Zap, Bell, TrendingUp, Eye, Filter, X, ChevronRight, MessageCircle } from 'lucide-react';
import ListingCard from './ListingCard';
import ListingSkeletonCard from './ListingSkeletonCard';
import { InFeedAd } from './AdBanner';
import { getSavedSearches, checkNewListings, checkPriceDrops, addNotification, saveSearch as saveSearchToEngine } from '../utils/notificationEngine';
import { StatsSection, WhyChooseUs, Testimonials, CallToAction } from './MarketingSections';

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
  const [searchFocused, setSearchFocused] = useState(false);
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
      <div className="filter-chip-bar flex flex-wrap gap-2 mt-2" aria-label="Active filters">
        {chips.map((chip, idx) => (
          <button
            key={idx}
            onClick={() => clearChip(chip.type, chip.value)}
            className="filter-chip px-4 py-1.5 rounded-full bg-gray-100 text-gray-700 hover:bg-[#E63946]/10 hover:text-[#E63946] focus:bg-[#E63946]/20 focus:text-[#E63946] transition-all duration-150 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#E63946]/40 text-sm font-medium flex items-center gap-1"
            aria-label={`Remove ${chip.label} filter`}
            tabIndex={0}
          >
            <span>{chip.label}</span>
            <span aria-hidden="true" className="ml-1 text-base">✕</span>
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
          className="filter-chip px-4 py-1.5 rounded-full bg-red-50 text-red-700 hover:bg-red-100 focus:bg-red-100 focus:text-red-700 transition-all duration-150 border border-red-200 text-sm font-semibold ml-2 focus:outline-none focus:ring-2 focus:ring-red-300"
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

  // Desktop layout
  if (isDesktop) {
    return (
      <div className="min-h-screen" aria-labelledby="results-heading">
        {/* Desktop Hero Banner */}
        {showWelcomeHero && !currentUser && listings.length > 0 && (
          <div className="bg-gradient-to-r from-[#1D3557] via-[#1D3557] to-[#2d4a6f] text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0aC0ydi00aDJ2LTJoLTJ2LTJoMnYtMkgyNHYyaDJ2MmgtMnYyaDJ2NGgtMnYyaDEydi0yeiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
            <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#E63946]/20 rounded-full blur-3xl" />
            <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
            
            <div className="max-w-7xl mx-auto px-8 py-16 relative">
              <button 
                onClick={dismissHero}
                className="absolute top-4 right-4 p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                aria-label="Dismiss"
              >
                <span className="text-2xl">×</span>
              </button>
              
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                <div>
                  <div className="flex items-center gap-2 mb-6">
                    <span className="bg-[#E63946] text-white text-xs font-bold px-3 py-1 rounded-full">🇿🇦 SOUTH AFRICA</span>
                    <span className="bg-white/20 text-white text-xs font-medium px-3 py-1 rounded-full">Free to Use</span>
                  </div>
                  <h1 className="text-5xl font-extrabold mb-6 leading-tight">
                    Find Your Perfect<br />
                    <span className="text-[#E63946]">Room Today</span>
                  </h1>
                  <p className="text-xl text-[#F1FAEE]/80 mb-8 max-w-lg">
                    Browse {listings.length}+ verified rooms across South Africa. Connect directly with landlords — no agent fees, no hidden costs.
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <button
                      onClick={() => onRequireAuth && onRequireAuth('renter')}
                      className="inline-flex items-center gap-2 bg-[#E63946] text-white font-bold px-8 py-4 rounded-xl hover:bg-[#c5303c] transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-100"
                    >
                      Start Searching
                      <ArrowRight className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => onRequireAuth && onRequireAuth('landlord')}
                      className="inline-flex items-center gap-2 bg-white/10 text-white font-bold px-8 py-4 rounded-xl hover:bg-white/20 transition-all border border-white/30"
                    >
                      List Your Room
                    </button>
                  </div>
                </div>
                
                <div className="hidden lg:grid grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                      <Building2 className="w-8 h-8 text-[#E63946] mb-3" />
                      <div className="text-3xl font-bold">{listings.length}+</div>
                      <div className="text-sm text-white/70">Active Listings</div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                      <Zap className="w-8 h-8 text-amber-400 mb-3" />
                      <div className="text-3xl font-bold">Instant</div>
                      <div className="text-sm text-white/70">Contact Landlords</div>
                    </div>
                  </div>
                  <div className="space-y-4 mt-8">
                    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                      <Shield className="w-8 h-8 text-emerald-400 mb-3" />
                      <div className="text-3xl font-bold">Verified</div>
                      <div className="text-sm text-white/70">Trusted Landlords</div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                      <MapPin className="w-8 h-8 text-blue-400 mb-3" />
                      <div className="text-3xl font-bold">Nationwide</div>
                      <div className="text-sm text-white/70">All Provinces</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Desktop Content */}
        <div className="bg-gradient-to-b from-gray-50 via-white to-gray-50 min-h-screen">
          <div className="max-w-7xl mx-auto px-6 py-8">
            {/* Search Bar - Desktop */}
            <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 p-8 mb-10 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-red-50 to-transparent rounded-bl-full" />
              <div className="relative">
                <div className="flex flex-wrap lg:flex-nowrap gap-4 items-end">
                  <div className="flex-1 min-w-[200px]">
                    <label className="text-sm font-bold text-gray-800 mb-2 block flex items-center gap-2" htmlFor="browse-location-search">
                      <MapPin className="w-4 h-4 text-red-500" />
                      Location
                    </label>
                    <div className="relative">
                      <input
                        id="browse-location-search"
                        type="text"
                        placeholder="e.g. Sandton, Cape Town, Midrand..."
                        value={searchLocation}
                        onChange={e => setSearchLocation(e.target.value)}
                        className="w-full pl-4 pr-4 py-4 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-[#E63946]/20 focus:border-[#E63946] text-gray-800 shadow-sm transition-all duration-300 placeholder-gray-400 font-medium"
                        aria-label="Search by location"
                        autoComplete="off"
                      />
                    </div>
                  </div>
                  <div className="w-40">
                    <label className="text-sm font-bold text-gray-800 mb-2 block" htmlFor="min-price-input">Min Price</label>
                    <input
                      id="min-price-input"
                      type="number"
                      min="0"
                      step="100"
                      value={priceRange[0]}
                      onChange={e => setPriceRange([parseInt(e.target.value) || 0, priceRange[1]])}
                      className="w-full py-4 px-4 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-[#E63946]/20 focus:border-[#E63946] text-gray-800 font-semibold transition-all"
                      placeholder="R0"
                      aria-label="Minimum price"
                    />
                  </div>
                  <div className="w-40">
                    <label className="text-sm font-bold text-gray-800 mb-2 block" htmlFor="max-price-input">Max Price</label>
                    <input
                      id="max-price-input"
                      type="number"
                      min="0"
                      step="100"
                      value={priceRange[1]}
                      onChange={e => setPriceRange([priceRange[0], parseInt(e.target.value) || 10000])}
                      className="w-full py-4 px-4 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-[#E63946]/20 focus:border-[#E63946] text-gray-800 font-semibold transition-all"
                      placeholder="R10,000"
                      aria-label="Maximum price"
                    />
                  </div>
                  <div className="w-44">
                    <label className="text-sm font-bold text-gray-800 mb-2 block">Sort By</label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="w-full py-4 px-4 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-[#E63946]/20 focus:border-[#E63946] text-gray-800 font-semibold transition-all appearance-none bg-white cursor-pointer"
                    >
                      <option value="newest">Newest First</option>
                      <option value="cheapest">Lowest Price</option>
                      <option value="expensive">Highest Price</option>
                    </select>
                  </div>
                  <button
                    onClick={() => addRecentSearch(searchLocation)}
                    className="bg-gradient-to-r from-[#E63946] via-rose-500 to-[#E63946] hover:from-[#c5303c] hover:via-red-600 hover:to-[#c5303c] text-white font-bold px-10 py-4 rounded-2xl transition-all duration-300 shadow-lg shadow-red-500/30 hover:shadow-xl hover:shadow-red-500/40 hover:scale-105 active:scale-100 flex items-center gap-2 focus:outline-none focus:ring-4 focus:ring-[#E63946]/30"
                    aria-label="Search rooms"
                    tabIndex={0}
                  >
                    <Search className="w-5 h-5" aria-hidden="true" />
                    Search
                  </button>
                </div>
              </div>
              
              {/* Quick Filters */}
              <div className="flex flex-wrap gap-2 mt-6 pt-6 border-t border-gray-100">
                <span className="text-sm font-semibold text-gray-600 mr-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  Popular:
                </span>
                {['Sandton', 'Soweto', 'Pretoria', 'Cape Town', 'Durban', 'Midrand'].map(area => (
                  <button
                    key={area}
                    onClick={() => setSearchLocation(area)}
                    className={`text-sm px-5 py-2 rounded-full transition-all duration-150 font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-[#E63946]/30 border border-gray-200 ${
                      searchLocation.toLowerCase().includes(area.toLowerCase())
                        ? 'bg-[#E63946] text-white scale-105 ring-2 ring-[#E63946]/40 shadow-lg'
                        : 'bg-gray-100 text-gray-600 hover:bg-[#E63946]/10 hover:text-[#E63946] active:scale-95'
                    }`}
                    aria-label={`Search popular area: ${area}`}
                    tabIndex={0}
                  >
                    {area}
                  </button>
                ))}
              </div>
            </div>

            {/* Two Column Layout: Listings + Sidebar */}
            <div className="flex gap-6 lg:gap-8">
              {/* Main Listings Area */}
              <div className="flex-1">
                {/* Results Header */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 id="results-heading" className="text-2xl font-bold text-gray-800 dark:text-white">
                      {listings.length === 0 ? 'No rooms found' : `${listings.length} Room${listings.length !== 1 ? 's' : ''} Available`}
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                      {searchLocation ? `Showing results for "${searchLocation}"` : 'Browse all available rooms in South Africa'}
                    </p>
                  </div>
                  {renderFilterChips()}
                </div>

                {/* Listings Grid - Adjusted for better density */}
                {initialLoad ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 animate-fadeIn" aria-label="Loading listings">
                    {Array.from({ length: 6 }).map((_, i) => <ListingSkeletonCard key={i} className="animate-pulse" />)}
                  </div>
                ) : (
                  (paymentFilter ? listings.filter(l => l.paymentMethod === paymentFilter) : listings).length === 0 ? (
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-12 text-center shadow-sm flex flex-col items-center justify-center">
                      <div className="w-24 h-24 mb-6 flex items-center justify-center">
                        <svg width="96" height="96" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <rect x="8" y="24" width="80" height="56" rx="16" fill="#F3F4F6" />
                          <rect x="20" y="36" width="56" height="32" rx="8" fill="#E63946" fillOpacity="0.08" />
                          <circle cx="48" cy="52" r="8" fill="#E63946" fillOpacity="0.15" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">No rooms found</h3>
                      <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 max-w-md mx-auto">
                        We couldn't find any rooms matching your search.<br />Try adjusting your filters or searching in a popular area below.
                      </p>
                      <div className="flex flex-wrap justify-center gap-2 mb-6">
                        <span className="text-xs text-gray-500">Popular areas:</span>
                        {['Sandton', 'Soweto', 'Pretoria', 'Cape Town', 'Durban', 'Midrand'].map(area => (
                          <button
                            key={area}
                            onClick={() => setSearchLocation(area)}
                            className="text-xs px-3 py-1.5 rounded-full bg-red-50 text-[#E63946] hover:bg-red-100 border border-red-200 transition-all focus:outline-none focus:ring-2 focus:ring-red-300"
                            aria-label={`Try searching in ${area}`}
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
                        className="text-sm text-[#E63946] hover:text-[#c5303c] font-semibold focus:outline-none focus:ring-2 focus:ring-red-300"
                        aria-label="Clear all filters"
                      >
                        Clear all filters
                      </button>
                    </div>
                  ) : (
                    <div className={`grid gap-6 ${
                      (paymentFilter ? listings.filter(l => l.paymentMethod === paymentFilter) : listings).length <= 2 
                        ? 'grid-cols-1 lg:grid-cols-2' 
                        : 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3'
                    }`}>
                      {(paymentFilter ? listings.filter(l => l.paymentMethod === paymentFilter) : listings).map((listing, idx) => (
                        <React.Fragment key={listing.id}>
                          <div className="animate-fadeInUp" style={{ animationDelay: `${idx * 60}ms` }}>
                            <ListingCard listing={listing} onClick={() => onSelectListing(listing)} />
                          </div>
                          {(idx + 1) % 6 === 0 && idx !== listings.length - 1 && (
                            <div className="lg:col-span-2 xl:col-span-3">
                              <InFeedAd />
                            </div>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  )
                )}
              </div>

              {/* Desktop Sidebar */}
              <div className="hidden lg:block w-72 xl:w-80 flex-shrink-0">
                <div className="sticky top-24 space-y-5">
                  {/* Save Search Card */}
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2 text-lg">
                      <div className="w-10 h-10 bg-gradient-to-br from-[#E63946] to-rose-500 rounded-xl flex items-center justify-center shadow-lg">
                        <Bell className="w-5 h-5 text-white" />
                      </div>
                      Get Notified
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                      Save this search and get alerts when new rooms match.
                    </p>
                    <button
                      onClick={saveCurrentSearch}
                      className="w-full bg-gradient-to-r from-[#1D3557] to-blue-600 hover:from-[#152a45] hover:to-blue-700 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl active:scale-95"
                    >
                      <Bell className="w-4 h-4" />
                      Save Search
                    </button>
                    {savedSearches.length > 0 && (
                      <div className="mt-5 pt-5 border-t border-gray-100 dark:border-gray-700">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 font-semibold">Your saved searches:</p>
                        <div className="space-y-2">
                          {savedSearches.slice(0, 3).map(s => (
                            <button
                              key={s.id}
                              onClick={() => loadSearch(s)}
                              className="w-full text-left text-sm px-4 py-3 rounded-xl bg-gradient-to-r from-gray-50 to-slate-100 dark:from-gray-900 dark:to-gray-800 hover:from-red-50 hover:to-rose-50 dark:hover:from-red-900/20 dark:hover:to-rose-900/20 text-gray-700 dark:text-gray-300 truncate border border-gray-200 dark:border-gray-700 hover:border-[#E63946] transition-all flex items-center gap-2"
                            >
                              <MapPin className="w-3.5 h-3.5 text-[#E63946] flex-shrink-0" />
                              {s.location || 'Any location'} • R{s.priceRange[0].toLocaleString()}-R{s.priceRange[1].toLocaleString()}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Quick Stats */}
                  <div className="bg-gradient-to-br from-[#1D3557] via-[#2d4a6f] to-blue-700 rounded-2xl shadow-xl p-6 text-white relative overflow-hidden">
                    {/* Decorative shine */}
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-bl-full" />
                    <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/5 rounded-tr-full" />
                    
                    <h3 className="font-bold mb-5 text-lg relative">✨ Why RentMzansi?</h3>
                    <div className="space-y-4 relative">
                      <div className="flex items-center gap-4 p-3 bg-white/10 rounded-xl backdrop-blur-sm">
                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                          <Shield className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-medium">Verified landlords only</span>
                      </div>
                      <div className="flex items-center gap-4 p-3 bg-white/10 rounded-xl backdrop-blur-sm">
                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                          <Zap className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-medium">Instant direct contact</span>
                      </div>
                      <div className="flex items-center gap-4 p-3 bg-white/10 rounded-xl backdrop-blur-sm">
                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-medium">No agent fees</span>
                      </div>
                    </div>
                  </div>

                  {/* Ad Space */}
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <InFeedAd />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Marketing Sections - Only show for non-logged-in users or if few listings */}
          {!currentUser && (
            <>
              <StatsSection listingsCount={listings.length} />
              <WhyChooseUs />
              <Testimonials />
              <CallToAction onSignUp={onRequireAuth} />
            </>
          )}
        </div>
      </div>
    );
  }
  // Mobile / tablet layout
  return (
    <div className="bg-gradient-to-b from-slate-50 via-white to-slate-100 dark:from-gray-900 dark:via-gray-850 dark:to-gray-900 min-h-screen pb-24" role="main" aria-labelledby="results-heading">
      {/* Custom animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        @keyframes pulse-soft {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        @keyframes slide-up {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .card-hover { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .card-hover:hover { transform: translateY(-4px); }
      `}</style>
      
      {/* Welcome Hero Section - Premium */}
      {showWelcomeHero && !currentUser && listings.length > 0 && (
        <div className="bg-gradient-to-br from-[#1D3557] via-[#243b5a] to-[#2d4a6f] text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0aC0ydi00aDJ2LTJoLTJ2LTJoMnYtMkgyNHYyaDJ2MmgtMnYyaDJ2NGgtMnYyaDEydi0yeiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
          {/* Decorative floating circles */}
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#E63946]/30 rounded-full blur-3xl" style={{ animation: 'pulse-soft 4s ease-in-out infinite' }} />
          <div className="absolute -bottom-24 -left-24 w-56 h-56 bg-blue-500/20 rounded-full blur-3xl" style={{ animation: 'pulse-soft 4s ease-in-out infinite', animationDelay: '2s' }} />
          <div className="absolute top-1/2 right-10 w-32 h-32 bg-amber-400/20 rounded-full blur-2xl" />
          
          <div className="max-w-7xl mx-auto px-5 py-10 relative">
            <button 
              onClick={dismissHero}
              className="absolute top-4 right-4 p-2.5 text-white/60 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl backdrop-blur-sm transition-all duration-200"
              aria-label="Dismiss welcome message"
            >
              <span className="text-xl font-light">×</span>
            </button>
            
            {/* Badge */}
            <div className="flex items-center gap-2 mb-5" style={{ animation: 'slide-up 0.5s ease-out' }}>
              <div className="flex items-center gap-2 bg-white/15 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 shadow-lg">
                <span className="text-lg">🇿🇦</span>
                <span className="text-sm font-semibold">South Africa's #1 Room Finder</span>
              </div>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-extrabold mb-4 leading-tight" style={{ animation: 'slide-up 0.6s ease-out' }}>
              Find Your Perfect<br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-[#E63946] to-rose-400">Room Today</span>
            </h1>
            <p className="text-white/80 text-lg mb-8 max-w-lg leading-relaxed" style={{ animation: 'slide-up 0.7s ease-out' }}>
              Discover affordable rooms across South Africa. Connect directly with verified landlords — no middleman fees.
            </p>
            
            {/* Stats cards with glass effect */}
            <div className="flex flex-wrap gap-3 mb-8" style={{ animation: 'slide-up 0.8s ease-out' }}>
              <div className="flex items-center gap-2.5 bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/20 shadow-lg" style={{ animation: 'float 3s ease-in-out infinite' }}>
                <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <span className="font-bold text-lg">{listings.length}+</span>
                  <span className="text-sm text-white/70 ml-1">Rooms</span>
                </div>
              </div>
              <div className="flex items-center gap-2.5 bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/20 shadow-lg" style={{ animation: 'float 3s ease-in-out infinite', animationDelay: '0.5s' }}>
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-green-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <span className="font-semibold">Verified</span>
              </div>
              <div className="flex items-center gap-2.5 bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/20 shadow-lg" style={{ animation: 'float 3s ease-in-out infinite', animationDelay: '1s' }}>
                <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <span className="font-semibold">Instant</span>
              </div>
            </div>
            
            <button
              onClick={() => onRequireAuth && onRequireAuth('renter')}
              className="inline-flex items-center gap-3 bg-gradient-to-r from-[#E63946] to-rose-500 text-white font-bold px-8 py-4 rounded-2xl hover:from-[#c5303c] hover:to-rose-600 transition-all shadow-xl hover:shadow-2xl active:scale-95 text-lg"
              style={{ animation: 'slide-up 0.9s ease-out' }}
            >
              Get Started Free
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      <div className="bg-gradient-to-b from-[#fff5f5] to-white dark:from-gray-900 dark:to-gray-900 border-b border-red-100 dark:border-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          
          <div className="mb-6 space-y-4">
            {/* Search Input */}
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-gradient-to-br from-[#E63946] to-[#c5303c] rounded-2xl flex items-center justify-center shadow-lg shadow-red-500/30">
                <MapPin className="w-6 h-6 text-white" />
              </div>
              <input
                type="text"
                placeholder="Search by location..."
                value={searchLocation}
                onChange={(e) => setSearchLocation(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => { 
                  // Delay hiding to allow click on dropdown items
                  setTimeout(() => setSearchFocused(false), 200);
                  if (searchLocation) addRecentSearch(searchLocation); 
                }}
                className="w-full pl-20 pr-12 py-5 border-2 border-red-200 dark:border-gray-700 rounded-2xl text-gray-800 dark:text-white text-lg focus:ring-4 focus:ring-red-100 dark:focus:ring-red-900/30 focus:border-[#E63946] shadow-md transition-all duration-200 hover:border-[#E63946] placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-800"
                aria-label="Location search"
              />
              {locationLoading && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[#E63946]" aria-live="polite">
                  <div className="w-5 h-5 border-2 border-[#E63946] border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {!locationLoading && searchLocation && (
                <button 
                  onClick={() => { setSearchLocation(''); setLocationSuggestions([]); }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                  aria-label="Clear search"
                >
                  <span className="text-xl">×</span>
                </button>
              )}
              {/* Location suggestions dropdown */}
              {locationSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-gray-800 border-2 border-red-200 dark:border-gray-700 rounded-2xl shadow-xl z-20 overflow-hidden animate-fadeIn">
                  <div className="text-xs text-[#E63946] px-4 py-2.5 bg-gradient-to-r from-red-50 to-rose-50 dark:from-gray-700 dark:to-gray-700 border-b border-red-100 dark:border-gray-600 font-semibold flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5" /> Suggestions
                  </div>
                  {locationSuggestions.map((s, i) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => { setSearchLocation(s); setLocationSuggestions([]); addRecentSearch(s); }}
                      className={`w-full text-left px-4 py-3 text-sm hover:bg-red-50 dark:hover:bg-gray-700 flex items-center gap-3 transition-colors ${i > 0 ? 'border-t border-gray-100 dark:border-gray-700' : ''}`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                        <MapPin className="w-4 h-4 text-[#E63946]" />
                      </div>
                      <span className="text-gray-800 dark:text-white font-medium">{s}</span>
                    </button>
                  ))}
                </div>
              )}
              {/* Recent searches dropdown - show when input focused and no suggestions */}
              {searchFocused && recentSearches.length > 0 && locationSuggestions.length === 0 && (
                <div className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl z-20 overflow-hidden animate-fadeIn">
                  <div className="text-xs text-gray-600 dark:text-gray-300 px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border-b border-gray-100 dark:border-gray-600 font-semibold flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5" /> Recent Searches
                  </div>
                  {recentSearches.map((s, i) => (
                    <button
                      key={`recent-${i}`}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()} 
                      onClick={() => { setSearchLocation(s); setSearchFocused(false); }}
                      className={`w-full text-left px-4 py-3 text-sm hover:bg-red-50 dark:hover:bg-gray-700 flex items-center gap-3 transition-colors ${i > 0 ? 'border-t border-gray-100 dark:border-gray-700' : ''}`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                        <Clock className="w-4 h-4 text-[#E63946]" />
                      </div>
                      <span className="text-gray-700 dark:text-white">{s}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button 
                className="bg-gradient-to-r from-[#E63946] to-[#c5303c] hover:from-[#c5303c] hover:to-[#a52833] text-white px-6 py-3 rounded-xl transition-all duration-200 font-bold shadow-lg hover:shadow-xl text-sm flex items-center gap-2 active:scale-95" 
                onClick={() => { if (searchLocation) addRecentSearch(searchLocation); }} 
                aria-label="Search submit"
              >
                <Search className="w-5 h-5" />
                Search Rooms
              </button>
              <button
                type="button"
                onClick={saveCurrentSearch}
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Save Search
              </button>
            </div>
            
            {/* Popular Areas Quick Select */}
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400 font-semibold">Popular:</span>
              {['Sandton', 'Soweto', 'Pretoria', 'Cape Town', 'Durban', 'Johannesburg'].map(area => (
                <button
                  key={area}
                  onClick={() => { setSearchLocation(area); addRecentSearch(area); }}
                  className={`text-sm px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
                    searchLocation.toLowerCase() === area.toLowerCase()
                      ? 'bg-gradient-to-r from-[#E63946] to-[#c5303c] text-white shadow-md scale-105'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-gray-700 hover:text-[#E63946] border-2 border-gray-200 dark:border-gray-700 hover:border-red-300 dark:hover:border-red-800 shadow-sm'
                  }`}
                >
                  {area}
                </button>
              ))}
            </div>

            {/* Quick Filter Chips */}
            <div className="flex flex-wrap gap-2 items-center pt-4 border-t border-gray-100 dark:border-gray-700">
              <span className="text-sm text-gray-600 dark:text-gray-400 font-semibold">Quick filters:</span>
              <button
                onClick={() => setPriceRange([0, 3000])}
                className={`text-sm px-4 py-2 rounded-xl transition-all duration-200 flex items-center gap-1.5 font-medium ${
                  priceRange[1] === 3000 && priceRange[0] === 0
                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md scale-105'
                    : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border-2 border-emerald-200 dark:border-emerald-800 hover:border-emerald-300'
                }`}
              >
                💰 Under R3,000
              </button>
              <button
                onClick={() => setPetFriendly(!petFriendly)}
                className={`text-sm px-4 py-2 rounded-xl transition-all duration-200 flex items-center gap-1.5 font-medium ${
                  petFriendly
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md scale-105'
                    : 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/50 border-2 border-amber-200 dark:border-amber-800 hover:border-amber-300'
                }`}
              >
                🐾 Pet Friendly
              </button>
              <button
                onClick={() => {
                  // Visual indicator for available now - just scroll to see results
                  window.scrollTo({ top: 400, behavior: 'smooth' });
                }}
                className="text-sm px-4 py-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 border-2 border-blue-200 dark:border-blue-800 hover:border-blue-300 transition-all duration-200 flex items-center gap-1.5 font-medium"
              >
                🏠 Available Now
              </button>
              <button
                onClick={() => toggleAmenity('WiFi')}
                className={`text-sm px-4 py-2 rounded-xl transition-all duration-200 flex items-center gap-1.5 font-medium ${
                  selectedAmenities.includes('WiFi')
                    ? 'bg-gradient-to-r from-[#E63946] to-[#c5303c] text-white shadow-md scale-105'
                    : 'bg-red-50 dark:bg-red-900/30 text-[#E63946] hover:bg-red-100 dark:hover:bg-red-900/50 border-2 border-red-200 dark:border-red-800 hover:border-red-300'
                }`}
              >
                📶 WiFi
              </button>
              <button
                onClick={() => toggleAmenity('Parking')}
                className={`text-sm px-4 py-2 rounded-xl transition-all duration-200 flex items-center gap-1.5 font-medium ${
                  selectedAmenities.includes('Parking')
                    ? 'bg-gradient-to-r from-slate-500 to-gray-600 text-white shadow-md scale-105'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 hover:border-slate-300'
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
                    className="text-[11px] px-2 py-1 rounded bg-red-50 text-[#E63946] border border-red-200"
                  >{s.location || 'Any'} • {s.priceRange[0]}-{s.priceRange[1]}</button>
                ))}
              </div>
            )}
          </div>
          {/* Filter Controls - Premium Card */}
          <div className="flex gap-3 mb-4 flex-wrap items-center bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-md border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-gray-50 to-slate-100 dark:from-gray-700 dark:to-gray-800 border border-gray-200 dark:border-gray-600">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">R{priceRange[0].toLocaleString()} - R{priceRange[1].toLocaleString()}</span>
              <select
                value={priceRange[0]}
                onChange={(e) => setPriceRange([parseInt(e.target.value), priceRange[1]])}
                className="text-xs bg-transparent border-l border-gray-300 dark:border-gray-500 pl-2 focus:outline-none text-gray-700 dark:text-gray-300 cursor-pointer"
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
                className="text-xs bg-transparent border-l border-gray-300 dark:border-gray-500 pl-2 focus:outline-none text-gray-700 dark:text-gray-300 cursor-pointer"
                aria-label="Maximum price"
              >
                <option value="10000">R10k</option>
                <option value="5000">R5k</option>
                <option value="3000">R3k</option>
                <option value="2000">R2k</option>
              </select>
            </div>
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-gray-50 to-slate-100 dark:from-gray-700 dark:to-gray-800 border border-gray-200 dark:border-gray-600">
              <TrendingUp className="w-4 h-4 text-[#E63946]" />
              <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="text-sm bg-transparent focus:outline-none text-gray-700 dark:text-gray-300 font-semibold cursor-pointer"
                aria-label="Sort order"
              >
                <option value="newest">Newest</option>
                <option value="cheapest">Cheapest</option>
                <option value="expensive">Most Expensive</option>
              </select>
            </div>
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-gray-50 to-slate-100 dark:from-gray-700 dark:to-gray-800 border border-gray-200 dark:border-gray-600">
              <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">💳 Payment:</span>
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="text-sm bg-transparent focus:outline-none text-gray-700 dark:text-gray-300 font-semibold cursor-pointer"
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
              className={`text-sm font-semibold px-4 py-2.5 rounded-xl transition-all duration-200 flex items-center gap-2 ${
                showAdvancedFilters
                  ? 'bg-gradient-to-r from-[#E63946] to-[#c5303c] text-white shadow-md'
                  : 'bg-gradient-to-r from-gray-50 to-slate-100 dark:from-gray-700 dark:to-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:border-[#E63946]'
              }`}
              aria-expanded={showAdvancedFilters}
            >
              <Filter className="w-4 h-4" />
              {showAdvancedFilters ? 'Hide Filters' : 'More Filters'}
            </button>
          </div>
          {showAdvancedFilters && (
            <div className="mt-4 p-5 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg space-y-5">
              {/* Room Type */}
              <div>
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 block flex items-center gap-2">🏠 Room Type</label>
                <div className="flex gap-3">
                  {['Private', 'Shared'].map(type => (
                    <button
                      key={type}
                      onClick={() => setRoomType(roomType === type.toLowerCase() ? '' : type.toLowerCase())}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium border transition ${ 
                        roomType === type.toLowerCase()
                          ? 'bg-[#E63946] text-white border-[#E63946] shadow-sm'
                          : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >{type}</button>
                  ))}
                </div>
              </div>

              {/* Lease Duration */}
              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 block">Lease Duration (months)</label>
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
                          ? 'bg-[#E63946] text-white border-[#E63946] shadow-sm'
                          : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
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
                    className="w-4 h-4 text-[#E63946] border-gray-300 dark:border-gray-600 rounded focus:ring-[#E63946]"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">🐾 Pet Friendly</span>
                </label>
              </div>

              {/* Gender Preference */}
              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 block">Gender Preference</label>
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
                          ? 'bg-[#E63946] text-white border-[#E63946] shadow-sm'
                          : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >{opt.label}</button>
                  ))}
                </div>
              </div>

              {/* Amenities */}
              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 block">Amenities</label>
                <div className="flex flex-wrap gap-1" aria-label="Amenities">
                  {amenityOptions.map(a => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => toggleAmenity(a)}
                      className={`px-2 py-1 rounded-md text-[11px] font-medium border transition ${selectedAmenities.includes(a) ? 'bg-[#E63946] text-white border-[#E63946] shadow-sm' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
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
      
      {/* Results Section */}
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center mt-6 mb-6 bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-md border border-gray-100 dark:border-gray-700">
          <h2 id="results-heading" className="text-2xl font-bold text-gray-800 dark:text-white">
            {listings.length === 0 ? (
              <span className="flex items-center gap-2">
                <Search className="w-6 h-6 text-gray-400" />
                No rooms available
              </span>
            ) : (
              <span className="flex items-center gap-3">
                <span className="bg-gradient-to-r from-[#E63946] to-rose-500 text-white text-lg font-bold px-4 py-1.5 rounded-xl shadow-lg">{listings.length}</span>
                <span>Rooms Available</span>
                <Eye className="w-5 h-5 text-gray-400 ml-2" />
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
            <div className="bg-gradient-to-br from-white via-slate-50 to-blue-50 dark:from-gray-800 dark:via-gray-800 dark:to-gray-800 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-600 p-12 md:p-16 text-center shadow-lg relative overflow-hidden">
              {/* Decorative elements */}
              <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-red-50 to-transparent rounded-br-full opacity-50" />
              <div className="absolute bottom-0 right-0 w-40 h-40 bg-gradient-to-tl from-blue-50 to-transparent rounded-tl-full opacity-50" />
              
              <div className="relative">
                <div className="bg-gradient-to-br from-gray-100 to-white dark:from-gray-700 dark:to-gray-900 w-28 h-28 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl border border-gray-200 dark:border-gray-600" style={{ animation: 'float 3s ease-in-out infinite' }}>
                  <Search className="w-14 h-14 text-gray-300 dark:text-gray-500" />
                </div>
                <h3 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white mb-3">No rooms found</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-2 text-lg">Try adjusting your filters or search in a different area</p>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-8 max-w-md mx-auto">
                  We'll help you find the perfect room. Try these popular areas below!
                </p>
                
                {/* Popular areas */}
                <div className="flex flex-wrap justify-center gap-2 mb-8">
                  {['Sandton', 'Soweto', 'Pretoria', 'Cape Town', 'Durban'].map(area => (
                    <button
                      key={area}
                      onClick={() => setSearchLocation(area)}
                      className="px-4 py-2 rounded-xl bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-2 border-gray-200 dark:border-gray-600 hover:border-[#E63946] hover:text-[#E63946] transition-all duration-200 font-medium text-sm shadow-sm"
                    >
                      {area}
                    </button>
                  ))}
                </div>
                
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
                    className="inline-flex items-center gap-2 bg-gradient-to-r from-[#E63946] to-rose-500 hover:from-[#c5303c] hover:to-rose-600 text-white font-bold px-8 py-3 rounded-xl transition-all shadow-lg hover:shadow-xl active:scale-95"
                  >
                    <X className="w-5 h-5" />
                    Clear All Filters
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12 justify-items-center stagger-animation">
                {(paymentFilter ? listings.filter(l => l.paymentMethod === paymentFilter) : listings).map((listing, idx) => (
                  <React.Fragment key={listing.id}>
                    <ListingCard
                      listing={listing}
                      onClick={() => onSelectListing(listing)}
                      isFavorite={favorites.includes(listing.id)}
                      onToggleFavorite={toggleFavorite}
                      index={idx}
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
                <div className="bg-gradient-to-br from-white via-slate-50 to-blue-50 dark:from-gray-800 dark:via-gray-800 dark:to-gray-800 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 p-8 md:p-12 mb-8 relative overflow-hidden">
                  {/* Decorative elements */}
                  <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-red-100/50 to-transparent rounded-bl-full" />
                  <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-blue-100/50 to-transparent rounded-tr-full" />
                  
                  <div className="relative text-center mb-10">
                    <span className="inline-flex items-center gap-2 bg-gradient-to-r from-[#E63946]/10 to-rose-500/10 text-[#E63946] px-4 py-2 rounded-full text-sm font-bold mb-4">
                      <Sparkles className="w-4 h-4" />
                      Simple Process
                    </span>
                    <h3 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-3">How RentMzansi Works</h3>
                    <p className="text-gray-600 dark:text-gray-300 text-lg">Find your perfect room in 3 simple steps</p>
                  </div>
                  
                  <div className="relative grid md:grid-cols-3 gap-8">
                    {/* Connecting line */}
                    <div className="hidden md:block absolute top-16 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-[#E63946] via-[#1D3557] to-emerald-500" />
                    
                    <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                      <div className="w-20 h-20 bg-gradient-to-br from-red-100 to-rose-200 dark:from-red-900/30 dark:to-rose-800/30 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md">
                        <Search className="w-10 h-10 text-[#E63946]" />
                      </div>
                      <div className="bg-gradient-to-r from-[#E63946] to-rose-500 text-white text-sm font-bold w-8 h-8 rounded-full flex items-center justify-center mx-auto -mt-10 mb-4 relative z-10 shadow-lg border-2 border-white">1</div>
                      <h4 className="font-bold text-gray-900 dark:text-white mb-3 text-lg">Search & Filter</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Browse rooms by location, price, and amenities. Use filters to find exactly what you need.</p>
                    </div>
                    
                    <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                      <div className="w-20 h-20 bg-gradient-to-br from-[#1D3557]/20 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md">
                        <Home className="w-10 h-10 text-[#1D3557]" />
                      </div>
                      <div className="bg-gradient-to-r from-[#1D3557] to-blue-600 text-white text-sm font-bold w-8 h-8 rounded-full flex items-center justify-center mx-auto -mt-10 mb-4 relative z-10 shadow-lg border-2 border-white">2</div>
                      <h4 className="font-bold text-gray-900 dark:text-white mb-3 text-lg">View Details</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Check photos, virtual tours, reviews, and landlord verification status.</p>
                    </div>
                    
                    <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                      <div className="w-20 h-20 bg-gradient-to-br from-emerald-100 to-green-200 dark:from-emerald-900/30 dark:to-green-800/30 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md">
                        <MessageCircle className="w-10 h-10 text-emerald-600" />
                      </div>
                      <div className="bg-gradient-to-r from-emerald-500 to-green-500 text-white text-sm font-bold w-8 h-8 rounded-full flex items-center justify-center mx-auto -mt-10 mb-4 relative z-10 shadow-lg border-2 border-white">3</div>
                      <h4 className="font-bold text-gray-900 dark:text-white mb-3 text-lg">Contact Landlord</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Connect directly via phone, email, or WhatsApp. No middleman fees.</p>
                    </div>
                  </div>
                  
                  <div className="text-center mt-10 pt-8 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => onRequireAuth && onRequireAuth('renter')}
                      className="inline-flex items-center gap-3 bg-gradient-to-r from-[#E63946] to-rose-500 hover:from-[#c5303c] hover:to-rose-600 text-white font-bold px-8 py-4 rounded-2xl shadow-xl hover:shadow-2xl transition-all active:scale-95 text-lg"
                    >
                      Create Free Account
                      <ChevronRight className="w-5 h-5" />
                    </button>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-4">Join thousands of happy renters</p>
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