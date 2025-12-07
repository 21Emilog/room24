// Security utilities for input validation and sanitization
// RentMzansi - Keep your users safe!

/**
 * Sanitize text input to prevent XSS attacks
 * Removes script tags, event handlers, and dangerous HTML
 */
export function sanitizeText(input) {
  if (typeof input !== 'string') return '';
  
  return input
    // Remove script tags
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove event handlers
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/on\w+\s*=\s*[^\s>]+/gi, '')
    // Remove javascript: URLs
    .replace(/javascript:/gi, '')
    // Remove data: URLs (potential XSS vector)
    .replace(/data:/gi, '')
    // Trim whitespace
    .trim();
}

/**
 * Sanitize HTML - more aggressive, strips all tags
 */
export function stripHtml(input) {
  if (typeof input !== 'string') return '';
  return input.replace(/<[^>]*>/g, '').trim();
}

/**
 * Validate email format
 */
export function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z]{2,}$/i;
  return emailRegex.test(email.trim());
}

/**
 * Validate phone number (South African format)
 */
export function isValidPhone(phone) {
  if (!phone || typeof phone !== 'string') return false;
  // Remove spaces, dashes, and parentheses
  const cleaned = phone.replace(/[\s\-()]/g, '');
  // SA numbers: 0XX XXX XXXX or +27 XX XXX XXXX
  const saRegex = /^(\+27|0)[0-9]{9}$/;
  return saRegex.test(cleaned);
}

/**
 * Validate price (positive number)
 */
export function isValidPrice(price) {
  const num = parseFloat(price);
  return !isNaN(num) && num >= 0 && num <= 1000000; // Max R1M
}

/**
 * Validate listing title
 */
export function isValidTitle(title) {
  if (!title || typeof title !== 'string') return false;
  const cleaned = title.trim();
  return cleaned.length >= 3 && cleaned.length <= 100;
}

/**
 * Validate description
 */
export function isValidDescription(description) {
  if (!description || typeof description !== 'string') return false;
  const cleaned = description.trim();
  return cleaned.length >= 10 && cleaned.length <= 5000;
}

/**
 * Validate location
 */
export function isValidLocation(location) {
  if (!location || typeof location !== 'string') return false;
  const cleaned = location.trim();
  return cleaned.length >= 2 && cleaned.length <= 200;
}

/**
 * Validate URL (for photos, etc.)
 */
export function isValidUrl(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Validate image URL (must be from trusted sources)
 */
export function isValidImageUrl(url) {
  if (!isValidUrl(url)) return false;
  
  const trustedDomains = [
    'supabase.co',
    'supabase.com',
    'googleusercontent.com',
    'githubusercontent.com',
    'cloudinary.com',
    'imgix.net',
    'unsplash.com',
    'pexels.com',
  ];
  
  try {
    const parsed = new URL(url);
    return trustedDomains.some(domain => parsed.hostname.endsWith(domain));
  } catch {
    return false;
  }
}

/**
 * Rate limiter for client-side protection
 */
const rateLimitStore = new Map();

export function checkRateLimit(action, maxRequests = 10, windowMs = 60000) {
  const now = Date.now();
  const key = action;
  
  if (!rateLimitStore.has(key)) {
    rateLimitStore.set(key, { count: 1, windowStart: now });
    return true;
  }
  
  const limit = rateLimitStore.get(key);
  
  // Reset window if expired
  if (now - limit.windowStart > windowMs) {
    rateLimitStore.set(key, { count: 1, windowStart: now });
    return true;
  }
  
  // Check if over limit
  if (limit.count >= maxRequests) {
    return false;
  }
  
  // Increment count
  limit.count++;
  return true;
}

/**
 * Validate a complete listing object
 */
export function validateListing(listing) {
  const errors = [];
  
  if (!isValidTitle(listing.title)) {
    errors.push('Title must be 3-100 characters');
  }
  
  if (!isValidPrice(listing.price)) {
    errors.push('Price must be a valid number between R0 and R1,000,000');
  }
  
  if (!isValidLocation(listing.location)) {
    errors.push('Location must be 2-200 characters');
  }
  
  if (!isValidDescription(listing.description)) {
    errors.push('Description must be 10-5000 characters');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Sanitize a complete listing object
 */
export function sanitizeListing(listing) {
  return {
    ...listing,
    title: sanitizeText(listing.title || ''),
    description: sanitizeText(listing.description || ''),
    location: sanitizeText(listing.location || ''),
    streetAddress: sanitizeText(listing.streetAddress || ''),
    landlordName: sanitizeText(listing.landlordName || ''),
  };
}

/**
 * Sanitize a chat message
 */
export function sanitizeMessage(content) {
  return sanitizeText(content)
    .slice(0, 5000); // Max message length
}

/**
 * Check for suspicious patterns (potential spam/scam)
 */
export function detectSuspiciousContent(text) {
  if (!text) return { isSuspicious: false, reasons: [] };
  
  const reasons = [];
  const lowerText = text.toLowerCase();
  
  // Check for common scam patterns
  const scamPatterns = [
    /send.*money/i,
    /wire.*transfer/i,
    /western.*union/i,
    /moneygram/i,
    /pay.*upfront/i,
    /advance.*fee/i,
    /lottery.*winner/i,
    /nigerian.*prince/i,
    /urgent.*transfer/i,
    /click.*here.*now/i,
    /too.*good.*true/i,
  ];
  
  for (const pattern of scamPatterns) {
    if (pattern.test(text)) {
      reasons.push('Potential scam pattern detected');
      break;
    }
  }
  
  // Check for excessive caps (SHOUTING)
  const capsRatio = (text.match(/[A-Z]/g) || []).length / text.length;
  if (capsRatio > 0.5 && text.length > 20) {
    reasons.push('Excessive capitalization');
  }
  
  // Check for too many special characters
  const specialRatio = (text.match(/[!?$@#%^&*]/g) || []).length / text.length;
  if (specialRatio > 0.1 && text.length > 20) {
    reasons.push('Excessive special characters');
  }
  
  // Check for repeated characters
  if (/(.)\1{5,}/i.test(text)) {
    reasons.push('Suspicious repeated characters');
  }
  
  return {
    isSuspicious: reasons.length > 0,
    reasons,
  };
}

/**
 * Generate a secure report ID
 */
export function generateReportId() {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 8);
  return `RPT-${timestamp}-${randomPart}`.toUpperCase();
}

/**
 * Mask sensitive data for logging
 */
export function maskSensitiveData(data) {
  if (typeof data === 'string') {
    // Mask email
    if (data.includes('@')) {
      const [local, domain] = data.split('@');
      return `${local.substring(0, 2)}***@${domain}`;
    }
    // Mask phone
    if (/^\+?\d{10,}$/.test(data.replace(/\D/g, ''))) {
      return data.slice(0, 4) + '****' + data.slice(-2);
    }
  }
  return data;
}
