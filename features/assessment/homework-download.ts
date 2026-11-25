"use server";

import { HOMEWORK_URL_SECONDS, resolveHomeworkObjectPath } from "@/lib/assessment/files";
import { createClient } from "@/lib/supabase/server";
import { getSupabasePublicEnv } from "@/lib/supabase/env";
import { loadAppSession } from "@/services/auth/session";

export async function homeworkDownloadAction(submissionId: string): Promise<{ url: string | null }> {
  const session = await loadAppSession();
  if (!session.userId) return { url: null };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("homework_submissions")
    .select("file_url, user_id")
    .eq("id", submissionId)
    .maybeSingle();
  const studentId = typeof data?.user_id === "string" ? data.user_id : "";
  const fileUrl = typeof data?.file_url === "string" ? data.file_url : "";
  const path = error || !data ? null : resolveHomeworkObjectPath(fileUrl, studentId, getSupabasePublicEnv().url);
  if (!path) return { url: null };

  const { data: signed, error: signError } = await supabase.storage
    .from("homework-files")
    .createSignedUrl(path, HOMEWORK_URL_SECONDS);
  if (signError || !signed?.signedUrl) return { url: null };
  return { url: signed.signedUrl };
}
