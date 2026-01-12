import React from 'react';
import { Heart, Shield, Mail, Download, MapPin } from 'lucide-react';

export default function Footer({ onOpenPrivacy, onOpenAbout, onInstallApp, onNavigate }) {
  const currentYear = new Date().getFullYear();

  // Logo component using PNG image
  const Logo = () => (
    <img 
      src="/logo192.png" 
      alt="RentMzansi" 
      className="w-8 h-8 object-contain"
    />
  );

  return (
    <footer className="bg-gradient-to-b from-gray-900 to-gray-950 text-gray-300 mt-auto">
      {/* Compact Footer Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Brand + Links Row */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-6">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-gradient-to-br from-red-500 to-rose-600 rounded-lg">
              <Logo />
            </div>
            <div>
              <span className="text-xl font-bold">
                <span className="text-white">Rent</span>
                <span className="text-[#E63946]">Mzansi</span>
              </span>
              <p className="text-gray-500 text-xs">Find your perfect room in SA</p>
            </div>
          </div>

          {/* Install Button */}
          <button
            onClick={onInstallApp}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#E63946] to-rose-600 hover:from-[#c5303c] hover:to-rose-700 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-red-500/20 hover:scale-105 active:scale-95"
          >
            <Download className="w-4 h-4" />
            Install App
          </button>
        </div>

        {/* Quick Links - Horizontal */}
        <div className="flex flex-wrap items-center justify-center gap-3 py-4 border-t border-gray-800/50">
          <button 
            onClick={() => onNavigate?.('browse')}
            className="flex items-center gap-2 px-3 py-2 bg-gray-800/50 hover:bg-red-500/20 rounded-lg text-gray-400 hover:text-white text-sm transition-all"
          >
            <MapPin className="w-4 h-4" />
            Browse Rooms
          </button>
          <button 
            onClick={() => onNavigate?.('favorites')}
            className="flex items-center gap-2 px-3 py-2 bg-gray-800/50 hover:bg-red-500/20 rounded-lg text-gray-400 hover:text-white text-sm transition-all"
          >
            <Heart className="w-4 h-4" />
            Saved
          </button>
          <button 
            onClick={onOpenPrivacy}
            className="flex items-center gap-2 px-3 py-2 bg-gray-800/50 hover:bg-red-500/20 rounded-lg text-gray-400 hover:text-white text-sm transition-all"
          >
            <Shield className="w-4 h-4" />
            Privacy
          </button>
          <a 
            href="mailto:support@rentmzansi.co.za"
            className="flex items-center gap-2 px-3 py-2 bg-gray-800/50 hover:bg-red-500/20 rounded-lg text-gray-400 hover:text-white text-sm transition-all"
          >
            <Mail className="w-4 h-4" />
            Contact
          </a>
        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-4 border-t border-gray-800/50 text-xs text-gray-500">
          <p>© {currentYear} RentMzansi. All rights reserved.</p>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              Made with <Heart className="w-3 h-3 text-[#E63946] fill-[#E63946]" /> in SA
            </span>
            <span className="text-gray-700">•</span>
            <button onClick={onOpenAbout} className="hover:text-[#E63946] transition-colors">
              About
            </button>
          </div>
        </div>
      </div>

      {/* Safe area padding for bottom navigation bar */}
      <div className="h-16 md:h-0 bg-gray-950" aria-hidden="true" />
    </footer>
  );
}
