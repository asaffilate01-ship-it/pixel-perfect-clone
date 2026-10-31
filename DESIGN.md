# Fanzeno design system — Floodlit pitch

## Direction
A premium, modern sports arcade at night, not a generic SaaS dashboard. Draw on the atmosphere of floodlit stadia: dark pitch-green surfaces, mint pitch markings, gold trophies, punchy condensed headings, crisp scoring information and distinctive *licensed/owned* game art. Preserve existing routes, labels, brand colours and gameplay semantics during redesign.

The following values describe **the current Fanzeno source tokens**, not colours copied from an unrelated brand. For implementation use `src/styles.css` as source of truth.

## Brand tokens
- Background: `--background: oklch(0.15 0.023 163)`.
- Surface / panel: `--surface: oklch(0.20 0.028 165)`; raised surface: `--surface-strong: oklch(0.25 0.033 166)`.
- Primary mint: `--primary: oklch(0.83 0.168 158)`; foreground on mint: `--primary-foreground: oklch(0.16 0.03 163)`.
- Trophy gold: `--gold: oklch(0.85 0.125 86)`; foreground on gold: `--gold-foreground: oklch(0.18 0.03 90)`.
- Body copy: `--foreground`; supporting copy `--muted-foreground`; meaningful feedback `--destructive` and `--ring`.
- Typography: Bebas Neue for athletic display headlines; Barlow for everything requiring easy reading, including instructions, answers, labels, forms and rules.
- Shape: `--radius: 0.9rem`, slightly more rounded game cards and restrained compact controls.
- Respect the current dark-first identity; do not introduce a light-mode redesign without a dedicated design and contrast audit.

## Composition
1. Landing: one meaningful headline, direct primary play action, honest playable/supported content cues. Let the sport picker communicate scope; avoid a pile of identical feature cards.
2. Arcade catalogue: art-led game tiles, clear title, game type, player count, duration, Free/Pro status, and one **working** action. Empty, loading, offline and error states are different states.
3. Game session: board is the focal point, not navigation chrome. Show *current player, turn, sport, difficulty, timer, action* and feedback without forcing scroll on a phone.
4. Room: code, members, ready states, connectivity, reconnect and turn ownership must all be evident before decorative effects.
5. Support/ops: prioritize readability, precision, provenance, status and actionable errors over cinematic animation.

## Interaction rules
- Minimum 44×44 CSS pixel touch targets for primary mobile controls; never create unreadable micro labels just to fit more chips.
- Every clickable element needs working behaviour. Don't label a disabled card “Notify me” unless a notification subscription exists.
- Provide visible keyboard focus, sensible heading order, descriptive labels, a skip link, and status announcements for async operations.
- Use symbols **and** text for correct/error/turn/player statuses. Do not rely solely on red/green or colour to indicate a state.
- Make errors recoverable: retry from the point of failure without resetting a game or claiming data was saved.
- Aim for WCAG 2.2 AA contrast, text resizing and a screen-reader usable mobile navigation. Audit all overlays, menus and form states.
- Motion communicates action: 120–250 ms microinteractions, 220 ms game token landing when appropriate, avoid scroll-jacking and excessive 3D shaders. Respect `prefers-reduced-motion` and low-power devices.
- Use existing Radix/Tailwind/shadcn-style primitives where possible. No blanket design-library replacement, especially for boards with custom physics/interaction.

## Original art and quality
- Keep original abstract sports and game art in `src/assets/games`. Do not import trademarked team badges, athlete photos or unlicensed third-party assets.
- Use meaningful art, not unrelated generic icons, while retaining contrast between art and text.
- Test at 320, 375, 768 and 1440 CSS px; verify landscape for game boards, safe-area/tab-bar overlap, keyboard/voice input and 200% zoom.
- Verify `bun install --frozen-lockfile`, `npm run test:logic`, `npm run test:content`, `bunx tsc --noEmit`, `bun run build`, then browser/assistive-technology acceptance. CI alone isn't a substitute for live multiplayer testing.

## Agent design workflow
1. **Taste Skill**, `design-taste-frontend` + `redesign-existing-projects`: audit a real surface before adjusting visual hierarchy or motion. Repository: https://github.com/Leonxlnx/taste-skill
2. **Impeccable**: apply `critique`, `audit`, `adapt`, `harden` and `polish` against a named screen, recording issues and screenshot evidence when a browser is available. Repository: https://github.com/pbakaus/impeccable
3. **Awesome Design MD**: review examples such as media/entertainment and athletics-inspired composition to strengthen the *Fanzeno-owned* system, never to copy a brand's imagery or proprietary type. Repository: https://github.com/VoltAgent/awesome-design-md
4. Implement targeted, reviewable diffs. Test on actual rendered screens and mobile devices; do not treat design-agent output as verification.

This DESIGN.md is the product's authority when external design skills disagree or suggest replacing the established identity.
