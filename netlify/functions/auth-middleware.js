/**
 * Auth middleware pro Netlify Functions
 * Ověřuje JWT token z Supabase Auth
 */

// Import pro ověření JWT
const fetch = (() => {
  try {
    return require('node-fetch');
  } catch (e) {
    return globalThis.fetch;
  }
})();

/**
 * Ověření JWT tokenu ze Supabase
 * @param {string} token - JWT token z Authorization header
 * @returns {Promise<{valid: boolean, user?: object, error?: string}>}
 */
async function verifySupabaseToken(token) {
  try {
    if (!token) {
      return { valid: false, error: 'Missing token' };
    }

    // Odstranění 'Bearer ' prefixu pokud existuje
    const cleanToken = token.replace(/^Bearer\s+/i, '');

    // Ověření tokenu pomocí Supabase API
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing Supabase configuration');
      return { valid: false, error: 'Server configuration error' };
    }

    // Volání Supabase API pro ověření uživatele
    const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${cleanToken}`,
        'apikey': supabaseAnonKey
      }
    });

    if (!response.ok) {
      return { valid: false, error: 'Invalid or expired token' };
    }

    const user = await response.json();

    return {
      valid: true,
      user: user
    };

  } catch (error) {
    console.error('Error verifying token:', error);
    return { valid: false, error: 'Token verification failed' };
  }
}

/**
 * Middleware pro kontrolu autentizace
 * Použití: const auth = await requireAuth(event);
 */
async function requireAuth(event) {
  // Získání Authorization header
  const authHeader = event.headers['authorization'] || event.headers['Authorization'];

  if (!authHeader) {
    return {
      authenticated: false,
      error: {
        statusCode: 401,
        body: JSON.stringify({ error: 'Missing authorization header' })
      }
    };
  }

  // Ověření tokenu
  const verification = await verifySupabaseToken(authHeader);

  if (!verification.valid) {
    return {
      authenticated: false,
      error: {
        statusCode: 401,
        body: JSON.stringify({ error: verification.error || 'Unauthorized' })
      }
    };
  }

  return {
    authenticated: true,
    user: verification.user
  };
}

/**
 * Simple in-memory rate limiter
 * Pro produkci by měl být nahrazen Redis nebo podobným řešením
 */
const rateLimitStore = new Map();

/**
 * Rate limiting middleware
 * @param {string} identifier - Identifikátor (IP, email, atd.)
 * @param {number} maxRequests - Maximum požadavků
 * @param {number} windowMs - Časové okno v milisekundách
 */
function checkRateLimit(identifier, maxRequests = 10, windowMs = 60000) {
  const now = Date.now();
  const key = `ratelimit:${identifier}`;

  // Získání nebo vytvoření záznamu
  let record = rateLimitStore.get(key);

  if (!record) {
    record = {
      count: 1,
      resetTime: now + windowMs
    };
    rateLimitStore.set(key, record);
    return { allowed: true, remaining: maxRequests - 1 };
  }

  // Reset pokud uplynulo časové okno
  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + windowMs;
    rateLimitStore.set(key, record);
    return { allowed: true, remaining: maxRequests - 1 };
  }

  // Kontrola limitu
  if (record.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: record.resetTime
    };
  }

  // Inkrementace počítadla
  record.count++;
  rateLimitStore.set(key, record);

  return {
    allowed: true,
    remaining: maxRequests - record.count
  };
}

/**
 * Cleanup staré záznamy z rate limit store (spouštět periodicky)
 */
function cleanupRateLimitStore() {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

// Cleanup každých 5 minut
setInterval(cleanupRateLimitStore, 5 * 60 * 1000);

module.exports = {
  verifySupabaseToken,
  requireAuth,
  checkRateLimit
};
