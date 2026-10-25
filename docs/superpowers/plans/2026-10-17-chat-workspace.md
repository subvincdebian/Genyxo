# Genyxo workspace implementation plan

> **For agentic workers:** Use superpowers:subagent-driven-development for the independent backend/page tasks and integrate the shared shell in this session. Track execution below; preserve existing uncommitted work.

**Goal:** Implement the approved sidebar, projects/context, library, plugins/skills, scheduled-task entry points and responsive workspace.

**Architecture:** `app/(workspace)/layout.tsx` owns a persistent client workspace shell and the existing mounted chat controller. The sidebar is React-owned; a small event bridge connects it to the current conversation controller. New authenticated API endpoints live under `/chat/workspace`, preserving existing chat endpoints and payment/stream behavior.

**Tech Stack:** Installed Next.js 16.4, React 19, TypeScript, CSS, NestJS/TypeORM/MySQL, Jest and Playwright.

**Spec:** `docs/superpowers/specs/2026-10-17-chat-sidebar-project-memory-design.md` (revisions 1–5, approved by user; latest user additions override it).

## Global constraints

- Persistent shell in a route-group layout, never duplicated in individual workspace pages. Preserve DOM/controller and draft between routes.
- Title model configurable, default `openai/gpt-4o-mini`, **max_tokens: 20**, asynchronous after first successful answer, manual names win.
- Mobile drawer locks body scroll (`overflow: hidden`) with cleanup, Escape, focus return, safe-area/dynamic-height support.
- Desktop 280/64 px, mobile drawer; responsive at short/tall heights and 320–2560 px widths; reduced motion.
- Existing changes in this working directory are the baseline. Do not reset, overwrite, or commit unrelated work. No deploy or production migrations.
- UI primitives/feedback/i18n belong to shared owners. User data are authorized server-side. No browser alert/confirm/prompt, fake success or secret persistence in client storage.
- Execute continuously: user explicitly authorized implementation; no additional design-approval stop.

## Review focus

1. Route transitions during a live SSE stream or nonempty draft must not remount/reset chat or sidebar.
2. Metadata edits and title races must not change last message activity or overwrite a manual name.
3. Project/preset/memory/file IDs and webhook endpoints cannot bypass ownership or reveal secrets.
4. Keyboard, short mobile heights, modal layering and body-scroll restoration must work after errors/navigation.
5. Existing chat controller and new React owners must never attach competing handlers to the same sidebar.

## Shared interfaces

Frontend feature `@/features/workspace` exports `workspaceRequest<T>(path, init?)` targeting `/api/chat/workspace/${path}`, `useWorkspace()` and entity types. Requests use the current `authToken` header and return parsed JSON/error messages. General resource response shapes:

- `GET /chat/workspace` → `{conversations, projects, preferences, capabilities}`.
- `GET conversations?search=&offset=&limit=&archived=` → `{items, hasMore}`. Conversation `{id,title,projectId,pinnedAt,archivedAt,lastActivityAt,createdAt,updatedAt,titleSource?,titleVersion?}`.
- `PATCH conversations/:id` accepts `{title?,pinned?,archived?,projectId?}`; DELETE removes it.
- `GET/POST/PATCH/DELETE projects[/:id]`; `{id,name,instructions,files,pinnedAt?}`; files support add/remove without losing existing source text. `GET/POST/PATCH/DELETE memory[/:id]` with `projectId`/scope.
- `GET/PATCH preferences` → `{grouping:'projects'|'list',sort:'activity'|'name',showProjects:boolean,timezone:string,libraryView:'grid'|'list'}`.
- `GET library?tab=&search=&folderId=&offset=` → `{items,folders,hasMore}`; `POST/PATCH/DELETE library[/:id]`; `POST/PATCH/DELETE folders[/:id]`. Item `{id,name,type:'document'|'image'|'video',url?,content?,isFavorite,folderId?,sourceMessageId?,createdAt}`.
- `GET presets` → `{items}`; `POST/PATCH/DELETE presets[/:id]`; `POST conversations/:id/preset {presetId}`. Preset `{id,name,description,instructions,version,isPublic?,model?}`.
- `GET plugins` → `{items,connections}`; `POST/PATCH/DELETE connections[/:id]`; catalog entries `{id,name,description,icon?,status,permissions?,category?}`, connection `{id,pluginId?,name,status,endpoint?,permissions?}` (never secrets).
- `GET scheduled` → `{items,available:boolean,reason?}`; POST/PATCH/DELETE scheduled[/:id]. Task `{id,name,prompt,model,projectId?,timezone,schedule,nextRunAt?,paused,lastRunAt?,lastError?}`. Unconfigured runtime must return genuine unavailable state, not fake scheduling.
- `POST conversations/:id/title-generation` bounded 20-token title with idempotent/manual-priority behavior; status available from conversations.

`useWorkspace()` exposes `{conversations,projects,preferences,loading,error,refresh,request,notify,activeProjectId,setActiveProjectId,selectedChatId,selectChat,startNewChat,openProject}`. Page components can independently load their resources through `workspaceRequest`; notify uses one accessible shared live region. Parent owns all shared files; page worker owns only its page subtree/styles/tests.

## Task 1: Backend workspace persistence and context

**Owner:** backend implementer. **Files:** `apps/backend/src/chat/workspace/*`, new migration(s), existing chat module/controller/service/entities/DTO tests only as needed.

