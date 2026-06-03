
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
