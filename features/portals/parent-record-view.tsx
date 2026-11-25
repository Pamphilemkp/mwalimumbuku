"use client";

import Link from "next/link";
import PaginationControls from "@/src/components/PaginationControls";
import { usePagination } from "@/src/hooks/usePagination";

export type ParentRecord = {
  homeworkUnavailable: boolean;
  homework: { id: string; title: string; status: string; grade: number | null; comment: string | null }[];
  attendanceUnavailable: boolean;
  attendance: { id: string; sessionDate: string; status: string; className: string }[];
  feedback: { id: string; message: string; createdAt: string }[];
  courses: { id: string; title: string }[];
  completedLessons: number | null;
  exerciseCount: number | null;
  exercisePoints: number | null;
  reward: { xp: number; level: number; streak: number } | null;
};

export function ParentRecordView({
  childLinks,
  denied,
  selectedId,
  record,
}: {
  childLinks: { id: string; name: string }[];
  denied: boolean;
  selectedId?: string;
  record: ParentRecord | null;
}) {
  const homework = usePagination(record?.homework, 6);
  const attendance = usePagination(record?.attendance, 8);

  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-display text-2xl font-bold">Dossier scolaire</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Cours, devoirs, notes et présences des enfants liés à votre compte. La date de présence est le jour scolaire.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {childLinks.map((child) => (
          <Link
            key={child.id}
            href={`/dashboard/child-progress?child=${child.id}`}
            className={`rounded-full border px-3 py-1 text-sm ${selectedId === child.id ? "border-primary bg-primary/10 text-primary" : "border-border"}`}
          >
            {child.name}
          </Link>
        ))}
      </div>
      {denied || !record ? (
        <p className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
          {"Choisissez l'un de vos enfants liés pour ouvrir son dossier."}
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <article className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-display font-semibold">Cours et leçons</h3>
            {record.courses.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">Aucun cours inscrit.</p> : (
              <ul className="mt-3 space-y-2 text-sm">
                {record.courses.map((course) => (
                  <li key={course.id} className="rounded-lg border border-border px-3 py-2">
                    {course.title}
                  </li>
                ))}
              </ul>
            )}
            {record.completedLessons != null ? (
              <p className="mt-3 text-xs text-muted-foreground">Leçons terminées au total : {record.completedLessons}.</p>
            ) : null}
            {record.exerciseCount != null ? (
              <p className="mt-3 text-xs text-muted-foreground">
                {`Exercices récents : ${record.exerciseCount}. Points d'exercice : ${record.exercisePoints ?? 0}. Ces points restent séparés de la note du devoir.`}
              </p>
            ) : null}
            {record.reward ? (
              <p className="mt-3 text-xs text-muted-foreground">
                {`XP de jeu : ${record.reward.xp}. Niveau ${record.reward.level}. Série ${record.reward.streak} jour(s) à Asia/Nicosia. L'XP ne change pas la note.`}
              </p>
            ) : null}
          </article>
          <article className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-display font-semibold">Devoirs et notes</h3>
            {record.homeworkUnavailable ? <p className="mt-2 text-sm text-muted-foreground">Les devoirs sont indisponibles pour le moment.</p> : homework.totalItems === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">Aucun devoir rendu.</p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm">
                {homework.paginatedItems.map((item) => (
                  <li key={item.id} className="rounded-lg border border-border px-3 py-2">
                    <p className="font-medium">{item.title}</p>
                    <p className="text-muted-foreground">{item.status}{item.grade != null ? ` · note ${item.grade}` : ""}</p>
                    {item.comment ? <p className="mt-1">{item.comment}</p> : null}
                  </li>
                ))}
              </ul>
            )}
            <PaginationControls {...homework} />
          </article>
          <article className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-display font-semibold">Présences</h3>
            {record.attendanceUnavailable ? <p className="mt-2 text-sm text-muted-foreground">Le registre est indisponible pour le moment.</p> : attendance.totalItems === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">Aucune présence enregistrée.</p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm">
                {attendance.paginatedItems.map((item) => (
                  <li key={item.id} className="rounded-lg border border-border px-3 py-2">
                    {item.className} · {item.sessionDate} · {item.status}
                  </li>
                ))}
              </ul>
            )}
            <PaginationControls {...attendance} />
          </article>
          <article className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-display font-semibold">Retour des enseignants</h3>
            {record.feedback.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">Aucun retour enregistré.</p> : (
              <ul className="mt-3 space-y-2 text-sm">
                {record.feedback.map((item) => (
                  <li key={item.id} className="rounded-lg border border-border px-3 py-2">
                    <p>{item.message}</p>
                    <p className="text-xs text-muted-foreground">{item.createdAt}</p>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </div>
      )}
    </section>
  );
}
