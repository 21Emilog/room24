# 💰 Ad Setup - Quick Start

## ✅ What's Already Done

Your Room24 app is now **ad-ready** with the following placements:

- ✅ **Desktop Sidebar Ad** (right side, 300x250)
- ✅ **In-Feed Ads** (between listings every 6-8 items)
- ✅ **Mobile Banner** (below filters)
- ✅ **Footer Banner** (above footer content)
- ✅ **Privacy Policy Modal** (POPIA compliant)
- ✅ **Ad placeholder display** in development mode

---

## 🚀 5 Steps to Start Earning

### 1. Sign Up for Google AdSense (5 minutes)
👉 [https://www.google.com/adsense](https://www.google.com/adsense)

- Sign in with Google account
- Enter your website URL
- Complete profile and payment info

### 2. Add AdSense Code (2 minutes)

**Edit `public/index.html`** - Uncomment line 12 and add your client ID:

```html
<!-- Before (commented out): -->
<!-- <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXX" crossorigin="anonymous"></script> -->

<!-- After (with your real ID): -->
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1234567890123456" crossorigin="anonymous"></script>
```

### 3. Create `.env.local` File (1 minute)

In your project root, create `.env.local`:

```bash
REACT_APP_ADSENSE_CLIENT=ca-pub-1234567890123456
```

Replace `1234567890123456` with your actual AdSense client ID (the numbers after `ca-pub-`).

### 4. Wait for AdSense Approval (1-3 days)

Google will review your site. They check:
- ✅ Original content (your listings count!)
- ✅ Clear navigation (you have this)
- ✅ Privacy policy (✅ done)
- ✅ Sufficient content (add 10+ sample listings)

**Tip**: While waiting, add more sample listings to help with approval.

### 5. Deploy to Production

```bash
npm run build
```

Then deploy to:
- **Netlify**: Drag & drop the `build` folder
- **Vercel**: Connect your GitHub repo
- **Firebase**: `firebase deploy`

**⚠️ Important**: Ads only show in **production**, not `localhost:3000`

---

## 💡 Pro Tips for Maximum Revenue

### Boost Your Approval Chances
- Add 15-20 sample listings before applying
- Write unique descriptions (don't copy-paste)
- Add a "About Us" page
- Include contact information

### After Approval
1. **Create Ad Units** in AdSense dashboard:
   - Go to **Ads** → **By ad unit**
   - Create 4 units: Sidebar, In-feed, Mobile Banner, Footer
   - Copy each **data-ad-slot** ID

2. **Update Ad Slots** in `src/components/AdBanner.jsx`:
   ```javascript
   export function SidebarAd() {
     return (
       <AdBanner
         slot="1234567890"  // Replace with your actual slot ID
         format="vertical"
         ...
       />
     );
   }
   ```

3. **Monitor Performance**:
   - Check AdSense dashboard daily
   - RPM typically $1-5 for SA traffic
   - Optimize high-performing placements

---

## 📊 Revenue Expectations

| Monthly Visitors | Estimated Revenue* |
|-----------------|-------------------|
| 1,000 | R150 (~$8) |
| 5,000 | R750 (~$42) |
| 10,000 | R1,500 (~$85) |
| 50,000 | R7,500 (~$420) |
| 100,000 | R15,000 (~$850) |

*Based on R2.50 RPM average for South African traffic

---

## 🐛 Troubleshooting

### "Ads not showing"
1. ✅ Check you're in **production** (not localhost)
2. ✅ Verify `.env.local` has correct client ID
3. ✅ AdSense script is in `public/index.html`
4. ✅ Account is approved (check AdSense dashboard)
5. ✅ Wait 24-48 hours after approval for ads to appear
6. ✅ Disable ad blocker when testing

### "Account suspended"
- **Cause**: Clicking your own ads, invalid traffic
- **Fix**: Appeal in AdSense dashboard with explanation
- **Prevention**: Never click your own ads!

### "Low earnings"
- Add more quality listings (better CPM)
- Target high-value areas (Sandton, Cape Town CBD)
- Enable Auto Ads for optimization
- Consider additional revenue: premium listings (R99/month)

---

## 📞 Need Help?

- **AdSense Support**: [https://support.google.com/adsense](https://support.google.com/adsense)
- **Full Guide**: See `MONETIZATION_GUIDE.md` in project root
- **Alternative Networks**: Media.net, PropellerAds (see guide)

---

## ✅ Checklist

- [ ] Signed up for Google AdSense
- [ ] Added AdSense script to `public/index.html`
- [ ] Created `.env.local` with client ID
- [ ] Added 15+ sample listings
- [ ] Submitted for AdSense approval
- [ ] Deployed to production (Netlify/Vercel)
- [ ] Waiting for approval (1-3 days)
- [ ] Created ad units after approval
- [ ] Updated slot IDs in `AdBanner.jsx`
- [ ] Monitoring revenue in dashboard

**Good luck! 🚀 Your Room24 platform is ready to earn!**
