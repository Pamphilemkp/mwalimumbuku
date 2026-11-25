import Link from "next/link";
import { missingSchema } from "@/lib/portals/schema";
import { resolveChildSelection } from "@/lib/portals/access";
import { createClient } from "@/lib/supabase/server";
import { loadAppSession } from "@/services/auth/session";
import { ParentRecordView, type ParentRecord } from "./parent-record-view";

function className(value: { name?: string | null } | { name?: string | null }[] | null | undefined): string {
  if (!value) return "Classe";
  return Array.isArray(value) ? value[0]?.name ?? "Classe" : value.name ?? "Classe";
}

export async function ParentAcademicRecord({ requestedChild }: { requestedChild?: string }) {
  const session = await loadAppSession();
  const role = session.resolution?.status === "ok" ? session.resolution.role : null;
  if (!session.userId || role !== "parent") return null;

  const supabase = await createClient();
  const withStatus = await supabase
    .from("parent_student")
    .select("student_id, status")
    .eq("parent_id", session.userId);
  let linkRows = withStatus.data ?? [];
  if (withStatus.error) {
    if (!missingSchema(withStatus.error)) {
      return <p className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">Le dossier scolaire est indisponible pour le moment.</p>;
    }
    const plain = await supabase.from("parent_student").select("student_id").eq("parent_id", session.userId);
    if (plain.error) {
      return <p className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">Le dossier scolaire est indisponible pour le moment.</p>;
    }
    linkRows = (plain.data ?? []).map((row) => ({ ...row, status: "active" }));
  }

  const selection = resolveChildSelection(
    linkRows.map((row) => ({ studentId: String(row.student_id), status: "status" in row ? String(row.status ?? "active") : "active" })),
    requestedChild ?? null,
  );
  if (selection.childIds.length === 0) {
    return (
      <section className="rounded-xl border border-dashed border-border p-8 text-center">
        <h2 className="font-display text-xl font-semibold">Dossier scolaire</h2>
        <p className="mt-2 text-sm text-muted-foreground">Liez un enfant pour suivre ses cours, ses notes et ses présences.</p>
        <Link href="/dashboard/children" className="mt-3 inline-block text-sm text-primary hover:underline">Lier un enfant</Link>
      </section>
    );
  }

  const names = await supabase.from("profiles").select("user_id, full_name").in("user_id", selection.childIds);
  const children = selection.childIds.map((id) => ({
    id,
    name: names.data?.find((profile) => profile.user_id === id)?.full_name || "Élève",
  }));
  if (selection.denied || !selection.selectedId) {
    return <ParentRecordView childLinks={children} denied record={null} />;
  }

  const studentId = selection.selectedId;
  const [homework, recommendations, enrollments, progress, results, memberships] = await Promise.all([
    supabase.from("homework_submissions").select("id, status, grade, teacher_comment, assignment_id, created_at").eq("user_id", studentId).order("created_at", { ascending: false }).limit(40),
    supabase.from("teacher_recommendations").select("id, message, created_at").eq("student_id", studentId).order("created_at", { ascending: false }).limit(20),
    supabase.from("course_enrollments").select("id, course_id, courses(title)").eq("user_id", studentId),
    supabase.from("lesson_progress").select("id, lesson_id").eq("user_id", studentId),
    supabase.from("results").select("id, is_correct, points_earned").eq("user_id", studentId).order("created_at", { ascending: false }).limit(30),
    supabase.from("school_memberships").select("id").eq("user_id", studentId).eq("membership_role", "student").eq("status", "active"),
  ]);

  const assignmentIds = (homework.data ?? []).map((row) => row.assignment_id).filter((id): id is string => typeof id === "string");
  const assignments = assignmentIds.length
    ? await supabase.from("assignments").select("id, title").in("id", assignmentIds)
    : { data: [], error: null };
  const membershipIds = (memberships.data ?? []).map((row) => row.id).filter((id): id is string => typeof id === "string");
  const attendance = membershipIds.length
    ? await supabase.from("class_attendance").select("id, status, session_date, classes(name)").in("membership_id", membershipIds).order("session_date", { ascending: false }).limit(40)
    : { data: [], error: memberships.error };

  const completedLessons = progress.error ? null : (progress.data ?? []).length;
  const record: ParentRecord = {
    homeworkUnavailable: Boolean(homework.error),
    homework: homework.error ? [] : (homework.data ?? []).map((row) => ({
      id: String(row.id),
      title: assignments.data?.find((item) => item.id === row.assignment_id)?.title || "Devoir",
      status: String(row.status ?? ""),
      grade: typeof row.grade === "number" ? row.grade : null,
      comment: row.teacher_comment ?? null,
    })),
    attendanceUnavailable: Boolean(attendance.error && missingSchema(attendance.error)),
    attendance: attendance.error ? [] : (attendance.data ?? []).map((row) => ({
      id: String(row.id),
      sessionDate: String(row.session_date),
      status: String(row.status),
      className: className(row.classes),
    })),
    feedback: missingSchema(recommendations.error) ? [] : (recommendations.data ?? []).map((row) => ({
      id: String(row.id),
      message: String(row.message),
      createdAt: String(row.created_at).slice(0, 10),
    })),
    courses: missingSchema(enrollments.error) ? [] : (enrollments.data ?? []).map((row) => {
      const course = Array.isArray(row.courses) ? row.courses[0] : row.courses;
      return { id: String(row.id), title: course?.title || "Cours" };
    }),
    completedLessons,
    exerciseCount: missingSchema(results.error) ? null : (results.data ?? []).length,
    exercisePoints: missingSchema(results.error) ? null : (results.data ?? []).reduce((sum, row) => sum + (row.points_earned ?? 0), 0),
  };

  return <ParentRecordView childLinks={children} denied={false} selectedId={studentId} record={record} />;
}
