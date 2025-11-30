import React from 'react';
import { BarChart3, Zap, Bug } from 'lucide-react';

export default function AnalyticsConsentModal({ onAccept, onDecline }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6 text-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Help Us Improve</h3>
              <p className="text-blue-100 text-sm">Your privacy matters to us</p>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          <p className="text-gray-600 mb-4">
            Room24 would like to collect anonymous analytics to improve your experience:
          </p>
          
          <div className="space-y-3 mb-6">
            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <BarChart3 className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">Usage Insights</p>
                <p className="text-xs text-gray-500">Which features are most useful</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-green-50 rounded-xl">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Zap className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">Performance</p>
                <p className="text-xs text-gray-500">How to make the app faster</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-xl">
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Bug className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">Bug Detection</p>
                <p className="text-xs text-gray-500">Common issues users encounter</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-gray-50 to-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-2">
              <span className="text-lg">🔒</span>
              <div>
                <p className="text-xs font-semibold text-gray-700 mb-1">Privacy Promise</p>
                <p className="text-xs text-gray-600">
                  We never collect personally identifiable information. 
                  All data is aggregated and anonymous. You can change this preference anytime.
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onDecline}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-xl transition-all duration-200 active:scale-95"
            >
              No Thanks
            </button>
            <button
              onClick={onAccept}
              className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold py-3 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg active:scale-95"
            >
              Accept
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
