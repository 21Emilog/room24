# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

## Room24 PWA & Native Notes

### Progressive Web App
- Manifest branded (`Room24`) with teal theme, maskable icon added.
- Service worker (`src/service-worker.js`) precaches shell and runtime caches images/map tiles.
- To build & serve locally with HTTPS via tunnel:
	1. `npm run build`
	2. `serve -s build -l 3001`
	3. `./ngrok.exe http 3001` → use HTTPS URL on phone for install.

### Android (Capacitor)
- Config: `capacitor.config.json` (appId `com.room24.app`).
- Add platform: `npx cap add android` then open: `npx cap open android`.
- After web changes: `npm run build && npx cap copy sync`.
- Splash screen configured via Capacitor SplashScreen plugin (teal background). Replace launcher icons in `android/app/src/main/res/mipmap-*` for production branding.

### Push Notifications (Scaffold)
- Placeholder worker: `public/firebase-messaging-sw.js`.
- Steps:
	1. Create Firebase project, enable Cloud Messaging.
	2. Add web app; copy config into worker & client init.
	3. Load Firebase SDK scripts (uncomment imports) & request notification permission in app code.
	4. Deploy on HTTPS origin (ngrok or production) for testing.

### Firebase Client Initialization
- Installed `firebase` package.
- File: `src/firebase.js` exposes `initFirebase`, `requestFcmToken`, `listenForegroundMessages`.
- Environment variables added to `.env.example` (prefix `REACT_APP_FIREBASE_*`).
- Token retrieval occurs on app load (adjust logic to defer until user consent if required for compliance).

### Android Adaptive Icon & Splash
- Background color updated to teal (`ic_launcher_background.xml`).
- Foreground vector (`drawable/ic_launcher_foreground.xml`) - simple door glyph.
- Splash drawable (`drawable/splash.xml`) used by Capacitor SplashScreen plugin.
- To apply changes:
  ```powershell
  npx cap copy android
  npx cap sync android
  npx cap open android
  ```
- Replace vector with branded artwork later (export 108x108 foreground, retain color in background).

### Replace Android Icon Assets
To use custom PNG icons instead of vector:
1. Generate icons at correct densities:
   - `mipmap-mdpi/ic_launcher_foreground.png` (108×108)
   - `mipmap-hdpi/ic_launcher_foreground.png` (162×162)
   - `mipmap-xhdpi/ic_launcher_foreground.png` (216×216)
   - `mipmap-xxhdpi/ic_launcher_foreground.png` (324×324)
   - `mipmap-xxxhdpi/ic_launcher_foreground.png` (432×432)
2. Place files in `android/app/src/main/res/mipmap-*/`
3. Ensure `mipmap-anydpi-v26/ic_launcher.xml` references `@mipmap/ic_launcher_foreground` and `@color/ic_launcher_background`
4. Sync assets:
   ```powershell
   npx cap copy android
   npx cap sync android
   ```

### Custom Splash Screen
Replace vector splash with PNG:
1. Create `splash_logo.png` (512×512 recommended, centered content)
2. Place in `android/app/src/main/res/drawable/`
3. Edit `drawable/splash.xml`:
   ```xml
   <item android:gravity="center">
     <bitmap android:src="@drawable/splash_logo" android:gravity="center"/>
   </item>
   ```
4. Sync and test:
   ```powershell
   npx cap copy android
   npx cap open android
   ```

### Backend API
- Example Express.js backend scaffold in `backend-example/`
- Endpoints: `/api/push/register`, `/api/push/send`, `/api/listings`
- To run locally:
  ```powershell
  cd backend-example
  npm install
  npm start
  ```
- Set `REACT_APP_BACKEND_URL=http://localhost:5000` in `.env.local` to connect frontend

### Analytics & Consent
- One-time consent modal (`AnalyticsConsentModal`) prompts users on first launch
- Preference stored in localStorage (`analytics-consent`)
- Initialize analytics only after consent granted
- Track custom events via `trackEvent('event_name', { params })`### Offline Behavior
- After first load, core UI works offline (listings persisted via localStorage). Map tiles require network for new areas.

### Updating PWA
- New deployment triggers service worker update; user sees changes after one full refresh cycle.

### Security & Privacy
- Ads placeholders only in dev until AdSense client ID added.
- Privacy policy modal included; keep disclosures updated if enabling FCM or analytics.


### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
