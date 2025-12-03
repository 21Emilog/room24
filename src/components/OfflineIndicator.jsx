import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showReconnected, setShowReconnected] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnected(true);
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 500);
      setTimeout(() => setShowReconnected(false), 3000);
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnected(false);
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 500);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline && !showReconnected) return null;

  return (
    <div 
      className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 ease-out animate-slideDown ${
        isOnline 
          ? 'bg-gradient-to-r from-emerald-500 to-green-500' 
          : 'bg-gradient-to-r from-gray-700 to-gray-800'
      }`}
      role="status"
      aria-live="polite"
    >
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-center gap-2.5 text-white text-sm font-medium">
        {isOnline ? (
          <>
            <Wifi className={`w-4 h-4 ${isAnimating ? 'animate-bounce' : ''}`} />
            <span>You're back online!</span>
            <button 
              onClick={() => window.location.reload()}
              className="ml-2 flex items-center gap-1.5 px-2.5 py-1 bg-white/20 hover:bg-white/30 rounded-full text-xs transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              Refresh
            </button>
          </>
        ) : (
          <>
            <WifiOff className={`w-4 h-4 ${isAnimating ? 'animate-pulse' : ''}`} />
            <span>You're offline</span>
            <span className="text-white/70">• Some features may be unavailable</span>
          </>
        )}
      </div>
    </div>
  );
}
