import React from 'react';
import { FooterAd } from './AdBanner';
import { Home, Mail, Phone, HelpCircle, Shield, FileText, Cookie } from 'lucide-react';

export default function Footer({ onOpenPrivacy }) {
  return (
    <footer className="bg-gradient-to-b from-gray-900 to-gray-950 text-gray-300 pt-12 pb-8 mt-auto" role="contentinfo">
      <div className="max-w-7xl mx-auto px-4">
        {/* Ad Banner Above Footer Content */}
        <div className="mb-10">
          <FooterAd />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">
          {/* Brand Section */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
                <Home className="w-5 h-5 text-white" />
              </div>
              <span className="text-2xl font-extrabold">
                <span className="bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">Room</span>
                <span className="text-rose-400">24</span>
              </span>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed mb-4">
              Find your perfect room in South Africa. Connect directly with verified landlords and discover your next home.
            </p>
            <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-800/50 px-3 py-2 rounded-lg">
              <span className="text-lg">🌟</span>
              <span><strong className="text-gray-400">Free platform</strong> supported by ads</span>
            </div>
          </div>
          
          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Quick Links</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <a href="#browse" className="text-gray-400 hover:text-teal-400 transition-colors flex items-center gap-2">
                  Browse Rooms
                </a>
              </li>
              <li>
                <a href="#list" className="text-gray-400 hover:text-teal-400 transition-colors flex items-center gap-2">
                  List Your Room
                </a>
              </li>
              <li>
                <a href="#pricing" className="text-gray-400 hover:text-teal-400 transition-colors flex items-center gap-2">
                  Pricing
                </a>
              </li>
            </ul>
          </div>
          
          {/* Legal */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Legal</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <button 
                  onClick={onOpenPrivacy}
                  className="text-gray-400 hover:text-teal-400 transition-colors flex items-center gap-2 text-left"
                >
                  <Shield className="w-4 h-4" />
                  Privacy Policy
                </button>
              </li>
              <li>
                <a href="#terms" className="text-gray-400 hover:text-teal-400 transition-colors flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Terms of Service
                </a>
              </li>
              <li>
                <a href="#cookies" className="text-gray-400 hover:text-teal-400 transition-colors flex items-center gap-2">
                  <Cookie className="w-4 h-4" />
                  Cookie Policy
                </a>
              </li>
            </ul>
          </div>
          
          {/* Contact */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Contact</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <a href="mailto:support@room24.co.za" className="text-gray-400 hover:text-teal-400 transition-colors flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  support@room24.co.za
                </a>
              </li>
              <li>
                <a href="#help" className="text-gray-400 hover:text-teal-400 transition-colors flex items-center gap-2">
                  <HelpCircle className="w-4 h-4" />
                  Help Center
                </a>
              </li>
              <li>
                <a href="tel:+27123456789" className="text-gray-400 hover:text-teal-400 transition-colors flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  +27 12 345 6789
                </a>
              </li>
            </ul>
            
            {/* Social Links */}
            <div className="flex gap-3 mt-6">
              <a 
                href="#facebook" 
                className="w-10 h-10 bg-gray-800 hover:bg-blue-600 rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-110 hover:shadow-lg hover:shadow-blue-600/25" 
                aria-label="Facebook"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              </a>
              <a 
                href="#twitter" 
                className="w-10 h-10 bg-gray-800 hover:bg-sky-500 rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-110 hover:shadow-lg hover:shadow-sky-500/25" 
                aria-label="Twitter"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
              </a>
              <a 
                href="#instagram" 
                className="w-10 h-10 bg-gray-800 hover:bg-gradient-to-br hover:from-purple-600 hover:to-pink-500 rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-110 hover:shadow-lg hover:shadow-pink-500/25" 
                aria-label="Instagram"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
              </a>
              <a 
                href="#whatsapp" 
                className="w-10 h-10 bg-gray-800 hover:bg-green-600 rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-110 hover:shadow-lg hover:shadow-green-600/25" 
                aria-label="WhatsApp"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              </a>
            </div>
          </div>
        </div>
        
        {/* Bottom Bar */}
        <div className="border-t border-gray-800 pt-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-500">
              © {new Date().getFullYear()} Room24. All rights reserved.
            </p>
            <p className="text-xs text-gray-600 text-center md:text-right max-w-lg">
              By using this site, you agree to our use of location services and cookies for improved user experience. 
              We display ads to keep Room24 free for everyone.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
