import React from 'react';
import { MessageSquare, Home, Clock, ChevronRight, MapPin, Star } from 'lucide-react';

function formatRelativeTime(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });
}

export default function ConversationList({
  conversations,
  currentUserId,
  onSelectConversation,
  selectedConversationId,
  unreadCounts = {},
  loading = false,
}) {
  if (loading) {
    return (
      <div className="flex flex-col gap-2 p-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="animate-pulse flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-2xl">
            <div className="w-14 h-14 bg-gray-200 dark:bg-gray-600 rounded-2xl" />
            <div className="flex-1 space-y-2.5">
              <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded-lg w-2/3" />
              <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded-lg w-1/2" />
              <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded-lg w-3/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!conversations || conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-10 text-center">
        <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-full flex items-center justify-center mb-5 shadow-inner">
          <MessageSquare className="w-9 h-9 text-gray-400 dark:text-gray-500" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
          No messages yet
        </h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm max-w-xs">
          When you message a landlord about a listing, your conversations will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col p-2 gap-2">
      {conversations.map((convo) => {
        const isLandlord = convo.landlord_id === currentUserId;
        const otherUser = isLandlord ? convo.renter : convo.landlord;
        const listing = convo.listing;
        const unreadCount = unreadCounts[convo.id] || 0;
        const isSelected = selectedConversationId === convo.id;
        const hasUnread = unreadCount > 0;

        return (
          <button
            key={convo.id}
            onClick={() => onSelectConversation(convo)}
            className={`group relative flex flex-col text-left rounded-2xl transition-all duration-300 overflow-hidden ${
              isSelected 
                ? 'bg-gradient-to-r from-red-500 via-rose-500 to-red-500 text-white shadow-xl shadow-red-500/30 scale-[1.02]' 
                : hasUnread
                  ? 'bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 hover:from-red-100 hover:to-rose-100 dark:hover:from-red-900/30 dark:hover:to-rose-900/30 border border-red-200 dark:border-red-800'
                  : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:shadow-lg border border-gray-100 dark:border-gray-700'
            }`}
          >
            {/* Property Image Banner (if available) */}
            {listing?.photos?.[0] && (
              <div className="relative h-20 overflow-hidden">
                <img 
                  src={listing.photos[0]} 
                  alt={listing.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className={`absolute inset-0 ${isSelected ? 'bg-gradient-to-t from-red-600/90 to-transparent' : 'bg-gradient-to-t from-black/70 to-transparent'}`} />
                
                {/* Price Badge */}
                <div className={`absolute top-2 right-2 px-2.5 py-1 rounded-lg text-xs font-bold shadow-lg ${
                  isSelected ? 'bg-white text-red-600' : 'bg-gradient-to-r from-[#E63946] to-rose-500 text-white'
                }`}>
                  R{listing.price?.toLocaleString()}/mo
                </div>
                
                {/* Unread Badge */}
                {hasUnread && !isSelected && (
                  <span className="absolute top-2 left-2 min-w-[24px] h-[24px] px-2 bg-gradient-to-br from-red-500 to-rose-600 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-lg animate-pulse ring-2 ring-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
                
                {/* Property Title on Image */}
                <div className="absolute bottom-0 left-0 right-0 p-2.5">
                  <p className={`font-semibold truncate text-sm ${isSelected ? 'text-white' : 'text-white'}`}>
                    {listing.title}
                  </p>
                  <p className={`text-xs truncate flex items-center gap-1 ${isSelected ? 'text-white/80' : 'text-white/80'}`}>
                    <MapPin className="w-3 h-3" /> {listing.location}
                  </p>
                </div>
              </div>
            )}
            
            {/* User Info Section */}
            <div className="flex items-center gap-3 p-3">
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                {otherUser?.photo_url ? (
                  <img
                    src={otherUser.photo_url}
                    alt={otherUser.display_name}
                    className={`w-12 h-12 rounded-xl object-cover border-2 transition-all duration-300 shadow-md ${
                      isSelected ? 'border-white/40' : 'border-transparent group-hover:border-red-200'
                    }`}
                  />
                ) : (
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-md transition-all duration-300 ${
                    isSelected 
                      ? 'bg-white/25 backdrop-blur-sm border-2 border-white/30' 
                      : 'bg-gradient-to-br from-red-100 to-rose-100 dark:from-red-900/50 dark:to-rose-900/50'
                  }`}>
                    <span className={`font-bold text-lg transition-all ${
                      isSelected ? 'text-white' : 'text-red-500 dark:text-red-400'
                    }`}>
                      {otherUser?.display_name?.[0]?.toUpperCase() || '?'}
                    </span>
                  </div>
                )}
                {/* Unread badge for non-photo listings */}
                {hasUnread && !isSelected && !listing?.photos?.[0] && (
                  <span className="absolute -top-1 -right-1 min-w-[20px] h-[20px] px-1.5 bg-gradient-to-br from-red-500 to-rose-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-lg animate-bounce ring-2 ring-white dark:ring-gray-800">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <h4 className={`font-semibold truncate ${
                    isSelected 
                      ? 'text-white' 
                      : hasUnread 
                        ? 'text-gray-900 dark:text-white' 
                        : 'text-gray-700 dark:text-gray-300'
                  }`}>
                    {otherUser?.display_name || 'Unknown User'}
                  </h4>
                  <div className={`flex items-center gap-1 flex-shrink-0 ${
                    isSelected ? 'text-white/70' : 'text-gray-400 dark:text-gray-500'
                  }`}>
                    <Clock className="w-3 h-3" />
                    <span className="text-xs">{formatRelativeTime(convo.last_message_at)}</span>
                  </div>
                </div>

                {/* No photo? Show listing title inline */}
                {listing && !listing.photos?.[0] && (
                  <div className={`flex items-center gap-1.5 mb-1 ${
                    isSelected ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    <Home className="w-3.5 h-3.5 flex-shrink-0" />
                    <p className="text-sm truncate">{listing.title} • R{listing.price?.toLocaleString()}/mo</p>
                  </div>
                )}

                {/* Tags row */}
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    isSelected 
                      ? 'bg-white/20 text-white' 
                      : isLandlord 
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                        : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                  }`}>
                    {isLandlord ? '🏠 Landlord' : '👤 Renter'}
                  </span>
                </div>
              </div>

              {/* Arrow */}
              <ChevronRight className={`w-5 h-5 flex-shrink-0 transition-transform group-hover:translate-x-1 ${
                isSelected ? 'text-white/50' : 'text-gray-300 dark:text-gray-600'
              }`} />
            </div>
          </button>
        );
      })}
    </div>
  );
}
