import rateLimit from 'express-rate-limit';

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    status: 'error',
    message: 'Too many requests from this IP, please try again after 15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Stricter rate limiter for auth routes
export const authLimiter = rateLimit({
  windowMs: 10 * 1000, // 1 hour
  max: 10, // Limit each IP to 5 login/register attempts per hour
  message: {
    status: 'error',
    message: 'Too many login attempts from this IP, please try again after an hour'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiter for OTP verification
export const otpLimiter = rateLimit({
  windowMs: 10 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 OTP requests per hour
  message: {
    status: 'error',
    message: 'Too many OTP requests from this IP, please try again after an hour'
  },
  standardHeaders: true,
  legacyHeaders: false
});
