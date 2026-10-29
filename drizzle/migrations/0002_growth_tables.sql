-- Commercial growth features: tables

CREATE TABLE public.add_ons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  price_kes integer not null,
  unit text not null default 'per_day',
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);
GRANT SELECT ON public.add_ons TO anon, authenticated;
GRANT ALL ON public.add_ons TO service_role;
ALTER TABLE public.add_ons ENABLE ROW LEVEL SECURITY;
CREATE POLICY active_add_ons_public ON public.add_ons FOR SELECT TO anon, authenticated USING (is_active);
CREATE INDEX idx_add_ons_order ON public.add_ons (display_order);

CREATE TABLE public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  discount_type text not null default 'percent',
  discount_value integer not null,
  max_uses integer,
  times_used integer not null default 0,
  expires_at date,
  is_active boolean not null default true,
  note text,
  created_at timestamptz not null default now()
);
GRANT ALL ON public.promo_codes TO service_role;
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_promo_codes_code ON public.promo_codes (code);

CREATE TABLE public.blocked_dates (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  reason text,
  created_at timestamptz not null default now()
);
GRANT SELECT ON public.blocked_dates TO anon, authenticated;
GRANT ALL ON public.blocked_dates TO service_role;
ALTER TABLE public.blocked_dates ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  excerpt text not null default '',
  body text not null,
  author text not null default 'Smart Ushering Team',
  is_published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
GRANT SELECT ON public.articles TO anon, authenticated;
GRANT ALL ON public.articles TO service_role;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY published_articles_public ON public.articles FOR SELECT TO anon, authenticated USING (is_published);
CREATE INDEX idx_articles_published ON public.articles (published_at DESC);

CREATE TABLE public.leads (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null,
  email text,
  source text not null default 'rate_card',
  created_at timestamptz not null default now()
);
GRANT ALL ON public.leads TO service_role;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_leads_created ON public.leads (created_at DESC);

CREATE TABLE public.callback_requests (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null,
  preferred_time text,
  notes text,
  status text not null default 'new',
  created_at timestamptz not null default now()
);
GRANT ALL ON public.callback_requests TO service_role;
ALTER TABLE public.callback_requests ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_callbacks_created ON public.callback_requests (created_at DESC);

CREATE TABLE public.referral_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  referrer_name text not null,
  referrer_phone text not null,
  reward_given boolean not null default false,
  reward_code text,
  created_at timestamptz not null default now()
);
GRANT ALL ON public.referral_codes TO service_role;
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_referral_codes_code ON public.referral_codes (code);

ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS add_ons jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS promo_code text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS discount_kes integer NOT NULL DEFAULT 0;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS referral_code text;
CREATE INDEX IF NOT EXISTS idx_bookings_event_date ON public.bookings (event_date);
CREATE INDEX IF NOT EXISTS idx_bookings_referral_code ON public.bookings (referral_code);