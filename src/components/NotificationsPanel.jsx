import React, { useState, useEffect } from 'react';
import { X, Bell, BellOff, Trash2, MapPin, TrendingDown, Star } from 'lucide-react';
import { getNotifications, markNotificationRead, clearNotifications, getSavedSearches, deleteSavedSearch } from '../utils/notificationEngine';

export default function NotificationsPanel({ onClose, onSelectListing }) {
  const [notifications, setNotifications] = useState([]);
  const [savedSearches, setSavedSearches] = useState([]);
  const [activeTab, setActiveTab] = useState('notifications'); // 'notifications' | 'searches'

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setNotifications(getNotifications());
    setSavedSearches(getSavedSearches());
  };

  const handleNotificationClick = (notif) => {
    markNotificationRead(notif.id);
    loadData();
    if (notif.listingId && onSelectListing) {
      onSelectListing(notif.listingId);
    }
  };

  const handleClearAll = () => {
    if (window.confirm('Clear all notifications?')) {
      clearNotifications();
      loadData();
    }
  };

  const handleDeleteSearch = (id) => {
    deleteSavedSearch(id);
    loadData();
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start sm:items-center justify-center p-0 sm:p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-none sm:rounded-2xl max-w-2xl w-full h-full sm:h-auto sm:max-h-[80vh] overflow-y-auto shadow-2xl fade-in">
        <div className="sticky top-0 bg-white/95 backdrop-blur-md border-b border-gray-100 p-4 flex justify-between items-center z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <Bell className="w-5 h-5 text-[#E63946]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-800">Notifications</h2>
              {unreadCount > 0 && (
                <p className="text-xs text-gray-500">{unreadCount} unread</p>
              )}
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
            aria-label="Close notifications"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="border-b">
          <div className="flex">
            <button
              onClick={() => setActiveTab('notifications')}
              className={`flex-1 py-3 text-sm font-semibold ${
                activeTab === 'notifications'
                  ? 'text-[#E63946] border-b-2 border-[#E63946]'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Notifications ({notifications.length})
            </button>
            <button
              onClick={() => setActiveTab('searches')}
              className={`flex-1 py-3 text-sm font-semibold ${
                activeTab === 'searches'
                  ? 'text-[#E63946] border-b-2 border-[#E63946]'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Saved Searches ({savedSearches.length})
            </button>
          </div>
        </div>

        <div className="p-4">
          {activeTab === 'notifications' && (
            <div className="space-y-3">
              {notifications.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <BellOff className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm">No notifications yet</p>
                </div>
              ) : (
                <>
                  <div className="flex justify-end mb-2">
                    <button
                      onClick={handleClearAll}
                      className="text-xs text-red-600 hover:text-red-700 font-medium"
                    >
                      Clear All
                    </button>
                  </div>
                  {notifications.map(notif => (
                    <div
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      className={`border rounded-xl p-4 cursor-pointer transition-all duration-200 hover:shadow-md ${
                        notif.read ? 'bg-white border-gray-100 hover:bg-gray-50' : 'bg-gradient-to-r from-red-50 to-red-50 border-red-200 hover:border-red-300'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          notif.type === 'new-listing' ? 'bg-blue-100' :
                          notif.type === 'price-drop' ? 'bg-emerald-100' : 'bg-amber-100'
                        }`}>
                          {notif.type === 'new-listing' && (
                            <MapPin className="w-5 h-5 text-blue-600" />
                          )}
                          {notif.type === 'price-drop' && (
                            <TrendingDown className="w-5 h-5 text-emerald-600" />
                          )}
                          {notif.type === 'saved-area' && (
                            <Star className="w-5 h-5 text-amber-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">{notif.title}</p>
                          <p className="text-xs text-gray-600 mt-1 line-clamp-2">{notif.body}</p>
                          <p className="text-xs text-gray-400 mt-2">
                            {new Date(notif.timestamp).toLocaleString()}
                          </p>
                        </div>
                        {!notif.read && (
                          <div className="w-2.5 h-2.5 bg-gradient-to-r from-red-500 to-red-500 rounded-full mt-1 animate-pulse" />
                        )}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {activeTab === 'searches' && (
            <div className="space-y-3">
              {savedSearches.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <MapPin className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm">No saved searches yet</p>
                  <p className="text-xs mt-1">Save a search to get notified of new listings</p>
                </div>
              ) : (
                savedSearches.map(search => (
                  <div
                    key={search.id}
                    className="border rounded-lg p-3 bg-white hover:bg-gray-50 transition"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <MapPin className="w-4 h-4 text-gray-600" />
                          <p className="text-sm font-semibold text-gray-800">
                            {search.location || 'Any location'}
                          </p>
                        </div>
                        <div className="text-xs text-gray-600 space-y-1">
                          {search.priceMin !== undefined && search.priceMax !== undefined && (
                            <p>Price: R{search.priceMin} - R{search.priceMax}/month</p>
                          )}
                          {search.amenities && search.amenities.length > 0 && (
                            <p>Amenities: {search.amenities.join(', ')}</p>
                          )}
                          <p className="text-gray-400">
                            Saved {new Date(search.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteSearch(search.id)}
                        className="text-red-600 hover:text-red-700 p-1"
                        aria-label="Delete search"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
