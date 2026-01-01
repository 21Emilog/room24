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
    <div className="flex flex-col">
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
            className={`flex items-center gap-3 p-4 text-left transition-colors border-b border-gray-100 dark:border-gray-800 ${
              isSelected 
                ? 'bg-gray-100 dark:bg-gray-800' 
                : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
            }`}
          >
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              {otherUser?.photo_url ? (
                <img
                  src={otherUser.photo_url}
                  alt={otherUser.display_name}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center">
                  <span className="font-semibold text-gray-700 dark:text-gray-300 text-lg">
                    {otherUser?.display_name?.[0]?.toUpperCase() || '?'}
                  </span>
                </div>
              )}
              {/* Online indicator */}
              {hasUnread && (
                <span className="absolute -top-1 -right-1 min-w-[20px] h-[20px] px-1.5 bg-[#E63946] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <h4 className={`font-semibold truncate ${
                  hasUnread 
                    ? 'text-gray-900 dark:text-white' 
                    : 'text-gray-700 dark:text-gray-300'
                }`}>
                  {otherUser?.display_name || 'Unknown User'}
                </h4>
                <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                  {formatRelativeTime(convo.last_message_at)}
                </span>
              </div>

              {/* Property title */}
              {listing && (
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                  {listing.title} • R{listing.price?.toLocaleString()}/mo
                </p>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
