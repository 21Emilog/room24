import React, { useState } from 'react';
import { Home, MapPin, User, ShieldCheck, Star, Heart, Clock } from 'lucide-react';

function formatRelativeTime(date) {
  const diffMs = Date.now() - date.getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 45) return 'Just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  const wk = Math.floor(day / 7);
  if (wk < 4) return `${wk}w ago`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `${mo}mo ago`;
  const yr = Math.floor(day / 365);
  return `${yr}y ago`;
}

export default function ListingCard({ listing, onClick, isFavorite, onToggleFavorite }) {
  const addressLine = [listing.streetAddress, listing.location].filter(Boolean).join(', ');
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleFavoriteClick = (e) => {
    e.stopPropagation();
    if (onToggleFavorite) onToggleFavorite(listing.id);
  };

  // Calculate average rating
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
      className={`bg-white rounded-2xl shadow-sm hover:shadow-2xl transition-all duration-300 cursor-pointer overflow-hidden border border-gray-100/80 hover:border-teal-300/80 hover:-translate-y-2 group ${listing.premium ? 'ring-2 ring-amber-400/80 ring-offset-2 shadow-amber-100' : ''}`}
    >
      {listing.photos && listing.photos.length > 0 ? (
        <div className="relative bg-gray-200 aspect-[4/3] overflow-hidden">
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
            alt="Room"
            className={`w-full h-full object-cover group-hover:scale-110 transition-all duration-500 ease-out ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
            loading="lazy"
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          {/* Favorite button */}
          {onToggleFavorite && (
            <button
              onClick={handleFavoriteClick}
              className={`absolute top-3 left-3 rounded-xl p-2.5 shadow-lg transition-all duration-300 hover:scale-110 active:scale-95 z-10 ${
                isFavorite 
                  ? 'bg-rose-500 hover:bg-rose-600' 
                  : 'bg-white/95 backdrop-blur-sm hover:bg-white'
              }`}
              aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Heart
                className={`w-5 h-5 transition-all duration-300 ${
                  isFavorite 
                    ? 'fill-white text-white' 
                    : 'text-gray-600 hover:text-rose-500'
                }`}
              />
            </button>
          )}
          
          {/* Top right badges */}
          <div className="absolute top-3 right-3 flex gap-2 flex-wrap justify-end">
            {listing.photos.length > 1 && (
              <div className="bg-black/70 backdrop-blur-sm text-white px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1">
                <span>📷</span> {listing.photos.length}
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

          {/* Badges row */}
          <div className="absolute top-12 right-3 flex flex-col gap-1.5 items-end">
            {isNew && (
              <div className="px-2 py-1 rounded-lg text-[10px] font-bold bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg uppercase tracking-wider animate-pulse">
                ✨ New
              </div>
            )}
            {(() => {
              const verified = listing.landlordVerified || (listing.landlord && listing.landlord.idNumber);
              return verified;
            })() && (
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
                <img src={listing.landlordPhoto} alt={listing.landlordName} className="w-full h-full object-cover" />
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
        <div className="bg-gradient-to-br from-gray-100 to-gray-200 aspect-[4/3] flex items-center justify-center relative">
          <div className="w-16 h-16 rounded-2xl bg-white/80 flex items-center justify-center shadow-lg">
            <Home className="w-8 h-8 text-gray-400" />
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
      
      <div className="p-4">
        {/* Title and time */}
        <div className="mb-3">
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <h3 className="font-bold text-base text-gray-900 group-hover:text-teal-600 transition-colors line-clamp-1 flex-1">
              {listing.title}
            </h3>
            {listing.createdAt && (
              <span className="text-[10px] font-medium text-gray-400 bg-gray-50 px-2 py-0.5 rounded-md flex-shrink-0 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatRelativeTime(new Date(listing.createdAt))}
              </span>
            )}
          </div>
          
          {/* Price and rating */}
          <div className="flex items-center gap-3">
            <p className="text-transparent bg-gradient-to-r from-rose-600 to-rose-500 bg-clip-text font-extrabold text-xl tracking-tight">
              R{formattedPrice}
              <span className="text-xs font-semibold text-gray-400 ml-0.5">/mo</span>
            </p>
            {avgRating && (
              <div className="flex items-center gap-1 text-xs bg-amber-50 px-2 py-1 rounded-lg border border-amber-100">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span className="font-bold text-gray-700">{avgRating}</span>
                <span className="text-gray-400">({reviews.length})</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Payment method & availability badges */}
        <div className="flex flex-wrap gap-2 mb-3">
          {listing.paymentMethod && (
            <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-xs px-2.5 py-1 rounded-lg font-medium border border-emerald-100">
              <span>💳</span> {listing.paymentMethod}
            </span>
          )}
          {isAvailableNow ? (
            <span className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 text-xs px-2.5 py-1 rounded-lg font-medium border border-green-100">
              <span>🏠</span> Available Now
            </span>
          ) : isAvailableSoon && (
            <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 text-xs px-2.5 py-1 rounded-lg font-medium border border-blue-100">
              <span>📅</span> {availableDate.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}
            </span>
          )}
        </div>
        
        {/* Location */}
        <div className="flex items-center text-gray-500 text-sm mb-3">
          <MapPin className="w-4 h-4 mr-1.5 text-teal-500 flex-shrink-0" />
          <span className="truncate font-medium uppercase">
            {addressLine || listing.location || 'Location TBA'}
          </span>
        </div>
        
        {/* Amenities */}
        {listing.amenities && listing.amenities.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {listing.amenities.slice(0, 3).map((amenity, index) => (
              <span
                key={index}
                className="inline-block bg-gray-100 text-gray-600 text-[11px] px-2.5 py-1 rounded-lg font-medium"
              >
                {amenity}
              </span>
            ))}
            {listing.amenities.length > 3 && (
              <span className="inline-block bg-teal-50 text-teal-600 text-[11px] px-2.5 py-1 rounded-lg font-semibold">
                +{listing.amenities.length - 3} more
              </span>
            )}
          </div>
        )}
        
        {/* CTA Button */}
        <button className="w-full bg-gradient-to-r from-teal-500 via-teal-500 to-cyan-500 hover:from-teal-600 hover:via-teal-500 hover:to-cyan-600 text-white py-3.5 rounded-xl font-bold text-sm transition-all duration-300 shadow-lg shadow-teal-500/20 hover:shadow-xl hover:shadow-teal-500/30 active:scale-[0.97] flex items-center justify-center gap-2 group/btn">
          <span className="group-hover/btn:tracking-wide transition-all duration-300">View Details</span>
          <svg className="w-4 h-4 transform group-hover/btn:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
