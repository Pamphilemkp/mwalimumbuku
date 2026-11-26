-- Verified educational games and the XP ledger.
-- Exercise points stay in results. Homework grades are not written here.

ALTER TABLE public.badges
  ADD COLUMN IF NOT EXISTS achievement_code text;

CREATE UNIQUE INDEX IF NOT EXISTS badges_achievement_code_key
  ON public.badges (achievement_code);

CREATE OR REPLACE FUNCTION public.award_badge_if_eligible(_badge_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _total_points int;
  _required int;
  _code text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT points_required, achievement_code INTO _required, _code
  FROM badges WHERE id = _badge_id;

  IF _required IS NULL AND _code IS NULL THEN
    RAISE EXCEPTION 'Badge not found';
  END IF;

  IF _code IS NOT NULL THEN
    RAISE EXCEPTION 'This badge is awarded from verified activity';
  END IF;

  SELECT COALESCE(SUM(points_earned), 0) INTO _total_points
  FROM results WHERE user_id = auth.uid();

  IF _total_points < _required THEN
    RAISE EXCEPTION 'Insufficient points to earn this badge';
  END IF;

  INSERT INTO user_badges (user_id, badge_id) VALUES (auth.uid(), _badge_id)
  ON CONFLICT DO NOTHING;
END;
$$;

INSERT INTO public.badges (name, description, points_required, achievement_code)
VALUES
  ('Première partie', 'Une partie vérifiée a été enregistrée.', 0, 'first_game'),
  ('Mémoire complète', 'Toutes les paires ont été trouvées.', 0, 'memory_clear'),
  ('Ordre parfait', 'Les lettres sont dans l''ordre alphabétique.', 0, 'alphabet_perfect'),
  ('Série de calcul', 'Cinq bonnes réponses de suite dans une partie.', 0, 'math_streak_5'),
  ('Frappe précise', 'Au moins cinq mots justes avec 90 % de précision.', 0, 'typing_accurate'),
  ('Couleurs justes', 'Toutes les couleurs de la partie sont justes.', 0, 'color_clear'),
  ('Mots justes', 'Tous les mots mélangés de la partie sont justes.', 0, 'word_clear'),
  ('Série de trois jours', 'Trois jours d''école d''affilée avec une partie vérifiée.', 0, 'streak_3')
ON CONFLICT (achievement_code) DO NOTHING;

CREATE OR REPLACE FUNCTION public.game_draw(rng_state bigint, n integer)
RETURNS TABLE(next_state bigint, value integer)
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  current bigint;
BEGIN
  current := CASE
    WHEN rng_state IS NULL OR rng_state % 4294967296 = 0 THEN 1
    ELSE rng_state % 4294967296
  END;
  next_state := (1664525::bigint * current + 1013904223) % 4294967296;
  value := ((next_state * n::bigint) / 4294967296)::integer;
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.game_shuffle_text(rng_state bigint, items text[])
RETURNS TABLE(next_state bigint, shuffled text[])
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  copy text[] := items;
  len integer := COALESCE(array_length(items, 1), 0);
  pos integer;
  pick integer;
  swap text;
BEGIN
  next_state := COALESCE(rng_state, 0);
  FOR pos IN REVERSE len..2 LOOP
    SELECT drawn.next_state, drawn.value INTO next_state, pick
    FROM public.game_draw(next_state, pos) AS drawn;
    swap := copy[pos];
    copy[pos] := copy[pick + 1];
    copy[pick + 1] := swap;
  END LOOP;
  shuffled := copy;
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.fold_word(value text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  trimmed text := btrim(COALESCE(value, ''));
  result text := '';
  i integer;
  ch text;
BEGIN
  FOR i IN 1..length(trimmed) LOOP
    ch := substr(trimmed, i, 1);
    result := result || CASE ch
      WHEN 'é' THEN 'É' WHEN 'è' THEN 'È' WHEN 'ê' THEN 'Ê' WHEN 'ë' THEN 'Ë'
      WHEN 'à' THEN 'À' WHEN 'â' THEN 'Â' WHEN 'ù' THEN 'Ù' WHEN 'û' THEN 'Û'
      WHEN 'ô' THEN 'Ô' WHEN 'î' THEN 'Î' WHEN 'ç' THEN 'Ç'
      ELSE upper(ch)
    END;
  END LOOP;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.level_for_xp(xp integer)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  level integer := 1;
BEGIN
  IF xp IS NULL OR xp <= 0 THEN
    RETURN 1;
  END IF;
  WHILE 25 * level * (level + 1) <= xp LOOP
    level := level + 1;
  END LOOP;
  RETURN level;
END;
$$;

CREATE OR REPLACE FUNCTION public.public_learner_label(full_name text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  cleaned text := btrim(COALESCE(full_name, ''));
  parts text[];
  first text;
BEGIN
  IF cleaned = '' THEN
    RETURN 'Élève';
  END IF;
  parts := regexp_split_to_array(cleaned, '\s+');
  first := left(parts[1], 12);
  IF COALESCE(array_length(parts, 1), 0) <= 1 THEN
    RETURN first;
  END IF;
  RETURN first || ' ' || upper(left(parts[array_length(parts, 1)], 1)) || '.';
END;
$$;

CREATE OR REPLACE FUNCTION public.build_game_round(_game text, _difficulty text, _seed integer)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  rng bigint := CASE WHEN _seed IS NULL OR _seed < 0 THEN 0 ELSE _seed::bigint END;
  duration integer := CASE _difficulty WHEN 'easy' THEN 120 WHEN 'medium' THEN 105 WHEN 'hard' THEN 60 ELSE NULL END;
  count integer;
  max_n integer;
  option_count integer;
  stroop boolean;
  op text;
  ops text[];
  a integer;
  b integer;
  pick integer;
  i integer;
  pos integer;
  problems jsonb := '[]'::jsonb;
  rounds jsonb := '[]'::jsonb;
  letters text[];
  deck text[];
  bag text[];
  pool text[];
  colors text[] := ARRAY['red','blue','green','yellow','orange','purple','pink','brown'];
  shuffled text[];
  words text[];
  word_list text[] := ARRAY['CHAT','LIRE','MATH','ÉCOLE','LIVRE','CLASSE','CAHIER','ÉCRIRE','TABLEAU','HISTOIRE','SCIENCES'];
  hint_fr text[] := ARRAY['Animal domestique','Avec les yeux','Nombres et calculs','Lieu d''apprentissage','On le lit','Salle de cours','On y écrit','Avec un stylo','Devant la classe','Le passé','Expériences'];
  hint_en text[] := ARRAY['Pet animal','With eyes','Numbers','Learning place','You read it','Classroom','Notebook','With a pen','Blackboard','The past','Experiments'];
  diffs integer[] := ARRAY[1,1,1,2,2,2,2,3,3,3,3];
  indexes integer[] := ARRAY[]::integer[];
  emojis text[] := ARRAY['🐘','🦁','🐍','🦒','🐊','🦓','🐆','🦏','🦩','🐢','🦜','🐠'];
  last_word text := '';
  chars text[];
  scrambled text;
  attempt integer;
  band integer;
  band_diff integer;
  wave_pairs integer[];
  stage_sizes integer[];
  early text[];
  later text[];
  waves jsonb;
  stages jsonb;
  drawn record;
BEGIN
  IF duration IS NULL OR _game NOT IN ('memory','words','math','alphabet','colors','typing') THEN
    RAISE EXCEPTION 'invalid';
  END IF;

  IF _game = 'math' THEN
    count := CASE _difficulty WHEN 'easy' THEN 5 WHEN 'medium' THEN 8 ELSE 15 END;
    FOR i IN 1..count LOOP
      IF (i - 1) < ceil(count / 3.0) THEN
        band := 0;
      ELSIF (i - 1) < ceil((2 * count) / 3.0) THEN
        band := 1;
      ELSE
        band := 2;
      END IF;
      IF _difficulty = 'easy' THEN
        ops := ARRAY['+','-'];
        max_n := CASE band WHEN 0 THEN 5 WHEN 1 THEN 8 ELSE 10 END;
      ELSIF _difficulty = 'medium' THEN
        IF band = 0 THEN
          ops := ARRAY['+','-'];
          max_n := 10;
        ELSIF band = 1 THEN
          ops := ARRAY['+','-','×'];
          max_n := 15;
        ELSE
          ops := ARRAY['+','-','×'];
          max_n := 20;
        END IF;
      ELSE
        IF band = 0 THEN
          ops := ARRAY['+','-'];
          max_n := 12;
        ELSIF band = 1 THEN
          ops := ARRAY['+','-','×'];
          max_n := 20;
        ELSE
          ops := ARRAY['+','-','×','÷'];
          max_n := 50;
        END IF;
      END IF;
      SELECT d.next_state, d.value INTO rng, pick FROM public.game_draw(rng, array_length(ops, 1)) AS d;
      op := ops[pick + 1];
      SELECT d.next_state, d.value INTO rng, a FROM public.game_draw(rng, max_n) AS d;
      a := a + 1;
      SELECT d.next_state, d.value INTO rng, b FROM public.game_draw(rng, floor(max_n / 2)::integer) AS d;
      b := b + 1;
      IF op = '-' AND b > a THEN
        pick := a; a := b; b := pick;
      END IF;
      IF op = '×' THEN
        SELECT d.next_state, d.value INTO rng, a FROM public.game_draw(rng, 12) AS d;
        a := a + 1;
        SELECT d.next_state, d.value INTO rng, b FROM public.game_draw(rng, 10) AS d;
        b := b + 1;
      END IF;
      IF op = '÷' THEN
        SELECT d.next_state, d.value INTO rng, b FROM public.game_draw(rng, 10) AS d;
        b := b + 1;
        SELECT d.next_state, d.value INTO rng, pick FROM public.game_draw(rng, 10) AS d;
        a := b * (pick + 1);
      END IF;
      problems := problems || jsonb_build_array(jsonb_build_object('a', a, 'b', b, 'op', op));
    END LOOP;
    RETURN jsonb_build_object('game', 'math', 'difficulty', _difficulty, 'durationSeconds', duration, 'problems', problems);
  END IF;

  IF _game = 'memory' THEN
    wave_pairs := CASE _difficulty WHEN 'easy' THEN ARRAY[2,2] WHEN 'medium' THEN ARRAY[2,3] ELSE ARRAY[2,3,4] END;
    waves := '[]'::jsonb;
    FOREACH count IN ARRAY wave_pairs LOOP
      deck := ARRAY[]::text[];
      FOR i IN 1..count LOOP
        deck := deck || emojis[i];
      END LOOP;
      FOR i IN 1..count LOOP
        deck := deck || emojis[i];
      END LOOP;
      SELECT s.next_state, s.shuffled INTO rng, deck FROM public.game_shuffle_text(rng, deck) AS s;
      waves := waves || jsonb_build_array(to_jsonb(deck));
    END LOOP;
    RETURN jsonb_build_object('game', 'memory', 'difficulty', _difficulty, 'durationSeconds', duration, 'waves', waves);
  END IF;

  IF _game = 'alphabet' THEN
    stage_sizes := CASE _difficulty WHEN 'easy' THEN ARRAY[5] WHEN 'medium' THEN ARRAY[4,6] ELSE ARRAY[4,6,10] END;
    stages := '[]'::jsonb;
    FOREACH count IN ARRAY stage_sizes LOOP
      SELECT d.next_state, d.value INTO rng, pick FROM public.game_draw(rng, 26 - count) AS d;
      letters := ARRAY[]::text[];
      FOR i IN 0..count - 1 LOOP
        letters := letters || CHR(65 + pick + i);
      END LOOP;
      SELECT s.next_state, s.shuffled INTO rng, letters FROM public.game_shuffle_text(rng, letters) AS s;
      stages := stages || jsonb_build_array(to_jsonb(letters));
    END LOOP;
    RETURN jsonb_build_object('game', 'alphabet', 'difficulty', _difficulty, 'durationSeconds', duration, 'stages', stages);
  END IF;

  IF _game = 'colors' THEN
    count := CASE _difficulty WHEN 'easy' THEN 5 WHEN 'medium' THEN 6 ELSE 12 END;
    FOR i IN 1..count LOOP
      IF _difficulty = 'easy' THEN
        option_count := CASE WHEN i <= 2 THEN 2 ELSE 3 END;
        stroop := false;
      ELSIF _difficulty = 'medium' THEN
        option_count := CASE WHEN i <= 2 THEN 3 ELSE 4 END;
        stroop := false;
      ELSIF i <= 4 THEN
        option_count := 3;
        stroop := false;
      ELSIF i <= 8 THEN
        option_count := 4;
        stroop := true;
      ELSE
        option_count := 6;
        stroop := true;
      END IF;
      SELECT s.next_state, s.shuffled INTO rng, shuffled FROM public.game_shuffle_text(rng, colors) AS s;
      pool := shuffled[1:option_count];
      IF stroop THEN
        IF NOT (shuffled[2] = ANY(pool)) THEN
          pool[option_count] := shuffled[2];
        END IF;
      ELSE
        IF NOT (shuffled[1] = ANY(pool)) THEN
          pool[option_count] := shuffled[1];
        END IF;
      END IF;
      SELECT s.next_state, s.shuffled INTO rng, pool FROM public.game_shuffle_text(rng, pool) AS s;
      rounds := rounds || jsonb_build_array(jsonb_build_object(
        'word', shuffled[1],
        'ink', CASE WHEN stroop THEN shuffled[2] ELSE shuffled[1] END,
        'options', to_jsonb(pool)
      ));
    END LOOP;
    RETURN jsonb_build_object('game', 'colors', 'difficulty', _difficulty, 'durationSeconds', duration, 'rounds', rounds);
  END IF;

  IF _game = 'words' THEN
    count := CASE _difficulty WHEN 'easy' THEN 3 WHEN 'medium' THEN 4 ELSE 7 END;
    FOR i IN 1..count LOOP
      IF _difficulty = 'easy' THEN
        band_diff := 1;
      ELSIF _difficulty = 'medium' THEN
        band_diff := CASE WHEN i <= 2 THEN 1 ELSE 2 END;
      ELSIF i <= 2 THEN
        band_diff := 1;
      ELSIF i <= 4 THEN
        band_diff := 2;
      ELSE
        band_diff := 3;
      END IF;
      indexes := ARRAY[]::integer[];
      FOR pos IN 1..array_length(word_list, 1) LOOP
        IF diffs[pos] = band_diff THEN
          indexes := indexes || pos;
        END IF;
      END LOOP;
      SELECT d.next_state, d.value INTO rng, pick FROM public.game_draw(rng, array_length(indexes, 1)) AS d;
      pos := indexes[pick + 1];
      scrambled := word_list[pos];
      FOR attempt IN 1..8 LOOP
        chars := ARRAY[]::text[];
        FOR pick IN 1..length(word_list[pos]) LOOP
          chars := chars || substr(word_list[pos], pick, 1);
        END LOOP;
        SELECT s.next_state, s.shuffled INTO rng, chars FROM public.game_shuffle_text(rng, chars) AS s;
        scrambled := array_to_string(chars, '');
        EXIT WHEN scrambled IS DISTINCT FROM word_list[pos];
      END LOOP;
      rounds := rounds || jsonb_build_array(jsonb_build_object(
        'word', word_list[pos],
        'scrambled', scrambled,
        'hintFr', hint_fr[pos],
        'hintEn', hint_en[pos]
      ));
    END LOOP;
    RETURN jsonb_build_object('game', 'words', 'difficulty', _difficulty, 'durationSeconds', duration, 'rounds', rounds);
  END IF;

  count := CASE _difficulty WHEN 'easy' THEN 8 WHEN 'medium' THEN 9 ELSE 12 END;
  IF _difficulty = 'easy' THEN
    early := ARRAY['le','un','et','la','il'];
    later := ARRAY['de','en','ce','tu','je'];
  ELSIF _difficulty = 'medium' THEN
    early := ARRAY['arbre','livre','école','classe'];
    later := ARRAY['enfant','maison','manger','soleil'];
  ELSE
    early := ARRAY['éducation','bibliothèque','connaissance'];
    later := ARRAY['apprentissage','développement','mathématiques'];
  END IF;
  SELECT s.next_state, s.shuffled INTO rng, early FROM public.game_shuffle_text(rng, early) AS s;
  SELECT s.next_state, s.shuffled INTO rng, later FROM public.game_shuffle_text(rng, later) AS s;
  bag := early || later;
  pos := 1;
  words := ARRAY[]::text[];
  FOR i IN 1..count LOOP
    IF pos > COALESCE(array_length(bag, 1), 0) THEN
      IF _difficulty = 'easy' THEN
        early := ARRAY['le','un','et','la','il'];
        later := ARRAY['de','en','ce','tu','je'];
      ELSIF _difficulty = 'medium' THEN
        early := ARRAY['arbre','livre','école','classe'];
        later := ARRAY['enfant','maison','manger','soleil'];
      ELSE
        early := ARRAY['éducation','bibliothèque','connaissance'];
        later := ARRAY['apprentissage','développement','mathématiques'];
      END IF;
      SELECT s.next_state, s.shuffled INTO rng, early FROM public.game_shuffle_text(rng, early) AS s;
      SELECT s.next_state, s.shuffled INTO rng, later FROM public.game_shuffle_text(rng, later) AS s;
      bag := early || later;
      pos := 1;
      IF COALESCE(array_length(bag, 1), 0) > 1 AND bag[1] = last_word THEN
        scrambled := bag[1];
        bag[1] := bag[2];
        bag[2] := scrambled;
      END IF;
    END IF;
    words := words || bag[pos];
    last_word := bag[pos];
    pos := pos + 1;
  END LOOP;
  RETURN jsonb_build_object('game', 'typing', 'difficulty', _difficulty, 'durationSeconds', duration, 'words', to_jsonb(words));
END;
$$;

CREATE OR REPLACE FUNCTION public.game_check_timing(_at_ms jsonb, _min_gap integer, _duration_seconds integer, _server_elapsed_ms integer)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  i integer;
  stamp numeric;
  previous numeric := NULL;
  last_stamp numeric := 0;
  limit_ms integer;
BEGIN
  IF _server_elapsed_ms IS NULL OR _server_elapsed_ms < 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'timing');
  END IF;
  IF _server_elapsed_ms > 129600000 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'expired');
  END IF;
  IF _at_ms IS NULL OR jsonb_typeof(_at_ms) <> 'array' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'mismatch');
  END IF;
  limit_ms := _duration_seconds * 1000;
  FOR i IN 0..jsonb_array_length(_at_ms) - 1 LOOP
    IF jsonb_typeof(_at_ms -> i) <> 'number' THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'mismatch');
    END IF;
    stamp := (_at_ms ->> i)::numeric;
    IF stamp <> trunc(stamp) OR stamp < 0 OR stamp > limit_ms THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'timing');
    END IF;
    IF previous IS NOT NULL AND stamp - previous < _min_gap THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'timing');
    END IF;
    previous := stamp;
    last_stamp := stamp;
  END LOOP;
  IF last_stamp > _server_elapsed_ms + 250 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'timing');
  END IF;
  RETURN jsonb_build_object('ok', true, 'wpmMs', LEAST(_server_elapsed_ms, limit_ms));
