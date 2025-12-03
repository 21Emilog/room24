import React from 'react';
import { Heart, Shield, Mail, Download, ExternalLink, Info, MapPin } from 'lucide-react';

export default function Footer({ onOpenPrivacy, onOpenAbout, onInstallApp }) {
  const currentYear = new Date().getFullYear();

  // Inline SVG logo component
  const Logo = () => (
    <svg viewBox="0 0 100 120" className="w-10 h-10">
      <path d="M50,5 Q70,5 80,20 Q90,35 80,50 L50,90 L20,50 Q10,35 20,20 Q30,5 50,5 Z" fill="#E63946"/>
      <polygon points="50,30 40,40 40,55 60,55 60,40" fill="#F1FAEE"/>
      <rect x="45" y="45" width="10" height="10" fill="#F1FAEE"/>
      <circle cx="50" cy="50" r="3" fill="#1D3557"/>
    </svg>
  );

  return (
    <footer className="bg-gradient-to-b from-gray-900 to-gray-950 text-gray-300 mt-auto">
      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <Logo />
              <span className="text-2xl font-extrabold text-[#1D3557]">
                Rent<span className="text-[#E63946]">Mzansi</span>
              </span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed mb-4 max-w-md">
              Find your perfect room in South Africa. Connect directly with verified landlords, 
              no middleman fees. Safe, simple, and completely free for renters.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={onInstallApp}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#E63946] hover:bg-[#c5303c] text-white font-semibold text-sm rounded-xl transition-all shadow-lg hover:shadow-xl"
              >
                <Download className="w-4 h-4" />
                Install App
              </button>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Quick Links</h4>
            <ul className="space-y-3">
              <li>
                <button className="text-gray-400 hover:text-[#E63946] transition-colors text-sm flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Browse Rooms
                </button>
              </li>
              <li>
                <button className="text-gray-400 hover:text-[#E63946] transition-colors text-sm flex items-center gap-2">
                  <Heart className="w-4 h-4" />
                  Saved Listings
                </button>
              </li>
              <li>
                <button 
                  onClick={onOpenPrivacy}
                  className="text-gray-400 hover:text-[#E63946] transition-colors text-sm flex items-center gap-2"
                >
                  <Shield className="w-4 h-4" />
                  Privacy Policy
                </button>
              </li>
              <li>
                <button 
                  onClick={onOpenAbout}
                  className="text-gray-400 hover:text-[#E63946] transition-colors text-sm flex items-center gap-2"
                >
                  <Info className="w-4 h-4" />
                  About Us
                </button>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Contact</h4>
            <ul className="space-y-3">
              <li>
                <a 
                  href="mailto:support@rentmzansi.co.za" 
                  className="text-gray-400 hover:text-[#E63946] transition-colors text-sm flex items-center gap-2"
                >
                  <Mail className="w-4 h-4" />
                  support@rentmzansi.co.za
                </a>
              </li>
              <li>
                <a 
                  href="https://rentmzansi.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-[#E63946] transition-colors text-sm flex items-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  rentmzansi.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Trust Badges */}
        <div className="flex flex-wrap items-center justify-center gap-6 py-6 border-t border-gray-800">
          <div className="flex items-center gap-2 text-gray-500 text-xs">
            <Shield className="w-4 h-4 text-[#E63946]" />
            <span>Verified Landlords</span>
          </div>
          <div className="flex items-center gap-2 text-gray-500 text-xs">
            <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span>Secure Platform</span>
          </div>
          <div className="flex items-center gap-2 text-gray-500 text-xs">
            <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>No Hidden Fees</span>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="bg-gray-950 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <p className="text-gray-500 text-xs">
              © {currentYear} RentMzansi. All rights reserved.
            </p>
            <div className="flex items-center gap-4 text-xs">
              <button 
                onClick={onOpenPrivacy}
                className="text-gray-500 hover:text-[#E63946] transition-colors"
              >
                Privacy
              </button>
              <span className="text-gray-700">•</span>
              <button 
                onClick={onOpenAbout}
                className="text-gray-500 hover:text-[#E63946] transition-colors"
              >
                About
              </button>
              <span className="text-gray-700">•</span>
              <button className="text-gray-500 hover:text-[#E63946] transition-colors">
                Terms
              </button>
              <span className="text-gray-700">•</span>
              <button className="text-gray-500 hover:text-[#E63946] transition-colors">
                Cookies
              </button>
            </div>
          </div>
          <p className="text-center text-gray-600 text-[10px] mt-3">
            By using RentMzansi, you agree to our use of cookies for improved user experience. 
            We display ads to keep RentMzansi free for everyone.
          </p>
        </div>
      </div>

      {/* Safe area padding for mobile */}
      <div className="h-20 md:h-0 bg-gray-950" aria-hidden="true" />
    </footer>
  );
}
