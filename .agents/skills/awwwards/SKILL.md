---
name: awwwards
description: Elite frontend orchestrator — slams the full design stack together for Awwwards-tier, blow-my-mind UI work. Use when the user asks for an elite/premium/showcase/standout/hero/jaw-dropping/portfolio-grade/award-worthy frontend, a landing page that has to wow, a client demo that needs to land, a brand site, a marketing hero, a creative coding piece, an interactive showcase, a Remotion video composition, or any single-shot HTML/React artifact where the bar is craft, not just function. Composes frontend-design + impeccable + ui-ux-pro-max + design-motion-principles + color-expert + color-palette-extractor + agent-browser + remotion-best-practices, plus the proven runtime stack of Framer Motion + anime.js + Three.js + 21st.dev component patterns via the Magic MCP. Triggers on phrases like 'elite', 'blow my mind', 'Awwwards', 'absolutely insane', 'go all out', 'showcase', 'something special', 'don't hold back', 'jaw-dropping', 'wow factor', 'premium feel', 'hero piece', 'pitch deck slide', 'creative coding', and on
user-invocable: true
argument-hint: "[brief — what you're building and the vibe]"
license: MIT — Sam Luker / Switchyard. Free to use and remix.
metadata:
  mcpmarket-version: 1.0.0
---

You are about to build something elite. The bar is **Awwwards-tier craft** — the page someone screenshots and shares, not the page that just works. This skill orchestrates the full Switchyard frontend stack into one disciplined pipeline.

Do not treat this as a checklist to race through. Each phase is load-bearing. Skipping the brief = generic. Skipping the colour pass = wrong palette. Skipping verification = "works on my machine" delivered to a paying client.

---

## When this fires

The skill description handles the trigger. Inside the skill, your job is to commit to the bar and run the pipeline.

If the request is genuinely utilitarian (internal admin, CRUD form, bug fix), STOP and tell the user this skill is overkill — point them at `frontend-design` or `impeccable` instead. Don't burn an elite pipeline on a settings page.

---

## The stack (and the order they run in)

| Phase                    | Skill / Tool                                                                   | What it produces                                                        |
| ------------------------ | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| 1. Brief                 | (this skill)                                                                   | Aesthetic direction, register, success criteria                         |
| 2. Palette               | `color-palette-extractor` OR `color-expert`                                    | OKLCH tokens, named roles, commitment level                             |
| 3. Inspiration           | `ui-ux-pro-max:ui-ux-pro-max` + `mcp__magic__21st_magic_component_inspiration` | Reference components, patterns, anti-patterns                           |
| 4. Composition           | `frontend-design`                                                              | Bold, committed layout with a clear conceptual direction                |
| 5. Motion calibration    | `design-motion-principles`                                                     | Three-lens decision: restraint / polish / play                          |
| 6. Implementation        | (this skill, see Architecture below)                                           | Working code with Framer Motion + anime.js + Three.js + 21st.dev pieces |
| 7. Video (if applicable) | `remotion-best-practices`                                                      | Remotion composition, captions, hero loops                              |
| 8. Polish & audit        | `impeccable`                                                                   | Restraint pass, hierarchy, edge cases, accessibility                    |
| 9. Verification          | `agent-browser`                                                                | Real-browser screenshot, viewport sweep, interaction test               |

**Hard rule:** Phases 1, 2, 4, 6, 8, 9 are mandatory for any elite build. Phase 3 is mandatory if you don't already have a strong reference in mind. Phase 5 is mandatory the moment you add a single transition. Phase 7 fires only for video deliverables.

---

## Phase 1 — Brief

Before opening an editor, lock the brief. Either elicit from the user or commit to your own answers and surface them for sign-off:

- **Purpose & audience** — one sentence each. "Who screenshots this and why."
- **Register** — **brand** (design IS the product: marketing, landing, hero, portfolio) or **product** (design SERVES the product: dashboard, app, tool). This routes the rest of the build.
- **Aesthetic direction** — pick ONE extreme and commit: brutally minimal, maximalist chaos, retro-futuristic, organic/natural, luxury editorial, playful toy-like, art deco, industrial brutalist, soft pastel, etc. Bland centrism is the enemy.
- **The unforgettable thing** — what is the _one_ element someone remembers? An iridescent 3D object? A velocity-driven marquee? A scroll-locked colour shift? Name it now.
- **Constraints** — framework (single HTML vs Next.js vs Remotion), performance budget, accessibility floor, viewport support.

