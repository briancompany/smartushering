
-- 1) notifications
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  entity_type text,
  entity_id uuid,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- 2) audit_logs
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor text NOT NULL,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id uuid,
  diff jsonb,
  ip text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 3) staff
CREATE TABLE public.staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  phone text NOT NULL,
  email text,
  role text NOT NULL DEFAULT 'usher',
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.staff TO service_role;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

-- 4) booking_assignments
CREATE TABLE public.booking_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES public.staff(id) ON DELETE RESTRICT,
  is_team_leader boolean NOT NULL DEFAULT false,
  report_time timestamptz,
  status text NOT NULL DEFAULT 'assigned',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (booking_id, staff_id)
);
GRANT ALL ON public.booking_assignments TO service_role;
ALTER TABLE public.booking_assignments ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_booking_assignments_booking ON public.booking_assignments(booking_id);

-- 5) admin_login_attempts (throttling)
CREATE TABLE public.admin_login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text,
  ip text,
  success boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.admin_login_attempts TO service_role;
ALTER TABLE public.admin_login_attempts ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_login_attempts_recent ON public.admin_login_attempts(username, created_at DESC);

-- 6) quotes
CREATE TABLE public.quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_phone text,
  event_type text NOT NULL,
  event_date date,
  venue text,
  county text,
  package_slug text,
  package_name text,
  number_of_ushers integer NOT NULL,
  package_price_kes integer NOT NULL,
  transport_kes integer NOT NULL DEFAULT 0,
  subtotal_kes integer NOT NULL,
  total_kes integer NOT NULL,
  notes text,
  pdf_path text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.quotes TO service_role;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

-- 7) admin_users: add session expiry tracking
ALTER TABLE public.admin_users
  ADD COLUMN IF NOT EXISTS session_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_active_at timestamptz;

-- 8) bookings: allow admin update via service_role already; add updated_at trigger keeps current
-- (no schema change needed)
