-- Smart Ushering — consolidated schema (all migrations, in order)
-- Run this once in the SQL editor of your own Supabase project.

-- ============================================================
-- 20260602085450_3450e429-b992-4844-86a8-39f9239f0e2f.sql
-- ============================================================

-- =========== ADMIN USERS ===========
CREATE TABLE public.admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  session_token TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.admin_users TO service_role;
-- no anon/authenticated grants: admin auth goes via server functions

INSERT INTO public.admin_users (username, password) VALUES ('Lensa', '@Lensa1#');

-- =========== SERVICES ===========
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT,
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.services TO anon, authenticated;
GRANT ALL ON public.services TO service_role;
CREATE POLICY "Public can read services" ON public.services FOR SELECT TO anon, authenticated USING (is_active = true);

INSERT INTO public.services (title, description, display_order) VALUES
('Wedding Ushering', 'Elegant guest reception and seating coordination for unforgettable weddings.', 1),
('Corporate Event Ushering', 'Polished professionals for conferences, AGMs and corporate gatherings.', 2),
('Conference Support', 'Smooth check-in, badge handling and floor management for conferences.', 3),
('Seminar Support', 'Reliable seminar coordination and delegate assistance.', 4),
('VIP Guest Management', 'Discreet, world-class care for VIPs and dignitaries.', 5),
('Gala Dinner Support', 'Refined service for high-end gala dinners and award nights.', 6),
('Graduation Ceremony Support', 'Organised seating, regalia handling and family guidance.', 7),
('Funeral Service Support', 'Compassionate and dignified ushering at memorial services.', 8),
('Award Ceremony Support', 'Coordinated guest flow for award nights and recognitions.', 9),
('Government Function Support', 'Protocol-compliant ushering for state and county events.', 10),
('Church Event Support', 'Warm, faith-sensitive ushering for church functions.', 11),
('Registration Desk Management', 'Efficient guest registration, badging and data capture.', 12),
('Guest Reception Services', 'A warm, professional first impression for every guest.', 13),
('Protocol Assistance', 'Etiquette and protocol support for formal occasions.', 14),
('Brand Activation Support', 'Energetic brand ambassadors for activations and roadshows.', 15),
('Product Launch Support', 'Polished hosts and ushers for product unveilings.', 16),
('Event Coordination Support', 'On-ground coordination to keep your event running on time.', 17),
('Information Desk Services', 'Knowledgeable staff to guide guests throughout your venue.', 18);

-- =========== PRICING PACKAGES ===========
CREATE TABLE public.pricing_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  price_kes INT NOT NULL,
  description TEXT NOT NULL,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  display_order INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.pricing_packages ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.pricing_packages TO anon, authenticated;
GRANT ALL ON public.pricing_packages TO service_role;
CREATE POLICY "Public can read pricing" ON public.pricing_packages FOR SELECT TO anon, authenticated USING (true);

INSERT INTO public.pricing_packages (slug, name, price_kes, description, features, display_order) VALUES
('standard', 'Standard Package', 1500, 'Per Usher — ideal for weddings and private functions.',
 '["Weddings","Birthdays","Church Events","Private Functions"]'::jsonb, 1),
('corporate', 'Corporate Package', 2500, 'Per Usher — for conferences, seminars and corporate events.',
 '["Conferences","Seminars","Workshops","Corporate Events","Award Ceremonies"]'::jsonb, 2),
('vip', 'High-End & VIP Package', 5000, 'Per Usher — premium professionals for VIP and diplomatic events.',
 '["VIP Functions","Diplomatic Functions","Executive Events","International Events"]'::jsonb, 3);

-- transport / settings as key-value
CREATE TABLE public.site_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT ALL ON public.site_settings TO service_role;
CREATE POLICY "Public can read settings" ON public.site_settings FOR SELECT TO anon, authenticated USING (true);

INSERT INTO public.site_settings (key, value) VALUES
('transport_nairobi_kes', '200'),
('phone', '0112836281'),
('email', 'ayietalensa@gmail.com'),
('whatsapp', '254112836281'),
('hero_headline', 'Professional Ushering Services for Exceptional Events'),
('hero_subheadline', 'Providing professional guest management, hospitality support, protocol assistance and event staffing services across Kenya.');

