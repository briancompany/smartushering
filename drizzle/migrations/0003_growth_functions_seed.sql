-- RPCs, notification triggers and seed data for growth features

CREATE OR REPLACE FUNCTION public.get_unavailable_dates()
RETURNS TABLE(event_date date, kind text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $func$
  SELECT b.event_date, 'booked'::text
  FROM public.bookings b
  WHERE b.status IN ('pending','confirmed')
  UNION
  SELECT d.date, 'blocked'::text
  FROM public.blocked_dates d
$func$;
GRANT EXECUTE ON FUNCTION public.get_unavailable_dates() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.check_promo(_code text, _subtotal integer)
RETURNS TABLE(valid boolean, discount_kes integer, message text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $func$
DECLARE
  p promo_codes%ROWTYPE;
  disc integer;
BEGIN
  SELECT * INTO p FROM promo_codes WHERE upper(code) = upper(coalesce(_code,''));
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0, 'Code not found'; RETURN;
  END IF;
  IF NOT p.is_active THEN
    RETURN QUERY SELECT false, 0, 'This code is no longer active'; RETURN;
  END IF;
  IF p.expires_at IS NOT NULL AND p.expires_at < CURRENT_DATE THEN
    RETURN QUERY SELECT false, 0, 'This code has expired'; RETURN;
  END IF;
  IF p.max_uses IS NOT NULL AND p.times_used >= p.max_uses THEN
    RETURN QUERY SELECT false, 0, 'This code has reached its limit'; RETURN;
  END IF;
  IF p.discount_type = 'percent' THEN
    disc := round(_subtotal * p.discount_value / 100.0);
  ELSE
    disc := p.discount_value;
  END IF;
  disc := least(greatest(disc, 0), _subtotal);
  RETURN QUERY SELECT true, disc, 'Applied';
END
$func$;
GRANT EXECUTE ON FUNCTION public.check_promo(text, integer) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.redeem_promo(_code text)
RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $func$
  UPDATE promo_codes SET times_used = times_used + 1
  WHERE upper(code) = upper(coalesce(_code,''))
    AND is_active
    AND (expires_at IS NULL OR expires_at >= CURRENT_DATE)
    AND (max_uses IS NULL OR times_used < max_uses);
$func$;
GRANT EXECUTE ON FUNCTION public.redeem_promo(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.notify_new_lead() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $func$
BEGIN
  INSERT INTO public.notifications(type, title, body, link, entity_type, entity_id)
  VALUES ('lead', 'New rate card lead: ' || NEW.full_name,
          COALESCE(NEW.phone || ' · ', '') || COALESCE(NEW.email, ''),
          '/admin/growth', 'lead', NEW.id);
  RETURN NEW;
END
$func$;
CREATE TRIGGER on_lead_created AFTER INSERT ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.notify_new_lead();

CREATE OR REPLACE FUNCTION public.notify_new_callback() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $func$
BEGIN
  INSERT INTO public.notifications(type, title, body, link, entity_type, entity_id)
  VALUES ('callback', 'New callback request: ' || NEW.full_name,
          COALESCE(NEW.preferred_time || ' · ', '') || NEW.phone,
          '/admin/growth', 'callback', NEW.id);
  RETURN NEW;
END
$func$;
CREATE TRIGGER on_callback_created AFTER INSERT ON public.callback_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_new_callback();

INSERT INTO public.add_ons (name, description, price_kes, unit, display_order) VALUES
('Event Supervisor', 'A dedicated supervisor to coordinate the ushering team and liaise with you on the day.', 1500, 'per_day', 1),
('Protocol Officer', 'Senior protocol officer for VIP handling, seating protocol and dignitary reception.', 2500, 'per_day', 2),
('Uniform & Grooming Package', 'Coordinated uniform and a polished grooming standard for every usher.', 300, 'per_usher', 3);

CREATE TRIGGER trg_articles_updated BEFORE UPDATE ON public.articles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();