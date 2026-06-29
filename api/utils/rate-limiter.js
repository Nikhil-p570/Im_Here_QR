// Simple, database-free in-memory rate limiter helper for Serverless / Local environments.
// Acts as a clean first line of defense against bot spams without breaking normal user experiences.

const tracker = {};

// Clean up expired entries periodically to prevent memory leaks
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const key in tracker) {
      if (tracker[key].resetTime < now) {
        delete tracker[key];
      }
    }
  }, 10 * 60 * 1000); // every 10 minutes
}

export function isRateLimited(ip, limit = 15, windowMs = 60 * 1000) {
  const now = Date.now();
  
  if (!tracker[ip]) {
    tracker[ip] = {
      count: 1,
      resetTime: now + windowMs
    };
    return false; // Not rate limited
  }
  
  const record = tracker[ip];
  
  // If window has passed, reset the counter
  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + windowMs;
    return false;
  }
  
  record.count++;
  return record.count > limit; // Returns true if the limit is exceeded
}
