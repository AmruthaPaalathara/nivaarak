const rateLimit = require("express-rate-limit");

//  Custom Rate Limiting for Login
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100000, // ⬅️ Reduce to 5 failed attempts for stronger security
    message: {
        success: false,
        error: "Too many login attempts. Try again in 15 minutes.",
    },
    standardHeaders: true, //  Return rate limit info in headers
    legacyHeaders: false, //  Disable `X-RateLimit-*` headers
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 50 requests per window
    message: {
      success: false,
      error: "Too many requests. Try again in 15 minutes.",
    },
    standardHeaders: true, // Return rate limit info in headers
    legacyHeaders: false, // Disable `X-RateLimit-*` headers
  });

  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: "Too many requests, please try again later.",
  });

const adminDashboardLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // ⬆️ Increase limit for dashboard requests
    message: "Too many requests for admin dashboard. Try again later.",
});

const refreshLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,  // 1 minute
    max: 1000,
    skipSuccessfulRequests: true
});


module.exports = { loginLimiter , authLimiter , limiter, adminDashboardLimiter, refreshLimiter };