Write these into a short brief and confirm with the user before phase 2. If `~/CLAUDE.md` or a project-level `PRODUCT.md` exists for the active project (e.g. Switchyard Web's Railyard aesthetic), the brief inherits from it — don't reinvent.

---

## Phase 2 — Palette

**Branch A — the design is for a real client / existing brand:**

- Use `color-palette-extractor` against the client's live site via headless browser screenshot. Never invent "tasteful guess" colours for a paying client.
- If no live site exists, ask Sam for brand assets or a reference URL.

**Branch B — original creative piece:**

- Use `color-expert` to invent a palette. Pick a **commitment level** explicitly (the impeccable taxonomy):
  - **Restrained** — tinted neutrals + one accent ≤10%. Product default.
  - **Committed** — one saturated color carries 30–60% of the surface.
  - **Full palette** — 3–4 named roles, each deliberate.
  - **Drenched** — the surface IS the color.

**Both branches:** Output OKLCH values, not hex. Never `#000` or `#fff` — tint every neutral toward the brand hue (chroma 0.005–0.01). Reduce chroma as lightness approaches 0 or 100.

Save the resulting tokens as CSS variables (`--bg`, `--ink`, `--accent`, etc.) and reuse them everywhere. No hardcoded duplicates.

---

## Phase 3 — Inspiration

When sourcing component patterns:

1. **`ui-ux-pro-max:ui-ux-pro-max`** — load the design intelligence library. Pull the relevant style (glassmorphism / brutalism / bento / etc.), the matching font pairing, the UX guidelines for the component type, and the chart stack if data viz is involved.
2. **`mcp__magic__21st_magic_component_inspiration`** — search for the specific component type ("hero with 3D object", "velocity marquee", "bento grid", "audit pin tooltip"). Pull 2–4 references.
3. **`mcp__magic__21st_magic_component_builder`** — when you find a 21st.dev pattern that fits exactly, generate the component code through Magic instead of rewriting from scratch.
4. **`mcp__magic__logo_search`** — if real brand logos are needed (testimonials, integration grid), pull them properly. Never fake logos.

Inspiration is a starting point, not a destination. Always remix; never copy 1:1.

---

## Phase 4 — Composition

Invoke `frontend-design`'s principles for the overall composition:

- **Typography:** distinctive display font paired with refined body. NEVER Inter, Roboto, Arial, system fonts. NEVER Space Grotesk by reflex (it's the AI-slop default).
- **Color:** apply the palette from phase 2 with the chosen commitment level. Dominant colours with sharp accents outperform timid even distributions.
- **Layout:** unexpected. Asymmetry. Overlap. Diagonal flow. Grid-breaking. Generous negative space OR controlled density — pick one and commit.
- **Backgrounds:** gradient meshes, noise textures, geometric patterns, layered transparencies, dramatic shadows, custom cursors, grain overlays. Never default to flat solids unless the aesthetic explicitly demands it.

NEVER produce AI-generic output: purple gradients on white, generic fonts, predictable layouts, cookie-cutter components.

---

## Phase 5 — Motion calibration

Invoke `design-motion-principles` and pick a lens:

- **Restraint (Emil)** — instant, near-invisible motion. Spring overshoot minimal. For tools and product UI where motion must not interrupt task flow.
- **Polish (Krehel)** — choreographed, measured, with deliberate easing curves. The default for premium brand and landing.
- **Play (Jhey)** — bouncy, expressive, character-driven. For portfolios, creative pieces, anything where personality matters more than speed.

Pick one lens _per surface_ and commit. Mixing lenses inside one section reads as indecision.

---

## Phase 6 — Implementation (the proven recipe)

There are three architecture branches. Pick before writing a line.

### Branch A — Single HTML file, no build step

The Switchyard signature for showcase pages, demos, client pitches, internal artifacts. Loads in seconds, no toolchain, zero deployment friction. **Reference:** [`reference/architecture-single-html.md`](reference/architecture-single-html.md).

Key moves:

- ES module import map with `react`, `react-dom`, `framer-motion`, `three`, `htm`, `animejs` from `esm.sh`
- Babel-free JSX via `htm` tagged templates
- Vanilla CSS with the OKLCH tokens from phase 2
- React islands inside an otherwise-vanilla page for the interactive bits

### Branch B — Next.js / production framework

When the build is going into `~/switchyard/web` or another deployed app. Use `vercel:nextjs`, `vercel:shadcn`, `vercel:next-cache-components` for the platform layer. Still apply phases 1–5 from this skill before coding.

### Branch C — Remotion video

For motion graphics, brand intros, demo reels. Hand off to `remotion-best-practices` for the composition rules, then return here for the audio + delivery pass via `switchyard-video`.

### Motion library matrix

| Tool              | Use for                                                                                                                                                                                                                                                 |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Framer Motion** | React component motion, layout transitions, `useScroll`/`useVelocity`/`useTransform`/`useSpring`/`useMotionValue`/`useAnimationFrame`. Velocity-driven marquees. Mouse-tilt 3D cards. Layout choreography.                                              |
| **anime.js**      | Specific effects — number counters (count-up via `easing: 'easeOutCubic'`), text scramble, stagger pulses, SVG path morphs.                                                                                                                             |
| **Three.js**      | Hero 3D objects. Use `MeshPhysicalMaterial` (iridescence, clearcoat). Procedural environment maps via `PMREMGenerator` on a `CanvasTexture` gradient. Real 3D orbit text via `CylinderGeometry` + `CanvasTexture` + `FrontSide` (auto-culls back half). |
| **CSS-only**      | Static decoration, hover micro-interactions, page-load stagger via `animation-delay`. First reach.                                                                                                                                                      |

Detailed patterns in [`reference/motion-recipes.md`](reference/motion-recipes.md).

### Known gotchas (these have bitten before)

1. **Italic gradient + character-split = invisible text.** Children inherit `color: transparent` from the parent but have no background. Fix: render gradient italics as a single `motion.span`, not character-split.
2. **Hooks inside helper functions = rules-of-hooks violation.** Promote any helper that calls `useMotionValue`/`useSpring` to its own component (e.g. `MagneticCTA`).
3. **PowerShell + UTF-8 without BOM = parser corruption.** When writing `.ps1` files for Sam's environment, use ASCII-only OR re-save with `-Encoding utf8`. See [[powershell-tool-quirks]] memory.
4. **CSS custom properties in React `style={{}}` work fine** even though the typings complain. `style={{ '--accent': value }}` is valid.

Full list: [`reference/gotchas.md`](reference/gotchas.md).

---

## Phase 7 — Video (if applicable)

If the deliverable includes motion graphics:

- `remotion-best-practices` for composition structure
- `switchyard-video` for end-to-end production (brief → render → social cuts)
- Default to **FREE assets and free-tier services**. Never auto-spend on fal-ai or paid TTS without asking Sam first.

---

## Phase 8 — Polish & audit

Hand the finished artifact to `impeccable` for the final pass:

- `impeccable audit` — restraint check, hierarchy, contrast, edge cases
- `impeccable shape` — if a section needs structural rework
- `impeccable live` — for live browser iteration on specific elements

The audit covers: visual hierarchy, cognitive load, accessibility (contrast ratios, touch target size ≥44px, focus rings, motion-meaning), responsive behavior at all viewports, error states, edge cases, copy precision.

---

## Phase 9 — Verification

Use `agent-browser` to:

1. Open the built artifact in a real browser
2. Screenshot at 320 / 768 / 1280 / 1920 viewports
3. Tab-through to verify focus order and keyboard accessibility
4. Hover/click every interactive element to verify motion fires
5. Throttle network/CPU to confirm motion still feels deliberate on slower hardware

**Type checking and test suites verify code correctness, not feature correctness.** If you can't open it in a browser, say so explicitly rather than claiming success.

---

## Anti-patterns (auto-reject)

- Inter / Roboto / Arial / generic system fonts
- Purple gradients on white backgrounds
- Space Grotesk by reflex
- Centred, evenly-spaced hero with one heading + one subhead + one button (the "AI slop landing page")
- Even, timid colour distributions
- Flat solid backgrounds when the aesthetic could carry depth
- Animations that don't reinforce meaning (motion-meaning rule from ui-ux-pro-max)
- Fake testimonials, fake logos, fake metrics
- Time-of-delivery promises in any Switchyard-facing copy (hard rule from `~/CLAUDE.md`)
- "Cheaper than other agencies" pricing language — use _"no agency overhead — same work, no office and account-manager fees"_

---

## Output checklist (before declaring done)

- [ ] Brief written and confirmed
- [ ] Palette in OKLCH, tokenised as CSS variables, no hex duplicates
- [ ] Typography is distinctive (not Inter / Roboto / Arial)
- [ ] One unforgettable element exists and works
- [ ] Motion lens (restraint / polish / play) is consistent within each surface
- [ ] All Framer Motion / anime.js / Three.js usage matches the matrix above
- [ ] All gotchas checked (italic-gradient, hooks-in-helpers, CSS vars)
- [ ] `impeccable audit` pass complete
- [ ] `agent-browser` verification at 4 viewports complete
- [ ] No AI-slop anti-patterns present
- [ ] No hardcoded values that should be tokens
- [ ] If client work: palette extracted from real client site (not invented)
- [ ] If Switchyard work: Railyard rules honoured (sodium amber as signal not fill, hero h1 locked, no time-promises, no "client owns code")

---

## Quick reference — the canonical reference build

Sam's `~/skills-showcase/index.html` (built 2026-05-16) is the canonical reference for what "absolutely elite" means in this stack. When in doubt, mirror its choices:

- Hero: iridescent Three.js icosahedron + two orbiting text rings + magnetic CTAs + anime.js number counters
- Velocity marquees between sections (Framer Motion `useVelocity` + `useSpring` + `useTransform`)
- Bento grid with 3D mouse-tilt cards
- Lens lab demonstrating restraint / polish / play side-by-side
- UI audit theatre with hover-tooltip pins citing specific ui-ux-pro-max rules

That file is the standard. If the new build isn't at least that polished, it's not done.
