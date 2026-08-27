ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS number_of_days integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS event_dates date[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS transport_rate_kes integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valid_until date;

UPDATE public.quotes
SET transport_rate_kes = CASE WHEN number_of_ushers > 0 THEN (transport_kes / number_of_ushers) ELSE 0 END
WHERE transport_rate_kes = 0 AND transport_kes > 0;

UPDATE public.quotes
SET event_dates = ARRAY[event_date]
WHERE event_date IS NOT NULL AND cardinality(event_dates) = 0;

UPDATE public.quotes
SET valid_until = (created_at + interval '14 days')::date
WHERE valid_until IS NULL;