- [x] Add meaningful failing Jest tests for ownership, pin/archive/search, memory/preset context, manual-title race and the 20-token cap.
- [x] Run those tests and record expected failures before implementation.
- [x] Implement endpoints above, durable storage, migrations, server validation, file text parsing/source boundaries, shared context on normal/stream/alternative answers. Keep existing APIs compatible.
- [x] Provide real library favorites/folders, private presets and catalog/connections. Do not claim external OAuth/scheduler readiness unless actually configured. Built-in skills have real instructions.
- [x] Implement asynchronous title generation on first success without adding latency to the main answer; max_tokens 20; avoid fire-and-forget loss, deduplicate and preserve manual titles.
- [x] Run Jest, backend typecheck/lint/build; report actual external-service limitations. No production migrations or external paid requests.

## Task 2: Persistent shell, sidebar and chat integration

**Owner:** primary agent. **Files:** `app/(workspace)/layout.tsx`, moved workspace route entry points, `features/workspace`, `widgets/workspace`, `pages/chat`, existing ChatApp/controller targeted edits, shared workspace CSS and translations, browser tests.

- [x] Add failing Playwright scenarios: draft/DOM identity across routes, footer/menu/profile placement, keyboard rename/search/collapse and mobile scroll-lock/restoration.
- [x] Run failure evidence, then build common shell/provider/primitives and preserve existing chat mount in layout.
- [x] Replace old sidebar with React sidebar, header actions and responsive drawer. Disable competing legacy owners through a scoped bridge; preserve composer/model/credits/messages.
- [x] Implement project accordion, direct-create modal, inline rename/F2, menus/right click, pin/archive/move/delete, server search palette, calendar groups, preferences and drag/drop.
- [x] Bridge selected/new chat, project IDs, refreshed conversations and title updates; isolate late SSE events from new drafts.
- [x] Add shared tokens, glass menus, skeletons, instant tooltips, active indicator, themed transient scrollbars and reduced motion. Own labels in all supported locales.
- [x] Run targeted browser/typecheck/lint/build checks and responsive visual QA.

## Task 3: Library, plugins/skills and scheduled screens

**Owner:** page implementer. **Files:** only `src/fsd/pages/workspace/*` and its export, optional page-local CSS and tests named `workspace-pages.spec.ts`. Parent creates app route files and shared API/provider.

- [x] Add failing browser tests for library tab/search/favorites/folders, plugins public/personal and skills CRUD/apply, genuine scheduled availability.
- [x] Implement exported `WorkspaceLibraryPage`, `WorkspacePluginsPage`, `WorkspaceScheduledPage` against shared interfaces. Every action calls a real endpoint; loading/empty/error/retry handled.
- [x] Match specified library toolbar/five tabs/cards/grid-list, plugin centered tabs/pill-search/installed-strip/two-column cards, skills editor/apply badge integration.
- [x] Use shared `WorkspaceDialog`, `WorkspaceMenu`, `WorkspaceIcon`, `useWorkspace`, `workspaceRequest`. Module paths/interfaces can be scaffolded jointly; coordinate before editing shared files.
- [x] Responsive 320 px/short heights, keyboard/focus, theme/reduced motion and no native dialogs. Secrets masked and never returned/stored on client.
- [x] Run page tests/typecheck and report integration needs. Do not commit other agents' or baseline changes.

## Task 4: Integration and independent review

**Owner:** primary agent + fresh reviewer after implementation.

- [x] Reconcile API/type/interface mismatches, register route-group pages, update spec with last user architecture requirements.
- [x] Run repository checks, frontend/backend typecheck/lint, relevant Jest/Playwright, builds, premium static audit and meaningful runtime workflow checks.
- [x] Browser QA at 320/390/768/1024/1440 px and short heights: no horizontal overflow, reachable toolbar/drawer, body lock restored, palette/menu collisions, keyboard and reduced motion.
- [x] Independently review implemented diff against spec and resolve substantive findings; record remaining limits truthfully.
- [x] Update execution ledger with completion evidence; deliver links and concise summary, no unsupported integration claims.

## Execution ledger

2026-10-17: User approved implementation and specified layout persistence, 20-token lightweight titler, body scroll lock and full responsiveness. Baseline `chat.service.spec.ts`: 9/9 pass. Branch `codex/chat-workspace` created retaining existing working changes.

Ruling: Work in this checkout on a dedicated branch — required project/context baseline is extensively uncommitted, while a fresh worktree would omit it; no reset/snapshot commit of user changes. Independent worker ownership is disjoint, with primary integration.

Preflight: Task 1 produces the workspace endpoints consumed by Tasks 2/3; field names above are authoritative. Task 2 owns shared feature/primitives; Task 3 imports them without changing them. Task 4 owns reconciliation/tests, not a second UI implementation. Each task couples behavior with verification; existing transport/payment are retained.

## Verified implementation checkpoint — 2026-10-17

Implementation and local verification above are complete for the approved configured/unavailable capability contract. 35 Jest tests and 22 Playwright tests pass; an additional eight-viewport visual pass succeeds. Next/Nest builds, typechecks, frontend lint, repository checks and strict workspace UI audit pass. Backend lint retains three unrelated warnings, zero errors.

No production migration or provider call was made. This machine currently has no backend `.env`, running backend, MySQL or Redis. Database integration and live provider validation remain release prerequisites. Scheduled execution and external plugin adapters expose unavailable/configuration-only states, and public sharing remains planned; these are not live capabilities. Request recovery does not automatically repeat an interrupted charge when no conversation link was persisted.

Detailed recovery/evidence record: `2026-10-17-chat-workspace-progress.md`. This record preserves all work from the interrupted multi-agent sessions and the integration fixes.
