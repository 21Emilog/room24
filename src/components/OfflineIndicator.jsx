import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, RefreshCw, X } from 'lucide-react';

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showReconnected, setShowReconnected] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnected(true);
      setIsAnimating(true);
      setDismissed(false);
      setTimeout(() => setIsAnimating(false), 500);
      setTimeout(() => setShowReconnected(false), 4000);
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnected(false);
      setIsAnimating(true);
      setDismissed(false);
      setTimeout(() => setIsAnimating(false), 500);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if ((isOnline && !showReconnected) || dismissed) return null;

  return (
    <div 
      className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 ease-out animate-slideDown ${
        isOnline 
          ? 'bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-600' 
          : 'bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800'
      }`}
      role="status"
      aria-live="polite"
    >
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-center gap-3 text-white text-sm font-semibold safe-area-top">
        {isOnline ? (
          <>
            <div className={`p-1.5 bg-white/20 backdrop-blur-sm rounded-xl ${isAnimating ? 'animate-bounce' : ''}`}>
              <Wifi className="w-4 h-4" />
            </div>
            <span>You're back online!</span>
            <button 
              onClick={() => window.location.reload()}
              className="ml-2 flex items-center gap-1.5 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-xs font-bold transition-all hover:scale-105 active:scale-95 backdrop-blur-sm"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>
          </>
        ) : (
          <>
            <div className={`p-1.5 bg-white/20 backdrop-blur-sm rounded-xl ${isAnimating ? 'animate-pulse' : ''}`}>
              <WifiOff className="w-4 h-4" />
            </div>
            <span>You're offline</span>
            <span className="text-white/60 text-xs font-medium">• Some features unavailable</span>
            <button
              onClick={() => setDismissed(true)}
              className="ml-2 p-1.5 hover:bg-white/20 rounded-xl transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
