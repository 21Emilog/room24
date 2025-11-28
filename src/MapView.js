import React, { useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet's default icon paths when using CRA / webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png')
});

// Mock location coordinates for South African areas
const locationCoordinates = {
  'soweto': [-26.2373, 27.8471],
  'johannesburg': [-26.2023, 28.0436],
  'pretoria': [-25.7461, 28.2333],
  'durban': [-29.8587, 31.0192],
  'cape town': [-33.9249, 18.4241],
  'sandton': [-26.1088, 28.0545],
  'midrand': [-25.9860, 28.1144],
  'benoni': [-26.1917, 28.3603],
  'boksburg': [-26.1972, 28.2328],
  'alberton': [-26.2745, 28.1114],
};

const getCoordinatesForLocation = (location) => {
  const normalized = location.toLowerCase().trim();
  for (const [key, coords] of Object.entries(locationCoordinates)) {
    if (normalized.includes(key)) {
      return coords;
    }
  }
  return [-26.2023, 28.0436]; // Default to Johannesburg
};

function FitBounds({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length > 0) {
      const group = new L.FeatureGroup();
      bounds.forEach(coord => group.addLayer(L.marker(coord)));
      map.fitBounds(group.getBounds(), { padding: [50, 50] });
    }
  }, [bounds, map]);
  return null;
}

export default function MapView({ listings = [], onMarkerClick = () => {}, userLocation = null, nearbyRadius = 0 }) {
  const markers = useMemo(() => {
    return listings
      .map(l => {
        let lat = l.latitude ?? l.lat ?? (l.coords && l.coords[0]);
        let lng = l.longitude ?? l.lng ?? (l.coords && l.coords[1]);
        
        // Fallback to location-based coordinates if no explicit coords
        if (typeof lat !== 'number' || typeof lng !== 'number') {
          [lat, lng] = getCoordinatesForLocation(l.location);
        }
        
        return { id: l.id, title: l.title, location: l.location, price: l.price, lat, lng, raw: l };
      });
  }, [listings]);

  const defaultCenter = [-26.2041, 28.0473]; // Johannesburg fallback
  const bounds = markers.length > 0 ? markers.map(m => [m.lat, m.lng]) : null;

  // include user location in bounds so map can show renter + listings together
  const allBounds = (() => {
    const b = bounds ? [...bounds] : [];
    if (userLocation && typeof userLocation.lat === 'number' && typeof userLocation.lon === 'number') {
      b.push([userLocation.lat, userLocation.lon]);
    }
    return b.length > 0 ? b : null;
  })();

  // detect Mapbox tile key to optionally use Mapbox tiles
  const MAPBOX_KEY = process.env.REACT_APP_MAPBOX_API_KEY;
  const useMapbox = MAPBOX_KEY && MAPBOX_KEY.length > 0;

  return (
    <div className="w-full h-96 bg-gray-100 rounded-lg border border-gray-200 p-0 overflow-hidden">
      {markers.length === 0 ? (
        <div className="h-full p-4 flex flex-col">
          <div className="text-gray-700 font-semibold mb-2 p-4">No listings to show on the map.</div>
          <div className="flex-1 overflow-auto p-4 bg-white">
            {listings.length === 0 ? (
              <div className="text-gray-500">No listings available.</div>
            ) : (
              <div className="grid gap-3">
                {listings.map(l => (
                  <button key={l.id} onClick={() => onMarkerClick(l)} className="text-left bg-gray-50 p-3 rounded border hover:bg-gray-100">
                    <div className="font-semibold text-gray-800">{l.title}</div>
                    <div className="text-sm text-gray-500">{l.location}</div>
                    <div className="text-red-600 font-bold mt-1">R{Number(l.price).toLocaleString()}/month</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <MapContainer center={markers[0] ? [markers[0].lat, markers[0].lng] : defaultCenter} zoom={11} className="w-full h-full">
          <TileLayer
            attribution={useMapbox ? '© <a href="https://www.mapbox.com/">Mapbox</a> contributors' : '&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors'}
            url={useMapbox ? `https://api.mapbox.com/styles/v1/mapbox/streets-v11/tiles/{z}/{x}/{y}?access_token=${MAPBOX_KEY}` : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'}
          />
            {/* Render renter position & search radius if provided */}
            {userLocation && typeof userLocation.lat === 'number' && typeof userLocation.lon === 'number' && (
              <>
                <Marker position={[userLocation.lat, userLocation.lon]}>
                  <Popup>You (approx.)</Popup>
                </Marker>
                {nearbyRadius > 0 && (
                  <Circle center={[userLocation.lat, userLocation.lon]} radius={nearbyRadius * 1000} pathOptions={{ color: '#2563eb', fillOpacity: 0.05 }} />
                )}
              </>
            )}
          {markers.map(m => (
            <Marker key={m.id} position={[m.lat, m.lng]} eventHandlers={{ click: () => onMarkerClick(m.raw) }}>
              <Popup>
                <div className="min-w-[150px]">
                  <div className="font-semibold">{m.title}</div>
                  <div className="text-sm text-gray-600">{m.location}</div>
                  <div className="text-red-600 font-bold mt-1">R{Number(m.price).toLocaleString()}/month</div>
                </div>
              </Popup>
            </Marker>
          ))}
            <FitBounds bounds={allBounds || bounds} />
        </MapContainer>
      )}
    </div>
  );
}

