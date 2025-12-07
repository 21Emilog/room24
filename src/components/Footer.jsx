import React, { useState } from 'react';
import { Heart, Shield, Mail, ExternalLink, Info, MapPin, Send, CheckCircle } from 'lucide-react';

export default function Footer({ onOpenPrivacy, onOpenAbout, onInstallApp }) {
  const currentYear = new Date().getFullYear();
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (email && email.includes('@')) {
      setSubscribed(true);
      setEmail('');
      setTimeout(() => setSubscribed(false), 5000);
    }
  };

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
    <footer className="bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 text-gray-300 mt-auto relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-red-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
      
      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 relative">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-10">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl shadow-lg shadow-red-500/30">
                <Logo />
              </div>
              <span className="text-2xl font-extrabold">
                <span className="text-white">Rent</span>
                <span className="text-[#E63946]">Mzansi</span>
              </span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed mb-6 max-w-md">
              Find your perfect room in South Africa. Connect directly with verified landlords, 
              no middleman fees. Safe, simple, and completely free for renters.
            </p>

            {/* Newsletter Signup */}
            <div className="mb-6">
              <p className="text-white text-sm font-medium mb-3">Get notified about new rooms</p>
              {subscribed ? (
                <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 px-4 py-3 rounded-xl animate-fadein">
                  <CheckCircle className="w-5 h-5" />
                  <span className="text-sm font-medium">Thanks! You're subscribed.</span>
                </div>
              ) : (
                <form onSubmit={handleSubscribe} className="flex gap-2">
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="flex-1 bg-gray-800 border border-gray-700 text-white placeholder-gray-500 px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                    required
                  />
                  <button
                    type="submit"
                    className="p-3 bg-gradient-to-r from-[#E63946] to-rose-600 hover:from-[#c5303c] hover:to-rose-700 text-white rounded-xl transition-all shadow-lg shadow-red-500/30 hover:shadow-xl hover:scale-105 active:scale-95"
                    aria-label="Subscribe"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </form>
              )}
            </div>

            {/* Social Links */}
            <div className="flex items-center gap-3">
              <a 
                href="https://facebook.com/rentmzansi" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-3 bg-gray-800 hover:bg-blue-600 rounded-xl transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-blue-500/30"
                aria-label="Facebook"
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a 
                href="https://instagram.com/rentmzansi" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-3 bg-gray-800 hover:bg-gradient-to-br hover:from-purple-600 hover:to-pink-500 rounded-xl transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-pink-500/30"
                aria-label="Instagram"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a 
                href="https://twitter.com/rentmzansi" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-3 bg-gray-800 hover:bg-sky-500 rounded-xl transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-sky-500/30"
                aria-label="Twitter"
              >
                <Twitter className="w-5 h-5" />
              </a>
              <a 
                href="https://linkedin.com/company/rentmzansi" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-3 bg-gray-800 hover:bg-blue-700 rounded-xl transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-blue-700/30"
                aria-label="LinkedIn"
              >
                <Linkedin className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-bold mb-5 text-sm uppercase tracking-wider flex items-center gap-2">
              <div className="w-1 h-5 bg-gradient-to-b from-red-500 to-rose-600 rounded-full" />
              Quick Links
            </h4>
            <ul className="space-y-4">
              <li>
                <button className="text-gray-400 hover:text-white transition-all text-sm flex items-center gap-3 group">
                  <div className="p-2 bg-gray-800 group-hover:bg-red-500/20 rounded-lg transition-colors">
                    <MapPin className="w-4 h-4 group-hover:text-red-400" />
                  </div>
                  Browse Rooms
                </button>
              </li>
              <li>
                <button className="text-gray-400 hover:text-white transition-all text-sm flex items-center gap-3 group">
                  <div className="p-2 bg-gray-800 group-hover:bg-red-500/20 rounded-lg transition-colors">
                    <Heart className="w-4 h-4 group-hover:text-red-400" />
                  </div>
                  Saved Listings
                </button>
              </li>
              <li>
                <button 
                  onClick={onOpenPrivacy}
                  className="text-gray-400 hover:text-white transition-all text-sm flex items-center gap-3 group"
                >
                  <div className="p-2 bg-gray-800 group-hover:bg-red-500/20 rounded-lg transition-colors">
                    <Shield className="w-4 h-4 group-hover:text-red-400" />
                  </div>
                  Privacy Policy
                </button>
              </li>
              <li>
                <button 
                  onClick={onOpenAbout}
                  className="text-gray-400 hover:text-white transition-all text-sm flex items-center gap-3 group"
                >
                  <div className="p-2 bg-gray-800 group-hover:bg-red-500/20 rounded-lg transition-colors">
                    <Info className="w-4 h-4 group-hover:text-red-400" />
                  </div>
                  About Us
                </button>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-bold mb-5 text-sm uppercase tracking-wider flex items-center gap-2">
              <div className="w-1 h-5 bg-gradient-to-b from-red-500 to-rose-600 rounded-full" />
              Contact
            </h4>
            <ul className="space-y-4">
              <li>
                <a 
                  href="mailto:support@rentmzansi.co.za" 
                  className="text-gray-400 hover:text-white transition-all text-sm flex items-center gap-3 group"
                >
                  <div className="p-2 bg-gray-800 group-hover:bg-red-500/20 rounded-lg transition-colors">
                    <Mail className="w-4 h-4 group-hover:text-red-400" />
                  </div>
                  support@rentmzansi.co.za
                </a>
              </li>
              <li>
                <a 
                  href="https://rentmzansi.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white transition-all text-sm flex items-center gap-3 group"
                >
                  <div className="p-2 bg-gray-800 group-hover:bg-red-500/20 rounded-lg transition-colors">
                    <ExternalLink className="w-4 h-4 group-hover:text-red-400" />
                  </div>
                  rentmzansi.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Trust Badges */}
        <div className="flex flex-wrap items-center justify-center gap-8 py-8 border-t border-gray-800/50">
          <div className="flex items-center gap-3 bg-gray-800/50 px-5 py-3 rounded-xl">
            <div className="p-2 bg-red-500/20 rounded-lg">
              <Shield className="w-5 h-5 text-[#E63946]" />
            </div>
            <span className="text-gray-300 text-sm font-medium">Verified Landlords</span>
          </div>
          <div className="flex items-center gap-3 bg-gray-800/50 px-5 py-3 rounded-xl">
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <span className="text-gray-300 text-sm font-medium">Secure Platform</span>
          </div>
          <div className="flex items-center gap-3 bg-gray-800/50 px-5 py-3 rounded-xl">
            <div className="p-2 bg-amber-500/20 rounded-lg">
              <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-gray-300 text-sm font-medium">No Hidden Fees</span>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="bg-gray-950 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <div className="flex items-center gap-3">
              <p className="text-gray-500 text-xs">
                © {currentYear} RentMzansi. All rights reserved.
              </p>
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-gray-600 bg-gray-800 px-2 py-0.5 rounded-full">
                <span className="text-emerald-400">•</span> v1.0.0
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="text-gray-600 flex items-center gap-1">
                Made with <Heart className="w-3 h-3 text-[#E63946] fill-[#E63946]" /> in SA
              </span>
              <span className="text-gray-700">•</span>
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
            </div>
          </div>
          <p className="text-center text-gray-600 text-[10px] mt-3">
            RentMzansi is free for renters. We display non-intrusive ads to keep it that way.
          </p>
        </div>
      </div>

      {/* Safe area padding for mobile */}
      <div className="h-20 md:h-0 bg-gray-950" aria-hidden="true" />
    </footer>
  );
}
