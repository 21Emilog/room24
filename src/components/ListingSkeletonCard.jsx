import React from 'react';

export default function ListingSkeletonCard() {
  return (
    <div className="w-full bg-white rounded-xl shadow-md p-3 border border-gray-100 overflow-hidden">
      {/* Image skeleton with shimmer */}
      <div className="relative w-full h-36 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded-lg mb-3 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
        {/* Favorite button placeholder */}
        <div className="absolute top-2 right-2 w-8 h-8 bg-white/60 rounded-full" />
      </div>
      
      {/* Title skeleton */}
      <div className="relative h-5 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded-md w-4/5 mb-2 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
      </div>
      
      {/* Location skeleton */}
      <div className="relative h-4 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded-md w-3/5 mb-3 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
      </div>
      
      {/* Tags skeleton */}
      <div className="flex gap-2 mb-3">
        <div className="relative h-6 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded-full w-16 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
        </div>
        <div className="relative h-6 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded-full w-20 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
        </div>
        <div className="relative h-6 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded-full w-14 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
        </div>
      </div>
      
      {/* Price and button skeleton */}
      <div className="flex justify-between items-center">
        <div className="relative h-6 bg-gradient-to-r from-teal-100 via-teal-50 to-teal-100 rounded-md w-24 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
        </div>
        <div className="relative h-9 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded-lg w-24 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
        </div>
      </div>
    </div>
  );
}
