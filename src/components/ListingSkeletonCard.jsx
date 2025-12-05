import React from 'react';

export default function ListingSkeletonCard() {
  return (
    <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Image skeleton with shimmer - matching ListingCard aspect ratio */}
      <div className="relative w-full aspect-[4/3] bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
        {/* Favorite button placeholder */}
        <div className="absolute top-3 left-3 w-10 h-10 bg-white/80 rounded-xl" />
        {/* Status badge placeholder */}
        <div className="absolute top-3 right-3 w-20 h-6 bg-white/60 rounded-lg" />
      </div>
      
      {/* Content Section */}
      <div className="p-4">
        {/* Title skeleton */}
        <div className="relative h-5 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded-md w-4/5 mb-2 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
        </div>
        
        {/* Price skeleton */}
        <div className="relative h-7 bg-gradient-to-r from-red-100 via-red-50 to-red-100 rounded-md w-28 mb-3 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
        </div>
        
        {/* Tags skeleton */}
        <div className="flex gap-2 mb-3">
          <div className="relative h-7 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded-lg w-20 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
          </div>
          <div className="relative h-7 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded-lg w-24 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
          </div>
        </div>
        
        {/* Location skeleton */}
        <div className="relative h-4 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded-md w-3/5 mb-3 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
        </div>
        
        {/* Amenities skeleton */}
        <div className="flex gap-1.5 mb-4">
          <div className="relative h-6 bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 rounded-lg w-16 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
          </div>
          <div className="relative h-6 bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 rounded-lg w-14 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
          </div>
          <div className="relative h-6 bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 rounded-lg w-12 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
          </div>
        </div>
        
        {/* Button skeleton */}
        <div className="relative h-12 bg-gradient-to-r from-red-100 via-red-50 to-red-100 rounded-xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
        </div>
      </div>
    </div>
  );
}