END;
$$;

CREATE OR REPLACE FUNCTION public.grade_game_payload(_round jsonb, _events jsonb, _server_elapsed_ms integer)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  game text := _round ->> 'game';
  timing jsonb;
  at_ms jsonb;
  min_gap integer;
  i integer;
  answers jsonb;
  flips jsonb;
  picks jsonb;
  guesses jsonb;
  logs jsonb;
  keys jsonb;
  stamp_count integer := 0;
  expected integer;
  given text;
  score integer := 0;
  streak integer := 0;
  max_streak integer := 0;
  correct integer := 0;
  moves integer := 0;
  matches integer := 0;
  pending integer := -1;
  wave integer := 0;
  idx integer;
  completed integer := 0;
  deck jsonb;
  order_list jsonb;
  expected_letters text[] := ARRAY[]::text[];
  letter text;
  perfect integer := 0;
  choice text;
  base integer;
  correct_words integer := 0;
  errors integer := 0;
  corrected integer := 0;
  correct_chars integer := 0;
  input text;
  key text;
  removed text;
  target text;
  k integer;
  denom integer;
  prefix integer;
  wpm_ms integer;
BEGIN
  IF _round IS NULL OR _events IS NULL OR jsonb_typeof(_events) <> 'object' OR (_events ->> 'game') IS DISTINCT FROM game THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'mismatch');
  END IF;
  at_ms := _events -> 'atMs';
  min_gap := CASE game
    WHEN 'memory' THEN 180 WHEN 'words' THEN 400 WHEN 'math' THEN 300
    WHEN 'alphabet' THEN 120 WHEN 'colors' THEN 250 WHEN 'typing' THEN 40
    ELSE NULL
  END;
  IF min_gap IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'mismatch');
  END IF;
  timing := public.game_check_timing(at_ms, min_gap, (_round ->> 'durationSeconds')::integer, _server_elapsed_ms);
  IF (timing ->> 'ok')::boolean IS NOT TRUE THEN
    RETURN timing;
  END IF;
  wpm_ms := (timing ->> 'wpmMs')::integer;

  IF game = 'math' THEN
    answers := _events -> 'answers';
    IF jsonb_typeof(answers) <> 'array' OR jsonb_array_length(answers) <> jsonb_array_length(at_ms)
       OR jsonb_array_length(answers) > jsonb_array_length(_round -> 'problems') THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'mismatch');
    END IF;
    FOR i IN 0..jsonb_array_length(answers) - 1 LOOP
      IF jsonb_typeof(answers -> i) <> 'string' THEN
        RETURN jsonb_build_object('ok', false, 'reason', 'mismatch');
      END IF;
      given := btrim(answers ->> i);
      expected := CASE (_round -> 'problems' -> i ->> 'op')
        WHEN '+' THEN (_round -> 'problems' -> i ->> 'a')::integer + (_round -> 'problems' -> i ->> 'b')::integer
        WHEN '-' THEN (_round -> 'problems' -> i ->> 'a')::integer - (_round -> 'problems' -> i ->> 'b')::integer
        WHEN '×' THEN (_round -> 'problems' -> i ->> 'a')::integer * (_round -> 'problems' -> i ->> 'b')::integer
        ELSE (_round -> 'problems' -> i ->> 'a')::integer / (_round -> 'problems' -> i ->> 'b')::integer
      END;
      IF given ~ '^-?\d+$' AND given::integer = expected THEN
        score := score + 10 + streak * 2;
        streak := streak + 1;
        correct := correct + 1;
        IF streak > max_streak THEN max_streak := streak; END IF;
      ELSE
        streak := 0;
      END IF;
    END LOOP;
    RETURN jsonb_build_object('ok', true, 'score', score, 'elapsedMs', wpm_ms,
      'stats', jsonb_build_object('correct', correct, 'maxStreak', max_streak, 'answered', jsonb_array_length(answers)));
  END IF;

  IF game = 'memory' THEN
    flips := _events -> 'flips';
    IF jsonb_typeof(flips) <> 'array' OR jsonb_typeof(_round -> 'waves') <> 'array'
       OR jsonb_array_length(flips) <> jsonb_array_length(at_ms) THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'mismatch');
    END IF;
    IF jsonb_array_length(_round -> 'waves') = 0 OR jsonb_array_length(flips) > 400 THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'rules');
    END IF;
    wave := 0;
    expected_letters := ARRAY[]::text[];
    FOR i IN 0..jsonb_array_length(flips) - 1 LOOP
      IF wave >= jsonb_array_length(_round -> 'waves') THEN
        RETURN jsonb_build_object('ok', false, 'reason', 'rules');
      END IF;
      deck := _round -> 'waves' -> wave;
      IF deck IS NULL OR jsonb_typeof(deck) <> 'array' OR jsonb_array_length(deck) < 2 OR jsonb_array_length(deck) % 2 <> 0 THEN
        RETURN jsonb_build_object('ok', false, 'reason', 'rules');
      END IF;
      IF jsonb_typeof(flips -> i) <> 'number' OR (flips ->> i)::numeric <> trunc((flips ->> i)::numeric) THEN
        RETURN jsonb_build_object('ok', false, 'reason', 'mismatch');
      END IF;
      idx := (flips ->> i)::integer;
      IF idx < 0 OR idx >= jsonb_array_length(deck) OR idx::text = ANY(expected_letters) THEN
        RETURN jsonb_build_object('ok', false, 'reason', 'rules');
      END IF;
      IF pending = -1 THEN
        pending := idx;
      ELSE
        IF pending = idx THEN
          RETURN jsonb_build_object('ok', false, 'reason', 'rules');
        END IF;
        moves := moves + 1;
        IF (deck ->> pending) = (deck ->> idx) THEN
          matches := matches + 1;
          expected_letters := expected_letters || pending::text || idx::text;
        END IF;
        pending := -1;
        IF COALESCE(array_length(expected_letters, 1), 0) = jsonb_array_length(deck) THEN
          wave := wave + 1;
          expected_letters := ARRAY[]::text[];
        END IF;
      END IF;
    END LOOP;
    IF wave = jsonb_array_length(_round -> 'waves') AND pending = -1 THEN completed := 1; END IF;
    score := CASE WHEN completed = 1 THEN GREATEST(100 - moves * 2, 20) ELSE matches * 5 END;
    RETURN jsonb_build_object('ok', true, 'score', score, 'elapsedMs', wpm_ms,
      'stats', jsonb_build_object('moves', moves, 'matches', matches, 'completed', completed));
  END IF;

  IF game = 'alphabet' THEN
    order_list := _events -> 'orders';
    IF jsonb_typeof(order_list) <> 'array' OR jsonb_typeof(_round -> 'stages') <> 'array' THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'mismatch');
    END IF;
    stamp_count := 0;
    FOR i IN 0..jsonb_array_length(order_list) - 1 LOOP
      IF jsonb_typeof(order_list -> i) <> 'array' THEN
        RETURN jsonb_build_object('ok', false, 'reason', 'mismatch');
      END IF;
      stamp_count := stamp_count + jsonb_array_length(order_list -> i);
    END LOOP;
    IF stamp_count <> jsonb_array_length(at_ms) OR jsonb_array_length(order_list) > jsonb_array_length(_round -> 'stages') THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'mismatch');
    END IF;
    perfect := 1;
    IF jsonb_array_length(order_list) <> jsonb_array_length(_round -> 'stages') THEN
      perfect := 0;
    ELSE
      FOR i IN 0..jsonb_array_length(_round -> 'stages') - 1 LOOP
        expected_letters := ARRAY[]::text[];
        FOR k IN 0..jsonb_array_length(_round -> 'stages' -> i) - 1 LOOP
          expected_letters := expected_letters || (_round -> 'stages' -> i ->> k);
        END LOOP;
        SELECT array_agg(sorted ORDER BY sorted) INTO expected_letters FROM unnest(expected_letters) AS sorted;
        IF COALESCE(array_length(expected_letters, 1), 0) <> jsonb_array_length(order_list -> i) THEN
          perfect := 0;
        ELSE
          FOR k IN 1..COALESCE(array_length(expected_letters, 1), 0) LOOP
            IF (order_list -> i ->> (k - 1)) IS DISTINCT FROM expected_letters[k] THEN
              perfect := 0;
            END IF;
          END LOOP;
        END IF;
      END LOOP;
    END IF;
    score := CASE WHEN perfect = 1 THEN 30 ELSE 0 END;
    RETURN jsonb_build_object('ok', true, 'score', score, 'elapsedMs', wpm_ms, 'stats', jsonb_build_object('perfect', perfect));
  END IF;

  IF game = 'colors' THEN
    picks := _events -> 'picks';
    IF jsonb_typeof(picks) <> 'array' OR jsonb_array_length(picks) <> jsonb_array_length(at_ms)
       OR jsonb_array_length(picks) > jsonb_array_length(_round -> 'rounds') THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'mismatch');
    END IF;
    FOR i IN 0..jsonb_array_length(picks) - 1 LOOP
      IF jsonb_typeof(picks -> i) <> 'number' THEN
        RETURN jsonb_build_object('ok', false, 'reason', 'mismatch');
      END IF;
      idx := (picks ->> i)::integer;
      choice := _round -> 'rounds' -> i -> 'options' ->> idx;
      IF choice IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'reason', 'rules');
      END IF;
      IF choice = (_round -> 'rounds' -> i ->> 'ink') THEN
        correct := correct + 1;
      END IF;
    END LOOP;
    RETURN jsonb_build_object('ok', true, 'score', correct * 15, 'elapsedMs', wpm_ms,
      'stats', jsonb_build_object('correct', correct, 'rounds', jsonb_array_length(_round -> 'rounds')));
  END IF;

  IF game = 'words' THEN
    guesses := _events -> 'guesses';
    IF jsonb_typeof(guesses) <> 'array' OR jsonb_array_length(guesses) <> jsonb_array_length(at_ms)
       OR jsonb_array_length(guesses) > jsonb_array_length(_round -> 'rounds') THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'mismatch');
    END IF;
    FOR i IN 0..jsonb_array_length(guesses) - 1 LOOP
      IF jsonb_typeof(guesses -> i) <> 'string' THEN
        RETURN jsonb_build_object('ok', false, 'reason', 'mismatch');
      END IF;
      IF public.fold_word(guesses ->> i) = (_round -> 'rounds' -> i ->> 'word') THEN
        correct := correct + 1;
      END IF;
    END LOOP;
    RETURN jsonb_build_object('ok', true, 'score', correct * 20, 'elapsedMs', wpm_ms,
      'stats', jsonb_build_object('correct', correct, 'rounds', jsonb_array_length(_round -> 'rounds')));
  END IF;

  logs := _events -> 'keys';
  IF jsonb_typeof(logs) <> 'array' OR jsonb_array_length(logs) > jsonb_array_length(_round -> 'words') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'mismatch');
  END IF;
  FOR i IN 0..jsonb_array_length(logs) - 1 LOOP
    keys := logs -> i;
    IF jsonb_typeof(keys) <> 'array' OR jsonb_array_length(keys) > 40 THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'mismatch');
    END IF;
    stamp_count := stamp_count + jsonb_array_length(keys);
  END LOOP;
  IF stamp_count <> jsonb_array_length(at_ms) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'mismatch');
  END IF;
  base := CASE _round ->> 'difficulty' WHEN 'easy' THEN 5 WHEN 'medium' THEN 10 ELSE 15 END;
  FOR i IN 0..jsonb_array_length(logs) - 1 LOOP
    target := _round -> 'words' ->> i;
    keys := logs -> i;
    input := '';
    FOR k IN 0..jsonb_array_length(keys) - 1 LOOP
      IF jsonb_typeof(keys -> k) <> 'string' THEN
        RETURN jsonb_build_object('ok', false, 'reason', 'mismatch');
      END IF;
      key := keys ->> k;
      IF key = chr(8) THEN
        IF length(input) > 0 THEN
          removed := substr(input, length(input), 1);
          IF length(input) > length(target) OR removed IS DISTINCT FROM substr(target, length(input), 1) THEN
            corrected := corrected + 1;
          END IF;
          input := left(input, length(input) - 1);
        END IF;
      ELSE
        IF length(key) <> 1 THEN
          RETURN jsonb_build_object('ok', false, 'reason', 'rules');
        END IF;
        IF length(input) >= length(target) OR key IS DISTINCT FROM substr(target, length(input) + 1, 1) THEN
          errors := errors + 1;
        END IF;
        input := input || key;
        IF length(input) > length(target) + 8 THEN
          RETURN jsonb_build_object('ok', false, 'reason', 'rules');
        END IF;
      END IF;
    END LOOP;
    prefix := 0;
    WHILE prefix < length(input) AND prefix < length(target) AND substr(input, prefix + 1, 1) = substr(target, prefix + 1, 1) LOOP
      prefix := prefix + 1;
    END LOOP;
    correct_chars := correct_chars + prefix;
    IF input = target THEN
      correct_words := correct_words + 1;
    END IF;
  END LOOP;
  denom := correct_chars + errors;
  score := CASE WHEN denom = 0 THEN 0 ELSE round((correct_words * base * correct_chars)::numeric / denom)::integer END;
  RETURN jsonb_build_object(
    'ok', true,
    'score', score,
    'elapsedMs', wpm_ms,
    'stats', jsonb_build_object(
      'correctWords', correct_words,
      'errors', errors,
      'corrected', corrected,
      'correctChars', correct_chars,
      'accuracyMillis', CASE WHEN denom = 0 THEN 0 ELSE round((correct_chars * 1000)::numeric / denom)::integer END,
      'wpmDeci', CASE WHEN correct_chars = 0 OR wpm_ms <= 0 THEN 0 ELSE round((correct_chars * 120000)::numeric / wpm_ms)::integer END
    )
  );
