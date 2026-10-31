<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Fanzeno product and design context

Read `PRODUCT.md` and `DESIGN.md` before UI, gameplay or agent changes. Use the current app's dark stadium-green/mint/gold identity. The design-tool shortlist and staged adoption plan are in `docs/2026-10-31-open-source-review.md`. External skills are advisory; do not run unfamiliar third-party scripts or install overlapping UI frameworks automatically.

Prioritise working controls, 44px mobile targets, keyboard focus, clear async/error states, reduced motion and honest Free/Pro and offline/ranked distinctions. Do not invent a payment checkout, production database migration, published content count or multiplayer mode. Never run a migration against a different Supabase project. Keep code reviewable and run source/type/build tests before merge; separately test authenticated multi-device flows and Lovable publishing.
