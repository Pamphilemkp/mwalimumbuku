"use server";

import { redirect } from "next/navigation";
import { parsePersonName, parseShortText } from "@/features/auth/register";
import { requireAccess } from "@/features/auth/require-access";
import { APP_ROLES } from "@/lib/auth/access";
import { createClient } from "@/lib/supabase/server";

function isUuid(value: FormDataEntryValue | null): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function isDate(value: FormDataEntryValue | null): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function slugFrom(name: string, userId: string): string {
  const base = name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `${base || "ecole"}-${userId.slice(0, 8)}`;
}

async function ownsSchool(userId: string, schoolId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("school_memberships")
    .select("id")
    .eq("user_id", userId)
    .eq("school_id", schoolId)
    .eq("membership_role", "school_admin")
    .eq("status", "active")
    .maybeSingle();
  return Boolean(data);
}

export async function createSchoolAction(formData: FormData) {
  const session = await requireAccess(["admin"]);
  const name = parsePersonName(formData.get("name"));
  if (!name || !session.userId) redirect("/dashboard/academic?error=1");
  const supabase = await createClient();
  const { error } = await supabase.from("schools").insert({
    name,
    slug: slugFrom(name, session.userId),
    created_by: session.userId,
  });
  redirect(error ? "/dashboard/academic?error=1" : "/dashboard/academic?saved=1");
}

export async function createYearAction(formData: FormData) {
  const session = await requireAccess(APP_ROLES);
  const schoolId = formData.get("schoolId");
  const name = parseShortText(formData.get("name"), 40);
  const starts = formData.get("starts");
  const ends = formData.get("ends");
  if (!session.userId || !isUuid(schoolId) || !name || !isDate(starts) || !isDate(ends) || !(await ownsSchool(session.userId, schoolId))) {
    redirect("/dashboard/academic?error=1");
  }
  const supabase = await createClient();
  const { error } = await supabase.from("academic_years").insert({
    school_id: schoolId,
    name,
    starts_on: starts,
    ends_on: ends,
    status: "planned",
  });
  redirect(error ? "/dashboard/academic?error=1" : "/dashboard/academic?saved=1");
}

export async function createGradeAction(formData: FormData) {
  const session = await requireAccess(APP_ROLES);
  const schoolId = formData.get("schoolId");
  const name = parseShortText(formData.get("name"), 40);
  if (!session.userId || !isUuid(schoolId) || !name || !(await ownsSchool(session.userId, schoolId))) {
    redirect("/dashboard/academic?error=1");
  }
  const supabase = await createClient();
  const { error } = await supabase.from("grade_levels").insert({ school_id: schoolId, name, sort_order: 1 });
  redirect(error ? "/dashboard/academic?error=1" : "/dashboard/academic?saved=1");
}

export async function createClassAction(formData: FormData) {
  const session = await requireAccess(APP_ROLES);
  const schoolId = formData.get("schoolId");
  const yearId = formData.get("yearId");
  const gradeId = formData.get("gradeId");
  const name = parseShortText(formData.get("name"), 40);
  if (!session.userId || !isUuid(schoolId) || !isUuid(yearId) || !isUuid(gradeId) || !name || !(await ownsSchool(session.userId, schoolId))) {
    redirect("/dashboard/academic?error=1");
  }
  const supabase = await createClient();
  const { error } = await supabase.from("classes").insert({
    school_id: schoolId,
    academic_year_id: yearId,
    grade_level_id: gradeId,
    name,
  });
  redirect(error ? "/dashboard/academic?error=1" : "/dashboard/academic?saved=1");
}
