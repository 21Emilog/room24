import React from 'react';
import { MessageSquare, Home } from 'lucide-react';

function formatRelativeTime(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
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
      <div className="flex flex-col gap-3 p-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-xl">
            <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!conversations || conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
          <MessageSquare className="w-8 h-8 text-gray-400 dark:text-gray-500" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
          No messages yet
        </h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm max-w-xs">
          When you message a landlord about a listing, your conversations will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col divide-y divide-gray-100 dark:divide-gray-700">
      {conversations.map((convo) => {
        const isLandlord = convo.landlord_id === currentUserId;
        const otherUser = isLandlord ? convo.renter : convo.landlord;
        const listing = convo.listing;
        const unreadCount = unreadCounts[convo.id] || 0;
        const isSelected = selectedConversationId === convo.id;

        return (
          <button
            key={convo.id}
            onClick={() => onSelectConversation(convo)}
            className={`flex items-center gap-3 p-4 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 ${
              isSelected ? 'bg-red-50 dark:bg-red-900/20' : ''
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
                <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
                  <span className="text-red-600 dark:text-red-300 font-semibold text-lg">
                    {otherUser?.display_name?.[0]?.toUpperCase() || '?'}
                  </span>
                </div>
              )}
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h4 className={`font-semibold truncate ${
                  unreadCount > 0 
                    ? 'text-gray-900 dark:text-white' 
                    : 'text-gray-700 dark:text-gray-300'
                }`}>
                  {otherUser?.display_name
                    || (otherUser?.id
                      ? `Deleted User (${otherUser.id.slice(0, 6)}...)`
                      : 'Unknown User')}
                </h4>
                <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                  {formatRelativeTime(convo.last_message_at)}
                </span>
              </div>

              {/* Listing info */}
              {listing && (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Home className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                    {listing.title}
                  </p>
                </div>
              )}

              {/* Role indicator */}
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  isLandlord 
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                }`}>
                  {isLandlord ? 'You: Landlord' : 'You: Renter'}
                </span>
                {listing?.price && (
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    R{listing.price.toLocaleString()}/mo
                  </span>
                )}
              </div>
            </div>

            {/* Listing thumbnail */}
            {listing?.photos?.[0] && (
              <div className="flex-shrink-0 hidden sm:block">
                <img
                  src={listing.photos[0]}
                  alt={listing.title}
                  className="w-14 h-14 rounded-lg object-cover"
                />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
