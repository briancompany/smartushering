
-- Announcements
CREATE TABLE public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('urgent','important','normal')),
  audience text NOT NULL DEFAULT 'all' CHECK (audience IN ('all','department','role')),
  target_value text,
  expires_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.announcements TO authenticated;
GRANT ALL ON public.announcements TO service_role;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.announcement_reads (
  id bigserial PRIMARY KEY,
  announcement_id uuid NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  read_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(announcement_id, user_id)
);
GRANT SELECT, INSERT ON public.announcement_reads TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.announcement_reads_id_seq TO authenticated;
GRANT ALL ON public.announcement_reads TO service_role;
GRANT ALL ON SEQUENCE public.announcement_reads_id_seq TO service_role;
ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;

-- Grievances / concerns
CREATE TABLE public.grievances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL,
  body text NOT NULL,
  submitted_by uuid,
  submitted_by_name text,
  is_anonymous boolean NOT NULL DEFAULT false,
  department text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_review','resolved')),
  admin_response text,
  responded_by text,
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.grievances TO authenticated;
GRANT ALL ON public.grievances TO service_role;
ALTER TABLE public.grievances ENABLE ROW LEVEL SECURITY;

-- Assets
CREATE TABLE public.assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  asset_code text UNIQUE,
  category text,
  condition text NOT NULL DEFAULT 'good' CHECK (condition IN ('new','good','fair','damaged','retired')),
  assigned_to uuid,
  assigned_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.assets TO authenticated;
GRANT ALL ON public.assets TO service_role;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

-- Client event tracking tokens (allow customer to view booking status)
CREATE TABLE public.client_event_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL,
  token text NOT NULL UNIQUE,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.client_event_tokens TO anon, authenticated;
GRANT ALL ON public.client_event_tokens TO service_role;
ALTER TABLE public.client_event_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read tokens by id" ON public.client_event_tokens FOR SELECT TO anon, authenticated USING (true);

-- updated_at trigger reuse
CREATE TRIGGER grievances_set_updated_at BEFORE UPDATE ON public.grievances FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER assets_set_updated_at BEFORE UPDATE ON public.assets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Notify admins of new grievance
CREATE OR REPLACE FUNCTION public.notify_new_grievance() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO public.notifications(type, title, body, link, entity_type, entity_id)
  VALUES ('grievance',
          'New concern: ' || NEW.subject,
          CASE WHEN NEW.is_anonymous THEN 'Anonymous submission' ELSE COALESCE(NEW.submitted_by_name,'') END,
          '/admin/grievances', 'grievance', NEW.id);
  RETURN NEW;
END $$;
CREATE TRIGGER trg_notify_new_grievance AFTER INSERT ON public.grievances FOR EACH ROW EXECUTE FUNCTION public.notify_new_grievance();
