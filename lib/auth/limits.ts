const FIFTEEN_MINUTES = 15 * 60 * 1000;

export const AUTH_LIMITS = {
  signIn: { limit: 8, windowMs: FIFTEEN_MINUTES },
  register: { limit: 5, windowMs: FIFTEEN_MINUTES },
  contact: { limit: 5, windowMs: FIFTEEN_MINUTES },
  recover: { limit: 5, windowMs: FIFTEEN_MINUTES },
  updatePassword: { limit: 5, windowMs: FIFTEEN_MINUTES },
  callback: { limit: 10, windowMs: FIFTEEN_MINUTES },
} as const;
