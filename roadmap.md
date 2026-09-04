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
- v0.11 fold-in: online arcade rooms at `/arcade/rooms` (create/join by code, lobby with realtime seats, ready/start,
  per-seat avatar + subject) driving Quiz Ludo, Snakes & Ladders and Mastermind across devices; `arcade_presence`,
  avatar presets (12, 4 Pro) on profiles + pickers; typed/voice `AnswerComposer` (Web Speech) with voice metadata on
  submissions; fair question bank (`question_bank`, exposures, attempts, `player_abilities` IRT calibration,
  selection audit) with `reserve_fair_question` / `record_question_attempt`, server-checked answers via
  `nextFairQuestion` / `submitArcadeAnswer`, 18 seeded verified questions; "Quiz form" on profile

## Open
- Arcade presence heartbeat + reconnect UI (table + realtime exist; no client heartbeat yet)
- Online Quiz Ludo races a single token per player (local mode keeps four tokens + captures)
- Question bank authoring/calibration review in admin (18 starter questions only)
- Stripe checkout for the £4.99 lifetime ad-free pass
- Real-time head-to-head room gameplay (currently code share + solo boards); wire Connect Four to `match_events`
- Remaining arcade modes: Territory, Category Tower, Sports 501, Connections, Draft XI, Bingo, Stat Cards
- Real ad network integration for the banner/rail slots (currently house placeholders)
- More sports content: grids/clue puzzles beyond football, NBA and cricket
- Admin evidence/verification review UI (mark athletes + answers verified, attach sources)
- Wikidata/licensed-feed import pipeline (schema ready; no ingestion runner yet)
- Admin UI for honours, verified facts and generation jobs
- Multi-language copy (mobile app ships i18n; web is English only)

## Done (v0.12–v0.20 fold-in)
- Branding, notifications, onboarding + home nudge, 5 arcade boards, Monthly page, Ops question review, security-definer grants tightened

- Question bank fairness + starter pack migration applied live (78 verified questions, scoring/streaks, random matchmaking)

## Done (Sep 4 UI pass)
- Games UI/UX overhaul: consistent game cards with proper icons across Arcade hub, modes and boards
  (refs: National Lottery instant-win games grid, Dribbble sport-quiz UI). No team logos or player photos (copyright).
- Simpler sport / sport-category filtering UX (home sport picker + /filters page): clear chips, search, grouped categories
- Sport hierarchy: Sport (American Football, Basketball…) → League/competition (NFL, CFL, NCAA / NBA, NCAA, EuroBasket, FIBA Worlds, Olympics) → categories
- Remote games: each player picks their own sport (A cricket, B football) for the same game; difficulty bands must stay fair across sports (icon picker + fairness note in lobbies/setup; percentile bands in reserve_fair_question)
- Fixed guest data loading: RLS helper functions re-granted to anon

## In progress
- In-game UI/UX polish: boards and play screens need stronger icons, avatars, colour hierarchy, and game-card feel inspired by the National Lottery instant-win grid and Dribbble sport-quiz references (user to share links); avoid team logos or player likenesses (copyright).
- Confirm final colour-scheme direction with user (currently dark pitch-green + mint primary + gold rewards).

## Done (Sep 4 data/account)
- Unlocked Fanzeno Pro for the testfan account only so every game can be tested; all other accounts keep the normal Pro gates.

- [ ] Home page: replace full sport grid with cascading dropdown selection (sport -> category -> sub-category)
- [x] Apply migration 20260904183000_answer_challenge_workflow.sql to live DB
- [x] Fix editDistance strict-index typecheck errors
