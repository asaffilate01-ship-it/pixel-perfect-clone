# Fanzeno — open-source design, agent and MCP review (31 October 2026)

Scope: an evidence-based **curated shortlist**, not a claim to have run or individually inspected thousands of repositories. Recommendations are not dependencies or live integrations unless explicitly implemented. Screen state and source files were inspected in `src/routes/index.tsx`, `src/routes/arcade.tsx`, `src/routes/upgrade.tsx`, `src/styles.css`, `src/lib/gameCatalog.ts` and the release runbook.

## Adopt now: minimal dependencies, high product value

| Repository | Fit | Adoption decision |
| --- | --- | --- |
| [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill) | Art direction, component hierarchy, typography and responsive motion | Apply redesign-audit and design-taste workflow to existing pages; keep Fanzeno dark pitch identity |
| [pbakaus/impeccable](https://github.com/pbakaus/impeccable) | Accessibility, design critique, hardening and clear empty/error states | Use the audit, critique, adapt and polish workflows before release; do not blindly execute third-party hooks |
| [VoltAgent/awesome-design-md](https://github.com/VoltAgent/awesome-design-md) | Reference design-token systems | Use as research; this repo owns `DESIGN.md`, not another brand's design |
| [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) | Responsive and component pattern lookup | Use for patterns only, avoid bulk component replacement |
| [microsoft/playwright](https://github.com/microsoft/playwright) + [microsoft/playwright-mcp](https://github.com/microsoft/playwright-mcp) | Automated cross-device game flows, accessibility snapshots and regression tests | Highest priority after source changes; test mobile filtering, authentication, 2-player room/refresh/rejoin, submit-twice and disabled checkout |
| [dequelabs/axe-core](https://github.com/dequelabs/axe-core) | Accessibility checks | Add browser-audit CI once environment and test fixtures are available; supplement, not replace, manual accessibility review |

## Evaluate next: gameplay and functionality

| Repository | Feature opportunity | Conditions |
| --- | --- | --- |
| [statelyai/xstate](https://github.com/statelyai/xstate) | Model host/join/ready/turn/disconnected/complete as explicit states; prevent invalid transitions | Pilot on one online-room mode only; do not replace the existing server authority or duplicate Supabase state |
| [colyseus/colyseus](https://github.com/colyseus/colyseus) | Authoritative multiplayer, reconnection and room synchronization at scale | **Only** after measuring Supabase room bottlenecks; a separate game server adds cost and operational complexity |
| [storybookjs/storybook](https://github.com/storybookjs/storybook) | Isolated, visual states for game cards, questions, turn banners, errors and skeletons | Add shared components/stories incrementally; avoid requiring browser stories for every business-logic test |
| [emilkowalski/skills](https://github.com/emilkowalski/skills) | Responsively interrupted animation, touch feedback, reduced-motion treatment | Apply to board pieces and score reveals, not as global animation effects |

## AI editorial agents and MCPs: behind the server, never the answer authority

| Repository | Possible use | Safety / release gate |
| --- | --- | --- |
| [mastra-ai/mastra](https://github.com/mastra-ai/mastra) | TypeScript workflow for question suggestion → evidence retrieval → duplicate checking → editorial review → publish | Human review required; use Apache-2.0 core only after licence audit, avoid enterprise-only features; never auto-publish generated questions |
| [langfuse/langfuse](https://github.com/langfuse/langfuse) | Trace and evaluate question-generation quality, cost, provenance and false statements | Remove player PII before traces, define retention, hosting/cost, and clear consent |
| [modelcontextprotocol/servers](https://github.com/modelcontextprotocol/servers) | Server-side tool access for controlled editorial research, file and data workflows | Least privilege, audited allow-list, no player-facing direct MCP credentials |
| [lacausecrypto/mcp-sports-hub](https://github.com/lacausecrypto/mcp-sports-hub) | Discovery of potential sports statistics sources for editors | Source permission, limits, reliability and licensing review first. Exclude betting/odds tools from Fanzeno features; do not use scraped unofficial feeds in production |

Do **not** build a general “AI knows the right answer” judge. Source-backed editorial facts and server-side answer checks are more reliable than a raw LLM deciding who wins. Avoid introducing a second Supabase tenant or passing service-role credentials to the browser/agent.

## Phased delivery order

**Phase A — clarity and interface resilience (this PR).** Fix server failure vs empty search, honest disabled actions and Pro status, keyboard skip/focus, more usable mobile filters and game-art contrast. Formalise `PRODUCT.md` / `DESIGN.md`.

**Phase B — browser verification.** Playwright + axe tests at 320/375/768/1440 widths; error/empty state injection, keyboard-only navigation, room joins across two contexts, 200% text zoom, game board orientation; compare actual screenshots to DESIGN.md.

**Phase C — reliable online play.** Audit Supabase realtime authorization, presence, reconnect, stale answers, timer handling, turn ownership, idempotent scoring and terminal room states. Optionally pilot XState after tests reveal specific state bugs.

**Phase D — verified question breadth.** Confirm live migration status and question counts in Fanzeno's own database; build a content QA queue for sources, alias checks, difficulty sampling, duplicates, expiry and disputed answers. Evaluate Mastra/Langfuse for editorial assistance only after source rights and review flow are agreed.

**Phase E — commercial and launch readiness.** Build and verify Pro checkout/webhooks, refunds and entitlement reconciliation before enabling purchase; review ads/privacy requirements and mobile/native plans separately; publish through Lovable and confirm release marker on live domain.

## Current boundaries
- The website's GitHub source and Lovable publishing are distinct. A PR/merge does not establish deployment.
- The previous release runbook says Fanzeno migrations and publish evidence remained pending. Recheck production rather than assuming completion.
- This review does not change database schema or require any Lovable credit use.
