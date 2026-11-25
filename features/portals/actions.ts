"use server";

import { headers } from "next/headers";
import { clientAddress } from "@/lib/auth/client-address";
import { AUTH_LIMITS } from "@/lib/auth/limits";
import { authRateLimiter } from "@/lib/auth/limiter";
import { isAttendanceStatus, isUuid, parseBody, parseHttpUrl } from "@/lib/portals/access";
import { missingSchema } from "@/lib/portals/schema";
import { nicosiaLocalToIso } from "@/lib/portals/time";
import { createClient } from "@/lib/supabase/server";
import { loadAppSession } from "@/services/auth/session";

type Result = { ok: true; message: string; id?: string } | { ok: false; message: string };

const SAVED = "Enregistré.";
const LIMITED = "Trop d'envois. Réessayez dans quelques minutes.";
const INVALID = "Vérifiez les champs et réessayez.";
const UNAVAILABLE = "L'enregistrement est indisponible pour le moment. Réessayez.";
const DENIED = "Cette action reste réservée à votre rôle.";

async function gate(kind: keyof typeof AUTH_LIMITS) {
  const session = await loadAppSession();
  const headerList = await headers();
  const address = clientAddress(headerList.get("x-forwarded-for"));
  const userId = session.userId;
  const role = session.resolution?.status === "ok" ? session.resolution.role : null;
  if (!userId || !role) return { session, role, userId: null as string | null, allowed: false };
  const rule = AUTH_LIMITS[kind];
  const allowed = authRateLimiter(`${kind}:${userId}:${address}`, rule.limit, rule.windowMs).allowed;
  return { session, role, userId, allowed };
}

async function callerSchoolId(userId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("school_memberships")
    .select("school_id")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("school_id")
    .limit(1);
  if (error || !data?.length) return null;
  const schoolId = data[0]?.school_id;
  return typeof schoolId === "string" ? schoolId : null;
}

export async function sendMessageAction(receiverId: string, content: string): Promise<Result> {
  const { userId, allowed } = await gate("message");
  if (!userId) return { ok: false, message: DENIED };
  if (!allowed) return { ok: false, message: LIMITED };
  const body = parseBody(content, 2000);
  if (!isUuid(receiverId) || receiverId === userId || !body) return { ok: false, message: INVALID };
  const supabase = await createClient();
  const { error } = await supabase.from("messages").insert({
    sender_id: userId,
    receiver_id: receiverId,
    content: body,
  });
  if (error) {
    if (/shared school/i.test(error.message)) {
      return { ok: false, message: "Choisissez un destinataire de votre école." };
    }
    return { ok: false, message: UNAVAILABLE };
  }
  return { ok: true, message: SAVED };
}

export async function createForumPostAction(input: { title: string; content: string; category: string }): Promise<Result> {
  const { userId, role, allowed } = await gate("forum");
  if (!userId || !role) return { ok: false, message: DENIED };
  if (!allowed) return { ok: false, message: LIMITED };
  const title = parseBody(input?.title, 120);
  const content = parseBody(input?.content, 4000);
  const category = parseBody(input?.category, 40);
  if (!title || !content || !category) return { ok: false, message: INVALID };
  const schoolId = role === "admin" ? null : await callerSchoolId(userId);
  const supabase = await createClient();
  const payload = { user_id: userId, title, content, category, school_id: schoolId };
  let { error } = await supabase.from("forum_posts").insert(payload);
  if (error && missingSchema(error)) {
    const retry = await supabase.from("forum_posts").insert({ user_id: userId, title, content, category });
    error = retry.error;
  }
  if (error) return { ok: false, message: UNAVAILABLE };
  return { ok: true, message: "Sujet publié." };
}

export async function createForumReplyAction(postId: string, content: string): Promise<Result> {
  const { userId, allowed } = await gate("forum");
  if (!userId) return { ok: false, message: DENIED };
  if (!allowed) return { ok: false, message: LIMITED };
  const body = parseBody(content, 4000);
  if (!isUuid(postId) || !body) return { ok: false, message: INVALID };
  const supabase = await createClient();
  const { error } = await supabase.from("forum_replies").insert({
    post_id: postId,
    user_id: userId,
    content: body,
  });
  if (error) return { ok: false, message: UNAVAILABLE };
  return { ok: true, message: "Réponse publiée." };
}

