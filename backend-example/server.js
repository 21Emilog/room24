// Example Node.js/Express backend endpoint for Room24
// This scaffold demonstrates FCM token persistence and basic API structure
// Deploy this separately from your React frontend

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// In-memory store (replace with database in production)
const fcmTokens = new Map(); // Map of userId -> fcmToken

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Register FCM token
app.post('/api/push/register', async (req, res) => {
  try {
    const { token, userId } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    // Store token (associate with userId if provided, otherwise store anonymously)
    const key = userId || `anon-${Date.now()}`;
    fcmTokens.set(key, { token, timestamp: Date.now() });

    console.log(`Registered FCM token for ${key}`);
    
    res.json({ success: true, message: 'Token registered successfully' });
  } catch (error) {
    console.error('Error registering token:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Send push notification (example - requires Firebase Admin SDK)
app.post('/api/push/send', async (req, res) => {
  try {
    const { userId, title, body, data } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const tokenData = fcmTokens.get(userId);
    if (!tokenData) {
      return res.status(404).json({ error: 'No token found for user' });
    }

    // TODO: Use Firebase Admin SDK to send notification
    // const admin = require('firebase-admin');
    // const message = {
    //   notification: { title, body },
    //   data: data || {},
    //   token: tokenData.token
    // };
    // const response = await admin.messaging().send(message);

    console.log(`Would send notification to ${userId}: ${title}`);
    
    res.json({ success: true, message: 'Notification sent (mock)' });
  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get listings endpoint (example)
app.get('/api/listings', async (req, res) => {
  try {
    const { location, minPrice, maxPrice, limit = 20 } = req.query;
    
    // TODO: Query database with filters
    // For now, return mock data
    const mockListings = [
      {
        id: 'backend-1',
        title: 'Modern Studio Apartment',
        price: 3500,
        location: 'Sandton, Johannesburg',
        description: 'Fully furnished studio with parking',
        amenities: ['WiFi', 'Parking', 'Furnished'],
        latitude: -26.1076,
        longitude: 28.0567
      }
    ];

    res.json({ listings: mockListings, total: mockListings.length });
  } catch (error) {
    console.error('Error fetching listings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Room24 Backend API running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;
