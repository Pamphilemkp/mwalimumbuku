-- Public contact messages. Additive only.
-- Depends on public.is_platform_admin from the multi-school migration.
-- Does not change users, schools, or existing rows.

CREATE TABLE public.contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 2 AND 80),
  email text NOT NULL CHECK (char_length(email) BETWEEN 3 AND 254),
  topic text NOT NULL CHECK (topic IN ('student', 'parent', 'school', 'other')),
  message text NOT NULL CHECK (char_length(btrim(message)) BETWEEN 10 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX contact_messages_created_idx ON public.contact_messages (created_at DESC);

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can leave a contact message"
  ON public.contact_messages
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Platform admins read contact messages"
  ON public.contact_messages
  FOR SELECT
  TO authenticated
  USING (public.is_platform_admin(auth.uid()));

GRANT INSERT ON public.contact_messages TO anon, authenticated;
GRANT SELECT ON public.contact_messages TO authenticated;

-- Rollback, as a later forward migration, when the table is still disposable:
-- drop policy if exists "Platform admins read contact messages" on public.contact_messages;
-- drop policy if exists "Anyone can leave a contact message" on public.contact_messages;
-- drop table if exists public.contact_messages;
