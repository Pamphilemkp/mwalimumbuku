import { createRateLimiter } from "@/lib/auth/rate-limit";

export const authRateLimiter = createRateLimiter();
