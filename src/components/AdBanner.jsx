import React, { useEffect } from 'react';

/**
 * AdBanner Component - Google AdSense Integration
 * 
 * Setup Instructions:
 * 1. Sign up at https://www.google.com/adsense
 * 2. Add your site and get approved
 * 3. Create ad units and get the data-ad-slot IDs
 * 4. Add your client ID to .env: REACT_APP_ADSENSE_CLIENT=ca-pub-XXXXXXXXXX
 * 5. Add the AdSense script to public/index.html <head>:
 *    <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXX" crossorigin="anonymous"></script>
 */

export default function AdBanner({ 
  slot, 
  format = 'auto', 
  responsive = true,
  style = {},
  className = ''
}) {
  const adClient = process.env.REACT_APP_ADSENSE_CLIENT;

  useEffect(() => {
    // Only load ads in production and if client ID is configured
    if (process.env.NODE_ENV === 'production' && adClient) {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (e) {
        console.error('AdSense error:', e);
      }
    }
  }, [adClient]);

  // Don't show ads in development
  if (process.env.NODE_ENV !== 'production' || !adClient) {
    return (
      <div 
        className={`bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center overflow-hidden ${className}`}
        style={{ minHeight: '100px', ...style }}
      >
        <div className="text-center p-4 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
          <div className="w-10 h-10 mx-auto mb-2 bg-gray-200 rounded-lg flex items-center justify-center">
            <span className="text-lg">📢</span>
          </div>
          <p className="text-sm font-semibold text-gray-500 mb-0.5">Ad Space</p>
          <p className="text-xs text-gray-400">Live in production</p>
        </div>
      </div>
    );
  }

  return (
    <div className={className} style={style}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={adClient}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive={responsive ? 'true' : 'false'}
      />
    </div>
  );
}

// Pre-configured ad components for common placements

export function HeaderAd() {
  return (
    <AdBanner
      slot="1234567890" // Replace with your actual slot ID
      format="horizontal"
      className="w-full my-2"
      style={{ minHeight: '90px' }}
    />
  );
}

export function SidebarAd() {
  return (
    <AdBanner
      slot="0987654321" // Replace with your actual slot ID
      format="vertical"
      className="w-full my-4"
      style={{ minHeight: '250px' }}
    />
  );
}

export function InFeedAd() {
  return (
    <AdBanner
      slot="1122334455" // Replace with your actual slot ID
      format="fluid"
      className="w-full my-6"
      style={{ minHeight: '100px' }}
    />
  );
}

export function FooterAd() {
  return (
    <AdBanner
      slot="5544332211" // Replace with your actual slot ID
      format="horizontal"
      responsive={true}
      className="w-full mt-4"
      style={{ minHeight: '90px' }}
    />
  );
}
