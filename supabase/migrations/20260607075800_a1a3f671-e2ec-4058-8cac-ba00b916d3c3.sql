
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'assigned';
CREATE INDEX IF NOT EXISTS idx_assets_assigned_to ON public.assets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_assets_status ON public.assets(status);

ALTER TABLE public.admin_users ADD COLUMN IF NOT EXISTS email text;
CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_users_email ON public.admin_users(lower(email)) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_admin_users_active ON public.admin_users(is_active);
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON public.admin_users(role);

ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS target_department text,
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_announcements_public ON public.announcements(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_announcements_target_dept ON public.announcements(target_department);
CREATE INDEX IF NOT EXISTS idx_announcements_created ON public.announcements(created_at DESC);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read public announcements" ON public.announcements;
CREATE POLICY "Public read public announcements"
  ON public.announcements FOR SELECT
  TO anon, authenticated
  USING (is_public = true AND (expires_at IS NULL OR expires_at > now()));
GRANT SELECT ON public.announcements TO anon, authenticated;

CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_created ON public.bookings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_event_date ON public.bookings(event_date);
CREATE INDEX IF NOT EXISTS idx_booking_assignments_staff ON public.booking_assignments(staff_id);
CREATE INDEX IF NOT EXISTS idx_booking_assignments_booking ON public.booking_assignments(booking_id);
CREATE INDEX IF NOT EXISTS idx_grievances_status ON public.grievances(status);
CREATE INDEX IF NOT EXISTS idx_grievances_created ON public.grievances(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON public.notifications(created_at DESC);

DROP FUNCTION IF EXISTS public.verify_login(text, text);
CREATE FUNCTION public.verify_login(_identifier text, _password text)
 RETURNS TABLE(id uuid, username text, role app_role, is_super_admin boolean, is_department_head boolean, department text, full_name text, staff_id text, email text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
  SELECT u.id, u.username, u.role, u.is_super_admin, u.is_department_head,
         u.department, u.full_name, u.staff_id, u.email
  FROM public.admin_users u
  WHERE u.is_active = true
    AND (
      u.username = _identifier
      OR u.staff_id = _identifier
      OR u.phone = _identifier
      OR lower(u.email) = lower(_identifier)
    )
    AND u.password = crypt(_password, u.password)
  LIMIT 1;
$function$;

DROP FUNCTION IF EXISTS public.create_staff_account(text, text, text, text, text, app_role, text, boolean, uuid);
CREATE FUNCTION public.create_staff_account(
  _full_name text, _username text, _staff_id text, _phone text,
  _password text, _role app_role, _department text,
  _is_department_head boolean, _created_by uuid, _email text DEFAULT NULL
)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE new_id uuid;
BEGIN
  IF _is_department_head THEN
    UPDATE public.admin_users SET is_department_head = false
      WHERE role = _role AND is_department_head = true;
  END IF;
  INSERT INTO public.admin_users(
    username, password, full_name, staff_id, phone, email, role, department,
    is_department_head, is_super_admin, is_active, created_by
  ) VALUES (
    _username, crypt(_password, gen_salt('bf')), _full_name, _staff_id, _phone, _email,
    _role, _department, _is_department_head, (_role = 'super_admin'), true, _created_by
  ) RETURNING id INTO new_id;
  RETURN new_id;
END $function$;