export async function createSupportTicketAction(input: {
  subject: string;
  category: string;
  priority: string;
  message: string;
}): Promise<Result> {
  const { userId, allowed } = await gate("support");
  if (!userId) return { ok: false, message: DENIED };
  if (!allowed) return { ok: false, message: LIMITED };
  const subject = parseBody(input?.subject, 120);
  const message = parseBody(input?.message, 4000);
  const category = parseBody(input?.category, 40);
  const priority = parseBody(input?.priority, 20);
  if (!subject || !message || !category || !priority) return { ok: false, message: INVALID };
  const schoolId = await callerSchoolId(userId);
  const supabase = await createClient();
  let created = await supabase
    .from("support_tickets")
    .insert({ user_id: userId, subject, category, priority, school_id: schoolId })
    .select("id")
    .single();
  if (created.error && missingSchema(created.error) && !schoolId) {
    created = await supabase.from("support_tickets").insert({ user_id: userId, subject, category, priority }).select("id").single();
  }
  const data = created.data;
  const error = created.error;
  if (error || !data?.id) return { ok: false, message: UNAVAILABLE };
  const messageInsert = await supabase.from("support_messages").insert({
    ticket_id: data.id,
    sender_id: userId,
    body: message,
  });
  if (messageInsert.error) return { ok: false, message: UNAVAILABLE };
  return { ok: true, message: "Demande envoyée.", id: data.id };
}

export async function sendSupportMessageAction(ticketId: string, body: string): Promise<Result> {
  const { userId, allowed } = await gate("support");
  if (!userId) return { ok: false, message: DENIED };
  if (!allowed) return { ok: false, message: LIMITED };
  const message = parseBody(body, 4000);
  if (!isUuid(ticketId) || !message) return { ok: false, message: INVALID };
  const supabase = await createClient();
  const { error } = await supabase.from("support_messages").insert({
    ticket_id: ticketId,
    sender_id: userId,
    body: message,
  });
  if (error) return { ok: false, message: UNAVAILABLE };
  return { ok: true, message: SAVED };
}

export async function recordAttendanceAction(input: {
  classId: string;
  membershipId: string;
  sessionDate: string;
  status: string;
  notes?: string;
}): Promise<Result> {
  const { userId, role, allowed } = await gate("attendance");
  if (!userId || role !== "teacher") return { ok: false, message: DENIED };
  if (!allowed) return { ok: false, message: LIMITED };
  if (!isUuid(input?.classId) || !isUuid(input?.membershipId) || !/^\d{4}-\d{2}-\d{2}$/.test(input?.sessionDate ?? "")) {
    return { ok: false, message: INVALID };
  }
  if (!isAttendanceStatus(input.status)) return { ok: false, message: INVALID };
  const notes = input.notes ? parseBody(input.notes, 500) : null;
  if (input.notes && !notes) return { ok: false, message: INVALID };

  const supabase = await createClient();
  const klass = await supabase.from("classes").select("id, school_id").eq("id", input.classId).maybeSingle();
  const marker = await supabase
    .from("school_memberships")
    .select("id")
    .eq("user_id", userId)
    .eq("school_id", klass.data?.school_id ?? "")
    .eq("membership_role", "teacher")
    .eq("status", "active")
    .maybeSingle();
  const enrollment = await supabase
    .from("student_enrollments")
    .select("membership_id")
    .eq("class_id", input.classId)
    .eq("membership_id", input.membershipId)
    .eq("status", "active")
    .maybeSingle();
  if (klass.error || marker.error || enrollment.error) return { ok: false, message: UNAVAILABLE };
  if (!klass.data?.school_id || !marker.data?.id || !enrollment.data) return { ok: false, message: DENIED };

  const existing = await supabase
    .from("class_attendance")
    .select("id, status")
    .eq("class_id", input.classId)
    .eq("membership_id", input.membershipId)
    .eq("session_date", input.sessionDate)
    .maybeSingle();
  if (existing.error) return { ok: false, message: UNAVAILABLE };

  if (existing.data?.id) {
    const updated = await supabase
      .from("class_attendance")
      .update({ status: input.status, notes, marked_by: marker.data.id })
      .eq("id", existing.data.id);
    if (updated.error) return { ok: false, message: UNAVAILABLE };
    return {
      ok: true,
      message: `Présence du ${input.sessionDate} mise à jour. L'historique conserve le statut précédent (${existing.data.status}).`,
    };
  }

  const inserted = await supabase.from("class_attendance").insert({
    school_id: klass.data.school_id,
    class_id: input.classId,
    membership_id: input.membershipId,
    session_date: input.sessionDate,
    status: input.status,
    marked_by: marker.data.id,
    notes,
  });
  if (inserted.error) {
    if (inserted.error.code === "23505") {
      return { ok: false, message: "Une présence existe déjà pour cet élève à cette date. Rouvrez la page et mettez le statut à jour." };
    }
    return { ok: false, message: UNAVAILABLE };
  }
  return { ok: true, message: `Présence enregistrée pour le ${input.sessionDate}.` };
}

