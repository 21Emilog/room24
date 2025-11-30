import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnected(true);
      setTimeout(() => setShowReconnected(false), 3000);
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnected(false);
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
      className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-300 ${
        isOnline ? 'bg-green-500' : 'bg-gray-800'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-center gap-2 text-white text-sm font-medium">
        {isOnline ? (
          <>
            <Wifi className="w-4 h-4" />
            <span>Back online!</span>
          </>
        ) : (
          <>
            <WifiOff className="w-4 h-4" />
            <span>You're offline. Some features may be unavailable.</span>
          </>
        )}
      </div>
    </div>
  );
}
