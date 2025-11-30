// Simple geocoding proxy to bypass CORS
// Usage: node proxy.js  (runs on port 4000)
// Then frontend fetch('/api/reverse?lat=..&lon=..')

const express = require('express');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 4000;

// Basic CORS middleware
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Reverse geocode endpoint
app.get('/api/reverse', async (req, res) => {
  const { lat, lon } = req.query;
  if (!lat || !lon) return res.status(400).json({ error: 'lat and lon required' });
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&zoom=18&addressdetails=1`;
    const resp = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'room-rental-platform/1.0 (localhost dev)'
      }
    });
    const data = await resp.json();
    res.json(data);
  } catch (e) {
    console.error('Reverse proxy error', e);
    res.status(500).json({ error: 'reverse_failed' });
  }
});

// Forward search geocode
app.get('/api/search', async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'q required' });
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}`;
    const resp = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'room-rental-platform/1.0 (localhost dev)'
      }
    });
    const data = await resp.json();
    res.json(data);
  } catch (e) {
    console.error('Search proxy error', e);
    res.status(500).json({ error: 'search_failed' });
  }
});

app.listen(PORT, () => {
  console.log(`Geocode proxy listening on http://localhost:${PORT}`);
});
