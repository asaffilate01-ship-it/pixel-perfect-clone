-- Fanzeno phase-14 provenance correction.
-- The initial seed referenced unrelated events for two darts answers and
-- an awards page for a third. These are replaced with direct event reporting.
-- Idempotent and safe whether this migration runs immediately after phase 14
-- or after question ingestion; only exact question hashes are affected.

update public.question_bank
set source_url = 'https://www.pdc-europe.tv/news/sensational-humphries-denies-littler-to-seal-world-championship-glory/',
    source_title = 'PDC Europe: 2024 World Championship final',
    reviewed_at = now()
where content_hash = encode(extensions.digest('Who won the 2024 PDC World Darts Championship?', 'sha256'), 'hex')
  and source_url = 'https://www.pdc.tv/news/2024/april/18/2024-neobet-european-darts-grand-prix-draw-schedule/';

update public.question_bank
set source_url = 'https://www.pdc-europe.tv/news/nine-dart-smith-stuns-van-gerwen-to-become-world-champion/',
    source_title = 'PDC Europe: Michael Smith wins 2023 World Championship',
    reviewed_at = now()
where content_hash = encode(extensions.digest('True or false: Luke Littler won the 2023 PDC World Darts Championship.', 'sha256'), 'hex')
  and source_url = 'https://www.pdc.tv/news/2024/april/18/2024-neobet-european-darts-grand-prix-draw-schedule/';

update public.question_bank
set source_url = 'https://www.bbc.co.uk/sport/darts/42537507',
    source_title = 'BBC Sport: Rob Cross defeats Phil Taylor in the 2018 world final',
    reviewed_at = now()
where content_hash = encode(extensions.digest('Who won the 2018 PDC World Darts Championship as a debutant?', 'sha256'), 'hex')
  and source_url = 'https://pdpa.co.uk/event-entry/annual-awards/';
