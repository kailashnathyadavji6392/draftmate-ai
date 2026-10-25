// server/middleware/rateLimiter.js
// In-memory sliding-window rate limiter for sensitive authentication endpoints

const buckets = new Map();

// Periodic cleanup of stale rate-limit buckets every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of buckets.entries()) {
    if (now > record.resetTime) {
      buckets.delete(key);
    }
  }
}, 10 * 60 * 1000);

/**
 * Creates a rate limiter middleware
 * @param {Object} options
 * @param {number} options.windowMs Window size in milliseconds (e.g. 15 * 60 * 1000 = 15m)
 * @param {number} options.max Maximum requests within window
 * @param {string} options.message Error message returned when limit exceeded
 */
export function createRateLimiter({ windowMs = 15 * 60 * 1000, max = 20, message = 'Too many requests. Please try again later.' } = {}) {
  return (req, res, next) => {
    // Determine client identifier (IP address, handling reverse proxy headers)
    const ip = req.headers['x-forwarded-for'] 
      ? req.headers['x-forwarded-for'].split(',')[0].trim() 
      : (req.socket?.remoteAddress || '127.0.0.1');

    const key = `${req.path}:${ip}`;
    const now = Date.now();

    let record = buckets.get(key);
    if (!record || now > record.resetTime) {
      record = {
        count: 1,
        resetTime: now + windowMs
      };
      buckets.set(key, record);
      return next();
    }

    record.count++;
    if (record.count > max) {
      const retryAfterSec = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfterSec);
      return res.status(429).json({
        success: false,
        code: 'RATE_LIMIT_EXCEEDED',
        error: message,
        retryAfterSeconds: retryAfterSec
      });
    }

    next();
  };
}

// Pre-configured rate limiters
export const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 attempts per 15 min per IP
  message: 'Too many authentication attempts from this IP address. Please wait 15 minutes before retrying.'
});

export const passwordResetLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many password reset requests. Please wait 15 minutes before requesting again.'
});
