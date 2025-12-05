import React, { useState, useEffect, useRef } from 'react';
import { X, Search, MapPin, User, Phone, Mail, ArrowLeft, ShieldCheck, Star, Maximize, ExternalLink, Share2, Copy, MessageCircle, Eye, GitCompare, Zap, Calendar, Clock, Award, Home, ChevronRight } from 'lucide-react';
import VirtualTourViewer from './VirtualTourViewer';
import { trackListingView, trackUserViewedListing, addToCompare, getCompareList, removeFromCompare, trackLandlordContactClick, getResponseTimeBadge } from '../utils/notificationEngine';
import { calculateQualityScore, getQualityLabel } from '../utils/qualityScore';

function PhotoGallery({ photos, currentIndex, onClose, onNavigate }) {
  const [touchStart, setTouchStart] = useState(null);
  const containerRef = useRef(null);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        onNavigate('next');
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        onNavigate('prev');
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    containerRef.current?.focus();
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNavigate, onClose]);

  const handleTouchStart = (e) => {
    if (e.touches && e.touches.length === 1) {
      const t = e.touches[0];
      setTouchStart({ x: t.clientX, y: t.clientY, time: Date.now() });
    }
  };

  const handleTouchEnd = (e) => {
    if (!touchStart || !e.changedTouches || e.changedTouches.length === 0) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.x;
    const dy = t.clientY - touchStart.y;
    const dt = Date.now() - touchStart.time;
    const fast = dt < 600; // quick swipe threshold
    const horiz = Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy);
    const vertDown = dy > 80 && Math.abs(dy) > Math.abs(dx);
    if (fast && horiz) {
      if (dx < 0) {
        onNavigate('next');
      } else {
        onNavigate('prev');
      }
    } else if (fast && vertDown) {
      onClose();
    }
    setTouchStart(null);
  };

  return (
    <div
      ref={containerRef}
      tabIndex={-1}
      className="fixed inset-0 bg-black/95 z-50 flex flex-col outline-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Header */}
      <div className="flex justify-between items-center p-4 text-white safe-area-top">
        <div className="flex items-center gap-3">
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
            aria-label="Close gallery"
          >
            <X className="w-6 h-6" />
          </button>
          <span className="text-sm font-medium bg-white/10 px-3 py-1 rounded-full">
            {currentIndex + 1} of {photos.length}
          </span>
        </div>
      </div>
      
      {/* Main Image */}
      <div className="flex-1 flex items-center justify-center relative px-4">
        {currentIndex > 0 && (
          <button
            onClick={() => onNavigate('prev')}
            className="absolute left-2 sm:left-6 bg-white/20 backdrop-blur-sm text-white p-3 sm:p-4 rounded-full hover:bg-white/30 z-10 transition-all duration-200 hover:scale-110 active:scale-95 shadow-lg"
            aria-label="Previous photo"
          >
            <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        )}
        <img 
          src={photos[currentIndex]} 
          alt={`Room view ${currentIndex + 1}`} 
          className="max-w-full max-h-full object-contain rounded-lg shadow-2xl transition-opacity duration-300" 
        />
        {currentIndex < photos.length - 1 && (
          <button
            onClick={() => onNavigate('next')}
            className="absolute right-2 sm:right-6 bg-white/20 backdrop-blur-sm text-white p-3 sm:p-4 rounded-full hover:bg-white/30 z-10 transition-all duration-200 hover:scale-110 active:scale-95 shadow-lg"
            aria-label="Next photo"
          >
            <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 transform rotate-180" />
          </button>
        )}
        
        {/* Swipe hint */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center text-xs text-white/60 bg-black/30 backdrop-blur-sm px-4 py-2 rounded-full hidden sm:block">
          Use arrow keys or swipe to navigate
        </div>
      </div>
      
      {/* Thumbnails */}
      <div className="p-4 safe-area-bottom">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {photos.map((photo, index) => (
            <button
              key={index}
              onClick={() => onNavigate('goto', index)}
              className={`flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden transition-all duration-200 ${index === currentIndex ? 'ring-2 ring-[#E63946] ring-offset-2 ring-offset-black scale-105' : 'opacity-50 hover:opacity-80'}`}
            >
              <img
                src={photo}
                alt={`Thumbnail ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ListingDetailModal({ listing, landlord, onClose, currentUserId, allListings = [], onSelectListing, onMessageLandlord }) {
  const [showContact, setShowContact] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showReport, setShowReport] = useState(false);
  const [copied, setCopied] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportComment, setReportComment] = useState('');
  const [reportStatus, setReportStatus] = useState('idle');
  const [showVirtualTour, setShowVirtualTour] = useState(false);
  const [viewCount, setViewCount] = useState(0);
  const [isInCompare, setIsInCompare] = useState(false);
  const [showViewingRequest, setShowViewingRequest] = useState(false);
  const [viewingDate, setViewingDate] = useState('');
  const [viewingTime, setViewingTime] = useState('');
  const [viewingMessage, setViewingMessage] = useState('');
  const [viewingStatus, setViewingStatus] = useState('idle'); // idle, sending, sent
  
  // Reviews state
  const listingKey = listing?.id || `${listing.title}-${listing.createdAt || 'na'}`;
  const reviewsStorageKey = `reviews-${listingKey}`;
  const [reviews, setReviews] = useState(() => {
    try {
      const raw = localStorage.getItem(reviewsStorageKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [newRating, setNewRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [newComment, setNewComment] = useState('');
  const [submitStatus, setSubmitStatus] = useState('idle');
  
  // Track view and get view count on mount
  useEffect(() => {
    if (listingKey) {
      const count = trackListingView(listingKey, currentUserId);
      setViewCount(count);
      // Track for price drop alerts
      if (currentUserId && listing?.price) {
        trackUserViewedListing(currentUserId, listingKey, listing.price);
      }
      // Check if in compare list
      const compareList = getCompareList();
      setIsInCompare(compareList.includes(listingKey));
    }
  }, [listingKey, currentUserId, listing?.price]);
  
  // Get landlord response badge
  const responseBadge = landlord?.id ? getResponseTimeBadge(landlord.id) : null;
  
  // Handle compare toggle
  const handleCompareToggle = () => {
    if (isInCompare) {
      removeFromCompare(listingKey);
      setIsInCompare(false);
    } else {
      const result = addToCompare(listingKey);
      if (result.success) {
        setIsInCompare(true);
      } else {
        alert(result.message);
      }
    }
  };
  
  // Track when landlord contact is clicked
  const handleContactClick = () => {
    if (landlord?.id) {
      trackLandlordContactClick(landlord.id);
    }
  };

  // Build complete address for Google Maps
  const completeAddress = listing?.fullAddress 
    || [listing?.streetAddress, listing?.location].filter(Boolean).join(', ')
    || listing?.location 
    || '';

  // Use coordinates if available for accurate Google Maps link, otherwise fall back to text address
  const googleMapsUrl = (() => {
    // Prefer coordinates - most accurate
    if (listing?.latitude && listing?.longitude) {
      return `https://www.google.com/maps/search/?api=1&query=${listing.latitude},${listing.longitude}`;
    }
    // Fall back to full text address
    const fullAddress = completeAddress ? `${completeAddress}, South Africa` : '';
    return fullAddress 
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`
      : '';
  })();

  const handleNavigate = (direction, index) => {
    if (direction === 'next' && currentPhotoIndex < listing.photos.length - 1) {
      setCurrentPhotoIndex(currentPhotoIndex + 1);
    } else if (direction === 'prev' && currentPhotoIndex > 0) {
      setCurrentPhotoIndex(currentPhotoIndex - 1);
    } else if (direction === 'goto') {
      setCurrentPhotoIndex(index);
    }
  };

  const reportReasons = [
    'Fraud / Scam',
    'Incorrect Information',
    'Safety Concern',
    'Inappropriate Content',
    'Other'
  ];

  const handleSubmitReport = (e) => {
    e.preventDefault();
    if (!reportReason) return;
    try {
      const key = listing.id || `${listing.title}-${listing.createdAt || Date.now()}`;
      const raw = localStorage.getItem('reports');
      const reports = raw ? JSON.parse(raw) : {};
      if (!reports[key]) reports[key] = [];
      reports[key].push({
        reason: reportReason,
        comment: reportComment.trim() || null,
        timestamp: Date.now()
      });
      localStorage.setItem('reports', JSON.stringify(reports));
      setReportStatus('submitted');
      setTimeout(() => {
        setShowReport(false);
        setReportReason('');
        setReportComment('');
        setReportStatus('idle');
      }, 1200);
    } catch (err) {
      setReportStatus('error');
    }
  };

  // Reviews helpers
  const avgRating = reviews.length
    ? Math.round((reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length) * 10) / 10
    : 0;

  const handleSubmitReview = (e) => {
    e.preventDefault();
    if (!newRating || newRating < 1) return;
    try {
      const entry = {
        rating: newRating,
        comment: newComment.trim(),
        timestamp: Date.now(),
      };
      const next = [...reviews, entry];
      setReviews(next);
      localStorage.setItem(reviewsStorageKey, JSON.stringify(next));
      setSubmitStatus('submitted');
      setNewRating(0);
      setNewComment('');
      setTimeout(() => setSubmitStatus('idle'), 1200);
    } catch {
      setSubmitStatus('error');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start sm:items-center justify-center p-0 sm:p-4 z-50 overflow-y-auto" aria-modal="true" role="dialog">
      <div className="bg-white rounded-none sm:rounded-3xl max-w-2xl w-full h-full sm:h-auto sm:max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-gradient-to-r from-[#E63946] via-[#c5303c] to-[#c5303c] text-white p-4 flex justify-between items-center z-10 sm:rounded-t-3xl">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="text-white/80 hover:text-white sm:hidden p-1 rounded-full hover:bg-white/20 transition-colors" aria-label="Back">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h2 className="text-lg md:text-xl font-bold">Room Details</h2>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white hidden sm:block p-2 rounded-full hover:bg-white/20 transition-colors" aria-label="Close">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="p-4">
          {listing.photos && listing.photos.length > 0 && (
            <div className="relative mb-4 cursor-pointer group" onClick={() => setShowGallery(true)}>
              <img src={listing.photos[currentPhotoIndex]} alt="Room" className="w-full h-64 object-cover rounded-xl shadow-md transition-transform duration-300 group-hover:scale-[1.01]" />
              {listing.photos.length > 1 && (
                <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-xs md:text-sm flex items-center gap-1.5 font-medium">
                  <Search className="w-4 h-4" />
                  View all {listing.photos.length} photos
                </div>
              )}
              {listing.photos.length > 1 && (
                <div className="absolute bottom-3 left-3 flex gap-1.5">
                  {listing.photos.map((_, index) => (
                    <div key={index} className={`w-2 h-2 rounded-full transition-all ${index === currentPhotoIndex ? 'bg-white scale-110' : 'bg-white/50'}`} />
                  ))}
                </div>
              )}
              {listing.photos.length >= 3 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowVirtualTour(true);
                  }}
                  className="absolute top-3 right-3 bg-gradient-to-r from-[#E63946] to-[#c5303c] hover:from-[#c5303c] hover:to-[#a52833] text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg transition-all hover:scale-105"
                >
                  <Maximize className="w-4 h-4" />
                  Virtual Tour
                </button>
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
          {showVirtualTour && listing.photos && (
            <VirtualTourViewer
              photos={listing.photos}
              initialIndex={currentPhotoIndex}
              onClose={() => setShowVirtualTour(false)}
            />
          )}
          
          {/* Video Tour */}
          {listing.videoTour && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">🎥</span>
                <h4 className="font-bold text-gray-800">Video Tour</h4>
                <span className="bg-purple-100 text-purple-700 text-xs font-semibold px-2 py-0.5 rounded-full">NEW</span>
              </div>
              <div className="rounded-xl overflow-hidden bg-gray-900 shadow-lg">
                <video 
                  src={listing.videoTour}
                  controls
                  poster={listing.photos?.[0]}
                  className="w-full max-h-64 object-contain"
                  preload="metadata"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1 text-center">Take a virtual walkthrough of this room</p>
            </div>
          )}
          
          <h3 className="text-2xl font-extrabold mb-2 text-gray-900">{listing.title}</h3>
          <div className="text-transparent bg-gradient-to-r from-[#E63946] to-[#c5303c] bg-clip-text font-bold text-3xl mb-2">
            R{typeof listing.price === 'number' ? listing.price.toLocaleString('en-ZA') : listing.price}<span className="text-lg text-gray-500 font-normal">/month</span>
          </div>
          
          {/* View Count & Compare Button */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {viewCount > 0 && (
              <div className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-sm font-medium">
                <Eye className="w-4 h-4" />
                {viewCount} {viewCount === 1 ? 'person' : 'people'} viewed
              </div>
            )}
            <button
              onClick={handleCompareToggle}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                isInCompare 
                  ? 'bg-purple-500 text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-purple-100 hover:text-purple-700'
              }`}
            >
              <GitCompare className="w-4 h-4" />
              {isInCompare ? 'In Compare' : 'Compare'}
            </button>
            {responseBadge && (
              <div className={`flex items-center gap-1.5 bg-${responseBadge.color}-50 text-${responseBadge.color}-700 px-3 py-1.5 rounded-full text-sm font-medium`}>
                <Zap className="w-4 h-4" />
                {responseBadge.text}
              </div>
            )}
            {/* Quality Score Badge */}
            {(() => {
              const score = calculateQualityScore(listing);
              const quality = getQualityLabel(score);
              return (
                <div className={`flex items-center gap-1.5 bg-${quality.color}-50 text-${quality.color}-700 px-3 py-1.5 rounded-full text-sm font-medium`}>
                  <Award className="w-4 h-4" />
                  {quality.emoji} {score}% {quality.label}
                </div>
              );
            })()}
          </div>
          
          {/* Additional Costs */}
          {listing.additionalCosts && listing.additionalCosts.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
              <h4 className="font-semibold text-amber-800 mb-2 flex items-center gap-2">
                <span>💰</span> Additional Costs
              </h4>
              <div className="space-y-2">
                {listing.additionalCosts.filter(c => c.name && c.amount).map((cost, index) => (
                  <div key={index} className="flex justify-between items-center text-sm">
                    <span className="text-gray-700">{cost.name}</span>
                    <span className="font-semibold text-amber-700">
                      R{parseFloat(cost.amount).toLocaleString('en-ZA')}
                      <span className="text-xs font-normal text-gray-500 ml-1">
                        {cost.frequency === 'monthly' ? '/month' : '(once-off)'}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-amber-600 mt-3 border-t border-amber-200 pt-2">
                ⚠️ These costs are in addition to the monthly rent shown above
              </p>
            </div>
          )}
          
          {/* Share & Action Buttons */}
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={() => {
                const shareUrl = window.location.href;
                const shareText = `Check out this room: ${listing.title} - R${listing.price}/month in ${listing.location || 'South Africa'}`;
                const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`;
                window.open(whatsappUrl, '_blank');
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm font-bold transition-all shadow-md hover:shadow-lg active:scale-95"
            >
              <MessageCircle className="w-4 h-4" />
              Share on WhatsApp
            </button>
            <button
              onClick={async () => {
                const shareUrl = window.location.href;
                const shareText = `${listing.title} - R${listing.price}/month`;
                try {
                  await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                } catch {
                  // Fallback
                  const textarea = document.createElement('textarea');
                  textarea.value = `${shareText}\n${shareUrl}`;
                  document.body.appendChild(textarea);
                  textarea.select();
                  document.execCommand('copy');
                  document.body.removeChild(textarea);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm ${
                copied 
                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-300' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200'
              }`}
            >
              <Copy className="w-4 h-4" />
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
            {navigator.share && (
              <button
                onClick={() => {
                  navigator.share({
                    title: listing.title,
                    text: `Check out this room: R${listing.price}/month`,
                    url: window.location.href,
                  }).catch(() => {});
                }}
                className="flex items-center gap-2 px-4 py-2.5 bg-red-50 hover:bg-red-100 text-[#c5303c] rounded-xl text-sm font-bold transition-all border border-red-200"
              >
                <Share2 className="w-4 h-4" />
                Share
              </button>
            )}
          </div>

          <div className="mb-4">
            <div className="flex items-start text-gray-600 gap-2">
              <MapPin className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div>
                {/* Show full complete address as entered by landlord */}
                <p className="text-base font-medium text-gray-800">
                  {(completeAddress || 'Address coming soon').toUpperCase()}
                </p>
                {completeAddress && <p className="text-sm text-gray-500">South Africa</p>}
              </div>
            </div>
            {googleMapsUrl && (
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-[#c5303c] hover:text-[#8a1f28]"
              >
                <ExternalLink className="w-4 h-4" /> Open in Google Maps
              </a>
            )}
          </div>
          {/* Rating summary */}
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center">
              {[0,1,2,3,4].map(i => (
                <Star key={i} className={`w-5 h-5 ${avgRating > i ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`} />
              ))}
            </div>
            <span className="text-sm text-gray-700">
              {reviews.length > 0 ? `${avgRating} • ${reviews.length} review${reviews.length>1?'s':''}` : 'No reviews yet'}
            </span>
          </div>
          {listing.paymentMethod && (
            <div className="bg-gradient-to-r from-emerald-50 to-red-50 border border-emerald-200 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-700">Payment Method:</span>
                <span className="text-sm text-emerald-700 font-medium">{listing.paymentMethod}</span>
              </div>
            </div>
          )}
          <div className="bg-gray-50 rounded-xl p-4 mb-4">
            <h4 className="font-semibold mb-2 text-gray-800">Description</h4>
            <p className="text-gray-600 leading-relaxed">{listing.description || 'No description provided.'}</p>
          </div>
          {/* Reviews list */}
          <div className="bg-gray-50 rounded-xl p-4 mb-4">
            <h4 className="font-semibold mb-3 text-gray-800">Reviews</h4>
            {reviews.length === 0 && (
              <p className="text-sm text-gray-500">No reviews yet. Be the first to leave one.</p>
            )}
            {reviews.length > 0 && (
              <div className="space-y-3">
                {reviews.slice().reverse().map((r, idx) => (
                  <div key={idx} className="border border-gray-200 rounded-md p-3">
                    <div className="flex items-center gap-1 mb-1">
                      {[0,1,2,3,4].map(i => (
                        <Star key={i} className={`w-4 h-4 ${r.rating > i ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`} />
                      ))}
                      <span className="ml-2 text-xs text-gray-500">
                        {new Date(r.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                    {r.comment && <p className="text-sm text-gray-700">{r.comment}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* Add a review */}
          <div className="bg-white rounded-xl p-4 mb-4 border border-gray-200 shadow-sm">
            <h4 className="font-semibold mb-2 text-gray-800">Leave a Review</h4>
            <form onSubmit={handleSubmitReview} className="space-y-3">
              <div className="flex items-center gap-2">
                {[1,2,3,4,5].map(val => (
                  <button
                    key={val}
                    type="button"
                    onMouseEnter={() => setHoverRating(val)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setNewRating(val)}
                    className="focus:outline-none transition-transform hover:scale-110"
                    aria-label={`Rate ${val} star${val>1?'s':''}`}
                  >
                    <Star className={`w-6 h-6 transition-colors ${((hoverRating || newRating) >= val) ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`} />
                  </button>
                ))}
                <span className="text-xs text-gray-600">{newRating ? `${newRating}/5` : 'Select rating'}</span>
              </div>
              <div>
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Share details about your experience (optional)"
                  className="w-full border-2 border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#E63946] focus:border-transparent transition-all"
                  rows={3}
                />
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="submit"
                  disabled={!newRating || submitStatus === 'submitted'}
                  className="text-sm px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#E63946] to-[#c5303c] hover:from-[#c5303c] hover:to-[#a52833] text-white font-semibold disabled:opacity-50 shadow-md transition-all"
                >
                  {submitStatus === 'submitted' ? 'Saved' : 'Submit Review'}
                </button>
              </div>
              {submitStatus === 'error' && (
                <p className="text-xs text-red-600">Failed to save review. Try again.</p>
              )}
              {submitStatus === 'submitted' && (
                <p className="text-xs text-green-600">Review saved locally.</p>
              )}
            </form>
          </div>
          {landlord && (
            <div className="bg-gradient-to-br from-red-50 via-red-50 to-red-50 rounded-2xl p-5 mb-4 border border-red-200">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-gray-800">Landlord Information</h4>
                <button
                  onClick={() => setShowContact(!showContact)}
                  className="text-[#c5303c] hover:text-[#a52833] text-sm font-semibold px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors"
                >
                  {showContact ? 'Hide' : 'Show'} Contact
                </button>
              </div>
              <div className="flex items-center mb-3">
                {landlord.photo ? (
                  <img src={landlord.photo} alt={landlord.name} className="w-14 h-14 rounded-xl object-cover mr-3 ring-2 ring-red-200" />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-red-500 to-[#c5303c] flex items-center justify-center mr-3">
                    <User className="w-7 h-7 text-white" />
                  </div>
                )}
                <div>
                  <p className="font-bold text-gray-800 flex items-center gap-2">
                    {landlord.name}
                    {(landlord.verified || landlord.idNumber) && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-[#E63946] to-[#c5303c] text-white text-[10px] font-bold shadow-sm">
                        <ShieldCheck className="w-3 h-3" /> Verified
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500">Property Owner</p>
                </div>
              </div>
              {showContact && (
                <div className="space-y-3 pt-4 border-t border-red-200">
                  {/* Safety Warning Banner */}
                  <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 mb-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-lg">⚠️</span>
                      </div>
                      <div>
                        <h5 className="font-bold text-amber-800 mb-1">Safety Warning</h5>
                        <p className="text-sm text-amber-700 leading-relaxed">
                          <strong>Never pay a deposit or any money before viewing the room in person.</strong> Always meet the landlord at the property and verify everything before making any payments.
                        </p>
                        <p className="text-xs text-amber-600 mt-2 font-medium">
                          🛡️ RentMzansi does not handle payments. Report suspicious listings immediately.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Quick Action Buttons */}
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {landlord.phone && (
                      <a
                        href={`tel:${landlord.phone}`}
                        onClick={handleContactClick}
                        className="flex items-center justify-center gap-2 bg-gradient-to-r from-[#E63946] to-[#c5303c] hover:from-[#c5303c] hover:to-[#a52833] text-white py-3.5 rounded-xl font-bold text-sm transition-all shadow-lg hover:shadow-xl active:scale-95"
                      >
                        <Phone className="w-4 h-4" />
                        Call Now
                      </a>
                    )}
                    {landlord.phone && (
                      <a
                        href={`https://wa.me/${landlord.phone.replace(/[^0-9]/g,'').replace(/^0/, '27')}?text=${encodeURIComponent(`Hi, I'm interested in your room listing: ${listing.title} - R${listing.price}/month`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={handleContactClick}
                        className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white py-3.5 rounded-xl font-bold text-sm transition-all shadow-lg hover:shadow-xl active:scale-95"
                      >
                        <MessageCircle className="w-4 h-4" />
                        WhatsApp
                      </a>
                    )}
                  </div>
                  
                  {/* Request to View Button */}
                  <button
                    onClick={() => setShowViewingRequest(true)}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white py-3.5 rounded-xl font-bold text-sm transition-all shadow-lg hover:shadow-xl active:scale-95 mb-3"
                  >
                    <Calendar className="w-4 h-4" />
                    Request to View Room
                  </button>
                  
                  {/* Message in App Button */}
                  {onMessageLandlord && currentUserId && currentUserId !== landlord?.id && (
                    <button
                      onClick={() => onMessageLandlord(listing, landlord)}
                      className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white py-3.5 rounded-xl font-bold text-sm transition-all shadow-lg hover:shadow-xl active:scale-95 mb-3"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Message in App
                    </button>
                  )}
                  
                  {/* Contact Details */}
                  <div className="bg-white rounded-xl p-4 space-y-3 shadow-sm">
                    <div className="flex items-center text-sm">
                      <Phone className="w-4 h-4 mr-3 text-[#E63946]" />
                      <a href={`tel:${landlord.phone}`} className="text-[#c5303c] hover:underline font-medium">{landlord.phone}</a>
                    </div>
                    <div className="flex items-center text-sm">
                      <Mail className="w-4 h-4 mr-3 text-[#E63946]" />
                      <a href={`mailto:${landlord.email}?subject=Inquiry about ${listing.title}`} className="text-[#c5303c] hover:underline font-medium">{landlord.email}</a>
                    </div>
                  </div>
                </div>
              )}
              <div className="mt-4 text-right">
                <button
                  onClick={() => setShowReport(true)}
                  className="text-xs font-medium text-red-500 hover:text-red-600 hover:underline"
                >
                  Report Listing
                </button>
              </div>
            </div>
          )}
          
          {/* Similar Rooms Section */}
          {allListings && allListings.length > 1 && (() => {
            const getSimilarRooms = () => {
              const currentPrice = listing.price || 0;
              const currentLocation = (listing.location || listing.streetAddress || '').toLowerCase();
              const locationParts = currentLocation.split(',').map(p => p.trim()).filter(p => p.length > 2);
              
              return allListings.filter(l => {
                if (l.id === listing.id || (l.title === listing.title && l.price === listing.price)) return false;
                
                // Price similarity (within R1500)
                const priceSimilar = Math.abs((l.price || 0) - currentPrice) <= 1500;
                
                // Location similarity
                const otherLocation = (l.location || l.streetAddress || '').toLowerCase();
                const locationSimilar = locationParts.some(part => 
                  otherLocation.includes(part) || part.includes(otherLocation.split(',')[0]?.trim() || '')
                );
                
                return priceSimilar || locationSimilar;
              }).slice(0, 3);
            };
            
            const similarRooms = getSimilarRooms();
            
            if (similarRooms.length === 0) return null;
            
            return (
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-5 mb-4 border border-blue-200">
                <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <span className="text-xl">🏠</span>
                  Similar Rooms You Might Like
                </h4>
                <div className="space-y-3">
                  {similarRooms.map((room, index) => (
                    <button
                      key={room.id || index}
                      onClick={() => onSelectListing && onSelectListing(room)}
                      className="w-full flex items-center gap-3 bg-white rounded-xl p-3 hover:shadow-md transition-all text-left group border border-blue-100 hover:border-blue-300"
                    >
                      <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                        {room.photos && room.photos[0] ? (
                          <img 
                            src={room.photos[0]} 
                            alt={room.title} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <Home className="w-6 h-6" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800 truncate text-sm group-hover:text-[#E63946] transition-colors">
                          {room.title}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {room.location || room.streetAddress || 'Location not specified'}
                        </p>
                        <p className="font-bold text-[#E63946] text-sm mt-1">
                          R{room.price?.toLocaleString()}/month
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[#E63946] transition-colors flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}
          
          {showReport && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-white w-full max-w-md mx-4 rounded-2xl shadow-2xl p-6 relative">
                <button
                  onClick={() => setShowReport(false)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
                  aria-label="Close report form"
                >
                  <X className="w-5 h-5" />
                </button>
                <h4 className="text-lg font-bold mb-4 text-gray-900">Report Listing</h4>
                <form onSubmit={handleSubmitReport} className="space-y-4">
                  <div className="space-y-2">
                    {reportReasons.map(r => (
                      <label key={r} className="flex items-center gap-3 text-sm text-gray-700 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                        <input
                          type="radio"
                          name="reportReason"
                          value={r}
                          checked={reportReason === r}
                          onChange={() => setReportReason(r)}
                          className="text-[#E63946] focus:ring-red-500"
                        />
                        {r}
                      </label>
                    ))}
                  </div>
                  <div>
                    <textarea
                      value={reportComment}
                      onChange={(e) => setReportComment(e.target.value)}
                      placeholder="Optional details..."
                      className="w-full border-2 border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#E63946] focus:border-transparent transition-all"
                      rows={3}
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowReport(false)}
                      className="text-sm px-4 py-2.5 rounded-xl border-2 border-gray-200 text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!reportReason || reportStatus === 'submitted'}
                      className="text-sm px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold disabled:opacity-50 shadow-md transition-all"
                    >
                      {reportStatus === 'submitted' ? 'Submitted' : 'Submit Report'}
                    </button>
                  </div>
                  {reportStatus === 'error' && (
                    <p className="text-xs text-red-600">Failed to save report. Try again.</p>
                  )}
                  {reportStatus === 'submitted' && (
                    <p className="text-xs text-green-600">Report received. Thank you.</p>
                  )}
                </form>
              </div>
            </div>
          )}
          
          {/* Viewing Request Modal */}
          {showViewingRequest && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      <h4 className="text-lg font-bold">Request to View</h4>
                    </div>
                    <button
                      onClick={() => {
                        setShowViewingRequest(false);
                        setViewingStatus('idle');
                      }}
                      className="p-1 rounded-full hover:bg-white/20 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <p className="text-purple-100 text-sm mt-1">Schedule a viewing with the landlord</p>
                </div>
                
                {viewingStatus === 'sent' ? (
                  <div className="p-6 text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-3xl">✅</span>
                    </div>
                    <h5 className="font-bold text-gray-900 text-lg mb-2">Request Sent!</h5>
                    <p className="text-gray-600 text-sm mb-4">
                      Your viewing request has been sent to the landlord via WhatsApp. They'll respond to confirm the appointment.
                    </p>
                    <button
                      onClick={() => {
                        setShowViewingRequest(false);
                        setViewingStatus('idle');
                        setViewingDate('');
                        setViewingTime('');
                        setViewingMessage('');
                      }}
                      className="px-6 py-2.5 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition-colors"
                    >
                      Done
                    </button>
                  </div>
                ) : (
                  <div className="p-4 space-y-4">
                    {/* Date Selection */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-800 mb-2">
                        <Calendar className="w-4 h-4 inline mr-1" />
                        Preferred Date *
                      </label>
                      <input
                        type="date"
                        value={viewingDate}
                        min={new Date().toISOString().split('T')[0]}
                        onChange={(e) => setViewingDate(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition-all"
                      />
                    </div>
                    
                    {/* Time Selection */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-800 mb-2">
                        <Clock className="w-4 h-4 inline mr-1" />
                        Preferred Time *
                      </label>
                      <select
                        value={viewingTime}
                        onChange={(e) => setViewingTime(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition-all"
                      >
                        <option value="">Select a time</option>
                        <option value="08:00">08:00 AM</option>
                        <option value="09:00">09:00 AM</option>
                        <option value="10:00">10:00 AM</option>
                        <option value="11:00">11:00 AM</option>
                        <option value="12:00">12:00 PM</option>
                        <option value="13:00">01:00 PM</option>
                        <option value="14:00">02:00 PM</option>
                        <option value="15:00">03:00 PM</option>
                        <option value="16:00">04:00 PM</option>
                        <option value="17:00">05:00 PM</option>
                        <option value="18:00">06:00 PM</option>
                      </select>
                    </div>
                    
                    {/* Message */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-800 mb-2">
                        Additional Message (Optional)
                      </label>
                      <textarea
                        value={viewingMessage}
                        onChange={(e) => setViewingMessage(e.target.value)}
                        placeholder="Any questions or notes for the landlord..."
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition-all resize-none"
                        rows={2}
                      />
                    </div>
                    
                    {/* Submit Button */}
                    <button
                      onClick={() => {
                        if (!viewingDate || !viewingTime) {
                          alert('Please select a date and time');
                          return;
                        }
                        
                        // Format the viewing request message
                        const formattedDate = new Date(viewingDate).toLocaleDateString('en-ZA', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        });
                        const timeLabel = new Date(`2000-01-01T${viewingTime}`).toLocaleTimeString('en-ZA', {
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true
                        });
                        
                        let message = `🏠 *VIEWING REQUEST*\n\n`;
                        message += `Hi! I would like to schedule a viewing for:\n\n`;
                        message += `📍 *${listing.title}*\n`;
                        message += `💰 R${listing.price}/month\n`;
                        message += `📍 ${listing.location || listing.streetAddress || ''}\n\n`;
                        message += `📅 *Preferred Date:* ${formattedDate}\n`;
                        message += `🕐 *Preferred Time:* ${timeLabel}\n`;
                        if (viewingMessage.trim()) {
                          message += `\n💬 *Note:* ${viewingMessage.trim()}\n`;
                        }
                        message += `\nPlease confirm if this works for you. Thank you!`;
                        
                        // Open WhatsApp with the message
                        const phone = landlord.phone.replace(/[^0-9]/g,'').replace(/^0/, '27');
                        const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
                        
                        // Save viewing request locally
                        const requests = JSON.parse(localStorage.getItem('viewingRequests') || '[]');
                        requests.push({
                          listingId: listing.id || listingKey,
                          listingTitle: listing.title,
                          landlordPhone: landlord.phone,
                          date: viewingDate,
                          time: viewingTime,
                          message: viewingMessage,
                          createdAt: new Date().toISOString()
                        });
                        localStorage.setItem('viewingRequests', JSON.stringify(requests));
                        
                        // Track contact
                        handleContactClick();
                        
                        // Open WhatsApp
                        window.open(whatsappUrl, '_blank');
                        setViewingStatus('sent');
                      }}
                      disabled={!viewingDate || !viewingTime || viewingStatus === 'sending'}
                      className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white py-3.5 rounded-xl font-bold transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <MessageCircle className="w-5 h-5" />
                      Send Request via WhatsApp
                    </button>
                    
                    <p className="text-xs text-gray-500 text-center">
                      This will open WhatsApp with a pre-filled viewing request message
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