-- =========== BOOKINGS ===========
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  event_type TEXT NOT NULL,
  package_slug TEXT NOT NULL,
  package_price_kes INT NOT NULL,
  number_of_ushers INT NOT NULL,
  event_date DATE NOT NULL,
  venue TEXT NOT NULL,
  county TEXT NOT NULL,
  special_instructions TEXT,
  estimated_cost_kes INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
GRANT INSERT ON public.bookings TO anon, authenticated;
GRANT ALL ON public.bookings TO service_role;
CREATE POLICY "Anyone can submit booking" ON public.bookings FOR INSERT TO anon, authenticated WITH CHECK (true);

-- =========== GALLERY ===========
CREATE TABLE public.gallery_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  image_url TEXT NOT NULL,
  caption TEXT,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.gallery_images ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.gallery_images TO anon, authenticated;
GRANT ALL ON public.gallery_images TO service_role;
CREATE POLICY "Public can read gallery" ON public.gallery_images FOR SELECT TO anon, authenticated USING (true);

-- =========== TESTIMONIALS ===========
CREATE TABLE public.testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author TEXT NOT NULL,
  role TEXT,
  quote TEXT NOT NULL,
  rating INT NOT NULL DEFAULT 5,
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.testimonials TO anon, authenticated;
GRANT ALL ON public.testimonials TO service_role;
CREATE POLICY "Public can read testimonials" ON public.testimonials FOR SELECT TO anon, authenticated USING (is_active = true);

INSERT INTO public.testimonials (author, role, quote, display_order) VALUES
('Grace Wanjiku', 'Bride, Karen Wedding', 'Smart Ushering made our wedding day flawless. The team was warm, professional and perfectly coordinated.', 1),
('David Otieno', 'Events Manager, Safaricom', 'Outstanding corporate ushering. Our delegates were impressed from the registration desk to the gala dinner.', 2),
('Hon. Margaret Kimani', 'Government Function Host', 'Exemplary protocol awareness. They handled our VIPs with the discretion the occasion deserved.', 3),
('Pastor John Mwangi', 'Church Anniversary', 'Faith-sensitive, warm and reliable. Our congregation felt cared for from arrival to departure.', 4);

-- =========== FAQs ===========
CREATE TABLE public.faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.faqs TO anon, authenticated;
GRANT ALL ON public.faqs TO service_role;
CREATE POLICY "Public can read faqs" ON public.faqs FOR SELECT TO anon, authenticated USING (is_active = true);

INSERT INTO public.faqs (question, answer, display_order) VALUES
('How many ushers can be provided?', 'We have a trained team of 30+ professionals and can scale up for larger events with advance notice.', 1),
('Do you operate outside Nairobi?', 'Yes — we are available nationwide across Kenya. Transport is agreed during booking for events outside Nairobi.', 2),
('How does booking work?', 'Submit a booking through our website, we confirm availability, agree on logistics, and your team is dispatched on the day.', 3),
('How are prices calculated?', 'Pricing is per usher per event, depending on the package (Standard, Corporate, or VIP). Transport is KES 200 per usher within Nairobi.', 4),
('How early should I book?', 'We recommend booking at least 2 weeks in advance, especially during peak wedding and conference seasons.', 5);

-- =========== CONTACT SUBMISSIONS ===========
CREATE TABLE public.contact_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  subject TEXT,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;
GRANT INSERT ON public.contact_submissions TO anon, authenticated;
GRANT ALL ON public.contact_submissions TO service_role;
CREATE POLICY "Anyone can contact" ON public.contact_submissions FOR INSERT TO anon, authenticated WITH CHECK (true);

-- =========== CHAT ===========
CREATE TABLE public.chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_name TEXT NOT NULL,
  visitor_phone TEXT NOT NULL,
  visitor_email TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.chat_conversations TO anon, authenticated;
