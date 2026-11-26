"use server";

import { headers } from "next/headers";
import { clientAddress } from "@/lib/auth/client-address";
import { AUTH_LIMITS } from "@/lib/auth/limits";
import { authRateLimiter } from "@/lib/auth/limiter";
import { isUuid } from "@/lib/portals/access";
import { missingSchema } from "@/lib/portals/schema";
import { createClient } from "@/lib/supabase/server";
import { loadAppSession } from "@/services/auth/session";

type StartOk = {
  ok: true;
  attemptId: string;
  startedAt: string;
  serverNow: string;
  round: unknown;
};

type SubmitOk = {
  ok: true;
  replayed: boolean;
  score: number;
  xpGranted: number;
  level: number;
  streak: number;
  stats: Record<string, number>;
};

type Fail = { ok: false; message: string };

const DENIED = "Connectez-vous pour jouer.";
const LIMITED = "Trop de parties. Réessayez dans quelques minutes.";
const INVALID = "Cette partie n'a pas pu être lancée.";
const UNAVAILABLE = "Les jeux vérifiés sont indisponibles pour le moment.";

function failMessage(error: { message?: string } | null): string {
  const message = error?.message ?? "";
  if (missingSchema(error)) return UNAVAILABLE;
  if (/not found/i.test(message)) return "Cette partie n'est plus disponible.";
  if (/replay/i.test(message)) return "Cette partie est déjà enregistrée.";
  if (/not allowed|Not authenticated/i.test(message)) return DENIED;
  return UNAVAILABLE;
}

async function callerId(): Promise<{ userId: string; allowed: boolean } | null> {
  const session = await loadAppSession();
  if (!session.userId || session.resolution?.status !== "ok") return null;
  const headerList = await headers();
  const address = clientAddress(headerList.get("x-forwarded-for"));
  const rule = AUTH_LIMITS.game;
  const allowed = authRateLimiter(`game:${session.userId}:${address}`, rule.limit, rule.windowMs).allowed;
  return { userId: session.userId, allowed };
}

export async function startGameAction(game: string, difficulty: string): Promise<StartOk | Fail> {
  const caller = await callerId();
  if (!caller) return { ok: false, message: DENIED };
  if (!caller.allowed) return { ok: false, message: LIMITED };
  if (!["memory", "words", "math", "alphabet", "colors", "typing"].includes(game)) return { ok: false, message: INVALID };
  if (!["easy", "medium", "hard"].includes(difficulty)) return { ok: false, message: INVALID };
  let data: unknown;
  let error: { message?: string } | null = null;
  try {
    const supabase = await createClient();
    const response = await supabase.rpc("open_game_attempt", { _game: game, _difficulty: difficulty });
    data = response.data;
    error = response.error;
  } catch {
    return { ok: false, message: UNAVAILABLE };
  }
  if (error || !data || typeof data !== "object") return { ok: false, message: failMessage(error) };
  const row = data as { attemptId?: unknown; startedAt?: unknown; serverNow?: unknown; round?: unknown };
  if (typeof row.attemptId !== "string" || typeof row.startedAt !== "string" || typeof row.serverNow !== "string") {
    return { ok: false, message: INVALID };
  }
  return { ok: true, attemptId: row.attemptId, startedAt: row.startedAt, serverNow: row.serverNow, round: row.round };
}

export async function submitGameAction(input: {
  attemptId: string;
  idempotencyKey: string;
  events: unknown;
}): Promise<SubmitOk | Fail> {
  const caller = await callerId();
  if (!caller) return { ok: false, message: DENIED };
  if (!caller.allowed) return { ok: false, message: LIMITED };
  if (!isUuid(input?.attemptId) || !isUuid(input?.idempotencyKey) || !input.events || typeof input.events !== "object") {
    return { ok: false, message: INVALID };
  }
  let data: unknown;
  let error: { message?: string } | null = null;
  try {
    const supabase = await createClient();
    const response = await supabase.rpc("submit_game_attempt", {
      _attempt_id: input.attemptId,
      _idempotency_key: input.idempotencyKey,
      _events: input.events,
    });
    data = response.data;
    error = response.error;
  } catch {
    return { ok: false, message: UNAVAILABLE };
  }
  if (error || !data || typeof data !== "object") return { ok: false, message: failMessage(error) };
  const row = data as {
    ok?: boolean;
    reason?: string;
    replayed?: boolean;
    score?: number;
    xpGranted?: number;
    level?: number;
    streak?: number;
    stats?: Record<string, number>;
  };
  if (row.ok !== true) return { ok: false, message: failMessage({ message: row.reason ?? "" }) };
  return {
    ok: true,
    replayed: Boolean(row.replayed),
    score: Number(row.score ?? 0),
    xpGranted: Number(row.xpGranted ?? 0),
    level: Number(row.level ?? 1),
    streak: Number(row.streak ?? 0),
    stats: row.stats ?? {},
  };
}

export async function reverseRewardAction(entryId: string, reason: string): Promise<{ ok: true } | Fail> {
  const caller = await callerId();
  if (!caller) return { ok: false, message: DENIED };
  if (!caller.allowed) return { ok: false, message: LIMITED };
  const text = reason.trim();
  if (!isUuid(entryId) || text.length < 3 || text.length > 200) return { ok: false, message: INVALID };
  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc("reverse_reward_entry", { _entry_id: entryId, _reason: text });
    if (error) return { ok: false, message: failMessage(error) };
  } catch {
    return { ok: false, message: UNAVAILABLE };
  }
  return { ok: true };
}
