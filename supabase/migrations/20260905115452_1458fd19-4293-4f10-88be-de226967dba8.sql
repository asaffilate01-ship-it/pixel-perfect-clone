insert into public.game_modes(
  slug, name, description, min_players, max_players, board_config, enabled, sort_order, access_tier
) values (
  'higher-lower', 'Higher or Lower',
  'Compare like-for-like sporting records. Build a streak as the gaps get tighter.',
  1, 1, '{"lives":3,"rounds":15}', true, 3, 'free'
)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  min_players = excluded.min_players,
  max_players = excluded.max_players,
  board_config = excluded.board_config,
  enabled = true,
  sort_order = excluded.sort_order,
  access_tier = 'free';