END;
$$;

CREATE TABLE public.game_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  game_key text NOT NULL,
  difficulty text NOT NULL,
  seed integer NOT NULL,
  questions jsonb NOT NULL,
  started_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'verified', 'rejected', 'abandoned')),
  idempotency_key uuid,
  events jsonb,
  score integer,
  stats jsonb,
  server_elapsed_ms integer,
  xp_granted integer,
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX game_attempts_user_idempotency
  ON public.game_attempts (user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE TABLE public.reward_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('game_xp', 'streak_credit', 'reversal')),
  amount integer NOT NULL,
  local_day date,
  attempt_id uuid,
  idempotency_key uuid,
  reverses_id uuid,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (kind <> 'reversal' OR reverses_id IS NOT NULL),
  CHECK (kind <> 'game_xp' OR (amount >= 0 AND attempt_id IS NOT NULL AND idempotency_key IS NOT NULL)),
  CHECK (kind <> 'streak_credit' OR (amount = 1 AND local_day IS NOT NULL AND attempt_id IS NOT NULL)),
  CHECK (kind <> 'reversal' OR amount <= 0)
);

CREATE UNIQUE INDEX reward_ledger_game_xp_once
  ON public.reward_ledger (user_id, idempotency_key)
  WHERE kind = 'game_xp';

