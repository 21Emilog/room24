// Run this in browser console on your Room24 site while logged in as a landlord
// Or we can add it directly to Firestore

const testListing = {
  title: "Cozy Room in Sandton",
  description: "Beautiful furnished room available in a secure complex. Walking distance to Sandton City mall. Includes WiFi, water & electricity. Safe parking available. Perfect for young professionals.",
  price: 4500,
  location: "Sandton, Johannesburg",
  latitude: -26.1076,
  longitude: 28.0567,
  amenities: ["WiFi", "Parking", "Security", "Furnished", "Kitchen Access"],
  photos: [
    "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800",
    "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800"
  ],
  availableDate: new Date().toISOString(),
  status: "available",
  landlordId: "test-landlord-001",
  landlordName: "Test Landlord",
  landlordEmail: "test@room24.co.za",
  landlordPhone: "+27 82 123 4567",
  landlordPhoto: "",
  createdAt: new Date().toISOString()
};

console.log("Test listing data:", testListing);
