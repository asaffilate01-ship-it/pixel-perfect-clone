-- Clue Ladder mode ---------------------------------------------------------
CREATE TABLE public.clue_puzzles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sport_id uuid NOT NULL REFERENCES public.sports ON DELETE CASCADE,
  answer_athlete_id uuid NOT NULL REFERENCES public.athletes ON DELETE CASCADE,
  clues_i18n jsonb NOT NULL,
  scheduled_for date,
  archive_enabled boolean NOT NULL DEFAULT true,
  published_at timestamptz,
  created_by uuid REFERENCES auth.users,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sport_id, scheduled_for)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.clue_puzzles TO authenticated;
GRANT ALL ON public.clue_puzzles TO service_role;

ALTER TABLE public.clue_puzzles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff manage clue puzzles"
  ON public.clue_puzzles FOR ALL TO authenticated
  USING (public.has_staff_role()) WITH CHECK (public.has_staff_role());

CREATE TABLE public.clue_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  puzzle_id uuid NOT NULL REFERENCES public.clue_puzzles ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  guesses jsonb NOT NULL DEFAULT '[]'::jsonb,
  clues_revealed smallint NOT NULL DEFAULT 1,
  solved boolean NOT NULL DEFAULT false,
  score int NOT NULL DEFAULT 0,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (puzzle_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.clue_attempts TO authenticated;
GRANT ALL ON public.clue_attempts TO service_role;

ALTER TABLE public.clue_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players read own clue attempts"
  ON public.clue_attempts FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Players start own clue attempts"
  ON public.clue_attempts FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Players update own clue attempts"
  ON public.clue_attempts FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_clue_puzzles_updated_at
  BEFORE UPDATE ON public.clue_puzzles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_clue_attempts_updated_at
  BEFORE UPDATE ON public.clue_attempts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Serve today's puzzle WITHOUT leaking the answer athlete.
CREATE OR REPLACE FUNCTION public.fz_clue_today(p_sport text)
RETURNS TABLE (puzzle_id uuid, sport_name text, scheduled_for date, clues text[])
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cp.id,
         s.name,
         cp.scheduled_for,
         ARRAY(SELECT jsonb_array_elements_text(cp.clues_i18n -> 'en'))
  FROM public.clue_puzzles cp
  JOIN public.sports s ON s.id = cp.sport_id
  WHERE s.slug = p_sport
    AND cp.published_at IS NOT NULL
  ORDER BY cp.scheduled_for DESC NULLS LAST
  LIMIT 1
$$;

-- Check a guess server-side; returns a hot/cold hint on a miss.
CREATE OR REPLACE FUNCTION public.fz_clue_guess(p_puzzle uuid, p_guess text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_answer public.athletes;
  v_guess public.athletes;
  v_hint text;
BEGIN
  SELECT a.* INTO v_answer
  FROM public.clue_puzzles cp
  JOIN public.athletes a ON a.id = cp.answer_athlete_id
  WHERE cp.id = p_puzzle AND cp.published_at IS NOT NULL;

  IF v_answer IS NULL THEN
    RETURN jsonb_build_object('correct', false, 'hint', 'That puzzle is not available.');
  END IF;

  IF public.fz_norm(p_guess) = public.fz_norm(v_answer.name)
     OR EXISTS (
       SELECT 1 FROM unnest(v_answer.aliases) alias
       WHERE public.fz_norm(alias) = public.fz_norm(p_guess)
     ) THEN
    RETURN jsonb_build_object('correct', true, 'answer', v_answer.name);
  END IF;

  SELECT a.* INTO v_guess
  FROM public.athletes a
  WHERE a.sport_id = v_answer.sport_id
    AND (public.fz_norm(a.name) = public.fz_norm(p_guess)
         OR EXISTS (SELECT 1 FROM unnest(a.aliases) alias
                    WHERE public.fz_norm(alias) = public.fz_norm(p_guess)))
  LIMIT 1;

  IF v_guess IS NULL THEN
    v_hint := 'COLD — we do not have that athlete in this sport.';
  ELSIF v_guess.country_code IS NOT NULL
        AND v_guess.country_code = v_answer.country_code THEN
    v_hint := 'WARM — same nationality as the answer.';
  ELSE
    v_hint := 'COLD — different nationality.';
  END IF;

  RETURN jsonb_build_object('correct', false, 'hint', v_hint);
END;
$$;

REVOKE ALL ON FUNCTION public.fz_clue_today(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fz_clue_guess(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fz_clue_today(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fz_clue_guess(uuid, text) TO anon, authenticated, service_role;

-- Seed one Clue Ladder puzzle per playable sport ---------------------------
INSERT INTO public.clue_puzzles (sport_id, answer_athlete_id, clues_i18n, scheduled_for, published_at)
SELECT a.sport_id, a.id, x.clues, '2026-09-01'::date, now()
FROM (VALUES
  ('football', 'Lionel Messi', '{"en":["I made my senior debut outside my country of birth.","I have played in both La Liga and Ligue 1.","I won an Olympic gold medal for my country.","I wore number 10 for Barcelona.","I captained Argentina to a World Cup title."]}'::jsonb),
  ('nba', 'LeBron James', '{"en":["I was drafted straight out of high school.","I have won titles with three different franchises.","I am the all-time leading scorer in league history.","I came back from 3-1 down in a Finals series.","My nickname is King James."]}'::jsonb),
  ('cricket', 'Adam Gilchrist', '{"en":["I kept wicket and opened in white-ball cricket.","I once walked in a World Cup semi-final.","I scored the fastest Australian Test century of my era.","I made 149 in a World Cup final.","My nickname is Gilly."]}'::jsonb)
) AS x(sport_slug, athlete_name, clues)
JOIN public.sports s ON s.slug = x.sport_slug
JOIN public.athletes a ON a.sport_id = s.id AND a.name = x.athlete_name
ON CONFLICT (sport_id, scheduled_for) DO NOTHING;