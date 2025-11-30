# 💰 Monetization Guide - Adding Ads to Room24

This guide walks you through implementing ads to monetize your free Room24 platform.

---

## 📊 Ad Strategy Overview

### Ad Placements Implemented:

1. **Desktop Sidebar Ad** - Vertical banner in left sidebar (250x250 or 300x250)
2. **In-Feed Ads** - Native ads between listing cards (every 6-8 listings)
3. **Mobile Banner** - Horizontal banner below filters on mobile
4. **Footer Banner** - Horizontal banner above footer content

### Expected Revenue:
- **RPM (Revenue Per 1000 views)**: $1-5 for South African traffic
- **With 10,000 monthly visitors**: ~$10-50/month
- **With 100,000 monthly visitors**: ~$100-500/month
- Higher RPM in major metros (Johannesburg, Cape Town, Durban)

---

## 🚀 Quick Start: Google AdSense

### Step 1: Sign Up for AdSense
1. Go to [https://www.google.com/adsense](https://www.google.com/adsense)
2. Sign in with Google account
3. Enter your website URL (e.g., `room24.co.za`)
4. Fill out tax and payment information

### Step 2: Add AdSense Code to Your Site

**Add to `public/index.html` inside the `<head>` tag:**

```html
<!-- Google AdSense -->
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXX"
     crossorigin="anonymous"></script>
```

Replace `XXXXXXXXXX` with your actual AdSense client ID.

### Step 3: Wait for Approval
- **Timeframe**: 1-3 days (sometimes up to 2 weeks)
- **Requirements**:
  - Original content
  - Clear navigation
  - Privacy Policy page
  - Contact information
  - Minimum content threshold (varies by region)

### Step 4: Create Ad Units

Once approved:
1. Go to AdSense dashboard → **Ads** → **By ad unit**
2. Click **+ New ad unit**
3. Create these units:

| Ad Unit Name | Type | Size | Purpose |
|--------------|------|------|---------|
| `sidebar_ad` | Display | 300x250 | Desktop sidebar |
| `infeed_ad` | In-feed | Responsive | Between listings |
| `mobile_banner` | Display | 320x100 | Mobile top banner |
| `footer_banner` | Display | Responsive | Above footer |

4. Copy each **data-ad-slot** ID (looks like: `1234567890`)

### Step 5: Configure Environment Variables

**Create `.env.local` file** in your project root:

```bash
# Your AdSense Client ID
REACT_APP_ADSENSE_CLIENT=ca-pub-1234567890123456
```

### Step 6: Update Ad Slot IDs

**Edit `src/components/AdBanner.jsx`** and replace placeholder slot IDs:

```javascript
export function SidebarAd() {
  return (
    <AdBanner
      slot="YOUR_SIDEBAR_SLOT_ID"  // Replace with actual slot
      format="vertical"
      className="w-full my-4"
      style={{ minHeight: '250px' }}
    />
  );
}
```

### Step 7: Deploy & Test

```bash
npm run build
```

Deploy to your hosting platform (Netlify, Vercel, etc.)

**⚠️ Important**: Ads only show in **production** mode. In development, you'll see placeholder boxes.

---

## 🎯 Alternative Ad Networks

If AdSense rejects your application or you want diversification:

### 1. **Media.net** (Yahoo/Bing Ads)
- **Best for**: Content-heavy sites, news
- **Approval**: Easier than AdSense
- **CPM**: Similar to AdSense
- **Sign up**: [https://www.media.net](https://www.media.net)

### 2. **PropellerAds**
- **Best for**: International traffic
- **Approval**: Very easy, instant
- **CPM**: Lower ($0.5-2), but accepts all traffic
- **Sign up**: [https://propellerads.com](https://propellerads.com)

### 3. **Carbon Ads**
- **Best for**: Tech/developer audience
- **Approval**: Requires review
- **CPM**: Higher ($5-15), but selective
- **Sign up**: [https://www.carbonads.net](https://www.carbonads.net)

### 4. **Amazon Associates** (Affiliate)
- **Best for**: Adding product recommendations
- **Earnings**: 1-10% commission on sales
- **Sign up**: [https://affiliate-program.amazon.com](https://affiliate-program.amazon.com)

---

## 📈 Optimization Tips

### 1. **Ad Placement Best Practices**
- ✅ Above the fold (visible without scrolling)
- ✅ Between content (native in-feed ads)
- ✅ Near call-to-action areas
- ❌ Avoid too many ads (1 ad per 2 screens max)
- ❌ Don't place ads in header/navigation

### 2. **Improve RPM**
- **Target high-value keywords**: "apartments johannesburg", "rooms to rent sandton"
- **Quality content**: Detailed listings, neighborhood guides
- **User engagement**: Encourage longer sessions (map exploration, filters)
- **Mobile optimization**: 70% of traffic is mobile
- **Geo-targeting**: Focus on high-income areas (Sandton, Cape Town CBD)

### 3. **A/B Testing**
Test different ad sizes and placements:
- **Sidebar**: 300x250 vs 300x600
- **In-feed frequency**: Every 4 vs 6 vs 8 listings
- **Mobile banner**: Top vs bottom

### 4. **Ad Balance**
Google has an **Auto Ads** feature that automatically places ads for maximum revenue:
- AdSense → **Ads** → **Overview** → Enable Auto ads
- Let Google optimize placement for 2-4 weeks
- Compare revenue vs manual placement

---

## 💡 Additional Monetization Ideas

### 1. **Premium Landlord Features** ($)
- Highlighted listings (stand out with colored border)
- Multiple photos (free = 3, premium = 10)
- Listing boost (appear at top for 7 days)
- Analytics dashboard (views, clicks, inquiries)

**Pricing**: R99/listing or R299/month unlimited

### 2. **Featured Listings** ($$)
- Homepage banner carousel (3-5 rotating listings)
- "Featured" badge on listing cards
- Priority in search results

**Pricing**: R199 per listing for 30 days

### 3. **Verification Service** ($)
- Landlord verification badge (ID check, property ownership)
- Tenant background checks
- Partner with background check services (SmartBackground, etc.)

**Pricing**: R150 per verification

### 4. **Affiliate Partnerships**
- Moving companies (Get 10% commission on bookings)
- Furniture rental (Rent-to-Own, etc.)
- Insurance providers (Tenant insurance, short-term insurance)
- Utility setup services (Electricity, internet)

### 5. **Subscription Model** (Monthly)
- **Landlord Pro**: R499/month
  - Unlimited listings
  - Analytics dashboard
  - Priority support
  - Featured placement
- **Tenant Plus**: R99/month
  - Early access to new listings (24hr before public)
  - Saved searches with alerts
  - Ad-free experience

### 6. **Lead Generation**
- Sell qualified tenant leads to landlords
- R50 per verified inquiry
- Track conversion rate, offer guarantees

---

## 📊 Revenue Projection Model

### Scenario: 50,000 Monthly Visitors

**Ad Revenue** (Conservative):
- RPM: $2 (R35)
- 50,000 visitors × 3 pageviews = 150,000 impressions
- **Monthly**: R5,250 (~$300)

**Premium Features** (10% landlord adoption):
- 100 listings posted/month
- 10 landlords upgrade to Premium
- 10 × R299 = **R2,990**

**Featured Listings** (5% take rate):
- 5 featured listings/month
- 5 × R199 = **R995**

**Verification Services** (5% take rate):
- 5 verifications/month
- 5 × R150 = **R750**

### **Total Monthly Revenue**: ~R10,000 ($550)

At 100,000 visitors: ~R25,000/month ($1,400)

---

## 🛡️ Important Legal Requirements

### 1. **Privacy Policy** (REQUIRED)
Add to your site that you use:
- Cookies for ads (AdSense uses cookies)
- Location services
- User data (name, email, phone)

**Sample**: [https://www.privacypolicygenerator.info](https://www.privacypolicygenerator.info)

### 2. **Cookie Consent Banner**
EU GDPR and SA POPIA require user consent for non-essential cookies.

**Install**: `npm install react-cookie-consent`

**Add to App.js**:
```jsx
import CookieConsent from "react-cookie-consent";

<CookieConsent
  location="bottom"
  buttonText="Accept"
  style={{ background: "#2B373B" }}
  buttonStyle={{ background: "#0d9488", color: "#fff", fontSize: "13px" }}
>
  We use cookies and location services to improve your experience.
  <a href="/privacy" style={{ color: "#0d9488" }}> Learn more</a>
</CookieConsent>
```

### 3. **Terms of Service**
- Liability disclaimer
- User-generated content policy
- Dispute resolution process

### 4. **Advertiser Disclosure**
Add to footer:
> "Room24 is supported by advertising. We may earn a commission when you click on certain links."

---

## 🔧 Troubleshooting

### "Ads not showing in production"
1. Check browser console for errors
2. Verify REACT_APP_ADSENSE_CLIENT is set correctly
3. Ensure AdSense script is in `public/index.html`
4. Wait 24-48 hours after approval for ads to start serving
5. Check if ad blocker is enabled

### "Low RPM / earnings"
1. **Improve content quality**: Add area guides, rent averages, safety info
2. **Increase traffic**: SEO optimization, social media, Google Ads
3. **Target high-value keywords**: Use Google Keyword Planner
4. **Enable Auto Ads**: Let Google optimize placement
5. **Diversify ad networks**: Use AdSense + Media.net

### "AdSense account suspended"
Common reasons:
- Invalid traffic (don't click your own ads!)
- Insufficient content (need more listings/pages)
- Policy violations (check AdSense policies)
- Missing privacy policy

**Fix**: Appeal via AdSense dashboard with detailed explanation

---

## 📞 Support Resources

- **AdSense Help**: [https://support.google.com/adsense](https://support.google.com/adsense)
- **AdSense Community**: [https://support.google.com/adsense/community](https://support.google.com/adsense/community)
- **Web Monetization Guide**: [https://www.monetizepros.com](https://www.monetizepros.com)

---

## ✅ Next Steps

1. [ ] Sign up for Google AdSense
2. [ ] Add AdSense script to `public/index.html`
3. [ ] Create `.env.local` with your client ID
4. [ ] Wait for AdSense approval (1-3 days)
5. [ ] Create ad units in AdSense dashboard
6. [ ] Update slot IDs in `AdBanner.jsx`
7. [ ] Deploy to production
8. [ ] Add Privacy Policy page
9. [ ] Install cookie consent banner
10. [ ] Monitor revenue in AdSense dashboard

**Good luck with monetization! 🚀**
