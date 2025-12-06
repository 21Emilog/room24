import React from 'react';

export default function ListingSkeletonCard() {
  return (
    <div className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-3xl shadow-md border border-gray-100 dark:border-gray-700 overflow-hidden">
      {/* Image skeleton with shimmer - matching ListingCard aspect ratio */}
      <div className="relative w-full aspect-[4/3] bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
        {/* Favorite button placeholder */}
        <div className="absolute top-3 left-3 w-12 h-12 bg-white/80 dark:bg-gray-600/80 rounded-2xl" />
        {/* Status badge placeholder */}
        <div className="absolute top-3 right-3 w-24 h-7 bg-white/60 dark:bg-gray-600/60 rounded-xl" />
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
        <div className="relative h-14 bg-gradient-to-r from-red-200 via-red-100 to-red-200 dark:from-red-900/50 dark:via-red-800/50 dark:to-red-900/50 rounded-2xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
        </div>
      </div>
    </div>
  );
}
