# Workspace execution recovery record

Plan: `2026-10-17-chat-workspace.md`; approved spec revisions 1–5 plus last user architecture notes.

## Preserved state

- Branch `codex/chat-workspace`; no reset or production deployment/migration.
- Existing unrelated changes remain in the original working tree. Product work is saved in source files, not confined to chat history.
- Three independent workers wrote backend, pages and sidebar; their sessions stopped at usage limits after writing their files. Primary continues integration without re-dispatching completed implementation.
- Dev preview: `http://localhost:3013/chat`, isolated cache `.next-workspace`; default project cache unaffected. Use **localhost**, because this environment's Next dev bootstrap did not hydrate on the IPv4 numeric origin.
- Workspace route group now owns the persistent shell and mounted original chat. Original chat route moved into `(workspace)` with metadata preserved.

## Implemented and reviewed

- React sidebar: two-row header, full/64px/mobile variants, navigation, project creation/accordion/storage, pins/calendar groups, inline rename/F2, right-click menus, archive/move/delete, drag/drop, footer Menu, list preferences, active indicator.
- Shared Dialog/Menu/Tooltip/Icon/scroll-lock primitives; Spotlight; project instructions/files and explicit memory UI.
- Library route with tabs/search/grid-list/folders/favorites/document CRUD/upload/preview; plugins catalog/personal configs; skills CRUD/apply; scheduled availability screen.
- Authenticated workspace API, new migration/record store, metadata, owner validation, incremental files incl DOCX text extraction, memory/preset context, encrypted write-only plugin config, idempotent first sends.
- Durable 20-token title queue/default GPT-4o-mini, manual-title priority. Queue polling and client active-project synchronization integrated by primary.
- Preset selection now snapshots the chosen version; personal memory is excluded from isolated project chats.

## Verification evidence so far

- Initial core chat baseline: 9 Jest tests passed.
- Backend workspace/context after workers: 24 Jest tests passed across workspace/chat suites.
- New regression tests reproduced project-memory leakage, mutable preset selection and overlong generated titles; all 15 workspace service tests pass after fixes.
- Production web build succeeded, all 17 routes generated (including `/chat`, `/library`, `/plugins`, `/scheduled`). Needs repeating after final changes.
- Browser suite: 13/15 initially passed, including exact sidebar/composer DOM identity across routes, draft retention, mobile body lock, keyboard search/collapse, pin/move/rename/persistence and page CRUD. Two failures: All-folders accessible name (fixed) and dev-tools portal intercepting footer click (dev indicator disabled; recheck).
- Frontend lint passed after correcting effect/ref synchronization. Repeat after current additions.
- Next route types regenerated; deleted only stale generated `.next/types/app/chat/page.ts` after moving its source route.

## Integration work completed in this continuation

1. Completed source/status synchronization, sidebar pagination, title polling/fallback, project file preview and context-fragment selection.
2. Verified contract paths and completed dialog/palette localization; optional integrations retain honest availability.
3. Passed browser regressions, viewport/short-height coverage and stream/project/preset scenarios.
4. Passed typechecks, lint (three existing backend warnings), tests/build/repository checks and strict UI audit; inspected screenshots.
5. Independent review completed; substantive findings fixed and regression checks added.

## External-service boundaries

No real provider calls or production migrations were run. Scheduled executor and third-party OAuth/tool adapters currently report unavailable/unconfigured; stored private API configuration is not presented as a live connected tool. Public sharing remains visibly planned as approved. Real DB/provider verification requires a configured test environment.

## Integration verification update

- Independent read-only review completed. Fixed preset override leakage/removal, missing skill snapshot on a newly created chat, query-aware excerpts for alternative answers, lost first-send drafts and unstable retry keys.
- First sends persist a request-to-conversation link before streaming its ID. A reconnecting client follows that owned conversation without a second charge. An interrupted request that never reached conversation creation is not automatically rerun, because charging/provider acceptance cannot be inferred safely.
- Project-file previews/downloads are owner checked; document chunks are ranked against the current question, including content beyond the first 6,000 characters.
- Body/proxy request limits aligned to 32 MB so five 4 MB project files fit after base64 encoding. Per-file and count validation remain enforced.
- Shared form validation explains missing/invalid fields inline and focuses the first invalid control; catalog searches debounce and respect IME composition. Dialog/palette copy is localized in all five supported languages.
- Both frontend/backend typechecks pass. Frontend lint passes; backend lint has zero errors and three existing warnings in admin/users files.
- All 33 targeted Jest tests pass. Backend Nest production build and Next production build pass; 17 static routes generated.
- Strict premium static audit now has zero findings: docs/design/workspace-static-audit.json. Canonical ownership is recorded in UX-CONTRACT.md and premium-ui.workspace.json.
- Eight viewport sizes verified: 320×568, 390×660, 768×1024, 1024×600, 1440×900, 2560×1080, 844×390, 320×400. Existing composer/model/comparison/library regression test was updated to use the new navigation and passes independently.
- Local runtime inventory: only frontend port 3013 is running; no backend .env, backend port, MySQL or Redis is present. Browser scenarios use API fixtures. Real provider calls, database migration/integration and deployment remain unperformed.

