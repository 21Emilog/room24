import React from 'react';
import { X, Shield } from 'lucide-react';

export default function PrivacyPolicyModal({ onClose }) {
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-900/70 via-slate-900/60 to-gray-900/70 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto animate-fadeIn">
      {/* Decorative background blurs */}
      <div className="fixed top-20 right-20 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-20 left-10 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      
      <div className="bg-white/95 backdrop-blur-xl rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-[0_25px_60px_-12px_rgba(0,0,0,0.35)] border border-white/20">
        <div className="sticky top-0 bg-gradient-to-r from-[#1D3557] to-[#2d4a6f] px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">Privacy Policy</h2>
          </div>
          <button 
            onClick={onClose} 
            className="text-white/80 hover:text-white hover:bg-white/20 p-2.5 rounded-xl transition-all duration-300 hover:scale-110 hover:rotate-90 active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-6 space-y-6">
          <p className="text-sm text-gray-500">Last updated: {new Date().toLocaleDateString()}</p>

          <section>
            <h3 className="text-xl font-semibold text-gray-800 mb-3">1. Information We Collect</h3>
            <p className="text-gray-600 mb-3">
              RentMzansi collects the following information to provide and improve our services:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-600 ml-4">
              <li><strong>Personal Information:</strong> Name, email address, phone number, and WhatsApp number (optional) when you create an account</li>
              <li><strong>Location Data:</strong> With your permission, we access your device location to show nearby rental listings</li>
              <li><strong>Listing Information:</strong> Property details, photos, prices, and addresses you provide when posting listings</li>
              <li><strong>Usage Data:</strong> Pages visited, search queries, filters used, and listing interactions</li>
              <li><strong>Device Information:</strong> Browser type, IP address, device type, and operating system</li>
            </ul>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-gray-800 mb-3">2. How We Use Your Information</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-600 ml-4">
              <li>To display and manage rental listings</li>
              <li>To facilitate communication between landlords and renters</li>
              <li>To show nearby listings based on your location (with consent)</li>
              <li>To send notifications about new listings in subscribed areas</li>
              <li>To improve our platform and user experience</li>
              <li>To prevent fraud and ensure platform safety</li>
              <li>To comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-gray-800 mb-3">3. Cookies and Tracking Technologies</h3>
            <p className="text-gray-600 mb-3">
              We use cookies and similar technologies to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-600 ml-4">
              <li><strong>Essential Cookies:</strong> Required for authentication and core functionality</li>
              <li><strong>Analytics Cookies:</strong> Help us understand how users interact with our platform</li>
              <li><strong>Advertising Cookies:</strong> Used by Google AdSense and other ad networks to display relevant ads</li>
              <li><strong>Preference Cookies:</strong> Remember your settings and preferences</li>
            </ul>
            <p className="text-gray-600 mt-3">
              You can control cookies through your browser settings, but disabling them may affect platform functionality.
            </p>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-gray-800 mb-3">4. Third-Party Services</h3>
            <p className="text-gray-600 mb-3">
              We use the following third-party services that may collect your information:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-600 ml-4">
              <li><strong>Google AdSense:</strong> Displays advertisements on our platform. <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-[#E63946] hover:underline">Google Privacy Policy</a></li>
              <li><strong>OpenStreetMap/Mapbox:</strong> Provides map tiles and geocoding services. <a href="https://wiki.osmfoundation.org/wiki/Privacy_Policy" target="_blank" rel="noopener noreferrer" className="text-[#E63946] hover:underline">OSM Privacy Policy</a></li>
              <li><strong>WhatsApp:</strong> Enables direct communication via WhatsApp (when you click a WhatsApp link)</li>
            </ul>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-gray-800 mb-3">5. Data Sharing and Disclosure</h3>
            <p className="text-gray-600 mb-3">
              We do not sell your personal information. We may share your information:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-600 ml-4">
              <li><strong>With other users:</strong> Your landlord/renter profile information is visible to facilitate communication</li>
              <li><strong>With service providers:</strong> Third-party services that help us operate the platform (hosting, analytics, ads)</li>
              <li><strong>For legal reasons:</strong> When required by law, regulation, or legal process</li>
              <li><strong>Business transfers:</strong> In the event of a merger, acquisition, or sale of assets</li>
            </ul>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-gray-800 mb-3">6. Location Services</h3>
            <p className="text-gray-600 mb-3">
              When you use the "Find Nearby" feature, we request access to your device location. This data:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-600 ml-4">
              <li>Is used only to calculate distances to rental listings</li>
              <li>Is not stored on our servers</li>
              <li>Is not shared with third parties</li>
              <li>Requires your explicit consent</li>
              <li>Can be revoked at any time through your browser settings</li>
            </ul>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-gray-800 mb-3">7. Data Security</h3>
            <p className="text-gray-600">
              We implement reasonable security measures to protect your information, including:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-600 ml-4 mt-3">
              <li>Encrypted data transmission (HTTPS)</li>
              <li>Secure data storage using browser localStorage</li>
              <li>Regular security audits and updates</li>
              <li>Access controls and authentication</li>
            </ul>
            <p className="text-gray-600 mt-3">
              However, no method of transmission over the internet is 100% secure. We cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-gray-800 mb-3">8. Your Rights (POPIA Compliance)</h3>
            <p className="text-gray-600 mb-3">
              Under South Africa's Protection of Personal Information Act (POPIA), you have the right to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-600 ml-4">
              <li><strong>Access:</strong> Request a copy of your personal information</li>
              <li><strong>Correction:</strong> Update or correct inaccurate information</li>
              <li><strong>Deletion:</strong> Request deletion of your account and associated data</li>
              <li><strong>Objection:</strong> Object to certain processing of your data</li>
              <li><strong>Data Portability:</strong> Receive your data in a structured format</li>
              <li><strong>Withdraw Consent:</strong> Revoke location permissions or other consents at any time</li>
            </ul>
            <p className="text-gray-600 mt-3">
              To exercise these rights, contact us at: <a href="mailto:privacy@rentmzansi.co.za" className="text-[#E63946] hover:underline">privacy@rentmzansi.co.za</a>
            </p>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-gray-800 mb-3">9. Children's Privacy</h3>
            <p className="text-gray-600">
              RentMzansi is not intended for users under 18 years of age. We do not knowingly collect information from children. 
              If you believe we have collected information from a minor, please contact us immediately.
            </p>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-gray-800 mb-3">10. Data Retention</h3>
            <p className="text-gray-600">
              We retain your information for as long as your account is active or as needed to provide services. 
              You can request deletion of your account at any time. After deletion, we may retain certain information 
              for legal compliance, fraud prevention, and dispute resolution purposes.
            </p>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-gray-800 mb-3">11. International Data Transfers</h3>
            <p className="text-gray-600">
              Your information may be transferred to and processed in countries outside South Africa, 
              including servers operated by our third-party service providers (e.g., Google AdSense). 
              We ensure appropriate safeguards are in place for such transfers.
            </p>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-gray-800 mb-3">12. Changes to This Policy</h3>
            <p className="text-gray-600">
              We may update this Privacy Policy periodically to reflect changes in our practices or legal requirements. 
              We will notify users of significant changes via email or prominent notice on the platform. 
              Continued use of RentMzansi after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-gray-800 mb-3">13. Contact Information</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-700 font-semibold mb-2">RentMzansi Data Protection Officer</p>
              <p className="text-gray-600">Email: <a href="mailto:privacy@rentmzansi.co.za" className="text-[#E63946] hover:underline">privacy@rentmzansi.co.za</a></p>
              <p className="text-gray-600">Support: <a href="mailto:support@rentmzansi.co.za" className="text-[#E63946] hover:underline">support@rentmzansi.co.za</a></p>
              <p className="text-gray-600 mt-2">For complaints or concerns, you may also contact:</p>
              <p className="text-gray-600">
                <strong>Information Regulator (South Africa)</strong><br />
                Email: <a href="mailto:inforeg@justice.gov.za" className="text-[#E63946] hover:underline">inforeg@justice.gov.za</a><br />
                Website: <a href="https://www.justice.gov.za/inforeg/" target="_blank" rel="noopener noreferrer" className="text-[#E63946] hover:underline">www.justice.gov.za/inforeg</a>
              </p>
            </div>
          </section>

          <div className="border-t border-gray-200 pt-6 mt-8">
            <button
              onClick={onClose}
              className="w-full bg-gradient-to-r from-red-500 to-[#c5303c] hover:from-[#E63946] hover:to-[#a52833] text-white font-semibold py-3.5 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg active:scale-[0.98]"
            >
              I Understand
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
