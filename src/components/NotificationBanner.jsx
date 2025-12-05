import React, { useState, useEffect, useCallback } from 'react';
import { Bell, X } from 'lucide-react';

export default function NotificationBanner({ title, body, onClose, type = 'info', duration = 5000 }) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  const handleClose = useCallback(() => {
    setIsLeaving(true);
    setTimeout(() => {
      setIsVisible(false);
      onClose?.();
    }, 300);
  }, [onClose]);

  useEffect(() => {
    if (title || body) {
      setIsVisible(true);
      setIsLeaving(false);
      
      // Auto-dismiss after duration
      if (duration > 0) {
        const timer = setTimeout(() => handleClose(), duration);
        return () => clearTimeout(timer);
      }
    }
  }, [title, body, duration, handleClose]);

  if (!title && !body) return null;
  if (!isVisible) return null;

  const typeStyles = {
    info: 'bg-gradient-to-r from-blue-500 to-indigo-500',
    success: 'bg-gradient-to-r from-emerald-500 to-green-500',
    warning: 'bg-gradient-to-r from-amber-500 to-orange-500',
    error: 'bg-gradient-to-r from-rose-500 to-red-600',
  };

  return (
    <div 
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-[1000] w-[92%] max-w-md transition-all duration-300 ${
        isLeaving ? 'opacity-0 -translate-y-2' : 'opacity-100 translate-y-0'
      }`}
      role="alert"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
        {/* Colored top bar */}
        <div className={`h-1 ${typeStyles[type] || typeStyles.info}`} />
        
        <div className="flex items-start p-4 gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${typeStyles[type] || typeStyles.info}`}>
            <Bell className="w-5 h-5 text-white" />
          </div>
          
          <div className="flex-1 min-w-0">
            {title && (
              <p className="font-semibold text-gray-900 truncate">{title}</p>
            )}
            {body && (
              <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">{body}</p>
            )}
          </div>
          
          <button 
            onClick={handleClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95"
            aria-label="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        {/* Progress bar for auto-dismiss */}
        {duration > 0 && (
          <div className="h-0.5 bg-gray-100">
            <div 
              className={`h-full ${typeStyles[type] || typeStyles.info} animate-shrink`}
              style={{ animationDuration: `${duration}ms` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