Final verification: 35/35 Jest tests across four suites and 22/22 Playwright scenarios pass. A separate viewport/screenshot rerun also passes. Generated media indexing is bridged into the new filtered library route and covered by a controller regression test. Dark desktop/mobile screenshots are saved in docs/design/workspace-desktop.png and workspace-mobile.png, using clearly isolated API fixtures. Light-theme logo contrast was corrected during visual QA.

No code was committed or deployed; existing user changes remain in the original checkout. All implementation source, tests, plan, canonical UI contract and audit evidence are saved on disk.

Generated-media deletion retains an owner-scoped source tombstone, so later indexing does not restore a deleted item. Covered by the 35th server regression test.

## ChatGPT-reference alignment follow-up

User requested minimalist navigation/icons matching the supplied ChatGPT screenshot and correction of drifting text/controls. Added the requested apple-design-skill Git submodule at `.design-rules`, pinned to 914b6a377c22755597e4405e54911b996de822d7. Its checkout remains unchanged.

Root cause: legacy chat CSS applied unscoped `header` rules, including `!important` and desktop/mobile/light media rules, to the sidebar header and catalog header. This replaced catalog grid with flex and altered padding/alignment. Universal font rules also assigned different font owners to nested controls. Scoped all chat toolbar rules, set stable workspace font inheritance, aligned 44px navigation rows and 22px outline icons, removed New chat's border/shortcut badge and Overview's trailing chevron, and used a single gray active surface. Scheduled now uses the clock glyph; Overview uses ellipsis; pencil/library/apps glyphs follow the reference. Catalog actions and dialog primary actions are monochrome. Removed duplicate account icon and press-scaling from text navigation. Empty projects retain their section and localized explanation.

Regression test `workspace-visual.spec.ts` first failed on catalog header `display:flex`; it now verifies grid centering, header layout, shared typography, row/text/icon alignment and collapsed centering. Full browser suite: 23/23 passed; separate final geometry rerun includes the last collapsed-header centering fix. Screenshots: docs/design/workspace-aligned-desktop.png and workspace-aligned-mobile.png. Static strict workspace audit: zero findings. Production build, frontend lint and repository checks pass; standalone typecheck also passes after build. A transient check during simultaneous type generation saw missing cache files; the sequential rerun is clean.

## Original ChatGPT icons, Overview and tooltips follow-up

Continued from the interrupted controls regression test. Copied 43 SVG symbols from the exact ChatGPT sprite observed in the user's Chrome tab, into `apps/web/public/images/workspace-icons.svg`; provenance is recorded beside the asset. The sprite is local and contains no scripts or external references. Shared WorkspaceIcon uses its source geometry for navigation, project/chat actions and catalog controls. Kept Genyxo's Menu/footer architecture. Hover motion is implemented locally (not copied ChatGPT animation code): a short sequence at the start of an 8-second cycle, running only while a fine pointer hovers a control. Reduced motion disables it.

Desktop navigation rows are now 40px with 20px icons, with 44px phone rows retained. Catalog buttons use compact 36px sizing. Overview uses the reference order (Maps, Images, Assistants, Sites, Integrations), with the original map/photo/cube/sites/plugin glyphs, a 184px graphite glass menu, 36px rows, 16px corners and 12px background blur. It opens to the right; constrained viewports use a clamped fallback. Maps/Sites remain honestly unavailable and explain that state through accessible description and the existing notification.

Root cause of repeated-click reopening: the outside pointerdown listener unmounted the menu before React handled its trigger click. WorkspaceMenu now excludes its trigger from pointerdown dismissal and consumes the repeat trigger click at capture time. Pointer and keyboard dismissal, focus return, other menu triggers and narrow-screen positioning are covered.

WorkspaceTooltip now measures its own bounds, clamps to the viewport, associates the description with the actual button/link, supports keyboard focus/Escape and retains its node for a 140ms fade-out. Icon-only controls on the library/plugins/skills/scheduled pages, search palette, project settings, file/memory controls and dialog close buttons use it. Expanded text navigation suppresses duplicate tooltips; collapsed navigation retains labels/shortcuts. An expanded project accordion still exposes its Collapse tooltip.

Verification: the full 26-scenario browser suite passed, including eight viewport sizes, preserved sidebar/composer DOM, draft/retry, project/pin/preferences and catalog workflows. A final 9-scenario controls/sidebar rerun passed after adding keyboard tooltips, narrow tooltip bounds, the 8s animation/rest check and expanded-project tooltip regression. Frontend lint is clean; repository checks pass. The final production compilation and build TypeScript check pass; an AnimationEffect typing issue in the added test was corrected with a KeyframeEffect guard. Final production build completed successfully (17 static pages); standalone `tsc --noEmit` also passes after the build.

Screenshots: `docs/design/workspace-premium-controls.png`, `workspace-premium-controls-mobile.png` and `workspace-premium-tooltip.png` (isolated API fixtures). Original user changes and the Apple Design Skill submodule pin remain intact; nothing was committed or deployed. The previous static-audit JSON is from the preceding follow-up: its plugin script was removed from the installed plugin cache during this task, so a new plugin audit could not be run. The user's Chrome access also became disabled in Work settings after source extraction; subsequent verification used the repository's local automated browser tests.