GRANT ALL ON public.chat_conversations TO service_role;
CREATE POLICY "Anyone create conversation" ON public.chat_conversations FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone read conversation by id" ON public.chat_conversations FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone update last_message_at" ON public.chat_conversations FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  sender TEXT NOT NULL, -- 'visitor' or 'admin'
  body TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.chat_messages (conversation_id, created_at);
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON public.chat_messages TO anon, authenticated;
GRANT ALL ON public.chat_messages TO service_role;
CREATE POLICY "Anyone read messages" ON public.chat_messages FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone insert messages" ON public.chat_messages FOR INSERT TO anon, authenticated WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_conversations;

-- ============================================================
-- STORAGE BUCKETS (all buckets the app uses — idempotent)
-- Run this whole file in the SQL Editor; these inserts create
-- every bucket so no feature ever hits "bucket not found".
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES
  ('chat-uploads', 'chat-uploads', false, 10485760),  -- 10MB, chat + visitor images
  ('gallery', 'gallery', false, 10485760),            -- 10MB, public gallery photos
  ('quotes', 'quotes', false, 20971520),              -- 20MB, generated PDF quotes
  ('backups', 'backups', false, NULL)                 -- admin JSON backup snapshots
ON CONFLICT (id) DO NOTHING;

-- Gallery bucket access (admin panel uploads via its own login)
CREATE POLICY "Anyone can upload gallery images" ON storage.objects FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'gallery');
CREATE POLICY "Anyone can read gallery images" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'gallery');
CREATE POLICY "Anyone can delete gallery images" ON storage.objects FOR DELETE TO anon, authenticated
  USING (bucket_id = 'gallery');

-- ============================================================
-- 20260602085515_198d2bf2-bb1e-4766-93c2-eb2e8f2f2851.sql
-- ============================================================

CREATE POLICY "Anyone can upload chat images" ON storage.objects FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'chat-uploads');
CREATE POLICY "Anyone can read chat images" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'chat-uploads');

-- ============================================================
-- 20260603083600_32982cee-8ba6-48a4-a04f-c02282f76c23.sql
-- ============================================================

-- Lock down admin_users: enable RLS with no public policies (only service_role bypasses).
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_users FROM anon, authenticated;
GRANT ALL ON public.admin_users TO service_role;

-- Hash existing plaintext password using pgcrypto bcrypt
CREATE EXTENSION IF NOT EXISTS pgcrypto;
UPDATE public.admin_users
SET password = crypt(password, gen_salt('bf', 10))
WHERE password NOT LIKE '$2%';

-- Update contact email setting
UPDATE public.site_settings SET value = 'Smartushering@gmail.com', updated_at = now() WHERE key = 'email';

-- ============================================================
-- 20260603083628_254780e8-61db-4331-8599-df56a07d2f34.sql
-- ============================================================

