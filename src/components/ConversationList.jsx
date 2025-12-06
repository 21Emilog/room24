import React from 'react';
import { MessageSquare, Home, Clock, ChevronRight } from 'lucide-react';

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
    <div className="flex flex-col p-2 gap-1">
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
            className={`group relative flex items-center gap-3 p-3.5 text-left rounded-2xl transition-all duration-300 overflow-hidden ${
              isSelected 
                ? 'bg-gradient-to-r from-red-500 via-rose-500 to-red-500 text-white shadow-xl shadow-red-500/30 scale-[1.02]' 
                : hasUnread
                  ? 'bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 hover:from-red-100 hover:to-rose-100 dark:hover:from-red-900/30 dark:hover:to-rose-900/30'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:shadow-md'
            }`}
          >
            {/* Shine effect on hover */}
            <span className={`absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full transition-transform duration-700 ${isSelected ? '' : 'group-hover:translate-x-full'}`} />
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              {otherUser?.photo_url ? (
                <img
                  src={otherUser.photo_url}
                  alt={otherUser.display_name}
                  className={`w-14 h-14 rounded-2xl object-cover border-2 transition-all duration-300 shadow-md ${
                    isSelected ? 'border-white/40 shadow-lg' : 'border-transparent group-hover:border-red-200 dark:group-hover:border-red-800'
                  }`}
                />
              ) : (
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-md transition-all duration-300 ${
                  isSelected 
                    ? 'bg-white/25 backdrop-blur-sm border-2 border-white/30' 
                    : 'bg-gradient-to-br from-red-100 to-rose-100 dark:from-red-900/50 dark:to-rose-900/50 group-hover:from-red-200 group-hover:to-rose-200 dark:group-hover:from-red-800/50 dark:group-hover:to-rose-800/50'
                }`}>
                  <span className={`font-bold text-xl transition-all ${
                    isSelected ? 'text-white' : 'text-red-500 dark:text-red-400'
                  }`}>
                    {otherUser?.display_name?.[0]?.toUpperCase() || '?'}
                  </span>
                </div>
              )}
              {hasUnread && !isSelected && (
                <span className="absolute -top-1 -right-1 min-w-[22px] h-[22px] px-1.5 bg-gradient-to-br from-red-500 to-rose-600 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-lg shadow-red-500/50 animate-bounce ring-2 ring-white dark:ring-gray-800">
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

              {/* Listing info */}
              {listing && (
                <div className={`flex items-center gap-1.5 mb-1 ${
                  isSelected ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'
                }`}>
                  <Home className="w-3.5 h-3.5 flex-shrink-0" />
                  <p className="text-sm truncate">{listing.title}</p>
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
                  {isLandlord ? 'Landlord' : 'Renter'}
                </span>
                {listing?.price && (
                  <span className={`text-xs font-medium ${
                    isSelected ? 'text-white/70' : 'text-gray-400 dark:text-gray-500'
                  }`}>
                    R{listing.price.toLocaleString()}/mo
                  </span>
                )}
              </div>
            </div>

            {/* Arrow */}
            <ChevronRight className={`w-5 h-5 flex-shrink-0 transition-transform group-hover:translate-x-1 ${
              isSelected ? 'text-white/50' : 'text-gray-300 dark:text-gray-600'
            }`} />
          </button>
        );
      })}
    </div>
  );
}