CREATE UNIQUE INDEX reward_ledger_streak_day
  ON public.reward_ledger (user_id, local_day)
  WHERE kind = 'streak_credit';

CREATE UNIQUE INDEX reward_ledger_one_reversal
  ON public.reward_ledger (reverses_id)
  WHERE kind = 'reversal';

ALTER TABLE public.game_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_ledger ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_read_learner(target uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR target IS NULL THEN
    RETURN false;
  END IF;
  IF auth.uid() = target OR public.is_platform_admin(auth.uid()) OR public.parent_of(auth.uid(), target) THEN
    RETURN true;
  END IF;
  RETURN EXISTS (
    SELECT 1
    FROM public.student_enrollments AS enrollment
    JOIN public.school_memberships AS membership ON membership.id = enrollment.membership_id
    WHERE membership.user_id = target
      AND enrollment.status = 'active'
      AND membership.status = 'active'
      AND public.teaches_class(auth.uid(), enrollment.class_id)
  );
END;
$$;

CREATE POLICY "Read visible game attempts"
  ON public.game_attempts FOR SELECT TO authenticated
  USING (public.can_read_learner(user_id));

CREATE POLICY "Read visible reward ledger"
  ON public.reward_ledger FOR SELECT TO authenticated
  USING (public.can_read_learner(user_id));

REVOKE ALL ON public.game_attempts FROM PUBLIC, authenticated;
REVOKE ALL ON public.reward_ledger FROM PUBLIC, authenticated;
GRANT SELECT ON public.game_attempts TO authenticated;
GRANT SELECT ON public.reward_ledger TO authenticated;

CREATE OR REPLACE FUNCTION public.game_lifetime_xp(_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(amount), 0)::integer
  FROM public.reward_ledger
  WHERE user_id = _user_id
    AND kind IN ('game_xp', 'reversal');
$$;

CREATE OR REPLACE FUNCTION public.game_xp_on_day(_user_id uuid, _day date)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(entry.amount), 0)::integer
  FROM public.reward_ledger AS entry
  WHERE entry.user_id = _user_id
    AND entry.kind = 'game_xp'
    AND entry.local_day = _day
    AND NOT EXISTS (
      SELECT 1 FROM public.reward_ledger AS reversal
      WHERE reversal.kind = 'reversal' AND reversal.reverses_id = entry.id
    );
