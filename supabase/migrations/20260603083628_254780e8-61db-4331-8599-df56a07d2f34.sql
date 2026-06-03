
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
