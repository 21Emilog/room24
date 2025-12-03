import React from 'react';
import { X, Home, Users, Shield, MapPin, Heart, Zap, Mail, Globe } from 'lucide-react';

export default function AboutModal({ onClose }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-teal-600 via-cyan-600 to-teal-700 px-6 py-6 rounded-t-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRoLTJ2LTRoMnYtMmgtMnYtMmgydi0ySDI0djJoMnYyaC0ydjJoMnY0aC0ydjJoMTJ2LTJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
          <button 
            onClick={onClose} 
            className="absolute top-4 right-4 text-white/80 hover:text-white hover:bg-white/20 p-2 rounded-lg transition-all duration-200"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-4 relative">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm shadow-lg">
              <Home className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-extrabold text-white">
                <span>Room</span><span className="text-amber-300">24</span>
              </h2>
              <p className="text-teal-100 font-medium">South Africa's Room Finder</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-8 space-y-8">
          {/* Mission Statement */}
          <section className="text-center max-w-2xl mx-auto">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">Our Mission</h3>
            <p className="text-gray-600 text-lg leading-relaxed">
              Room24 connects South Africans with affordable, quality rental rooms. 
              We believe everyone deserves a safe place to call home, without hidden fees or complicated processes.
            </p>
          </section>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-2xl p-6 text-center border border-teal-100">
              <div className="text-3xl font-bold text-teal-600 mb-1">100%</div>
              <div className="text-sm text-gray-600 font-medium">Free for Renters</div>
            </div>
            <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl p-6 text-center border border-amber-100">
              <div className="text-3xl font-bold text-amber-600 mb-1">Direct</div>
              <div className="text-sm text-gray-600 font-medium">Landlord Contact</div>
            </div>
            <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl p-6 text-center border border-emerald-100">
              <div className="text-3xl font-bold text-emerald-600 mb-1">Verified</div>
              <div className="text-sm text-gray-600 font-medium">Landlords</div>
            </div>
          </div>

          {/* Why Room24 */}
          <section>
            <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <Heart className="w-6 h-6 text-rose-500" />
              Why Choose Room24?
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex gap-4 p-4 bg-gray-50 rounded-xl">
                <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Shield className="w-6 h-6 text-teal-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800 mb-1">Verified Landlords</h4>
                  <p className="text-sm text-gray-600">We verify landlord identities to ensure your safety and peace of mind.</p>
                </div>
              </div>
              <div className="flex gap-4 p-4 bg-gray-50 rounded-xl">
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Zap className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800 mb-1">No Middleman Fees</h4>
                  <p className="text-sm text-gray-600">Connect directly with landlords. No agent fees, no hidden costs.</p>
                </div>
              </div>
              <div className="flex gap-4 p-4 bg-gray-50 rounded-xl">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800 mb-1">Nationwide Coverage</h4>
                  <p className="text-sm text-gray-600">Find rooms across South Africa - Johannesburg, Cape Town, Durban, and more.</p>
                </div>
              </div>
              <div className="flex gap-4 p-4 bg-gray-50 rounded-xl">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Users className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800 mb-1">Community Focused</h4>
                  <p className="text-sm text-gray-600">Built by South Africans, for South Africans. We understand local needs.</p>
                </div>
              </div>
            </div>
          </section>

          {/* How It Works */}
          <section className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-2xl p-6 border border-gray-100">
            <h3 className="text-xl font-bold text-gray-800 mb-6 text-center">How It Works</h3>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-14 h-14 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <span className="text-white font-bold text-xl">1</span>
                </div>
                <h4 className="font-semibold text-gray-800 mb-2">Search</h4>
                <p className="text-sm text-gray-600">Browse rooms by location, price, and amenities</p>
              </div>
              <div className="text-center">
                <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <span className="text-white font-bold text-xl">2</span>
                </div>
                <h4 className="font-semibold text-gray-800 mb-2">Connect</h4>
                <p className="text-sm text-gray-600">Contact landlords directly via phone or WhatsApp</p>
              </div>
              <div className="text-center">
                <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-green-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <span className="text-white font-bold text-xl">3</span>
                </div>
                <h4 className="font-semibold text-gray-800 mb-2">Move In</h4>
                <p className="text-sm text-gray-600">View the room and move in - it's that simple!</p>
              </div>
            </div>
          </section>

          {/* For Landlords */}
          <section className="bg-gradient-to-br from-teal-600 to-cyan-600 rounded-2xl p-6 text-white">
            <h3 className="text-xl font-bold mb-4">Are You a Landlord?</h3>
            <p className="text-teal-100 mb-4">
              List your rooms for free and reach thousands of potential tenants across South Africa.
            </p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <span className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center text-xs">✓</span>
                Free listing - no upfront costs
              </li>
              <li className="flex items-center gap-2">
                <span className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center text-xs">✓</span>
                Direct tenant inquiries via phone/WhatsApp
              </li>
              <li className="flex items-center gap-2">
                <span className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center text-xs">✓</span>
                Premium listings for extra visibility
              </li>
              <li className="flex items-center gap-2">
                <span className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center text-xs">✓</span>
                Manage multiple properties easily
              </li>
            </ul>
          </section>

          {/* Contact Information */}
          <section>
            <h3 className="text-xl font-bold text-gray-800 mb-4">Contact Us</h3>
            <div className="bg-gray-50 rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                  <Mail className="w-5 h-5 text-teal-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <a href="mailto:support@room24.co.za" className="text-teal-600 hover:underline font-medium">support@room24.co.za</a>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                  <Globe className="w-5 h-5 text-teal-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Website</p>
                  <a href="https://room24.vercel.app" target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline font-medium">room24.vercel.app</a>
                </div>
              </div>
            </div>
          </section>

          {/* Footer */}
          <div className="border-t border-gray-200 pt-6 text-center">
            <p className="text-gray-500 text-sm mb-4">
              Made with ❤️ in South Africa
            </p>
            <button
              onClick={onClose}
              className="w-full bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-semibold py-3.5 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg active:scale-[0.98]"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