CREATE OR REPLACE FUNCTION public.verify_admin_password(_username text, _password text)
RETURNS TABLE(id uuid, username text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT id, username FROM public.admin_users
  WHERE username = _username AND password = crypt(_password, password)
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.verify_admin_password(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_admin_password(text, text) TO service_role;

-- ============================================================
-- 20260603090258_667123b4-0cde-4566-86c7-a297f712171e.sql
-- ============================================================

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

-- ============================================================
-- 20260603090401_cdb1decd-d56d-4a01-8518-3f905478ab0e.sql
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER staff_updated_at BEFORE UPDATE ON public.staff
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER booking_assignments_updated_at BEFORE UPDATE ON public.booking_assignments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Notifications on booking insert
CREATE OR REPLACE FUNCTION public.notify_new_booking()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notifications(type, title, body, link, entity_type, entity_id)
  VALUES ('booking', 'New booking: ' || NEW.full_name,
          NEW.event_type || ' on ' || NEW.event_date || ' • ' || NEW.number_of_ushers || ' ushers',
          '/admin/bookings', 'booking', NEW.id);
  RETURN NEW;
END $$;
CREATE TRIGGER bookings_notify AFTER INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_booking();

-- Notifications on contact submission
CREATE OR REPLACE FUNCTION public.notify_new_contact()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notifications(type, title, body, link, entity_type, entity_id)
  VALUES ('contact', 'New contact message: ' || NEW.full_name,
          COALESCE(NEW.subject, substring(NEW.message, 1, 100)),
          '/admin/messages', 'contact', NEW.id);
  RETURN NEW;
END $$;
CREATE TRIGGER contact_notify AFTER INSERT ON public.contact_submissions
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_contact();

-- Notifications on new chat conversation
CREATE OR REPLACE FUNCTION public.notify_new_chat()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notifications(type, title, body, link, entity_type, entity_id)
  VALUES ('chat', 'New chat from ' || NEW.visitor_name,
          NEW.visitor_phone, '/admin/chats', 'chat', NEW.id);
  RETURN NEW;
END $$;
CREATE TRIGGER chat_conversations_notify AFTER INSERT ON public.chat_conversations
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_chat();

-- Grant SELECT on contact_submissions to service_role for admin viewing
GRANT SELECT ON public.contact_submissions TO service_role;

-- ============================================================
-- 20260604050959_3cc96c8c-bb70-4d2a-b330-d548949c9aea.sql
-- ============================================================

CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author text NOT NULL,
  email text,
  role text,
  event_type text,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  quote text NOT NULL,
  is_approved boolean NOT NULL DEFAULT false,
  display_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.reviews TO anon, authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read approved reviews" ON public.reviews FOR SELECT TO anon, authenticated USING (is_approved = true);
CREATE POLICY "Anyone can submit a review" ON public.reviews FOR INSERT TO anon, authenticated WITH CHECK (is_approved = false);

CREATE OR REPLACE FUNCTION public.notify_new_review()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO public.notifications(type, title, body, link, entity_type, entity_id)
  VALUES ('review', 'New review from ' || NEW.author,
          'Rating: ' || NEW.rating || '/5 — ' || substring(NEW.quote, 1, 100),
          '/admin/reviews', 'review', NEW.id);
  RETURN NEW;
END $$;
CREATE TRIGGER trg_notify_new_review AFTER INSERT ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.notify_new_review();

CREATE TABLE public.rate_limits (
  id bigserial PRIMARY KEY,
  bucket text NOT NULL,
  identifier text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.rate_limits TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.rate_limits_id_seq TO service_role;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
CREATE INDEX rate_limits_lookup ON public.rate_limits(bucket, identifier, created_at DESC);

-- ============================================================
-- 20260605071141_4072e1ef-d0d0-4a27-8f17-a0f639e01eea.sql
-- ============================================================

-- RBAC extension on admin_users
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM (
    'super_admin','staff_management','bookings_operations',
    'customer_support','media_content','finance_reporting','staff'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.admin_users
  ADD COLUMN IF NOT EXISTS role public.app_role NOT NULL DEFAULT 'super_admin',
  ADD COLUMN IF NOT EXISTS department text,
  ADD COLUMN IF NOT EXISTS is_super_admin boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_department_head boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS staff_id text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS remember_me_until timestamptz,
  ADD COLUMN IF NOT EXISTS created_by uuid;

-- Backfill: all existing rows -> super admins
UPDATE public.admin_users
  SET is_super_admin = true, role = 'super_admin', is_active = true
  WHERE is_super_admin = false OR is_super_admin IS NULL;

-- Unique staff_id (allow NULLs)
CREATE UNIQUE INDEX IF NOT EXISTS admin_users_staff_id_unique
  ON public.admin_users (staff_id) WHERE staff_id IS NOT NULL;

-- One department head per role
CREATE UNIQUE INDEX IF NOT EXISTS admin_users_one_head_per_role
  ON public.admin_users (role) WHERE is_department_head = true;

-- Unified login: by username OR staff_id OR phone, only active accounts
CREATE OR REPLACE FUNCTION public.verify_login(_identifier text, _password text)
RETURNS TABLE(id uuid, username text, role public.app_role, is_super_admin boolean,
              is_department_head boolean, department text, full_name text, staff_id text)
LANGUAGE sql SECURITY DEFINER SET search_path = public, extensions AS $$
  SELECT u.id, u.username, u.role, u.is_super_admin, u.is_department_head,
         u.department, u.full_name, u.staff_id
  FROM public.admin_users u
  WHERE u.is_active = true
    AND (u.username = _identifier OR u.staff_id = _identifier OR u.phone = _identifier)
    AND u.password = crypt(_password, u.password)
  LIMIT 1;
$$;

-- Helper: create a new staff/admin account (Super Admin only path enforced in app layer)
CREATE OR REPLACE FUNCTION public.create_staff_account(
  _full_name text, _username text, _staff_id text, _phone text,
  _password text, _role public.app_role, _department text,
  _is_department_head boolean, _created_by uuid
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE new_id uuid;
BEGIN
  -- If marking new head, demote existing head in this role
  IF _is_department_head THEN
    UPDATE public.admin_users SET is_department_head = false
      WHERE role = _role AND is_department_head = true;
  END IF;
  INSERT INTO public.admin_users(
    username, password, full_name, staff_id, phone, role, department,
    is_department_head, is_super_admin, is_active, created_by
  ) VALUES (
    _username, crypt(_password, gen_salt('bf')), _full_name, _staff_id, _phone,
    _role, _department, _is_department_head, (_role = 'super_admin'), true, _created_by
  ) RETURNING id INTO new_id;
  RETURN new_id;
END $$;

-- Update password helper
CREATE OR REPLACE FUNCTION public.update_account_password(_id uuid, _password text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public, extensions AS $$
  UPDATE public.admin_users SET password = crypt(_password, gen_salt('bf')) WHERE id = _id;
$$;

-- ============================================================
-- 20260606074021_5660f9d5-c2c9-4557-b811-154730e161d4.sql
-- ============================================================

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

-- ============================================================
-- 20260607075800_a1a3f671-e2ec-4058-8cac-ba00b916d3c3.sql
-- ============================================================

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

-- ============================================================
-- 20260701122702_bf5508b0-7418-4fdb-b819-ec25740647e1.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_no text UNIQUE NOT NULL DEFAULT ('TCK-' || upper(substring(replace(gen_random_uuid()::text,'-',''),1,8))),
  category text NOT NULL CHECK (category IN ('forgot_password','account_help','bug_report','feature_request','general','complaint','other')),
  subject text NOT NULL,
  details text,
  submitter_name text,
  submitter_username text,
  submitter_phone text,
  submitter_email text,
  is_staff boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','closed')),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  admin_response text,
  handled_by uuid REFERENCES public.admin_users(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.support_tickets TO anon, authenticated;
GRANT ALL ON public.support_tickets TO service_role;

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can open a ticket" ON public.support_tickets;
CREATE POLICY "Anyone can open a ticket"
  ON public.support_tickets FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_category ON public.support_tickets(category);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON public.support_tickets(created_at DESC);

CREATE OR REPLACE FUNCTION public.notify_new_ticket()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notifications(type, title, body, link, entity_type, entity_id)
  VALUES ('ticket',
          'New ticket: ' || NEW.subject,
          COALESCE(NEW.submitter_name,'') || ' • ' || NEW.category,
          '/admin/tickets', 'ticket', NEW.id);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_new_ticket ON public.support_tickets;
CREATE TRIGGER trg_notify_new_ticket AFTER INSERT ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_ticket();

DROP TRIGGER IF EXISTS trg_support_tickets_updated ON public.support_tickets;
CREATE TRIGGER trg_support_tickets_updated BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.grievances ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS trg_grievances_updated ON public.grievances;
CREATE TRIGGER trg_grievances_updated BEFORE UPDATE ON public.grievances
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_assets_updated ON public.assets;
CREATE TRIGGER trg_assets_updated BEFORE UPDATE ON public.assets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_announcements_updated ON public.announcements;
CREATE TRIGGER trg_announcements_updated BEFORE UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_assignments_staff ON public.booking_assignments(staff_id);
CREATE INDEX IF NOT EXISTS idx_assignments_booking ON public.booking_assignments(booking_id);
CREATE INDEX IF NOT EXISTS idx_assets_assigned_to ON public.assets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_assets_status ON public.assets(status);
CREATE INDEX IF NOT EXISTS idx_grievances_status ON public.grievances(status);
CREATE INDEX IF NOT EXISTS idx_grievances_created_at ON public.grievances(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON public.announcements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON public.bookings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_users_session_token ON public.admin_users(session_token) WHERE session_token IS NOT NULL;

ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grievances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 20260702112012_4b7bc0fb-af7f-405b-8cc8-f698981fdb3f.sql
-- ============================================================

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

