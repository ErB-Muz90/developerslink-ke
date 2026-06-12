import rateLimit from "express-rate-limit";

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many login attempts. Please wait 15 minutes before trying again." },
  skipSuccessfulRequests: true,
});

export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many registration attempts from this IP. Please try again later." },
  skipSuccessfulRequests: true,
});

export const resendVerificationLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 3,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many resend requests. Please wait 10 minutes before trying again." },
  skipSuccessfulRequests: false,
});

export const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many password reset requests. Please wait 15 minutes before trying again." },
  skipSuccessfulRequests: false,
});
