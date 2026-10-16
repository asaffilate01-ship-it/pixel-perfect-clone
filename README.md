# Fanzeno

A multi-sport trivia and tactical arcade built with TanStack Start, React and Supabase. Play curated sports questions across difficulty levels, solo puzzles, grid battles and online arcade rooms.

## Local development

Requirements: Node.js 22 or later and Bun.

```sh
bun install --frozen-lockfile
bun run dev
npm run test:logic
bunx tsc --noEmit
bun run build
```

### Key areas

- `src/routes/arcade*`: the arcade hub and game screens
- `src/components/game/QuestionCard.tsx`: verified question presentation and typed/voice/choice interactions
- `src/lib/arcadeRooms.functions.ts`: authenticated server reservation, answers and room actions
- `src/lib/higherLower.ts`: pure, tested comparison-generation rules
- `supabase/migrations`: schema and curated question releases
- `docs/2026-10-16-arcade-release-audit.md`: current validated work and launch blockers

Historical question-answer sets are kept server-side for ranked games; pre-answer clients receive prompts, clues and choice labels only. Offline practice and human-adjudicated pass-and-play are clearly separate from ranked play.

## Delivery

The [Lovable project](https://lovable.dev/projects/4e35e2ad-84ba-420e-a0d7-2ccf45c7afbd) syncs commits from GitHub. Publishing an updated site is separate from syncing. Apply migrations to **Fanzeno's own Supabase project**, not to another SaaS tenant or the DISHBEE project. The CI workflow checks TypeScript, game logic and production bundling, but cannot verify database deployment without configured access.

## Source assets

Original abstract game artwork and shapes are used in place of protected logos, athlete photos and team crests.
