
-- Enums
DO $$ BEGIN
  CREATE TYPE public.support_category AS ENUM (
    'technical_issue','learning_difficulty','homework_help','subscription_issue',
    'teacher_assistance','parent_guidance','general_inquiry','academic_question','report_issue'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.support_priority AS ENUM ('low','normal','high','urgent');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.support_status AS ENUM ('open','pending','replied','resolved','closed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Tickets
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subject text NOT NULL,
  category public.support_category NOT NULL DEFAULT 'general_inquiry',
  priority public.support_priority NOT NULL DEFAULT 'normal',
  status public.support_status NOT NULL DEFAULT 'open',
  assigned_to uuid,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own tickets" ON public.support_tickets FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Staff view all tickets" ON public.support_tickets FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'teacher'));
CREATE POLICY "Users create tickets" ON public.support_tickets FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner updates ticket" ON public.support_tickets FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Staff manage tickets" ON public.support_tickets FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'teacher'));
CREATE POLICY "Admins delete tickets" ON public.support_tickets FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON public.support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);

-- Messages
CREATE TABLE IF NOT EXISTS public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  body text,
  attachment_url text,
  attachment_type text, -- 'image' | 'voice' | 'file'
  attachment_name text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_messages TO authenticated;
GRANT ALL ON public.support_messages TO service_role;

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants view messages" ON public.support_messages FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND t.user_id = auth.uid())
    OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'teacher')
  );
CREATE POLICY "Participants send messages" ON public.support_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND (
      EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND t.user_id = auth.uid())
      OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'teacher')
    )
  );
CREATE POLICY "Mark messages read" ON public.support_messages FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND t.user_id = auth.uid())
    OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'teacher')
  );

CREATE INDEX IF NOT EXISTS idx_support_messages_ticket ON public.support_messages(ticket_id, created_at);

-- Typing indicators
CREATE TABLE IF NOT EXISTS public.support_typing (
  ticket_id uuid NOT NULL,
  user_id uuid NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (ticket_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_typing TO authenticated;
GRANT ALL ON public.support_typing TO service_role;
ALTER TABLE public.support_typing ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Typing visible to participants" ON public.support_typing FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND (t.user_id = auth.uid()))
    OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'teacher')
  );
CREATE POLICY "Set own typing" ON public.support_typing FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Update own typing" ON public.support_typing FOR UPDATE TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Delete own typing" ON public.support_typing FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Trigger: update ticket on new message + notify other party
CREATE OR REPLACE FUNCTION public.on_support_message_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _ticket public.support_tickets%ROWTYPE;
  _is_staff boolean;
  _admin_id uuid;
BEGIN
  SELECT * INTO _ticket FROM support_tickets WHERE id = NEW.ticket_id;
  _is_staff := public.has_role(NEW.sender_id,'admin') OR public.has_role(NEW.sender_id,'teacher');

  UPDATE support_tickets
    SET last_message_at = now(),
        status = CASE WHEN _is_staff THEN 'replied'::support_status ELSE 'pending'::support_status END,
        updated_at = now()
    WHERE id = NEW.ticket_id;

  IF _is_staff THEN
    INSERT INTO notifications (user_id,title,message,type,related_id)
    VALUES (_ticket.user_id,'Réponse au ticket: '||_ticket.subject,COALESCE(LEFT(NEW.body,140),'Nouveau message'),'support',NEW.ticket_id);
  ELSE
    -- Notify all admins
    FOR _admin_id IN SELECT user_id FROM user_roles WHERE role='admin' LOOP
      INSERT INTO notifications (user_id,title,message,type,related_id)
      VALUES (_admin_id,'Nouveau message support: '||_ticket.subject,COALESCE(LEFT(NEW.body,140),'Pièce jointe'),'support',NEW.ticket_id);
    END LOOP;
  END IF;
  RETURN NEW;
END;$$;

DROP TRIGGER IF EXISTS trg_support_message_insert ON public.support_messages;
CREATE TRIGGER trg_support_message_insert
AFTER INSERT ON public.support_messages
FOR EACH ROW EXECUTE FUNCTION public.on_support_message_insert();

-- Trigger: notify admins on new ticket
CREATE OR REPLACE FUNCTION public.on_support_ticket_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _admin_id uuid;
BEGIN
  FOR _admin_id IN SELECT user_id FROM user_roles WHERE role='admin' LOOP
    INSERT INTO notifications (user_id,title,message,type,related_id)
    VALUES (_admin_id,'Nouveau ticket: '||NEW.subject,'Priorité: '||NEW.priority::text||' | Catégorie: '||NEW.category::text,'support',NEW.id);
  END LOOP;
  RETURN NEW;
END;$$;

DROP TRIGGER IF EXISTS trg_support_ticket_insert ON public.support_tickets;
CREATE TRIGGER trg_support_ticket_insert
AFTER INSERT ON public.support_tickets
FOR EACH ROW EXECUTE FUNCTION public.on_support_ticket_insert();

-- Storage bucket
INSERT INTO storage.buckets (id,name,public) VALUES ('support-files','support-files',true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Support files public read" ON storage.objects FOR SELECT
  USING (bucket_id = 'support-files');
CREATE POLICY "Auth upload support files" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'support-files' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Owner delete support files" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'support-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Realtime
ALTER TABLE public.support_tickets REPLICA IDENTITY FULL;
ALTER TABLE public.support_messages REPLICA IDENTITY FULL;
ALTER TABLE public.support_typing REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_typing;
