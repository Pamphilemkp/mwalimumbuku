
-- ============ Subscription history & payments ============
CREATE TABLE IF NOT EXISTS public.payment_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount numeric(10,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'pending', -- pending | succeeded | failed | refunded
  provider text, -- stripe | mobile_money | manual
  provider_ref text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.payment_history TO authenticated;
GRANT ALL ON public.payment_history TO service_role;
ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own payments" ON public.payment_history FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins manage payments" ON public.payment_history FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "System insert payments" ON public.payment_history FOR INSERT TO authenticated WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.renewal_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  previous_expires_at timestamptz,
  new_expires_at timestamptz NOT NULL,
  tier text NOT NULL DEFAULT 'premium',
  payment_id uuid REFERENCES public.payment_history(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.renewal_history TO authenticated;
GRANT ALL ON public.renewal_history TO service_role;
ALTER TABLE public.renewal_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own renewals" ON public.renewal_history FOR SELECT TO authenticated USING (auth.uid()=user_id);
CREATE POLICY "Admins manage renewals" ON public.renewal_history FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ Trigger: notify on payment status changes ============
CREATE OR REPLACE FUNCTION public.notify_payment_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.status = 'failed' THEN
    INSERT INTO notifications(user_id,title,message,type,related_id)
    VALUES (NEW.user_id, 'Échec du paiement',
            'Votre paiement de '||NEW.amount||' '||NEW.currency||' a échoué. Merci de réessayer.',
            'payment_failed', NEW.id);
    -- parents notified
    INSERT INTO notifications(user_id,title,message,type,related_id)
    SELECT ps.parent_id, 'Échec du paiement de votre enfant',
           'Le paiement de '||NEW.amount||' '||NEW.currency||' a échoué.',
           'payment_failed', NEW.id
    FROM parent_student ps WHERE ps.student_id = NEW.user_id;
  ELSIF NEW.status = 'succeeded' THEN
    INSERT INTO notifications(user_id,title,message,type,related_id)
    VALUES (NEW.user_id,'Paiement reçu',
            'Merci! Paiement de '||NEW.amount||' '||NEW.currency||' confirmé.',
            'payment_success', NEW.id);
  END IF;
  RETURN NEW;
END;$$;
DROP TRIGGER IF EXISTS trg_payment_event ON public.payment_history;
CREATE TRIGGER trg_payment_event AFTER INSERT OR UPDATE OF status ON public.payment_history
FOR EACH ROW EXECUTE FUNCTION public.notify_payment_event();

-- ============ Trigger: notify on renewal ============
CREATE OR REPLACE FUNCTION public.notify_renewal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  INSERT INTO notifications(user_id,title,message,type,related_id)
  VALUES (NEW.user_id,'Renouvellement réussi',
          'Votre abonnement '||NEW.tier||' est actif jusqu''au '||to_char(NEW.new_expires_at,'DD/MM/YYYY')||'.',
          'renewal_success', NEW.id);
  INSERT INTO notifications(user_id,title,message,type,related_id)
  SELECT ps.parent_id,'Abonnement renouvelé pour votre enfant',
         'Actif jusqu''au '||to_char(NEW.new_expires_at,'DD/MM/YYYY')||'.',
         'renewal_success', NEW.id
  FROM parent_student ps WHERE ps.student_id = NEW.user_id;
  RETURN NEW;
END;$$;
DROP TRIGGER IF EXISTS trg_renewal ON public.renewal_history;
CREATE TRIGGER trg_renewal AFTER INSERT ON public.renewal_history
FOR EACH ROW EXECUTE FUNCTION public.notify_renewal();

-- ============ Idempotency helper for scheduled reminders ============
-- We dedupe via (user_id,type,related_id) using a deterministic related_id derived from subscription id + day-bucket.

-- ============ Subscription expiry reminders ============
CREATE OR REPLACE FUNCTION public.send_subscription_reminders()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  _days int;
  _label text;
BEGIN
  FOREACH _days IN ARRAY ARRAY[30,14,7,3,1,0] LOOP
    _label := CASE WHEN _days=0 THEN 'expire aujourd''hui'
                   WHEN _days=1 THEN 'expire demain'
                   ELSE 'expire dans '||_days||' jours' END;

    -- Notify students
    INSERT INTO notifications(user_id,title,message,type,related_id)
    SELECT s.user_id,
           'Abonnement '||_label,
           'Votre abonnement '||s.tier||' '||_label||'. Pensez à renouveler pour garder l''accès complet.',
           'subscription_expiring_'||_days::text,
           s.id
    FROM subscriptions s
    WHERE s.is_active = true
      AND s.expires_at IS NOT NULL
      AND date_trunc('day', s.expires_at) = date_trunc('day', now() + (_days||' days')::interval)
      AND NOT EXISTS (
        SELECT 1 FROM notifications n
        WHERE n.user_id = s.user_id
          AND n.type = 'subscription_expiring_'||_days::text
          AND n.related_id = s.id
      );

    -- Notify parents of student subscriptions
    INSERT INTO notifications(user_id,title,message,type,related_id)
    SELECT DISTINCT ps.parent_id,
           'Abonnement de votre enfant '||_label,
           'L''abonnement '||s.tier||' '||_label||'.',
           'subscription_expiring_'||_days::text,
           s.id
    FROM subscriptions s
    JOIN parent_student ps ON ps.student_id = s.user_id
    WHERE s.is_active = true
      AND s.expires_at IS NOT NULL
      AND date_trunc('day', s.expires_at) = date_trunc('day', now() + (_days||' days')::interval)
      AND NOT EXISTS (
        SELECT 1 FROM notifications n
        WHERE n.user_id = ps.parent_id
          AND n.type = 'subscription_expiring_'||_days::text
          AND n.related_id = s.id
      );
  END LOOP;

  -- Expired (1 day after)
  INSERT INTO notifications(user_id,title,message,type,related_id)
  SELECT s.user_id,'Abonnement expiré',
         'Votre abonnement a expiré le '||to_char(s.expires_at,'DD/MM/YYYY')||'. Renouvelez pour reprendre l''accès Premium.',
         'subscription_expired', s.id
  FROM subscriptions s
  WHERE s.expires_at IS NOT NULL
    AND s.expires_at < now()
    AND s.expires_at > now() - interval '2 days'
    AND NOT EXISTS (
      SELECT 1 FROM notifications n WHERE n.user_id=s.user_id AND n.type='subscription_expired' AND n.related_id=s.id
    );

  -- Auto-deactivate
  UPDATE subscriptions SET is_active = false, tier='free', updated_at=now()
  WHERE is_active = true AND expires_at IS NOT NULL AND expires_at < now() - interval '1 day' AND tier <> 'free';
END;$$;

-- ============ Academic reminders (extends existing assignment reminders) ============
CREATE OR REPLACE FUNCTION public.send_academic_reminders()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  -- Unfinished exercises (enrolled but no result in 7 days, max 1 per lesson per week)
  INSERT INTO notifications(user_id,title,message,type,related_id)
  SELECT DISTINCT ce.user_id,
         'Exercices non terminés',
         'Vous avez des exercices en attente dans le cours: '||c.title,
         'exercise_pending', c.id
  FROM course_enrollments ce
  JOIN courses c ON c.id = ce.course_id
  JOIN lessons l ON l.course_id = c.id
  JOIN exercises e ON e.lesson_id = l.id
  WHERE NOT EXISTS (SELECT 1 FROM results r WHERE r.user_id=ce.user_id AND r.exercise_id=e.id)
    AND NOT EXISTS (
      SELECT 1 FROM notifications n
      WHERE n.user_id=ce.user_id AND n.type='exercise_pending' AND n.related_id=c.id
        AND n.created_at > now() - interval '7 days'
    );

  -- Poor performance alert (<50% on last 5 exercises)
  INSERT INTO notifications(user_id,title,message,type,related_id)
  SELECT user_id,'Alerte performance',
         'Vos derniers résultats sont en baisse. Consultez les leçons recommandées ou contactez votre enseignant.',
         'performance_alert', NULL
  FROM (
    SELECT r.user_id, AVG(CASE WHEN r.is_correct THEN 1.0 ELSE 0 END) AS rate
    FROM (
      SELECT user_id, exercise_id, is_correct,
        ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) rn
      FROM results
    ) r WHERE rn <= 5
    GROUP BY r.user_id HAVING COUNT(*) >= 5 AND AVG(CASE WHEN r.is_correct THEN 1.0 ELSE 0 END) < 0.5
  ) low
  WHERE NOT EXISTS (
    SELECT 1 FROM notifications n WHERE n.user_id=low.user_id AND n.type='performance_alert'
      AND n.created_at > now() - interval '7 days'
  );

  -- Parents of low performers
  INSERT INTO notifications(user_id,title,message,type,related_id)
  SELECT ps.parent_id,'Alerte: performance de votre enfant',
         'Les derniers résultats de votre enfant sont en baisse. Pensez à en discuter avec lui/elle.',
         'performance_alert', NULL
  FROM (
    SELECT r.user_id
    FROM (
      SELECT user_id, exercise_id, is_correct,
        ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) rn
      FROM results
    ) r WHERE rn <= 5
    GROUP BY r.user_id HAVING COUNT(*) >= 5 AND AVG(CASE WHEN r.is_correct THEN 1.0 ELSE 0 END) < 0.5
  ) low
  JOIN parent_student ps ON ps.student_id = low.user_id
  WHERE NOT EXISTS (
    SELECT 1 FROM notifications n WHERE n.user_id=ps.parent_id AND n.type='performance_alert'
      AND n.created_at > now() - interval '7 days'
  );

  -- Upcoming live sessions (1h before)
  INSERT INTO notifications(user_id,title,message,type,related_id)
  SELECT ce.user_id,'Cours en direct bientôt: '||ls.title,
         'Démarre à '||to_char(ls.scheduled_at,'HH24:MI')||'.',
         'live_reminder', ls.id
  FROM live_sessions ls
  JOIN course_enrollments ce ON ce.course_id = ls.course_id
  WHERE ls.scheduled_at BETWEEN now()+interval '55 minutes' AND now()+interval '65 minutes'
    AND NOT EXISTS (SELECT 1 FROM notifications n WHERE n.user_id=ce.user_id AND n.type='live_reminder' AND n.related_id=ls.id);
END;$$;

-- ============ Master orchestrator (runs all reminders) ============
CREATE OR REPLACE FUNCTION public.run_scheduled_notifications()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  PERFORM public.send_assignment_reminders();
  PERFORM public.send_subscription_reminders();
  PERFORM public.send_academic_reminders();
END;$$;

-- ============ pg_cron schedule (every hour) ============
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname='run-scheduled-notifications') THEN
    PERFORM cron.unschedule('run-scheduled-notifications');
  END IF;
  PERFORM cron.schedule('run-scheduled-notifications','0 * * * *',$cron$SELECT public.run_scheduled_notifications();$cron$);
END$$;
