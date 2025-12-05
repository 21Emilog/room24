// Calculate listing quality score (0-100)
export function calculateQualityScore(listing) {
  let score = 0;
  const maxScore = 100;
  
  // Photos (up to 30 points)
  const photoCount = listing.images?.length || 0;
  if (photoCount >= 5) score += 30;
  else if (photoCount >= 3) score += 20;
  else if (photoCount >= 1) score += 10;
  
  // Description (up to 20 points)
  const descLength = listing.description?.length || 0;
  if (descLength >= 200) score += 20;
  else if (descLength >= 100) score += 15;
  else if (descLength >= 50) score += 10;
  else if (descLength > 0) score += 5;
  
  // Amenities (up to 15 points)
  const amenityCount = listing.amenities?.length || 0;
  if (amenityCount >= 5) score += 15;
  else if (amenityCount >= 3) score += 10;
  else if (amenityCount >= 1) score += 5;
  
  // Price info (10 points)
  if (listing.price && listing.price > 0) score += 10;
  
  // Location (10 points)
  if (listing.location && listing.location.length > 3) score += 10;
  
  // Contact info (5 points)
  if (listing.phone || listing.email || listing.whatsapp) score += 5;
  
  // Availability date (5 points)
  if (listing.availableDate) score += 5;
  
  // Virtual tour (5 bonus points)
  if (listing.virtualTour) score += 5;
  
  return Math.min(score, maxScore);
}

// Get quality label based on score
export function getQualityLabel(score) {
  if (score >= 80) return { label: 'Excellent', color: 'green' };
  if (score >= 60) return { label: 'Good', color: 'blue' };
  if (score >= 40) return { label: 'Fair', color: 'yellow' };
  return { label: 'Needs Improvement', color: 'red' };
}