$$;

CREATE OR REPLACE FUNCTION public.game_current_streak(_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  today date := (clock_timestamp() AT TIME ZONE 'Asia/Nicosia')::date;
  cursor_day date;
  total integer := 0;
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.reward_ledger AS entry
    WHERE entry.user_id = _user_id AND entry.kind = 'streak_credit' AND entry.local_day = today
      AND NOT EXISTS (SELECT 1 FROM public.reward_ledger AS reversal WHERE reversal.kind = 'reversal' AND reversal.reverses_id = entry.id)
  ) THEN
    cursor_day := today;
  ELSE
    cursor_day := today - 1;
  END IF;
  WHILE EXISTS (
    SELECT 1 FROM public.reward_ledger AS entry
    WHERE entry.user_id = _user_id AND entry.kind = 'streak_credit' AND entry.local_day = cursor_day
      AND NOT EXISTS (SELECT 1 FROM public.reward_ledger AS reversal WHERE reversal.kind = 'reversal' AND reversal.reverses_id = entry.id)
  ) LOOP
    total := total + 1;
    cursor_day := cursor_day - 1;
  END LOOP;
  RETURN total;
END;
$$;

CREATE OR REPLACE FUNCTION public.open_game_attempt(_game text, _difficulty text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _seed integer;
  _round jsonb;
  _id uuid;
  _started timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF _game NOT IN ('memory','words','math','alphabet','colors','typing')
     OR _difficulty NOT IN ('easy','medium','hard') THEN
    RAISE EXCEPTION 'invalid';
  END IF;
  IF (SELECT count(*) FROM public.game_attempts WHERE user_id = auth.uid() AND status = 'open') >= 20 THEN
    UPDATE public.game_attempts
    SET status = 'abandoned'
    WHERE id = (
      SELECT id FROM public.game_attempts
      WHERE user_id = auth.uid() AND status = 'open'
      ORDER BY started_at ASC
      LIMIT 1
    );
  END IF;
  _seed := floor(random() * 2147483646)::integer + 1;
  _round := public.build_game_round(_game, _difficulty, _seed);
  INSERT INTO public.game_attempts (user_id, game_key, difficulty, seed, questions)
  VALUES (auth.uid(), _game, _difficulty, _seed, _round)
  RETURNING id, started_at INTO _id, _started;
  RETURN jsonb_build_object(
    'attemptId', _id,
    'startedAt', _started,
    'serverNow', clock_timestamp(),
    'round', _round
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_game_attempt(_attempt_id uuid, _idempotency_key uuid, _events jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  attempt public.game_attempts%ROWTYPE;
  elapsed integer;
  graded jsonb;
  awarded integer := 0;
  stats jsonb := '{}'::jsonb;
  credit_day date;
  already integer := 0;
  grant_xp integer := 0;
  streak integer := 0;
  codes text[] := ARRAY['first_game'];
  result jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF _attempt_id IS NULL OR _idempotency_key IS NULL OR jsonb_typeof(_events) <> 'object' THEN
    RAISE EXCEPTION 'invalid';
  END IF;

  SELECT * INTO attempt
  FROM public.game_attempts
  WHERE id = _attempt_id AND user_id = auth.uid()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not found';
  END IF;

  IF attempt.status IN ('verified', 'rejected') THEN
    IF attempt.idempotency_key = _idempotency_key AND attempt.events = _events THEN
      IF attempt.status = 'rejected' THEN
        RETURN jsonb_build_object('ok', false, 'replayed', true, 'reason', attempt.stats ->> 'reason');
      END IF;
      RETURN jsonb_build_object(
        'ok', true,
        'replayed', true,
        'score', attempt.score,
        'xpGranted', COALESCE(attempt.xp_granted, 0),
        'level', public.level_for_xp(public.game_lifetime_xp(auth.uid())),
        'streak', public.game_current_streak(auth.uid()),
        'stats', COALESCE(attempt.stats, '{}'::jsonb)
      );
    END IF;
    RAISE EXCEPTION 'replay';
  END IF;

  IF attempt.status <> 'open' THEN
    RAISE EXCEPTION 'replay';
  END IF;

  elapsed := floor(extract(epoch FROM (clock_timestamp() - attempt.started_at)) * 1000)::integer;
  graded := public.grade_game_payload(attempt.questions, _events, elapsed);
  IF (graded ->> 'ok')::boolean IS NOT TRUE THEN
    UPDATE public.game_attempts
    SET status = 'rejected',
        idempotency_key = _idempotency_key,
        events = _events,
        stats = graded,
        server_elapsed_ms = elapsed,
        submitted_at = clock_timestamp()
    WHERE id = attempt.id;
    RETURN jsonb_build_object('ok', false, 'replayed', false, 'reason', graded ->> 'reason');
  END IF;

  awarded := (graded ->> 'score')::integer;
  stats := graded -> 'stats';
  credit_day := (attempt.started_at AT TIME ZONE 'Asia/Nicosia')::date;
  already := public.game_xp_on_day(auth.uid(), credit_day);
  IF awarded > 0 THEN
    grant_xp := LEAST(awarded, GREATEST(0, 400 - already));
  END IF;

  UPDATE public.game_attempts
  SET status = 'verified',
      idempotency_key = _idempotency_key,
      events = _events,
      score = awarded,
      stats = graded -> 'stats',
      server_elapsed_ms = elapsed,
      xp_granted = grant_xp,
      submitted_at = clock_timestamp()
  WHERE id = attempt.id;

  IF grant_xp > 0 THEN
    INSERT INTO public.reward_ledger (user_id, kind, amount, local_day, attempt_id, idempotency_key)
    VALUES (auth.uid(), 'game_xp', grant_xp, credit_day, attempt.id, _idempotency_key);
  END IF;

  INSERT INTO public.reward_ledger (user_id, kind, amount, local_day, attempt_id, idempotency_key)
  VALUES (auth.uid(), 'streak_credit', 1, credit_day, attempt.id, _idempotency_key)
  ON CONFLICT DO NOTHING;

  streak := public.game_current_streak(auth.uid());
  IF attempt.game_key = 'memory' AND (stats ->> 'completed')::integer = 1 THEN
    codes := array_append(codes, 'memory_clear');
  END IF;
  IF attempt.game_key = 'alphabet' AND awarded = 30 THEN
    codes := array_append(codes, 'alphabet_perfect');
  END IF;
  IF attempt.game_key = 'math' AND COALESCE((stats ->> 'maxStreak')::integer, 0) >= 5 THEN
    codes := array_append(codes, 'math_streak_5');
  END IF;
  IF attempt.game_key = 'typing'
     AND COALESCE((stats ->> 'correctWords')::integer, 0) >= 5
     AND COALESCE((stats ->> 'accuracyMillis')::integer, 0) >= 900 THEN
    codes := array_append(codes, 'typing_accurate');
  END IF;
  IF attempt.game_key = 'colors'
     AND COALESCE((stats ->> 'rounds')::integer, 0) > 0
     AND (stats ->> 'correct')::integer = (stats ->> 'rounds')::integer THEN
    codes := array_append(codes, 'color_clear');
  END IF;
  IF attempt.game_key = 'words'
     AND COALESCE((stats ->> 'rounds')::integer, 0) > 0
     AND (stats ->> 'correct')::integer = (stats ->> 'rounds')::integer THEN
    codes := array_append(codes, 'word_clear');
  END IF;
  IF streak >= 3 THEN
    codes := array_append(codes, 'streak_3');
  END IF;

  INSERT INTO public.user_badges (user_id, badge_id)
  SELECT auth.uid(), badge.id
  FROM public.badges AS badge
  WHERE badge.achievement_code = ANY(codes)
  ON CONFLICT DO NOTHING;

  result := jsonb_build_object(
    'ok', true,
    'replayed', false,
    'score', awarded,
    'xpGranted', grant_xp,
    'level', public.level_for_xp(public.game_lifetime_xp(auth.uid())),
    'streak', streak,
    'stats', stats
  );
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.reverse_reward_entry(_entry_id uuid, _reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  entry public.reward_ledger%ROWTYPE;
  student_school uuid;
  allowed boolean := false;
BEGIN
  IF auth.uid() IS NULL OR _entry_id IS NULL OR _reason IS NULL OR length(btrim(_reason)) < 3 OR length(_reason) > 200 THEN
    RAISE EXCEPTION 'invalid';
  END IF;
  SELECT * INTO entry FROM public.reward_ledger WHERE id = _entry_id FOR UPDATE;
  IF NOT FOUND OR entry.kind NOT IN ('game_xp', 'streak_credit') THEN
    RAISE EXCEPTION 'not found';
  END IF;
  IF EXISTS (SELECT 1 FROM public.reward_ledger WHERE kind = 'reversal' AND reverses_id = entry.id) THEN
    RAISE EXCEPTION 'already reversed';
  END IF;
  SELECT school_id INTO student_school
  FROM public.school_memberships
  WHERE user_id = entry.user_id AND status = 'active'
  ORDER BY school_id
  LIMIT 1;
  allowed := public.is_platform_admin(auth.uid())
    OR (student_school IS NOT NULL AND public.active_membership(auth.uid(), student_school, 'school_admin'))
    OR EXISTS (
      SELECT 1
      FROM public.student_enrollments AS enrollment
      JOIN public.school_memberships AS membership ON membership.id = enrollment.membership_id
      WHERE membership.user_id = entry.user_id
        AND enrollment.status = 'active'
        AND membership.status = 'active'
        AND public.teaches_class(auth.uid(), enrollment.class_id)
    );
  IF NOT allowed THEN
    RAISE EXCEPTION 'not allowed';
  END IF;
  INSERT INTO public.reward_ledger (user_id, kind, amount, local_day, attempt_id, reverses_id, reason)
  VALUES (
    entry.user_id,
    'reversal',
    CASE WHEN entry.kind = 'streak_credit' THEN 0 ELSE -entry.amount END,
    entry.local_day,
    entry.attempt_id,
    entry.id,
    btrim(_reason)
  );
  RETURN jsonb_build_object('ok', true, 'reversesId', entry.id);
END;
$$;

CREATE OR REPLACE FUNCTION public.reward_summary(_student_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  today date := (clock_timestamp() AT TIME ZONE 'Asia/Nicosia')::date;
  xp integer;
BEGIN
  IF NOT public.can_read_learner(_student_id) THEN
    RAISE EXCEPTION 'not allowed';
  END IF;
  xp := public.game_lifetime_xp(_student_id);
  RETURN jsonb_build_object(
    'xp', xp,
    'level', public.level_for_xp(xp),
    'streak', public.game_current_streak(_student_id),
    'todayXp', public.game_xp_on_day(_student_id, today)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.student_reward_summary()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.reward_summary(auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.reward_summaries(_student_ids uuid[])
RETURNS TABLE(student_id uuid, xp integer, level integer, streak integer, today_xp integer)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target uuid;
  summary jsonb;
BEGIN
  IF _student_ids IS NULL THEN
    RETURN;
  END IF;
  FOREACH target IN ARRAY _student_ids LOOP
    IF public.can_read_learner(target) THEN
      summary := public.reward_summary(target);
      student_id := target;
      xp := (summary ->> 'xp')::integer;
      level := (summary ->> 'level')::integer;
      streak := (summary ->> 'streak')::integer;
      today_xp := (summary ->> 'todayXp')::integer;
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.my_game_leaderboards()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb := '[]'::jsonb;
  class_row record;
  rows jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  FOR class_row IN
    SELECT class.id, class.name
    FROM public.classes AS class
    WHERE public.student_in_class(auth.uid(), class.id)
       OR public.teaches_class(auth.uid(), class.id)
    ORDER BY class.name
  LOOP
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'rank', ranked.rank,
      'label', ranked.label,
      'xp', ranked.xp,
      'level', public.level_for_xp(ranked.xp)
    ) ORDER BY ranked.rank), '[]'::jsonb)
    INTO rows
    FROM (
      SELECT
        row_number() OVER (ORDER BY public.game_lifetime_xp(membership.user_id) DESC, membership.user_id) AS rank,
        public.public_learner_label(profile.full_name) AS label,
        public.game_lifetime_xp(membership.user_id) AS xp
      FROM public.student_enrollments AS enrollment
      JOIN public.school_memberships AS membership ON membership.id = enrollment.membership_id
      LEFT JOIN public.profiles AS profile ON profile.user_id = membership.user_id
      WHERE enrollment.class_id = class_row.id
        AND enrollment.status = 'active'
        AND membership.status = 'active'
        AND membership.membership_role = 'student'
    ) AS ranked;
    result := result || jsonb_build_array(jsonb_build_object(
      'classId', class_row.id,
      'className', class_row.name,
      'rows', rows
    ));
  END LOOP;
  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.open_game_attempt(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_game_attempt(uuid, uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reverse_reward_entry(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reward_summary(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.student_reward_summary() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reward_summaries(uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.my_game_leaderboards() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.open_game_attempt(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_game_attempt(uuid, uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reverse_reward_entry(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reward_summary(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.student_reward_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.reward_summaries(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_game_leaderboards() TO authenticated;
