import React from 'react';

export default function NotificationBanner({ title, body, onClose }) {
  if (!title && !body) return null;
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[1000] bg-white border border-gray-200 rounded-xl shadow-lg w-[90%] max-w-md">
      <div className="flex items-start p-4 gap-3">
        <div className="flex-1">
          {title && <p className="font-semibold text-gray-900">{title}</p>}
          {body && <p className="text-sm text-gray-700 mt-0.5">{body}</p>}
        </div>
        <button className="text-gray-400 hover:text-gray-600" onClick={onClose} aria-label="Dismiss notification">✕</button>
      </div>
    </div>
  );
}
