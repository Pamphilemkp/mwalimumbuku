import { requireAccess } from "@/features/auth/require-access";
import { createClassAction, createGradeAction, createSchoolAction, createYearAction } from "@/features/dashboard/academic-actions";
import { APP_ROLES } from "@/lib/auth/access";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/src/dashboard-shell";

type SchoolRow = { id: string; name: string; status: string };
type YearRow = { id: string; school_id: string; name: string; status: string };
type GradeRow = { id: string; school_id: string; name: string };
type ClassRow = { id: string; school_id: string; name: string; academic_year_id: string };
type MembershipRow = { school_id: string; membership_role: string };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const session = await requireAccess(APP_ROLES);
  const params = await searchParams;
  const supabase = await createClient();
  const [schools, years, grades, classes, memberships] = await Promise.all([
    supabase.from("schools").select("id, name, status").order("name"),
    supabase.from("academic_years").select("id, school_id, name, status").order("name"),
    supabase.from("grade_levels").select("id, school_id, name").order("name"),
    supabase.from("classes").select("id, school_id, name, academic_year_id").order("name"),
    supabase
      .from("school_memberships")
      .select("school_id, membership_role")
      .eq("user_id", session.userId ?? "")
      .eq("status", "active"),
  ]);
  const unavailable = schools.error || years.error || grades.error || classes.error || memberships.error;
  const schoolRows = (schools.data ?? []) as SchoolRow[];
  const yearRows = (years.data ?? []) as YearRow[];
  const gradeRows = (grades.data ?? []) as GradeRow[];
  const classRows = (classes.data ?? []) as ClassRow[];
  const adminSchoolIds = new Set(
    ((memberships.data ?? []) as MembershipRow[])
      .filter((row) => row.membership_role === "school_admin")
      .map((row) => row.school_id),
  );
  const isPlatformAdmin = session.resolution?.status === "ok" && session.resolution.role === "admin";

  return (
    <DashboardShell>
      <main className="space-y-6">
        <header>
          <h1 className="font-display text-2xl font-bold">Structure académique</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Les lignes ci-dessous viennent de la base. Une école vide n'est pas remplie avec un exemple. Un administrateur de la plateforme crée l'école. Un administrateur de cette école crée l'année, le niveau et la classe.
          </p>
        </header>
        {params.saved === "1" ? (
          <p role="status" className="rounded-md bg-primary/10 px-3 py-2 text-sm">
            Enregistré.
          </p>
        ) : null}
        {params.error === "1" ? (
          <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm">
            Cette action n'a pas été enregistrée.
          </p>
        ) : null}
        {unavailable ? (
          <p className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
            La structure académique n'est pas disponible sur cette base pour le moment.
          </p>
        ) : null}
        {!unavailable && schoolRows.length === 0 ? (
          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="font-display text-lg font-semibold">Aucune école</h2>
            <p className="mt-2 text-sm text-muted-foreground">Aucune école n'est enregistrée. Les comptes existants restent sans école.</p>
          </section>
        ) : null}
        {isPlatformAdmin ? (
          <form action={createSchoolAction} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 sm:flex-row sm:items-end">
            <label className="flex-1 text-sm font-medium">
              Nom de l'école
              <input name="name" required minLength={2} maxLength={80} className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" />
            </label>
            <button type="submit" className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
              Créer l'école
            </button>
          </form>
        ) : null}
        <div className="space-y-4">
          {schoolRows.map((school) => {
            const schoolYears = yearRows.filter((year) => year.school_id === school.id);
            const schoolGrades = gradeRows.filter((grade) => grade.school_id === school.id);
            const schoolClasses = classRows.filter((item) => item.school_id === school.id);
            const canManage = adminSchoolIds.has(school.id);
            return (
              <section key={school.id} className="rounded-xl border border-border bg-card p-5">
                <h2 className="font-display text-lg font-semibold">{school.name}</h2>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{school.status}</p>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[28rem] text-left text-sm">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground">
                        <th className="py-2 pr-3 font-medium">Années</th>
                        <th className="py-2 pr-3 font-medium">Niveaux</th>
                        <th className="py-2 font-medium">Classes</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="align-top">
                        <td className="py-2 pr-3">{schoolYears.length === 0 ? "Aucune" : schoolYears.map((year) => year.name).join(", ")}</td>
                        <td className="py-2 pr-3">{schoolGrades.length === 0 ? "Aucun" : schoolGrades.map((grade) => grade.name).join(", ")}</td>
                        <td className="py-2">{schoolClasses.length === 0 ? "Aucune" : schoolClasses.map((item) => item.name).join(", ")}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                {canManage ? (
                  <div className="mt-4 grid gap-4 lg:grid-cols-3">
                    <form action={createYearAction} className="space-y-2">
                      <input type="hidden" name="schoolId" value={school.id} />
                      <p className="text-sm font-medium">Année</p>
                      <input name="name" required maxLength={40} placeholder="2026-2027" aria-label="Nom de l'année" className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" />
                      <input name="starts" type="date" required aria-label="Début" className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" />
                      <input name="ends" type="date" required aria-label="Fin" className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" />
                      <button type="submit" className="h-10 rounded-md border border-border px-3 text-sm">Ajouter l'année</button>
                    </form>
                    <form action={createGradeAction} className="space-y-2">
                      <input type="hidden" name="schoolId" value={school.id} />
                      <p className="text-sm font-medium">Niveau</p>
                      <input name="name" required maxLength={40} placeholder="6e" aria-label="Nom du niveau" className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" />
                      <button type="submit" className="h-10 rounded-md border border-border px-3 text-sm">Ajouter le niveau</button>
                    </form>
                    <form action={createClassAction} className="space-y-2">
                      <input type="hidden" name="schoolId" value={school.id} />
                      <p className="text-sm font-medium">Classe</p>
                      <select name="yearId" required aria-label="Année de la classe" className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                        {schoolYears.map((year) => (
                          <option key={year.id} value={year.id}>{year.name}</option>
                        ))}
                      </select>
                      <select name="gradeId" required aria-label="Niveau de la classe" className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                        {schoolGrades.map((grade) => (
                          <option key={grade.id} value={grade.id}>{grade.name}</option>
                        ))}
                      </select>
                      <input name="name" required maxLength={40} placeholder="6e A" aria-label="Nom de la classe" className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" />
                      <button type="submit" className="h-10 rounded-md border border-border px-3 text-sm" disabled={schoolYears.length === 0 || schoolGrades.length === 0}>
                        Ajouter la classe
                      </button>
                    </form>
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      </main>
    </DashboardShell>
  );
}
