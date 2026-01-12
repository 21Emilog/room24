import React, { useState } from 'react';
import { Home, MapPin, User, ShieldCheck, Star, Heart, Clock } from 'lucide-react';

function formatRelativeTime(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });
}

// Listing type configuration
const listingTypeConfig = {
  room: { label: 'Room', icon: '🛏️', color: 'from-blue-500 to-blue-600', bgColor: 'bg-blue-500', textColor: 'text-blue-600' },
  backroom: { label: 'Backroom', icon: '🏡', color: 'from-emerald-500 to-green-600', bgColor: 'bg-emerald-500', textColor: 'text-emerald-600' },
  guesthouse: { label: 'Guesthouse', icon: '🏨', color: 'from-purple-500 to-violet-600', bgColor: 'bg-purple-500', textColor: 'text-purple-600' }
};

export default function ListingCard({ listing, onClick, isFavorite, onToggleFavorite }) {
  const addressLine = [listing.streetAddress, listing.location].filter(Boolean).join(', ');
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleFavoriteClick = (e) => {
    e.stopPropagation();
    if (onToggleFavorite) onToggleFavorite(listing.id);
  };

  // Calculate average rating from reviews
  const reviews = listing.reviews || [];
  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length).toFixed(1)
    : null;

  // Check if listing is new (within 24 hours)
  const isNew = listing.createdAt && Date.now() - new Date(listing.createdAt).getTime() < 1000 * 60 * 60 * 24;
  
  // Check if available soon (within 7 days)
  const availableDate = listing.availableDate ? new Date(listing.availableDate) : null;
  const isAvailableSoon = availableDate && availableDate > new Date() && (availableDate - new Date()) < 1000 * 60 * 60 * 24 * 7;
  const isAvailableNow = !availableDate || availableDate <= new Date();

  // Format price with thousands separator
  const formattedPrice = typeof listing.price === 'number' 
    ? listing.price.toLocaleString('en-ZA') 
    : parseFloat(listing.price)?.toLocaleString('en-ZA') || listing.price;

  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-gray-800 rounded-3xl shadow-md hover:shadow-2xl dark:shadow-gray-900/50 transition-all duration-500 ease-out cursor-pointer overflow-hidden border border-gray-100 dark:border-gray-700 hover:border-red-400 dark:hover:border-red-500/50 hover:-translate-y-2 hover:scale-[1.02] group w-full max-w-sm ${listing.premium ? 'ring-2 ring-amber-400 ring-offset-4 dark:ring-offset-gray-900 shadow-amber-500/20' : ''}`}
      role="article"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.(); } }}
      aria-label={`${listing.title} - R${formattedPrice} per month in ${listing.location || 'unknown location'}`}
    >
      {/* Image Section */}
      {listing.photos && listing.photos.length > 0 ? (
        <div className="relative bg-gray-200 dark:bg-gray-700 aspect-[4/3] overflow-hidden">
          {/* Skeleton placeholder while loading */}
          {!imageLoaded && !imageError && (
            <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-pulse" />
          )}
          {/* Error fallback */}
          {imageError && (
            <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
              <Home className="w-12 h-12 text-gray-300" />
            </div>
          )}
          <img
            src={listing.photos[0]}
            alt={`Room: ${listing.title}`}
            className={`w-full h-full object-cover group-hover:scale-110 transition-all duration-500 ease-out ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
            loading="lazy"
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500" />
          
          {/* Favorite button */}
          {onToggleFavorite && (
            <button
              onClick={handleFavoriteClick}
              className={`absolute top-3 left-3 rounded-2xl p-3 shadow-xl transition-all duration-300 hover:scale-110 active:scale-90 z-10 ${
                isFavorite 
                  ? 'bg-gradient-to-br from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 shadow-rose-500/40' 
                  : 'bg-white/95 backdrop-blur-md hover:bg-white shadow-black/10'
              }`}
              aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              aria-pressed={isFavorite}
            >
              <Heart
                className={`w-5 h-5 transition-all duration-300 ${
                  isFavorite 
                    ? 'fill-white text-white animate-pulse' 
                    : 'text-gray-600 group-hover:text-rose-500'
                }`}
              />
            </button>
          )}
          
          {/* Top right badges */}
          <div className="absolute top-3 right-3 flex gap-2 flex-wrap justify-end">
            {listing.photos.length > 1 && (
              <div className="bg-black/70 backdrop-blur-sm text-white px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1">
                <span aria-hidden="true">📷</span> {listing.photos.length}
              </div>
            )}
            <div
              className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wide ${
                listing.status === 'available' 
                  ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-lg shadow-emerald-500/30' 
                  : 'bg-gray-700/90 text-white'
              }`}
            >
              {listing.status === 'available' ? '✓ Available' : 'Rented'}
            </div>
          </div>
          
          {/* Additional badges row */}
          <div className="absolute top-12 right-3 flex flex-col gap-1.5 items-end">
            {/* Listing Type Badge */}
            {listing.listingType && listing.listingType !== 'room' && (
              <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold text-white shadow-lg bg-gradient-to-r ${listingTypeConfig[listing.listingType]?.color || 'from-gray-500 to-gray-600'}`}>
                <span>{listingTypeConfig[listing.listingType]?.icon}</span>
                {listingTypeConfig[listing.listingType]?.label}
              </div>
            )}
            {isNew && (
              <div className="px-2 py-1 rounded-lg text-[10px] font-bold bg-gradient-to-r from-red-500 to-red-500 text-white shadow-lg uppercase tracking-wider animate-pulse">
                ✨ New
              </div>
            )}
            {(listing.landlordVerified || listing.landlord?.idNumber) && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-blue-600 text-white shadow-lg">
                <ShieldCheck className="w-3 h-3" /> Verified
              </div>
            )}
            {listing.premium && (
              <div className="px-2 py-1 rounded-lg text-[10px] font-bold bg-gradient-to-r from-amber-400 to-orange-400 text-amber-900 shadow-lg flex items-center gap-1">
                <Star className="w-3 h-3 fill-current" /> Premium
              </div>
            )}
          </div>

          {/* Bottom left - Landlord info */}
          <div className="absolute bottom-3 left-3 flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-white shadow-lg ring-2 ring-white overflow-hidden flex items-center justify-center">
              {listing.landlordPhoto ? (
                <img src={listing.landlordPhoto} alt={listing.landlordName || 'Landlord'} className="w-full h-full object-cover" />
              ) : (
                <User className="w-5 h-5 text-gray-400" />
              )}
            </div>
            {listing.landlordName && (
              <span className="hidden sm:inline-block text-xs font-semibold bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded-lg text-gray-700 shadow-lg">
                {listing.landlordName.split(' ')[0]}
              </span>
            )}
          </div>
        </div>
      ) : (
        /* No photo fallback */
        <div className="bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 aspect-[4/3] flex items-center justify-center relative">
          <div className="w-16 h-16 rounded-2xl bg-white/80 dark:bg-gray-600 flex items-center justify-center shadow-lg">
            <Home className="w-8 h-8 text-gray-400 dark:text-gray-300" />
          </div>
          <div
            className={`absolute top-3 right-3 px-2.5 py-1 rounded-lg text-xs font-bold ${
              listing.status === 'available' ? 'bg-emerald-500 text-white' : 'bg-gray-700 text-white'
            }`}
          >
            {listing.status === 'available' ? '✓ Available' : 'Rented'}
          </div>
        </div>
      )}
      
      {/* Content Section */}
      <div className="p-4">
        {/* Title and time */}
        <div className="mb-3">
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <h3 className="font-bold text-base text-gray-800 dark:text-white group-hover:text-[#E63946] transition-colors line-clamp-1 flex-1 uppercase tracking-wide">
              {listing.title}
            </h3>
            {listing.createdAt && (
              <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700 px-2 py-0.5 rounded-md flex-shrink-0 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatRelativeTime(new Date(listing.createdAt))}
              </span>
            )}
          </div>
          
          {/* Price and rating */}
          <div className="flex items-center gap-3">
            <p className="text-[#E63946] font-extrabold text-xl tracking-tight">
              R{formattedPrice}
              <span className="text-sm font-medium text-gray-400 dark:text-gray-500 ml-0.5">/mo</span>
            </p>
            {avgRating && (
              <div className="flex items-center gap-1 text-xs bg-amber-50 dark:bg-amber-900/30 px-2 py-1 rounded-lg border border-amber-100 dark:border-amber-700">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span className="font-bold text-gray-700">{avgRating}</span>
                <span className="text-gray-400">({reviews.length})</span>
              </div>
            )}
          </div>
          {/* Additional costs indicator */}
          {listing.additionalCosts && listing.additionalCosts.filter(c => c.name && c.amount).length > 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
              <span>💰</span> +additional costs apply
            </p>
          )}
        </div>
        
        {/* Payment method & availability badges */}
        <div className="flex flex-wrap gap-2 mb-3">
          {/* Listing Type Badge */}
          {listing.listingType && (
            <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg font-semibold border ${
              listing.listingType === 'backroom' 
                ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                : listing.listingType === 'guesthouse'
                ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800'
                : 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800'
            }`}>
              <span aria-hidden="true">{listingTypeConfig[listing.listingType]?.icon || '🛏️'}</span>
              {listingTypeConfig[listing.listingType]?.label || 'Room'}
            </span>
          )}
          {listing.paymentMethod && (
            <span className="inline-flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs px-2.5 py-1 rounded-lg font-medium border border-emerald-100 dark:border-emerald-800">
              <span aria-hidden="true">💳</span> {listing.paymentMethod}
            </span>
          )}
          {isAvailableNow ? (
            <span className="inline-flex items-center gap-1.5 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs px-2.5 py-1 rounded-lg font-medium border border-green-100 dark:border-green-800">
              <span aria-hidden="true">🏠</span> Available Now
            </span>
          ) : isAvailableSoon && availableDate && (
            <span className="inline-flex items-center gap-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs px-2.5 py-1 rounded-lg font-medium border border-blue-100 dark:border-blue-800">
              <span aria-hidden="true">📅</span> {availableDate.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}
            </span>
          )}
        </div>
        
        {/* Location */}
        <div className="flex items-center text-sm mb-3">
          <MapPin className="w-4 h-4 mr-1.5 text-red-500 flex-shrink-0" aria-hidden="true" />
          <span className="truncate font-semibold text-[#c5303c] dark:text-red-400 uppercase tracking-wide">
            {addressLine || listing.location || 'Location TBA'}
          </span>
        </div>
        
        {/* Amenities */}
        {listing.amenities && listing.amenities.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {listing.amenities.slice(0, 3).map((amenity, index) => (
              <span
                key={index}
                className="inline-block bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-[11px] px-2.5 py-1 rounded-lg font-medium"
              >
                {amenity}
              </span>
            ))}
            {listing.amenities.length > 3 && (
              <span className="inline-block bg-red-50 dark:bg-red-900/30 text-[#E63946] dark:text-red-400 text-[11px] px-2.5 py-1 rounded-lg font-semibold">
                +{listing.amenities.length - 3} more
              </span>
            )}
          </div>
        )}
        
        {/* CTA Button */}
        <button className="w-full bg-gradient-to-r from-[#E63946] via-rose-500 to-[#E63946] hover:from-[#c5303c] hover:via-red-600 hover:to-[#c5303c] text-white py-3.5 rounded-2xl font-bold text-sm transition-all duration-300 shadow-lg shadow-red-500/30 hover:shadow-xl hover:shadow-red-500/40 active:scale-[0.97] flex items-center justify-center gap-2 group/btn relative overflow-hidden">
          <span className="relative z-10">View Details</span>
          <svg className="w-4 h-4 transform group-hover/btn:translate-x-1.5 transition-transform duration-300 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
          </svg>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700" />
        </button>
      </div>
    </div>
  );
}
