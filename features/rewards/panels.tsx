"use client";

import { missingSchema } from "@/lib/portals/schema";
import { levelForXp } from "@/lib/rewards/economy";
import { supabase } from "@/src/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

type Summary = { xp: number; level: number; streak: number; todayXp: number };
type Board = { classId: string; className: string; rows: { rank: number; label: string; xp: number; level: number }[] };

function asSummary(value: unknown): Summary | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Partial<Summary>;
  if (typeof row.xp !== "number") return null;
  return { xp: row.xp, level: row.level ?? levelForXp(row.xp), streak: row.streak ?? 0, todayXp: row.todayXp ?? 0 };
}

export function StudentRewardPanel({ showBoard = false }: { showBoard?: boolean }) {
  const summary = useQuery({
    queryKey: ["student-reward-summary"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("student_reward_summary");
      if (error) {
        if (missingSchema(error)) return null;
        throw error;
      }
      return asSummary(data);
    },
  });
  const boards = useQuery({
    queryKey: ["game-leaderboards"],
    enabled: showBoard,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("my_game_leaderboards");
      if (error) {
        if (missingSchema(error)) return [] as Board[];
        throw error;
      }
      return (Array.isArray(data) ? data : []) as Board[];
    },
  });
  if (!summary.data && (!boards.data || boards.data.length === 0)) return null;
  return (
    <section className="space-y-4">
      {summary.data ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <article className="rounded-xl border border-border bg-card p-4">
            <p className="text-2xl font-bold">{summary.data.xp}</p>
            <p className="text-sm text-muted-foreground">XP</p>
          </article>
          <article className="rounded-xl border border-border bg-card p-4">
            <p className="text-2xl font-bold">{summary.data.level}</p>
            <p className="text-sm text-muted-foreground">Niveau</p>
          </article>
          <article className="rounded-xl border border-border bg-card p-4">
            <p className="text-2xl font-bold">{summary.data.streak}</p>
            <p className="text-sm text-muted-foreground">Série (Asia/Nicosia)</p>
          </article>
        </div>
      ) : null}
      <p className="text-xs text-muted-foreground">L’XP vient des parties vérifiées. Elle ne modifie pas les points d’exercice ni la note d’un devoir.</p>
      {showBoard && boards.data && boards.data.length > 0 ? (
        <div className="space-y-3">
          {boards.data.map((board) => (
            <article key={board.classId} className="rounded-xl border border-border bg-card p-4">
              <h2 className="font-display font-semibold">{board.className}</h2>
              <ol className="mt-3 space-y-2 text-sm">
                {board.rows.map((row) => (
                  <li key={`${board.classId}-${row.rank}`} className="flex items-center justify-between gap-3">
                    <span>{row.rank}. {row.label}</span>
                    <span className="text-muted-foreground">{row.xp} XP · niv. {row.level}</span>
                  </li>
                ))}
              </ol>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
