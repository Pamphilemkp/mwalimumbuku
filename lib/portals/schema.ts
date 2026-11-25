export function missingSchema(error: { code?: string | null; message?: string | null } | null | undefined): boolean {
  if (!error) return false;
  const message = `${error.code ?? ""} ${error.message ?? ""}`;
  return /42P01|42703|PGRST204|PGRST205|does not exist|schema cache|Could not find/i.test(message);
}