export async function scheduleLiveSessionAction(input: {
  courseId: string;
  classId?: string;
  title: string;
  description?: string;
  instructions?: string;
  link?: string;
  startsAt: string;
  endsAt?: string;
  status?: string;
}): Promise<Result> {
  const { userId, role, allowed } = await gate("session");
  if (!userId || role !== "teacher") return { ok: false, message: DENIED };
  if (!allowed) return { ok: false, message: LIMITED };
  const title = parseBody(input?.title, 120);
  const description = input?.description ? parseBody(input.description, 2000) : null;
  const instructions = input?.instructions ? parseBody(input.instructions, 1000) : null;
  const startsAt = nicosiaLocalToIso(input?.startsAt ?? "");
  const endsAt = input?.endsAt ? nicosiaLocalToIso(input.endsAt) : null;
  const status = input?.status && ["scheduled", "live", "ended", "cancelled"].includes(input.status) ? input.status : "scheduled";
  const link = input?.link ? parseHttpUrl(input.link) : null;
  if (!isUuid(input?.courseId) || !title || !startsAt || (input?.description && !description) || (input?.instructions && !instructions)) {
    return { ok: false, message: INVALID };
  }
  if (input?.link && !link) return { ok: false, message: "Le lien doit commencer par http:// ou https://." };
  if (input?.classId && !isUuid(input.classId)) return { ok: false, message: INVALID };
  if (endsAt && new Date(endsAt).getTime() < new Date(startsAt).getTime()) return { ok: false, message: INVALID };
  const duration = endsAt
    ? Math.round((new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 60000)
    : 60;
  if (duration < 5 || duration > 480) return { ok: false, message: INVALID };

  const supabase = await createClient();
  const course = await supabase.from("courses").select("id, school_id").eq("id", input.courseId).eq("teacher_id", userId).maybeSingle();
  if (course.error) return { ok: false, message: UNAVAILABLE };
  if (!course.data) return { ok: false, message: DENIED };
  if (input.classId) {
    const assigned = await supabase.from("classes").select("id, school_id").eq("id", input.classId).maybeSingle();
    if (assigned.error) return { ok: false, message: UNAVAILABLE };
    if (!assigned.data) return { ok: false, message: DENIED };
    if (course.data.school_id && assigned.data.school_id !== course.data.school_id) return { ok: false, message: DENIED };
  }

  const inserted = await supabase.from("live_sessions").insert({
    course_id: input.courseId,
    class_id: input.classId || null,
    teacher_id: userId,
    title,
    description: instructions || description,
    access_instructions: instructions,
    meeting_url: link,
    scheduled_at: startsAt,
    ends_at: endsAt,
    duration_minutes: duration,
    status,
  });
  if (inserted.error && missingSchema(inserted.error)) {
    const retry = await supabase.from("live_sessions").insert({
      course_id: input.courseId,
      teacher_id: userId,
      title,
      description: instructions || description,
      meeting_url: link,
      scheduled_at: startsAt,
      duration_minutes: duration,
      status,
    });
    if (retry.error) return { ok: false, message: UNAVAILABLE };
  } else if (inserted.error) {
    return { ok: false, message: UNAVAILABLE };
  }
  return { ok: true, message: "Session enregistrée. Les élèves voient les instructions que vous avez écrites." };
}

export async function updateLiveSessionStatusAction(sessionId: string, status: string): Promise<Result> {
  const { userId, role, allowed } = await gate("session");
  if (!userId || role !== "teacher") return { ok: false, message: DENIED };
  if (!allowed) return { ok: false, message: LIMITED };
  if (!isUuid(sessionId) || !["scheduled", "live", "ended", "cancelled"].includes(status)) return { ok: false, message: INVALID };
  const supabase = await createClient();
  const { error } = await supabase.from("live_sessions").update({ status }).eq("id", sessionId).eq("teacher_id", userId);
  if (error) return { ok: false, message: UNAVAILABLE };
  return { ok: true, message: "Statut mis à jour." };
}

export async function publishAnnouncementAction(input: { title: string; message: string; audience: string }): Promise<Result> {
  const { userId, role, allowed } = await gate("announcement");
  if (!userId || role !== "admin") return { ok: false, message: DENIED };
  if (!allowed) return { ok: false, message: LIMITED };
  const title = parseBody(input?.title, 120);
  const message = parseBody(input?.message, 500);
  if (!title || !message || !["all", "student", "parent", "teacher"].includes(input?.audience)) {
    return { ok: false, message: INVALID };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("publish_announcement", {
    _title: title,
    _message: message,
    _audience: input.audience,
  });
  if (error) return { ok: false, message: UNAVAILABLE };
  return { ok: true, message: `Annonce envoyée (${Number(data ?? 0)} comptes).` };
}
