/**
 * Security utilities for RentMzansi
 * Provides XSS sanitization, input validation, and security helpers
 */

// ===========================
// XSS SANITIZATION
// ===========================

/**
 * Sanitize HTML to prevent XSS attacks
 * Removes all potentially dangerous HTML tags and attributes
 */
export function sanitizeHTML(dirty) {
  if (!dirty || typeof dirty !== 'string') return '';
  
  // Create a temporary element to parse the HTML
  const temp = document.createElement('div');
  temp.textContent = dirty; // This escapes all HTML
  return temp.innerHTML;
}

/**
 * Sanitize user-generated content for display
 * Allows safe formatting but removes scripts and dangerous elements
 */
export function sanitizeUserContent(content) {
  if (!content || typeof content !== 'string') return '';
  
  // Remove script tags and event handlers
  let safe = content
    // Remove script tags entirely
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove onclick, onerror, onload, etc.
    .replace(/\bon\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/\bon\w+\s*=\s*[^\s>]+/gi, '')
    // Remove javascript: URLs
    .replace(/javascript:/gi, '')
    // Remove data: URLs (can contain scripts)
    .replace(/data:/gi, 'data-blocked:')
    // Remove style expressions (IE)
    .replace(/expression\s*\(/gi, '')
    // Remove vbscript
    .replace(/vbscript:/gi, '');
  
  return safe;
}

/**
 * Escape HTML entities for safe display
 */
export function escapeHTML(str) {
  if (!str || typeof str !== 'string') return '';
  
  const escapeMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;'
  };
  
  return str.replace(/[&<>"'`=/]/g, char => escapeMap[char]);
}

// ===========================
// INPUT VALIDATION
// ===========================

/**
 * Validate email format
 */
export function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email.trim()) && email.length <= 254;
}

/**
 * Validate phone number format (South African)
 */
export function isValidPhone(phone) {
  if (!phone || typeof phone !== 'string') return false;
  // Remove formatting
  const cleaned = phone.replace(/[\s()-]/g, '');
  // South African format: 0XX XXX XXXX or +27XX XXX XXXX
  const saRegex = /^(\+27|0)[6-8][0-9]{8}$/;
  return saRegex.test(cleaned);
}

/**
 * Validate username/display name
 */
