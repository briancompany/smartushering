
-- 1. Support tickets: reset flow columns
ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS reset_token uuid UNIQUE,
  ADD COLUMN IF NOT EXISTS reset_token_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS reset_used_at timestamptz;

-- 2. admin_users: temp password state
ALTER TABLE public.admin_users
  ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS temp_password_expires_at timestamptz;

-- 3. notifications: target a specific user (nullable = admin broadcast)
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS target_user_id uuid REFERENCES public.admin_users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_notifications_target_user ON public.notifications(target_user_id, read_at);

-- 4. Assignment → staff notification trigger
CREATE OR REPLACE FUNCTION public.notify_new_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid;
  v_booking record;
BEGIN
  SELECT b.event_type, b.event_date, b.venue INTO v_booking
    FROM public.bookings b WHERE b.id = NEW.booking_id;
  SELECT au.id INTO v_admin_id
    FROM public.admin_users au
    JOIN public.staff s ON s.full_name = au.full_name
    WHERE s.id = NEW.staff_id
    LIMIT 1;
  IF v_admin_id IS NOT NULL THEN
    INSERT INTO public.notifications(type, title, body, link, entity_type, entity_id, target_user_id)
    VALUES ('assignment',
            'New assignment: ' || COALESCE(v_booking.event_type,'event'),
            COALESCE(to_char(v_booking.event_date,'DD Mon YYYY'),'') || ' • ' || COALESCE(v_booking.venue,''),
            '/staff', 'booking_assignment', NEW.id, v_admin_id);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_new_assignment ON public.booking_assignments;
CREATE TRIGGER trg_notify_new_assignment
  AFTER INSERT ON public.booking_assignments
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_assignment();
