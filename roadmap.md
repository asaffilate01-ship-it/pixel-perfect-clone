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

## Open
- Stripe checkout for the £4.99 lifetime ad-free pass
- Real-time head-to-head room gameplay (currently code share + solo boards)
- More sports content: grids/clue puzzles beyond football, NBA and cricket
- Admin evidence/verification review UI (mark athletes + answers verified, attach sources)
- Multi-language copy (mobile app ships i18n; web is English only)
