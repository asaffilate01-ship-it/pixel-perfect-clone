insert into public.game_modes(
  slug, name, description, min_players, max_players, access_tier, enabled, sort_order
) values (
  'crossword-quiz',
  'Sports Crossword',
  'Solve intersecting sports clues, use hints carefully and chase a perfect score.',
  1, 1, 'free', true, 35
)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  min_players = excluded.min_players,
  max_players = excluded.max_players,
  access_tier = excluded.access_tier,
  enabled = excluded.enabled,
  sort_order = excluded.sort_order;
