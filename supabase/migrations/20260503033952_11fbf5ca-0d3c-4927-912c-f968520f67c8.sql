
CREATE TABLE public.recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  category text NOT NULL DEFAULT 'feature',
  status text NOT NULL DEFAULT 'open',
  anonymous_user_id text NOT NULL,
  upvotes integer NOT NULL DEFAULT 0,
  downvotes integer NOT NULL DEFAULT 0,
  admin_response text,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public view recommendations" ON public.recommendations
  FOR SELECT USING (deleted_at IS NULL);
CREATE POLICY "Admins view all recommendations" ON public.recommendations
  FOR SELECT TO authenticated USING (is_admin_tier(auth.uid()));
CREATE POLICY "Public insert recommendations" ON public.recommendations
  FOR INSERT WITH CHECK (
    length(title) BETWEEN 3 AND 200
    AND length(body) BETWEEN 3 AND 2000
    AND length(anonymous_user_id) BETWEEN 8 AND 128
    AND NOT is_blocked(anonymous_user_id)
  );
CREATE POLICY "Admins update recommendations" ON public.recommendations
  FOR UPDATE TO authenticated USING (is_admin_tier(auth.uid())) WITH CHECK (is_admin_tier(auth.uid()));
CREATE POLICY "Admins delete recommendations" ON public.recommendations
  FOR DELETE TO authenticated USING (
    has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'moderator')
  );

CREATE TRIGGER recommendations_touch
  BEFORE UPDATE ON public.recommendations
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.recommendation_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id uuid NOT NULL REFERENCES public.recommendations(id) ON DELETE CASCADE,
  anonymous_user_id text NOT NULL,
  vote smallint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (recommendation_id, anonymous_user_id),
  CHECK (vote IN (-1, 1))
);

ALTER TABLE public.recommendation_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public view votes" ON public.recommendation_votes FOR SELECT USING (true);
CREATE POLICY "Public insert votes" ON public.recommendation_votes
  FOR INSERT WITH CHECK (
    length(anonymous_user_id) BETWEEN 8 AND 128
    AND NOT is_blocked(anonymous_user_id)
  );
CREATE POLICY "Public update own vote" ON public.recommendation_votes
  FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete own vote" ON public.recommendation_votes
  FOR DELETE USING (true);

CREATE TRIGGER recommendation_votes_touch
  BEFORE UPDATE ON public.recommendation_votes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Recompute vote tallies on the parent recommendation
CREATE OR REPLACE FUNCTION public.recompute_recommendation_votes()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE rid uuid;
BEGIN
  rid := COALESCE(NEW.recommendation_id, OLD.recommendation_id);
  UPDATE public.recommendations r
  SET upvotes = COALESCE((SELECT count(*) FROM public.recommendation_votes WHERE recommendation_id = rid AND vote = 1), 0),
      downvotes = COALESCE((SELECT count(*) FROM public.recommendation_votes WHERE recommendation_id = rid AND vote = -1), 0)
  WHERE r.id = rid;
  RETURN NULL;
END $$;

CREATE TRIGGER recommendation_votes_recount
  AFTER INSERT OR UPDATE OR DELETE ON public.recommendation_votes
  FOR EACH ROW EXECUTE FUNCTION public.recompute_recommendation_votes();

ALTER PUBLICATION supabase_realtime ADD TABLE public.recommendations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.recommendation_votes;
