
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
