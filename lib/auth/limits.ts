const FIFTEEN_MINUTES = 15 * 60 * 1000;

export const AUTH_LIMITS = {
  signIn: { limit: 8, windowMs: FIFTEEN_MINUTES },
  register: { limit: 5, windowMs: FIFTEEN_MINUTES },
  contact: { limit: 5, windowMs: FIFTEEN_MINUTES },
  recover: { limit: 5, windowMs: FIFTEEN_MINUTES },
  updatePassword: { limit: 5, windowMs: FIFTEEN_MINUTES },
  callback: { limit: 10, windowMs: FIFTEEN_MINUTES },
  message: { limit: 30, windowMs: FIFTEEN_MINUTES },
  forum: { limit: 12, windowMs: FIFTEEN_MINUTES },
  support: { limit: 8, windowMs: FIFTEEN_MINUTES },
  attendance: { limit: 40, windowMs: FIFTEEN_MINUTES },
  session: { limit: 12, windowMs: FIFTEEN_MINUTES },
  announcement: { limit: 5, windowMs: FIFTEEN_MINUTES },
  game: { limit: 40, windowMs: FIFTEEN_MINUTES },
} as const;
