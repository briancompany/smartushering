
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
