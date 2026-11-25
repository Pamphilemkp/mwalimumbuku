"use server";

import { HOMEWORK_URL_SECONDS, isStoredHomeworkPath } from "@/lib/assessment/files";
import { createClient } from "@/lib/supabase/server";
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
  if (error || !data || typeof data.file_url !== "string" || !isStoredHomeworkPath(data.file_url)) {
    return { url: null };
  }

  const { data: signed, error: signError } = await supabase.storage
    .from("homework-files")
    .createSignedUrl(data.file_url, HOMEWORK_URL_SECONDS);
  if (signError || !signed?.signedUrl) return { url: null };
  return { url: signed.signedUrl };
}
