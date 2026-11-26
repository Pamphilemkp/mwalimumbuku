"use server";

import { redirect } from "next/navigation";
import { parseShortText } from "@/features/auth/register";
import { requireAccess } from "@/features/auth/require-access";
import { adminScope } from "@/lib/admin/scope";
import { APP_ROLES } from "@/lib/auth/access";
import { createClient } from "@/lib/supabase/server";

function isUuid(value: FormDataEntryValue | null): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

async function scopeFor(userId: string, role: string | null, schoolId: string, platformOnly: boolean) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("school_memberships")
    .select("school_id")
    .eq("user_id", userId)
    .eq("membership_role", "school_admin")
    .eq("status", "active");
  const administered = ((data ?? []) as { school_id: string }[]).map((row) => row.school_id);
  return adminScope({
    platformAdmin: role === "admin",
    administeredSchoolIds: administered,
    schoolId,
    platformOnly,
  });
}

async function accountForCode(code: string): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("find_account_for_admin", { _code: code });
  if (error || !Array.isArray(data) || data.length === 0) return null;
  const row = data[0] as { user_id?: string };
  return typeof row.user_id === "string" ? row.user_id : null;
}

export async function provisionTeacherAction(formData: FormData) {
  const session = await requireAccess(APP_ROLES);
  const schoolId = formData.get("schoolId");
  const code = parseShortText(formData.get("code"), 32);
  const role = session.resolution?.status === "ok" ? session.resolution.role : null;
  if (!session.userId || !isUuid(schoolId) || !code || (await scopeFor(session.userId, role, schoolId, false)) === "refused") {
    redirect("/dashboard/academic?error=1");
  }
  const userId = await accountForCode(code);
  const supabase = await createClient();
  const { error } = userId
    ? await supabase.rpc("provision_teacher", { target_user: userId, target_school: schoolId })
    : { error: { message: "missing" } };
  redirect(error ? "/dashboard/academic?error=1" : "/dashboard/academic?saved=1");
}

export async function addStudentMembershipAction(formData: FormData) {
  const session = await requireAccess(APP_ROLES);
  const schoolId = formData.get("schoolId");
  const code = parseShortText(formData.get("code"), 32);
  const role = session.resolution?.status === "ok" ? session.resolution.role : null;
  if (!session.userId || !isUuid(schoolId) || !code || (await scopeFor(session.userId, role, schoolId, false)) === "refused") {
    redirect("/dashboard/academic?error=1");
  }
  const userId = await accountForCode(code);
  if (!userId || userId === session.userId) redirect("/dashboard/academic?error=1");
  const supabase = await createClient();
  const { error } = await supabase.from("school_memberships").insert({
    school_id: schoolId,
    user_id: userId,
    membership_role: "student",
    status: "active",
    invited_by: session.userId,
    started_on: new Date().toISOString().slice(0, 10),
  });
  redirect(error ? "/dashboard/academic?error=1" : "/dashboard/academic?saved=1");
}

export async function suspendMembershipAction(formData: FormData) {
  const session = await requireAccess(APP_ROLES);
  const schoolId = formData.get("schoolId");
  const membershipId = formData.get("membershipId");
  const role = session.resolution?.status === "ok" ? session.resolution.role : null;
  if (!session.userId || !isUuid(schoolId) || !isUuid(membershipId) || (await scopeFor(session.userId, role, schoolId, false)) === "refused") {
    redirect("/dashboard/academic?error=1");
  }
  const supabase = await createClient();
  const { data } = await supabase
    .from("school_memberships")
    .select("user_id, school_id")
    .eq("id", membershipId)
    .maybeSingle();
  const row = data as { user_id?: string; school_id?: string } | null;
  if (!row || row.school_id !== schoolId || row.user_id === session.userId) redirect("/dashboard/academic?error=1");
  const { error } = await supabase
    .from("school_memberships")
    .update({ status: "suspended" })
    .eq("id", membershipId)
    .eq("school_id", schoolId);
  redirect(error ? "/dashboard/academic?error=1" : "/dashboard/academic?saved=1");
}

export async function setCoursePublishedAction(formData: FormData) {
  const session = await requireAccess(APP_ROLES);
  const schoolId = formData.get("schoolId");
  const courseId = formData.get("courseId");
  const published = formData.get("published") === "1";
  const role = session.resolution?.status === "ok" ? session.resolution.role : null;
  if (!session.userId || !isUuid(schoolId) || !isUuid(courseId) || (await scopeFor(session.userId, role, schoolId, false)) === "refused") {
    redirect("/dashboard/academic?error=1");
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("courses")
    .update({ is_published: published })
    .eq("id", courseId)
    .eq("school_id", schoolId)
    .select("id");
  redirect(error || !data || data.length === 0 ? "/dashboard/academic?error=1" : "/dashboard/academic?saved=1");
}

export async function setSchoolStatusAction(formData: FormData) {
  const session = await requireAccess(APP_ROLES);
  const schoolId = formData.get("schoolId");
  const status = formData.get("status");
  const role = session.resolution?.status === "ok" ? session.resolution.role : null;
  if (!session.userId || !isUuid(schoolId) || (status !== "active" && status !== "suspended")) {
    redirect("/dashboard/academic?error=1");
  }
  if ((await scopeFor(session.userId, role, schoolId, false)) === "refused") redirect("/dashboard/academic?error=1");
  const supabase = await createClient();
  const { error } = await supabase.from("schools").update({ status }).eq("id", schoolId);
  redirect(error ? "/dashboard/academic?error=1" : "/dashboard/academic?saved=1");
}

export async function notifySchoolAction(formData: FormData) {
  const session = await requireAccess(APP_ROLES);
  const schoolId = formData.get("schoolId");
  const title = parseShortText(formData.get("title"), 120);
  const message = parseShortText(formData.get("message"), 500);
  const role = session.resolution?.status === "ok" ? session.resolution.role : null;
  if (!session.userId || !isUuid(schoolId) || !title || !message || (await scopeFor(session.userId, role, schoolId, false)) === "refused") {
    redirect("/dashboard/academic?error=1");
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_notify_school", {
    target_school: schoolId,
    title,
    message,
  });
  redirect(error ? "/dashboard/academic?error=1" : "/dashboard/academic?saved=1");
}
