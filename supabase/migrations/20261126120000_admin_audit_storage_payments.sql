-- Administration audit, teacher provisioning, email outcomes, and payment locks.
-- Uses the existing platform role (public.app_role 'admin' via is_platform_admin)
-- and school_admin memberships. Does not delete or rewrite academic rows.
--
-- Student homework stays in the private homework-files bucket.
-- Retention: keep each homework file for 24 months after homework_submissions.created_at.
-- A platform administrator may remove it after that. This migration does not delete files.
-- Support attachments are private to the ticket's existing readers.
-- Mobile-money is not a provider here. Card payments change tier only when
-- auth.uid() is null (the payment function's service connection), never from a signed-in session.

CREATE OR REPLACE FUNCTION public.signup_role(raw text)
RETURNS public.app_role
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN raw = 'student' THEN 'student'::public.app_role
    WHEN raw = 'parent' THEN 'parent'::public.app_role
    ELSE 'student'::public.app_role
  END
$$;

REVOKE ALL ON FUNCTION public.signup_role(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.signup_role(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _role public.app_role;
  _code text;
BEGIN
  _code := LPAD(FLOOR(RANDOM() * 100000000)::TEXT, 8, '0');

  INSERT INTO public.profiles (user_id, full_name, student_code)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''), _code);

  _role := public.signup_role(NEW.raw_user_meta_data ->> 'role');

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _role);
  INSERT INTO public.subscriptions (user_id, tier) VALUES (NEW.id, 'free');

  IF _role = 'student' THEN
    INSERT INTO public.student_profiles (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  ELSIF _role = 'parent' THEN
    INSERT INTO public.parent_profiles (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_self_privileged_role()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND NEW.user_id = auth.uid()
     AND NEW.role IN ('admin'::public.app_role, 'teacher'::public.app_role) THEN
    RAISE EXCEPTION 'a user cannot grant themselves a privileged role';
  END IF;
  IF NEW.role = 'admin'::public.app_role
     AND auth.uid() IS NOT NULL
     AND NOT public.is_platform_admin(auth.uid()) THEN
    RAISE EXCEPTION 'only a platform administrator can grant the platform role';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_roles_no_self_grant ON public.user_roles;
CREATE TRIGGER user_roles_no_self_grant
  BEFORE INSERT OR UPDATE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_self_privileged_role();

CREATE TABLE public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL,
  school_id uuid,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id uuid,
  summary text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (char_length(action) BETWEEN 1 AND 40),
  CHECK (char_length(entity) BETWEEN 1 AND 40),
  CHECK (char_length(summary) BETWEEN 1 AND 200)
);

CREATE INDEX admin_audit_log_school_idx
  ON public.admin_audit_log (school_id, created_at DESC);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_audit_log FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON public.admin_audit_log FROM anon;
    REVOKE TRUNCATE ON public.admin_audit_log FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON public.admin_audit_log FROM authenticated;
    GRANT SELECT ON public.admin_audit_log TO authenticated;
    REVOKE TRUNCATE ON public.admin_audit_log FROM authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    REVOKE ALL ON public.admin_audit_log FROM service_role;
    GRANT SELECT, INSERT ON public.admin_audit_log TO service_role;
    REVOKE TRUNCATE ON public.admin_audit_log FROM service_role;
  END IF;
END $$;

REVOKE TRUNCATE ON public.admin_audit_log FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.reject_audit_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'audit history is append-only';
END;
$$;

DROP TRIGGER IF EXISTS admin_audit_log_append_only ON public.admin_audit_log;
CREATE TRIGGER admin_audit_log_append_only
  BEFORE UPDATE OR DELETE ON public.admin_audit_log
  FOR EACH ROW EXECUTE FUNCTION public.reject_audit_mutation();

CREATE OR REPLACE FUNCTION public.append_admin_audit(
  _actor uuid,
  _school uuid,
  _action text,
  _entity text,
  _entity_id uuid,
  _summary text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _actor IS NULL OR _summary IS NULL OR char_length(btrim(_summary)) = 0 THEN
    RETURN;
  END IF;
  IF NOT public.is_platform_admin(_actor)
     AND (_school IS NULL OR NOT public.active_membership(_actor, _school, 'school_admin')) THEN
    RETURN;
  END IF;
  INSERT INTO public.admin_audit_log (actor_id, school_id, action, entity, entity_id, summary)
  VALUES (_actor, _school, left(_action, 40), left(_entity, 40), _entity_id, left(btrim(_summary), 200));
END;
$$;

REVOKE ALL ON FUNCTION public.append_admin_audit(uuid, uuid, text, text, uuid, text) FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON FUNCTION public.append_admin_audit(uuid, uuid, text, text, uuid, text) FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON FUNCTION public.append_admin_audit(uuid, uuid, text, text, uuid, text) FROM authenticated;
  END IF;
END $$;

CREATE POLICY "Platform admins read the audit log"
  ON public.admin_audit_log
  FOR SELECT TO authenticated
  USING (public.is_platform_admin(auth.uid()));

CREATE POLICY "School admins read their audit log"
  ON public.admin_audit_log
  FOR SELECT TO authenticated
  USING (
    school_id IS NOT NULL
    AND public.active_membership(auth.uid(), school_id, 'school_admin')
  );

CREATE TABLE public.email_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('password_recovery', 'auth_signup', 'notification')),
  status text NOT NULL CHECK (status IN ('accepted', 'failed', 'unconfigured')),
  detail text NOT NULL CHECK (detail IN ('accepted', 'provider_unreachable', 'provider_rejected', 'unconfigured', 'notification_in_app')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_deliveries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.email_deliveries FROM PUBLIC;
GRANT SELECT ON public.email_deliveries TO authenticated;

CREATE POLICY "Platform admins read email outcomes"
  ON public.email_deliveries
  FOR SELECT TO authenticated
  USING (public.is_platform_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.record_email_delivery(_kind text, _status text, _detail text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _recent integer;
BEGIN
  IF _kind NOT IN ('password_recovery', 'auth_signup', 'notification')
     OR _status NOT IN ('accepted', 'failed', 'unconfigured')
     OR _detail NOT IN ('accepted', 'provider_unreachable', 'provider_rejected', 'unconfigured', 'notification_in_app') THEN
    RAISE EXCEPTION 'email outcome is not allowed';
  END IF;
  SELECT count(*) INTO _recent
  FROM public.email_deliveries
  WHERE created_at > now() - interval '1 minute';
  IF _recent >= 60 THEN
    RETURN;
  END IF;
  INSERT INTO public.email_deliveries (kind, status, detail)
  VALUES (_kind, _status, _detail);
END;
$$;

REVOKE ALL ON FUNCTION public.record_email_delivery(text, text, text) FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON FUNCTION public.record_email_delivery(text, text, text) FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON FUNCTION public.record_email_delivery(text, text, text) FROM authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION public.record_email_delivery(text, text, text) TO service_role;
  END IF;
END $$;

CREATE TABLE public.payment_events (
  event_id text PRIMARY KEY,
  event_type text NOT NULL,
  status text NOT NULL CHECK (status IN ('processed', 'ignored')),
  received_at timestamptz NOT NULL DEFAULT now(),
  CHECK (char_length(event_id) BETWEEN 3 AND 120),
  CHECK (char_length(event_type) BETWEEN 1 AND 80)
);

ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.payment_events FROM PUBLIC, authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT ALL ON public.payment_events TO service_role;
    GRANT ALL ON public.email_deliveries TO service_role;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.prevent_subscription_self_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    IF TG_OP = 'INSERT' OR TG_OP = 'DELETE' THEN
      RAISE EXCEPTION 'a signed-in user cannot change a subscription tier';
    END IF;
    IF NEW.tier IS DISTINCT FROM OLD.tier
       OR NEW.is_active IS DISTINCT FROM OLD.is_active
       OR NEW.expires_at IS DISTINCT FROM OLD.expires_at THEN
      RAISE EXCEPTION 'a signed-in user cannot change a subscription tier';
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.subscriptions') IS NOT NULL THEN
    ALTER TABLE public.subscriptions
      ADD COLUMN IF NOT EXISTS entitlement_event_at bigint;
    DROP TRIGGER IF EXISTS subscriptions_no_self_tier ON public.subscriptions;
    CREATE TRIGGER subscriptions_no_self_tier
      BEFORE INSERT OR UPDATE OR DELETE ON public.subscriptions
      FOR EACH ROW EXECUTE FUNCTION public.prevent_subscription_self_update();
  END IF;
  IF to_regclass('public.payment_history') IS NOT NULL THEN
    DROP POLICY IF EXISTS "System insert payments" ON public.payment_history;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.find_account_for_admin(_code text)
RETURNS TABLE (user_id uuid, full_name text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller uuid := auth.uid();
BEGIN
  IF _caller IS NULL
     OR _code IS NULL
     OR _code !~ '^[A-Za-z0-9-]{4,32}$' THEN
    RETURN;
  END IF;
  IF NOT public.is_platform_admin(_caller)
     AND NOT EXISTS (
       SELECT 1
       FROM public.school_memberships AS membership
       WHERE membership.user_id = _caller
         AND membership.membership_role = 'school_admin'
         AND membership.status = 'active'
     ) THEN
    RETURN;
  END IF;
  RETURN QUERY
  SELECT profile.user_id, profile.full_name
  FROM public.profiles AS profile
  WHERE profile.student_code = _code
  LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.find_account_for_admin(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_account_for_admin(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.provision_teacher(target_user uuid, target_school uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller uuid := auth.uid();
BEGIN
  IF _caller IS NULL OR target_user IS NULL OR target_school IS NULL OR target_user = _caller THEN
    RAISE EXCEPTION 'a user cannot grant themselves a staff membership';
  END IF;
  IF NOT public.is_platform_admin(_caller)
     AND NOT public.active_membership(_caller, target_school, 'school_admin') THEN
    RAISE EXCEPTION 'not authorized for that school';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE profiles.user_id = target_user) THEN
    RAISE EXCEPTION 'account not found';
  END IF;
  IF public.has_role(target_user, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'platform role is unchanged';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user, 'teacher'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.school_memberships (
    school_id, user_id, membership_role, status, invited_by, started_on
  )
  VALUES (target_school, target_user, 'teacher', 'active', _caller, current_date)
  ON CONFLICT (school_id, user_id, membership_role) DO UPDATE
    SET status = 'active',
        ended_on = NULL,
        invited_by = EXCLUDED.invited_by
    WHERE public.school_memberships.status IS DISTINCT FROM 'active';
END;
$$;

REVOKE ALL ON FUNCTION public.provision_teacher(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.provision_teacher(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_notify_school(target_school uuid, title text, message text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller uuid := auth.uid();
  _count integer;
  _title text := btrim(title);
  _message text := btrim(message);
BEGIN
  IF _caller IS NULL THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF NOT public.is_platform_admin(_caller) THEN
    PERFORM 1
    FROM public.school_memberships AS membership
    WHERE membership.user_id = _caller
      AND membership.school_id = target_school
      AND membership.membership_role = 'school_admin'
      AND membership.status = 'active'
    FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'not authorized for that school';
    END IF;
  END IF;
  IF _title IS NULL OR char_length(_title) < 2 OR char_length(_title) > 120
     OR _message IS NULL OR char_length(_message) < 2 OR char_length(_message) > 500 THEN
    RAISE EXCEPTION 'notice is incomplete';
  END IF;

  INSERT INTO public.notifications (user_id, title, message, type)
  SELECT DISTINCT membership.user_id, _title, _message, 'admin'
  FROM public.school_memberships AS membership
  WHERE membership.school_id = target_school
    AND membership.status = 'active'
    AND membership.membership_role IN ('school_admin', 'teacher');

  GET DIAGNOSTICS _count = ROW_COUNT;
  PERFORM public.record_email_delivery('notification', 'unconfigured', 'notification_in_app');
  PERFORM public.append_admin_audit(_caller, target_school, 'notice.create', 'notifications', NULL, 'in-app notice');
  RETURN _count;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_notify_school(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_notify_school(uuid, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.audit_admin_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _actor uuid := auth.uid();
  _school uuid;
  _id uuid;
  _action text;
  _summary text;
BEGIN
  IF _actor IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_TABLE_NAME = 'schools' THEN
    _school := NEW.id;
    _id := NEW.id;
    _action := CASE WHEN TG_OP = 'INSERT' THEN 'school.create' ELSE 'school.update' END;
    _summary := 'school record';
  ELSIF TG_TABLE_NAME = 'school_memberships' THEN
    _school := NEW.school_id;
    _id := NEW.id;
    _action := CASE WHEN TG_OP = 'INSERT' THEN 'membership.create' ELSE 'membership.update' END;
    _summary := NEW.membership_role || ' ' || NEW.status;
  ELSIF TG_TABLE_NAME = 'academic_years' THEN
    _school := NEW.school_id;
    _id := NEW.id;
    _action := CASE WHEN TG_OP = 'INSERT' THEN 'year.create' ELSE 'year.update' END;
    _summary := left(NEW.name, 80);
  ELSIF TG_TABLE_NAME = 'classes' THEN
    _school := NEW.school_id;
    _id := NEW.id;
    _action := CASE WHEN TG_OP = 'INSERT' THEN 'class.create' ELSE 'class.update' END;
    _summary := left(NEW.name, 80);
  ELSIF TG_TABLE_NAME = 'courses' THEN
    IF TG_OP = 'UPDATE'
       AND NEW.is_published IS NOT DISTINCT FROM OLD.is_published
       AND NEW.archived IS NOT DISTINCT FROM OLD.archived
       AND NEW.school_id IS NOT DISTINCT FROM OLD.school_id THEN
      RETURN NEW;
    END IF;
    _school := NEW.school_id;
    _id := NEW.id;
    _action := 'course.update';
    _summary := 'course publication';
  ELSIF TG_TABLE_NAME = 'platform_settings' THEN
    _school := NULL;
    _id := NEW.id;
    _action := 'settings.update';
    _summary := left(NEW.key, 80);
  ELSIF TG_TABLE_NAME = 'user_roles' THEN
    IF NEW.user_id = _actor OR NEW.role NOT IN ('teacher'::public.app_role, 'admin'::public.app_role) THEN
      RETURN NEW;
    END IF;
    _school := NULL;
    _id := NEW.id;
    _action := 'role.grant';
    _summary := NEW.role::text;
  ELSE
    RETURN NEW;
  END IF;

  PERFORM public.append_admin_audit(_actor, _school, _action, TG_TABLE_NAME, _id, _summary);
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.audit_admin_change() FROM PUBLIC;

DO $$
BEGIN
  IF to_regclass('public.schools') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS schools_admin_audit ON public.schools;
    CREATE TRIGGER schools_admin_audit
      AFTER INSERT OR UPDATE ON public.schools
      FOR EACH ROW EXECUTE FUNCTION public.audit_admin_change();
  END IF;
  IF to_regclass('public.school_memberships') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS school_memberships_admin_audit ON public.school_memberships;
    CREATE TRIGGER school_memberships_admin_audit
      AFTER INSERT OR UPDATE ON public.school_memberships
      FOR EACH ROW EXECUTE FUNCTION public.audit_admin_change();
  END IF;
  IF to_regclass('public.academic_years') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS academic_years_admin_audit ON public.academic_years;
    CREATE TRIGGER academic_years_admin_audit
      AFTER INSERT OR UPDATE ON public.academic_years
      FOR EACH ROW EXECUTE FUNCTION public.audit_admin_change();
  END IF;
  IF to_regclass('public.classes') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS classes_admin_audit ON public.classes;
    CREATE TRIGGER classes_admin_audit
      AFTER INSERT OR UPDATE ON public.classes
      FOR EACH ROW EXECUTE FUNCTION public.audit_admin_change();
  END IF;
  IF to_regclass('public.courses') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS courses_admin_audit ON public.courses;
    CREATE TRIGGER courses_admin_audit
      AFTER UPDATE ON public.courses
      FOR EACH ROW EXECUTE FUNCTION public.audit_admin_change();
  END IF;
  IF to_regclass('public.platform_settings') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS platform_settings_admin_audit ON public.platform_settings;
    CREATE TRIGGER platform_settings_admin_audit
      AFTER UPDATE ON public.platform_settings
      FOR EACH ROW EXECUTE FUNCTION public.audit_admin_change();
  END IF;
  IF to_regclass('public.user_roles') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS user_roles_admin_audit ON public.user_roles;
    CREATE TRIGGER user_roles_admin_audit
      AFTER INSERT OR UPDATE ON public.user_roles
      FOR EACH ROW EXECUTE FUNCTION public.audit_admin_change();
  END IF;
  IF to_regclass('public.homework_submissions') IS NOT NULL THEN
    COMMENT ON TABLE public.homework_submissions IS
      'Private student work. Retain the object for 24 months after created_at. A platform administrator may delete it after that. The bucket is not public. Downloads use a short-lived signed URL.';
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('storage.objects') IS NULL OR to_regclass('storage.buckets') IS NULL THEN
    RETURN;
  END IF;

  UPDATE storage.buckets
  SET public = false,
      file_size_limit = 5242880,
      allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
  WHERE id = 'homework-files';

  DROP POLICY IF EXISTS "Teachers view homework files" ON storage.objects;
  DROP POLICY IF EXISTS "Teachers read submitted homework files" ON storage.objects;
  CREATE POLICY "Teachers read submitted homework files"
    ON storage.objects
    FOR SELECT TO authenticated
    USING (
      bucket_id = 'homework-files'
      AND EXISTS (
        SELECT 1
        FROM public.homework_submissions AS submission
        JOIN public.assignments AS assignment ON assignment.id = submission.assignment_id
        JOIN public.courses AS course ON course.id = assignment.course_id
        WHERE submission.file_url = storage.objects.name
          AND (
            course.teacher_id = auth.uid()
            OR (
              course.school_id IS NOT NULL
              AND public.active_membership(auth.uid(), course.school_id, 'school_admin')
            )
          )
      )
    );

  DROP POLICY IF EXISTS "Parents read linked homework files" ON storage.objects;
  CREATE POLICY "Parents read linked homework files"
    ON storage.objects
    FOR SELECT TO authenticated
    USING (
      bucket_id = 'homework-files'
      AND (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
      AND public.parent_of(auth.uid(), ((storage.foldername(name))[1])::uuid)
    );

  IF to_regclass('public.support_messages') IS NOT NULL THEN
    UPDATE storage.buckets
    SET public = false
    WHERE id = 'support-files';

    DROP POLICY IF EXISTS "Support files public read" ON storage.objects;
    DROP POLICY IF EXISTS "Support files for ticket participants" ON storage.objects;
    CREATE POLICY "Support files for ticket participants"
      ON storage.objects
      FOR SELECT TO authenticated
      USING (
        bucket_id = 'support-files'
        AND (
          (storage.foldername(name))[1] = auth.uid()::text
          OR EXISTS (
            SELECT 1
            FROM public.support_messages AS message
            WHERE public.support_ticket_visible(message.ticket_id)
              AND (
                message.attachment_url = storage.objects.name
                OR (
                  length(message.attachment_url) > length(storage.objects.name)
                  AND right(message.attachment_url, length(storage.objects.name) + 1)
                      = '/' || storage.objects.name
                )
              )
          )
        )
      );
  END IF;
END $$;

CREATE TABLE public.stripe_customer_links (
  customer_id text PRIMARY KEY,
  user_id uuid NOT NULL,
  subscription_id text,
  CHECK (customer_id ~ '^[A-Za-z0-9_]{3,120}$'),
  CHECK (subscription_id IS NULL OR subscription_id ~ '^[A-Za-z0-9_]{3,120}$')
);

ALTER TABLE public.stripe_customer_links ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.stripe_customer_links FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.stripe_refund_user(_customer_id text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT link.user_id
  FROM public.stripe_customer_links AS link
  WHERE _customer_id IS NOT NULL
    AND link.customer_id = _customer_id
$$;

CREATE OR REPLACE FUNCTION public.apply_payment_event(
  _event_id text,
  _event_type text,
  _event_created bigint,
  _user_id uuid,
  _action text,
  _tier text,
  _is_active boolean,
  _expires_at timestamptz,
  _apply_entitlement boolean,
  _amount numeric,
  _currency text,
  _payment_status text,
  _customer_id text,
  _subscription_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _stored bigint;
  _subscription text;
BEGIN
  IF _event_id IS NULL OR char_length(_event_id) < 3 OR char_length(_event_id) > 120
     OR _event_type IS NULL OR char_length(_event_type) < 1 OR char_length(_event_type) > 80
     OR _action NOT IN ('sync', 'ignore') THEN
    RAISE EXCEPTION 'payment event is invalid';
  END IF;
  IF _action = 'sync' AND _user_id IS NULL THEN
    RAISE EXCEPTION 'payment event has no owner';
  END IF;

  BEGIN
    INSERT INTO public.payment_events (event_id, event_type, status)
    VALUES (
      _event_id,
      _event_type,
      CASE WHEN _action = 'sync' THEN 'processed' ELSE 'ignored' END
    );
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('ok', true, 'duplicate', true);
  END;

  IF _action = 'ignore' THEN
    RETURN jsonb_build_object('ok', true, 'ignored', true);
  END IF;

  _subscription := CASE
    WHEN _subscription_id ~ '^[A-Za-z0-9_]{3,120}$' THEN _subscription_id
    ELSE NULL
  END;
  IF _customer_id ~ '^[A-Za-z0-9_]{3,120}$' THEN
    INSERT INTO public.stripe_customer_links (customer_id, user_id, subscription_id)
    VALUES (_customer_id, _user_id, _subscription)
    ON CONFLICT (customer_id) DO UPDATE
      SET subscription_id = COALESCE(EXCLUDED.subscription_id, public.stripe_customer_links.subscription_id)
      WHERE public.stripe_customer_links.user_id = EXCLUDED.user_id;
  END IF;

  IF _apply_entitlement THEN
    IF _tier NOT IN ('free', 'premium') THEN
      RAISE EXCEPTION 'payment entitlement is invalid';
    END IF;
    SELECT subscriptions.entitlement_event_at
    INTO _stored
    FROM public.subscriptions AS subscriptions
    WHERE subscriptions.user_id = _user_id
    FOR UPDATE;

    IF NOT FOUND THEN
      INSERT INTO public.subscriptions (user_id, tier, is_active, expires_at, entitlement_event_at, updated_at)
      VALUES (_user_id, _tier, COALESCE(_is_active, false), _expires_at, _event_created, now());
    ELSIF _event_created IS NOT NULL AND (_stored IS NULL OR _event_created > _stored) THEN
      UPDATE public.subscriptions
      SET tier = _tier,
          is_active = COALESCE(_is_active, false),
          expires_at = _expires_at,
          entitlement_event_at = _event_created,
          updated_at = now()
      WHERE user_id = _user_id;
    END IF;
  END IF;

  IF _payment_status IN ('succeeded', 'failed', 'refunded') AND _currency ~ '^[A-Za-z]{3}$' THEN
    INSERT INTO public.payment_history (user_id, amount, currency, status, provider, provider_ref, description)
    VALUES (
      _user_id,
      COALESCE(_amount, 0),
      upper(_currency),
      _payment_status,
      'stripe',
      _event_id,
      _event_type
    );
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.stripe_refund_user(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.apply_payment_event(text, text, bigint, uuid, text, text, boolean, timestamptz, boolean, numeric, text, text, text, text) FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON FUNCTION public.stripe_refund_user(text) FROM anon;
    REVOKE ALL ON FUNCTION public.apply_payment_event(text, text, bigint, uuid, text, text, boolean, timestamptz, boolean, numeric, text, text, text, text) FROM anon;
    REVOKE ALL ON public.stripe_customer_links FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON FUNCTION public.stripe_refund_user(text) FROM authenticated;
    REVOKE ALL ON FUNCTION public.apply_payment_event(text, text, bigint, uuid, text, text, boolean, timestamptz, boolean, numeric, text, text, text, text) FROM authenticated;
    REVOKE ALL ON public.stripe_customer_links FROM authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION public.stripe_refund_user(text) TO service_role;
    GRANT EXECUTE ON FUNCTION public.apply_payment_event(text, text, bigint, uuid, text, text, boolean, timestamptz, boolean, numeric, text, text, text, text) TO service_role;
  END IF;
END $$;
