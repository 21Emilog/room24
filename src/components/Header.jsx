import React, { useState, useRef, useEffect } from 'react';
import { Menu, X, Bell, User, LogOut, Search, PlusCircle, Heart, Settings, ChevronDown, Eye, EyeOff, MapPin } from 'lucide-react';

// RentMzansi Logo Component
const Logo = ({ className = "w-10 h-10" }) => (
  <svg viewBox="0 0 100 120" className={className}>
    <path d="M50,5 Q70,5 80,20 Q90,35 80,50 L50,90 L20,50 Q10,35 20,20 Q30,5 50,5 Z" fill="#E63946"/>
    <polygon points="50,30 40,40 40,55 60,55 60,40" fill="#F1FAEE"/>
    <rect x="45" y="45" width="10" height="10" fill="#F1FAEE"/>
    <circle cx="50" cy="50" r="3" fill="#1D3557"/>
  </svg>
);

export default function Header({
  currentUser,
  previewAsRenter,
  setPreviewAsRenter,
  openAuthModal,
  handleSignOut,
  setCurrentView,
  unreadCount,
  onOpenNotifications
}) {
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef(null);
  const mobileMenuRef = useRef(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
        setShowMobileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile menu on escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setShowMobileMenu(false);
        setShowUserMenu(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const isLandlord = currentUser?.type === 'landlord';

  const navLinks = [
    { id: 'browse', label: 'Browse', icon: Search, show: true },
    { id: 'add', label: 'List Room', icon: PlusCircle, show: currentUser && isLandlord && !previewAsRenter },
    { id: 'my-listings', label: 'My Rooms', icon: MapPin, show: currentUser && isLandlord && !previewAsRenter },
    { id: 'favorites', label: 'Saved', icon: Heart, show: true },
  ].filter(link => link.show);

  return (
    <header className="sticky top-0 z-30 bg-gradient-to-r from-[#1D3557] via-[#1D3557] to-[#2d4a6f] text-white shadow-lg safe-area-top">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <button 
            onClick={() => setCurrentView('browse')}
            className="flex items-center gap-2 hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-[#1D3557] rounded-lg"
            aria-label="Go to home page"
          >
            <Logo className="w-10 h-10" />
            <span className="text-xl font-extrabold hidden sm:block tracking-tight">
              <span className="text-white">Rent</span>
              <span className="text-[#E63946]">Mzansi</span>
            </span>
          </button>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1" role="navigation" aria-label="Main navigation">
            {navLinks.map(link => {
              const Icon = link.icon;
              return (
                <button
                  key={link.id}
                  onClick={() => setCurrentView(link.id)}
                  className="flex items-center gap-2 px-4 py-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl font-medium text-sm transition-all duration-200"
                >
                  <Icon className="w-4 h-4" />
                  {link.label}
                </button>
              );
            })}
          </nav>

          {/* Right Side Actions */}
          <div className="flex items-center gap-2">
            {/* Landlord Preview Toggle */}
            {currentUser && isLandlord && (
              <button
                onClick={() => setPreviewAsRenter(!previewAsRenter)}
                className={`hidden md:flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  previewAsRenter
                    ? 'bg-amber-400 text-amber-900'
                    : 'bg-white/10 text-white/80 hover:bg-white/20 hover:text-white'
                }`}
                title={previewAsRenter ? 'Exit renter view' : 'Preview as renter'}
                aria-pressed={previewAsRenter}
              >
                {previewAsRenter ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                <span className="hidden lg:inline">{previewAsRenter ? 'Exit Preview' : 'Renter View'}</span>
              </button>
            )}

            {/* Notifications */}
            {currentUser && (
              <button
                onClick={onOpenNotifications}
                className="relative p-2.5 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-200"
                aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-[#E63946] text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse ring-2 ring-[#1D3557]">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
            )}

            {/* User Menu / Auth Buttons */}
            {currentUser ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 p-1.5 pr-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all duration-200"
                  aria-expanded={showUserMenu}
                  aria-haspopup="true"
                >
                  {currentUser.photo ? (
                    <img src={currentUser.photo} alt="" className="w-8 h-8 rounded-lg object-cover ring-2 ring-white/30" />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#E63946] to-[#c5303c] flex items-center justify-center ring-2 ring-white/30">
                      <span className="text-white text-sm font-bold">
                        {currentUser.name?.charAt(0)?.toUpperCase() || 'U'}
                      </span>
                    </div>
                  )}
                  <span className="hidden sm:block text-sm font-medium text-white max-w-[100px] truncate">
                    {currentUser.name?.split(' ')[0] || 'User'}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-white/60 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 animate-fadeIn z-50">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-semibold text-gray-900 truncate">{currentUser.name}</p>
                      <p className="text-xs text-gray-500 capitalize">{currentUser.type || 'Member'}</p>
                    </div>
                    <div className="py-1">
                      <button
                        onClick={() => { setCurrentView('profile'); setShowUserMenu(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <User className="w-4 h-4 text-gray-400" />
                        My Profile
                      </button>
                      {isLandlord && !previewAsRenter && (
                        <button
                          onClick={() => { setCurrentView('my-listings'); setShowUserMenu(false); }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <MapPin className="w-4 h-4 text-gray-400" />
                          My Listings
                        </button>
                      )}
                      <button
                        onClick={() => { setCurrentView('favorites'); setShowUserMenu(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <Heart className="w-4 h-4 text-gray-400" />
                        Saved Rooms
                      </button>
                    </div>
                    <div className="border-t border-gray-100 pt-1">
                      <button
                        onClick={() => { handleSignOut(); setShowUserMenu(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#E63946] hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openAuthModal('renter', 'signin')}
                  className="hidden sm:block px-4 py-2 text-white/80 hover:text-white font-medium text-sm transition-colors"
                >
                  Sign In
                </button>
                <button
                  onClick={() => openAuthModal('landlord', 'signup')}
                  className="px-4 py-2.5 bg-[#E63946] hover:bg-[#c5303c] text-white font-semibold text-sm rounded-xl shadow-lg shadow-red-500/30 hover:shadow-red-500/50 transition-all duration-200 hover:scale-105 active:scale-100"
                >
                  List Room
                </button>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="md:hidden p-2.5 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
              aria-label="Toggle menu"
              aria-expanded={showMobileMenu}
            >
              {showMobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {showMobileMenu && (
        <div 
          ref={mobileMenuRef}
          className="md:hidden bg-[#1D3557] border-t border-white/10 shadow-lg animate-slideDown"
          role="menu"
        >
          <nav className="px-4 py-4 space-y-1">
            {navLinks.map(link => {
              const Icon = link.icon;
              return (
                <button
                  key={link.id}
                  onClick={() => { setCurrentView(link.id); setShowMobileMenu(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-white/80 hover:bg-white/10 hover:text-white rounded-xl font-medium transition-colors"
                  role="menuitem"
                >
                  <Icon className="w-5 h-5" />
                  {link.label}
                </button>
              );
            })}
            
            {currentUser && isLandlord && (
              <button
                onClick={() => { setPreviewAsRenter(!previewAsRenter); setShowMobileMenu(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${
                  previewAsRenter
                    ? 'bg-amber-400 text-amber-900'
                    : 'text-white/80 hover:bg-white/10'
                }`}
                role="menuitem"
              >
                {previewAsRenter ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                {previewAsRenter ? 'Exit Renter Preview' : 'Preview as Renter'}
              </button>
            )}

            {currentUser ? (
              <>
                <div className="border-t border-white/10 my-2" />
                <button
                  onClick={() => { setCurrentView('profile'); setShowMobileMenu(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-white/80 hover:bg-white/10 rounded-xl font-medium transition-colors"
                  role="menuitem"
                >
                  <Settings className="w-5 h-5" />
                  Settings
                </button>
                <button
                  onClick={() => { handleSignOut(); setShowMobileMenu(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-[#E63946] hover:bg-red-500/10 rounded-xl font-medium transition-colors"
                  role="menuitem"
                >
                  <LogOut className="w-5 h-5" />
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <div className="border-t border-white/10 my-2" />
                <button
                  onClick={() => { openAuthModal('renter', 'signin'); setShowMobileMenu(false); }}
                  className="w-full px-4 py-3 text-white/80 hover:bg-white/10 rounded-xl font-medium transition-colors text-center"
                  role="menuitem"
                >
                  Sign In
                </button>
                <button
                  onClick={() => { openAuthModal('landlord', 'signup'); setShowMobileMenu(false); }}
                  className="w-full px-4 py-3 bg-[#E63946] hover:bg-[#c5303c] text-white rounded-xl font-semibold transition-all shadow-lg"
                  role="menuitem"
                >
                  Get Started
                </button>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
