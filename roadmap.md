# Fanzeno roadmap

## Done
- Lovable Cloud backend: schema, RLS, grid/answer RPCs, seed grids (football, NBA, cricket)
- Design system (pitch-green/mint/gold) + app shell, header, footer
- Home, daily grid play, Arena (rooms), Ranks, Ad-free page, Auth (email + Google)
- Admin ops console at `/admin` behind staff-role gate
- v0.3 fold-in: Clue Ladder mode (`/clue/:sport`) with server-checked guesses and
  hot/cold hints, plus player profile at `/profile`
- v0.4 fold-in: competition/league + era filters (`/filters`), 39 seeded competitions,
  preferences saved to profile (or locally for guests), scoped grid lookup with
  whole-sport fallback, admin scope tagging on grids
- v0.5 fold-in: verified-answer pipeline (athlete/answer verification status, alias table,
  evidence + data sources, import jobs), trigram fuzzy `search_athletes`, publish guard
  (9 verified cells + competition tag), `grid_quality` view, athlete autocomplete and
  criterion icons in play, first verified EPL grid
- v0.6 fold-in: historical catalogue (Olympic games/events/medals, historical seasons, 44 Olympic
  sports switched off pending content, global T20 + rugby competitions), match lifecycle schema
  (outcome/end reason/passes/draw offers/rematch, `match_events`, `game_modes`), Tactical Arcade
  hub at `/arcade` with playable Connect Four vs bot (pass, draw offer, resign, turn timer, rematch),
  banner-only ad slots hidden for lifetime ad-free holders
- v0.7 fold-in: endless quiz pipeline (`athlete_criteria` verified facts backfilled from grid answers,
  provider records/cursors/coverage/generation jobs, `grid_exposures`, `generate_endless_grid` RPC),
  difficulty scoring (`scoring_rules`, per-move points, Easy 1x / Medium 2x / Hard 3x / Expert 5x),
  competition lineage + honours catalogue, `/modes/:sport` picker (Pass & Play, vs CPU, Endless, online),
  `/endless/:sport`, battle modes on the play board with three-in-a-row win detection
- v0.8 fold-in: competition hierarchy (category / format / level / parent, 117 competitions across 20 sports),
  10 new pro sports (snooker, darts, horse racing, F1, NASCAR, IndyCar, MotoGP, superbikes, boxing, UFC),
  `/filters` country chips + category accordions, `ad_events` analytics with impression/click logging

- v0.9 fold-in: Quiz Ludo (Pro) and Quiz Snakes & Ladders (free) at `/arcade/quiz-race`, Sports Mastermind (Pro)
  at `/arcade/mastermind` with 3-minute chosen-sport + all-sports rounds, arcade room/question/submission schema with
  realtime + `mastermind_standings`, Pro access tier on game modes, `can_host_game`, Fanzeno Pro upgrade page
- v0.10 fold-in: question scope hierarchy (`scope_entities` seeded for 11 sports, `question_scope_links`, grid scope
  paths, profile recent scopes), team/person drill-down pickers + question focus on `/filters`, per-player competition
  category picker in board-game setup

## Open
- Online arcade rooms (host/join, realtime questions) on top of the v0.9 room schema — games are local pass & play today
- Stripe checkout for the £4.99 lifetime ad-free pass
- Real-time head-to-head room gameplay (currently code share + solo boards); wire Connect Four to `match_events`
- Remaining arcade modes: Territory, Category Tower, Sports 501, Connections, Draft XI, Bingo, Stat Cards
- Real ad network integration for the banner/rail slots (currently house placeholders)
- More sports content: grids/clue puzzles beyond football, NBA and cricket
- Admin evidence/verification review UI (mark athletes + answers verified, attach sources)
- Wikidata/licensed-feed import pipeline (schema ready; no ingestion runner yet)
- Admin UI for honours, verified facts and generation jobs
- Multi-language copy (mobile app ships i18n; web is English only)
