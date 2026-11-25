import { AUTH_LIMITS } from "../../lib/auth/limits.ts";
import type { RateLimiter } from "../../lib/auth/rate-limit.ts";
import { parseEmail } from "../../lib/auth/validation.ts";
import { parsePersonName, parseShortText } from "../auth/register.ts";

const TOPICS = ["student", "parent", "school", "other"] as const;
export type ContactTopic = (typeof TOPICS)[number];

export type ContactResult =
  | { status: "saved"; message: string }
  | { status: "failed"; message: string };

const SAVED = "The message is saved. Only a platform administrator can read it.";
const INVALID = "Check the name, email, and message.";
const LIMITED = "Too many attempts. Wait a few minutes and try again.";
const UNAVAILABLE = "The form is unavailable right now. Try again in a few minutes.";

export function parseContactTopic(value: unknown): ContactTopic | null {
  if (typeof value !== "string") return null;
  return TOPICS.includes(value as ContactTopic) ? (value as ContactTopic) : null;
}

export async function runContact(
  deps: {
    consume: RateLimiter;
    save: (input: { name: string; email: string; topic: ContactTopic; message: string }) => Promise<{ error: boolean }>;
  },
  input: { name: unknown; email: unknown; topic: unknown; message: unknown; address: string },
): Promise<ContactResult> {
  const name = parsePersonName(input.name);
  const email = parseEmail(input.email);
  const topic = parseContactTopic(input.topic);
  const message = parseShortText(input.message, 2000);
  if (!name || !email || !topic || !message || message.length < 10) return { status: "failed", message: INVALID };

  const decision = deps.consume(`contact:${input.address}`, AUTH_LIMITS.contact.limit, AUTH_LIMITS.contact.windowMs);
  if (!decision.allowed) return { status: "failed", message: LIMITED };

  try {
    const saved = await deps.save({ name, email, topic, message });
    if (saved.error) return { status: "failed", message: UNAVAILABLE };
  } catch {
    return { status: "failed", message: UNAVAILABLE };
  }
  return { status: "saved", message: SAVED };
}
