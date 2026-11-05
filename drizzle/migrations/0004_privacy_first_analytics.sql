CREATE TABLE public.page_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  path text NOT NULL CHECK (length(path) BETWEEN 1 AND 300 AND left(path, 1) = '/'),
  referrer text,
  device text NOT NULL CHECK (device IN ('mobile', 'desktop', 'tablet')),
  session_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.page_views TO anon;
GRANT SELECT ON public.page_views TO service_role;
ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anonymous visitors can record page views" ON public.page_views FOR INSERT TO anon WITH CHECK (true);

CREATE TABLE public.click_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  path text NOT NULL CHECK (length(path) BETWEEN 1 AND 300 AND left(path, 1) = '/'),
  element text NOT NULL CHECK (length(element) BETWEEN 1 AND 120),
  session_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.click_events TO anon;
GRANT SELECT ON public.click_events TO service_role;
ALTER TABLE public.click_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anonymous visitors can record click events" ON public.click_events FOR INSERT TO anon WITH CHECK (true);

CREATE TABLE public.heatmap_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  path text NOT NULL CHECK (length(path) BETWEEN 1 AND 300 AND left(path, 1) = '/'),
  x_pct numeric(5,2) NOT NULL CHECK (x_pct >= 0 AND x_pct <= 100),
  y_pct numeric(5,2) NOT NULL CHECK (y_pct >= 0 AND y_pct <= 100),
  session_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.heatmap_clicks TO anon;
GRANT SELECT ON public.heatmap_clicks TO service_role;
ALTER TABLE public.heatmap_clicks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anonymous visitors can record heatmap clicks" ON public.heatmap_clicks FOR INSERT TO anon WITH CHECK (true);

CREATE TABLE public.active_sessions (
  session_id uuid PRIMARY KEY,
  path text NOT NULL CHECK (length(path) BETWEEN 1 AND 300 AND left(path, 1) = '/'),
  last_seen timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.active_sessions TO service_role;
ALTER TABLE public.active_sessions ENABLE ROW LEVEL SECURITY;

CREATE INDEX page_views_path_idx ON public.page_views (path);
CREATE INDEX page_views_created_at_idx ON public.page_views (created_at DESC);
CREATE INDEX page_views_session_created_idx ON public.page_views (session_id, created_at DESC);
CREATE INDEX click_events_path_idx ON public.click_events (path);
CREATE INDEX click_events_created_at_idx ON public.click_events (created_at DESC);
CREATE INDEX heatmap_clicks_path_idx ON public.heatmap_clicks (path);
CREATE INDEX heatmap_clicks_created_at_idx ON public.heatmap_clicks (created_at DESC);
CREATE INDEX active_sessions_path_idx ON public.active_sessions (path);
CREATE INDEX active_sessions_last_seen_idx ON public.active_sessions (last_seen DESC);

CREATE OR REPLACE FUNCTION public.analytics_heartbeat(p_session_id uuid, p_path text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_session_id IS NULL OR p_path IS NULL OR length(p_path) < 1 OR length(p_path) > 300 OR left(p_path, 1) <> '/' THEN
    RETURN;
  END IF;
  INSERT INTO public.active_sessions (session_id, path, last_seen)
  VALUES (p_session_id, p_path, now())
  ON CONFLICT (session_id) DO UPDATE SET path = EXCLUDED.path, last_seen = EXCLUDED.last_seen;
END;
$$;
REVOKE ALL ON FUNCTION public.analytics_heartbeat(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.analytics_heartbeat(uuid, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_heartbeat(uuid, text) TO anon;