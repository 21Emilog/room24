# Room24 Backend Example

Simple Express.js API for Room24 platform.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```env
PORT=5000
FIREBASE_PROJECT_ID=your_project_id
# Add Firebase Admin SDK service account credentials
```

3. Start server:
```bash
npm start
# Or for development with auto-reload:
npm run dev
```

## Endpoints

### Health Check
```
GET /api/health
```

### Register FCM Token
```
POST /api/push/register
Body: { "token": "fcm_token_string", "userId": "user_id" }
```

### Send Push Notification
```
POST /api/push/send
Body: { "userId": "user_id", "title": "Title", "body": "Message" }
```

### Get Listings
```
GET /api/listings?location=Sandton&minPrice=2000&maxPrice=5000&limit=20
```

## Deployment

### Option 1: Heroku
```bash
heroku create room24-api
heroku config:set FIREBASE_PROJECT_ID=your_project_id
git push heroku main
```

### Option 2: Vercel (Serverless)
Create `vercel.json`:
```json
{
  "version": 2,
  "builds": [{ "src": "server.js", "use": "@vercel/node" }],
  "routes": [{ "src": "/(.*)", "dest": "server.js" }]
}
```

### Option 3: Railway
```bash
railway init
railway up
```

## Firebase Admin Setup

1. Go to Firebase Console → Project Settings → Service Accounts
2. Generate new private key
3. Save as `serviceAccountKey.json` (add to .gitignore)
4. Initialize in `server.js`:
```javascript
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
```

## Database Integration

Replace in-memory Map with:
- **MongoDB**: `mongoose` + Atlas
- **PostgreSQL**: `pg` + connection pool
- **Supabase**: REST API client
- **Firebase Firestore**: Admin SDK

## Production Checklist

- [ ] Add authentication middleware (JWT/Firebase Auth)
- [ ] Rate limiting (express-rate-limit)
- [ ] Input validation (joi/express-validator)
- [ ] Logging (winston/morgan)
- [ ] Database connection
- [ ] Environment variables
- [ ] HTTPS/TLS certificates
- [ ] CORS whitelist
- [ ] Error monitoring (Sentry)
- [ ] CI/CD pipeline
