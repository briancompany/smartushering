
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

-- chat images storage bucket created via tool separately
