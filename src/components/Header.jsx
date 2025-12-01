import React, { useState } from 'react';
import { User, Menu, X, Bell, Home } from 'lucide-react';

export default function Header({ currentUser, previewAsRenter, setPreviewAsRenter, openAuthModal, handleSignOut, setCurrentView, showToast, unreadCount, onOpenNotifications }) {
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50 shadow-sm" role="banner">
      <div className="max-w-7xl mx-auto px-4 py-2.5 md:py-3">
        <div className="flex items-center justify-between min-h-[52px]">
          {/* Logo */}
          <button
            onClick={() => setCurrentView('browse')}
            className="text-xl md:text-2xl font-extrabold flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 px-1 rounded-lg transition-transform hover:scale-105 active:scale-95"
            aria-label="Go to browse"
          >
            <div className="w-8 h-8 md:w-9 md:h-9 bg-gradient-to-br from-teal-500 to-teal-600 rounded-lg flex items-center justify-center shadow-md">
              <Home className="w-4 h-4 md:w-5 md:h-5 text-white" />
            </div>
            <span className="bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">Room</span>
            <span className="text-rose-500">24</span>
          </button>

          {/* Desktop Right Section */}
          <div className="hidden md:flex items-center gap-3">
            {!currentUser && (
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => openAuthModal('renter')} 
                  className="text-gray-600 hover:text-teal-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Sign in
                </button>
                <button 
                  onClick={() => openAuthModal('landlord')} 
                  className="bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2"
                >
                  <Home className="w-4 h-4" />
                  List Your Room
                </button>
              </div>
            )}
            {currentUser && (
              <>
                {onOpenNotifications && (
                  <button
                    onClick={onOpenNotifications}
                    className="relative p-2.5 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded-xl transition-all duration-200"
                    aria-label="Notifications"
                  >
                    <Bell className={`w-5 h-5 ${unreadCount > 0 ? 'text-teal-600' : ''}`} />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white text-[10px] font-bold rounded-full min-w-[20px] h-[20px] flex items-center justify-center shadow-md animate-pulse">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </button>
                )}
                <div 
                  className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors group" 
                  onClick={() => setCurrentView('profile')}
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center text-white font-bold shadow-md ring-2 ring-white group-hover:shadow-lg transition-all duration-200 overflow-hidden">
                    {currentUser.photo ? (
                      <img src={currentUser.photo} alt={currentUser.name || 'User'} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-sm">{currentUser?.name?.charAt(0)?.toUpperCase() || 'U'}</span>
                    )}
                  </div>
                  <div className="hidden lg:block">
                    <p className="font-semibold text-gray-800 leading-tight group-hover:text-teal-600 transition text-sm">{currentUser.name || 'User'}</p>
                    <p className="text-xs text-gray-500 leading-tight flex items-center gap-1.5">
                      {previewAsRenter ? (
                        <><span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></span> Preview Mode</>
                      ) : currentUser.type === 'landlord' ? (
                        <><span className="w-1.5 h-1.5 bg-teal-500 rounded-full"></span> Property Owner</>
                      ) : (
                        <><span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span> Looking for a Room</>
                      )}
                    </p>
                  </div>
                </div>
                {currentUser.type === 'landlord' && (
                  <button
                    onClick={() => setPreviewAsRenter(!previewAsRenter)}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all duration-200 ${
                      previewAsRenter 
                        ? 'bg-amber-100 text-amber-700 border border-amber-300 hover:bg-amber-200' 
                        : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-teal-50 hover:text-teal-700 hover:border-teal-200'
                    }`}
                    aria-pressed={previewAsRenter ? 'true' : 'false'}
                  >
                    {previewAsRenter ? '✕ Exit Preview' : '👁 Preview'}
                  </button>
                )}
                <button
                  onClick={handleSignOut}
                  className="text-xs text-gray-500 hover:text-rose-600 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-rose-200 hover:bg-rose-50 transition-all duration-200 font-medium"
                >
                  Sign Out
                </button>
              </>
            )}
          </div>

          {/* Mobile Menu / Auth CTAs */}
          <div className="flex md:hidden items-center gap-2">
            {!currentUser ? (
              <>
                <button 
                  onClick={() => openAuthModal('renter')} 
                  className="text-sm text-gray-600 hover:text-teal-600 px-3 py-1.5 font-medium transition-colors"
                >
                  Sign in
                </button>
                <button 
                  onClick={() => openAuthModal('landlord')} 
                  className="text-sm bg-gradient-to-r from-rose-500 to-pink-500 text-white px-4 py-2 rounded-xl font-semibold shadow-md"
                >
                  List Room
                </button>
              </>
            ) : (
              <>
                {onOpenNotifications && (
                  <button
                    onClick={onOpenNotifications}
                    className="relative p-2 text-gray-500 hover:text-teal-600 hover:bg-gray-50 rounded-xl transition"
                    aria-label="Notifications"
                  >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white text-[9px] font-bold rounded-full w-5 h-5 flex items-center justify-center shadow">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>
                )}
                <button
                  onClick={() => setShowMobileMenu(!showMobileMenu)}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-xl transition"
                  aria-label="Menu"
                >
                  {showMobileMenu ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Mobile Dropdown */}
        {currentUser && showMobileMenu && (
          <div className="md:hidden mt-2 pb-4 border-t border-gray-100 pt-4 animate-slideDown" role="navigation" aria-label="Mobile">
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100 px-1">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center text-white font-bold text-lg shadow-md">
                {currentUser.photo ? (
                  <img src={currentUser.photo} alt={currentUser.name || 'User'} className="w-full h-full rounded-xl object-cover" />
                ) : (
                  currentUser?.name?.charAt(0)?.toUpperCase() || 'U'
                )}
              </div>
              <div>
                <p className="font-semibold text-gray-800">{currentUser.name || 'User'}</p>
                <p className="text-xs text-gray-500 flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${currentUser.type === 'landlord' ? 'bg-teal-500' : 'bg-blue-500'}`}></span>
                  {currentUser.type === 'landlord' ? 'Property Owner' : 'Looking for a Room'}
                </p>
              </div>
            </div>
            <div className="space-y-1 px-1">
              <button 
                onClick={() => { setCurrentView('profile'); setShowMobileMenu(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-teal-50 hover:text-teal-700 rounded-xl transition font-medium"
              >
                <User className="w-5 h-5" />
                <span>My Profile</span>
              </button>
              {currentUser.type === 'landlord' && (
                <button
                  onClick={() => { setPreviewAsRenter(!previewAsRenter); setShowMobileMenu(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition text-sm font-medium ${
                    previewAsRenter 
                      ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' 
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                  aria-pressed={previewAsRenter ? 'true' : 'false'}
                >
                  <span className="text-lg">{previewAsRenter ? '✕' : '👁'}</span>
                  <span>{previewAsRenter ? 'Exit Renter Preview' : 'Preview as Renter'}</span>
                </button>
              )}
              <button
                onClick={() => { handleSignOut(); setShowMobileMenu(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-gray-500 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition text-sm font-medium"
              >
                <X className="w-5 h-5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        )}
      </div>
      {previewAsRenter && currentUser?.type === 'landlord' && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200 text-amber-700 text-xs py-1.5 text-center font-medium" role="status" aria-live="polite">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></span>
            Preview Mode: Viewing as a renter. Toggle off to manage your listings.
          </span>
        </div>
      )}
    </header>
  );
}
