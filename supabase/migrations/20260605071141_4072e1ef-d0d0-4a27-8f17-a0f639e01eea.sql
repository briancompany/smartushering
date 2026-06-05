
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