export function isValidDisplayName(name) {
  if (!name || typeof name !== 'string') return false;
  const trimmed = name.trim();
  // 2-50 characters, no special HTML characters
  if (trimmed.length < 2 || trimmed.length > 50) return false;
  // Only allow letters, numbers, spaces, and common punctuation
  const nameRegex = /^[a-zA-Z0-9\s\-'.]+$/;
  return nameRegex.test(trimmed);
}

/**
 * Sanitize and validate URL
 */
export function isValidURL(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    // Only allow http and https protocols
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

// ===========================
// FILE VALIDATION
// ===========================

/**
 * Validate file type by checking magic bytes (file signature)
 * More secure than just checking MIME type which can be spoofed
 */
export async function validateImageFile(file) {
  const ALLOWED_TYPES = {
    'image/jpeg': { magic: [0xFF, 0xD8, 0xFF], ext: ['jpg', 'jpeg'] },
    'image/png': { magic: [0x89, 0x50, 0x4E, 0x47], ext: ['png'] },
    'image/gif': { magic: [0x47, 0x49, 0x46, 0x38], ext: ['gif'] },
    'image/webp': { magic: [0x52, 0x49, 0x46, 0x46], ext: ['webp'] }, // RIFF header
  };

  // Check MIME type first
  const typeInfo = ALLOWED_TYPES[file.type];
  if (!typeInfo) {
    return { valid: false, error: 'Unsupported image format' };
  }

  // Check file extension
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (!typeInfo.ext.includes(ext)) {
    return { valid: false, error: 'File extension does not match content type' };
  }

  // Validate magic bytes
  try {
    const buffer = await file.slice(0, 8).arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const magicValid = typeInfo.magic.every((byte, i) => bytes[i] === byte);
    
    if (!magicValid) {
      return { valid: false, error: 'File content does not match declared type' };
    }
  } catch (error) {
    return { valid: false, error: 'Could not validate file' };
  }

  return { valid: true };
}

/**
 * Validate audio file (for voice messages)
 */
export async function validateAudioFile(file) {
  const ALLOWED_AUDIO = ['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg'];
  
  if (!ALLOWED_AUDIO.includes(file.type)) {
    return { valid: false, error: 'Unsupported audio format' };
  }

  // Check file size (max 10MB for audio)
  if (file.size > 10 * 1024 * 1024) {
    return { valid: false, error: 'Audio file too large (max 10MB)' };
  }

  return { valid: true };
}

// ===========================
// RATE LIMITING (Client-side)
// ===========================

const rateLimitMap = new Map();

/**
 * Simple client-side rate limiting
 * Returns true if action is allowed, false if rate limited
 */
export function checkRateLimit(action, maxAttempts = 5, windowMs = 60000) {
  const now = Date.now();
  const key = action;
  
  if (!rateLimitMap.has(key)) {
    rateLimitMap.set(key, { attempts: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxAttempts - 1 };
  }
  
  const limit = rateLimitMap.get(key);
  
  // Reset if window expired
  if (now > limit.resetAt) {
    rateLimitMap.set(key, { attempts: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxAttempts - 1 };
  }
  
  // Check if over limit
  if (limit.attempts >= maxAttempts) {
    const retryAfter = Math.ceil((limit.resetAt - now) / 1000);
    return { allowed: false, remaining: 0, retryAfter };
  }
  
  // Increment attempts
  limit.attempts++;
  return { allowed: true, remaining: maxAttempts - limit.attempts };
}

/**
 * Create a debounced function to prevent spam
 */
export function debounce(func, wait, options = {}) {
  let timeout;
  let lastArgs;
  let lastThis;
  let result;
  let lastCallTime;
  
  const leading = options.leading ?? false;
  const trailing = options.trailing ?? true;
  
  function invokeFunc(time) {
    const args = lastArgs;
    const thisArg = lastThis;
    lastArgs = lastThis = undefined;
    result = func.apply(thisArg, args);
    return result;
  }
  
  function debounced(...args) {
    const time = Date.now();
    const isInvoking = leading && !timeout;
    
    lastArgs = args;
    lastThis = this;
    lastCallTime = time;
    
    if (isInvoking) {
      timeout = setTimeout(() => {
        timeout = undefined;
        if (trailing && lastArgs) {
          invokeFunc(Date.now());
        }
      }, wait);
      return invokeFunc(time);
    }
    
    if (!timeout && trailing) {
      timeout = setTimeout(() => {
        timeout = undefined;
        if (trailing && lastArgs) {
          invokeFunc(Date.now());
        }
      }, wait);
    }
    
    return result;
  }
  
  debounced.cancel = function() {
    if (timeout) {
      clearTimeout(timeout);
      timeout = undefined;
    }
    lastArgs = lastThis = undefined;
  };
  
  return debounced;
}

// ===========================
// SECURE STORAGE
// ===========================

/**
 * Secure session storage (uses sessionStorage instead of localStorage)
 * Data is cleared when browser tab closes
 */
export const secureStorage = {
  set(key, value, expiresInMs = null) {
    try {
      const item = {
        value,
        timestamp: Date.now(),
        expires: expiresInMs ? Date.now() + expiresInMs : null
      };
      sessionStorage.setItem(key, JSON.stringify(item));
    } catch (e) {
      console.warn('SecureStorage set failed:', e.message);
    }
  },
  
  get(key) {
    try {
      const itemStr = sessionStorage.getItem(key);
      if (!itemStr) return null;
      
      const item = JSON.parse(itemStr);
      
      // Check if expired
      if (item.expires && Date.now() > item.expires) {
        sessionStorage.removeItem(key);
        return null;
      }
      
      return item.value;
    } catch (e) {
      return null;
    }
  },
  
  remove(key) {
    sessionStorage.removeItem(key);
  },
  
  clear() {
    sessionStorage.clear();
  }
};

// ===========================
// CONTENT SECURITY
// ===========================

/**
 * Check if content contains potential XSS patterns
 */
export function detectXSSPatterns(content) {
  if (!content || typeof content !== 'string') return false;
  
  const xssPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+=/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /<form/i,
    /expression\(/i,
    /vbscript:/i,
    /<svg.*onload/i,
    /<img.*onerror/i,
  ];
  
  return xssPatterns.some(pattern => pattern.test(content));
}

/**
 * Generate a secure random string for tokens/IDs
 */
export function generateSecureId(length = 32) {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// ===========================
// LOGGING (Safe for production)
// ===========================

const isDev = process.env.NODE_ENV === 'development';

export const safeLog = {
  debug(...args) {
    if (isDev) console.log('[DEBUG]', ...args);
  },
  
  info(...args) {
    if (isDev) console.log('[INFO]', ...args);
  },
  
  warn(...args) {
    console.warn('[WARN]', ...args);
  },
  
  error(message, error = null) {
    // In production, don't log sensitive error details
    if (isDev) {
      console.error('[ERROR]', message, error);
    } else {
      console.error('[ERROR]', message);
      // Optionally send to error tracking service
    }
  }
};
