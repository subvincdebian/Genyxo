# Gotchas

The recurring bugs that bite when building elite frontend pieces. Check this list before declaring done. Sourced from `~/switchyard/brain/Areas/AI/Memory/Procedural/2026-05-16-elite-frontend-skill-stacking.md` and `2026-05-16-powershell-tool-quirks.md`.

## 1. Italic gradient + character-split = invisible text

**Symptom:** `<span class="it" style="background-clip:text; color:transparent;">` with character-by-character animated children renders nothing.

**Cause:** Children inherit `color: transparent` but have no background of their own, so they vanish.

**Fix:** Don't character-split italic-gradient text. Render the whole word as one `motion.span` with the gradient applied directly. The word fades in instead of staggering per-character. Acceptable tradeoff.

## 2. Hooks inside helper functions

**Symptom:** Component renders fine in isolation but throws `Invalid hook call` or behaves erratically when used twice in the same parent.

**Cause:** A factory-style helper like `const make = (label) => { const x = useMotionValue(0); return <a>...</a>; }` called twice from one component shares hook order with the parent. React's rules-of-hooks are violated even though it sometimes accidentally works.

**Fix:** Promote the helper to a real component (`MagneticCTA`, `TiltCard`, etc.). Each invocation gets its own hook scope.

## 3. CSS custom properties in React style prop

**Not a bug — common false alarm.** `style={{ '--accent': value }}` works fine in React even though the typings complain. React passes CSS custom properties straight through to the DOM.

If TS complains, cast: `style={{ '--accent': value } as React.CSSProperties}`.

## 4. PowerShell + UTF-8 without BOM

**Symptom:** A `.ps1` file written by Claude's Write tool fails with `The string is missing the terminator: '.` or similar parser errors. Non-ASCII chars look like `â€"` instead of `—`.

**Cause:** Write tool produces UTF-8 without BOM. PowerShell 5.1 (the default on Win11 Home) reads BOM-less files as Windows-1252/ANSI, corrupting non-ASCII chars.

**Fix options:**

- Use ASCII-only chars in `.ps1` (em-dash → hyphen, curly quotes → straight)
- Re-save: `Get-Content $f -Raw | Set-Content $f -Encoding utf8`
- Or use `Out-File ... -Encoding utf8`

## 5. Three.js orbit text — back-half visible

**Symptom:** Text orbiting a 3D sphere shows through from the back, breaking the Saturn-ring illusion.

**Fix:** Use `MeshBasicMaterial({ side: THREE.FrontSide })`. `FrontSide` automatically culls the back half of the cylinder. Combine with `transparent: true` and `alphaTest: 0.1` so the unrendered cylinder background doesn't occlude the central object. Set `renderOrder: 1` on the ring so the central object draws first into the depth buffer.

## 6. Three.js iridescent material looks flat without an envmap

**Symptom:** `MeshPhysicalMaterial({ iridescence: 1, clearcoat: 1 })` looks dull and dead.

**Cause:** Iridescence and clearcoat need reflections to express. Without an `envMap`, the material has nothing to reflect.

**Fix:** Bake a procedural envmap from a `CanvasTexture` gradient through `PMREMGenerator`. See `architecture-single-html.md` for the full pattern. The gradient colours become the iridescent shimmer — pick gradient stops that complement the brand palette.

## 7. Velocity marquee jitters on mobile

**Symptom:** The Framer Motion velocity marquee judders on touch-scroll devices.

**Cause:** iOS / mobile browsers throttle `requestAnimationFrame` during momentum scroll, and `useVelocity` over-reads the throttled frames.

**Fix:** Increase the `useSpring` `damping` (50 → 80) and lower `stiffness` (400 → 200). The marquee feels slightly less responsive but stops juddering. For the cleanest result on mobile, disable the velocity factor entirely below 768px and run a constant-speed marquee.

## 8. Font flash of unstyled text (FOUT)

**Symptom:** Distinctive display font loads in noticeably after first paint. Whole hero re-flows.

**Fix:**

- Preconnect Google Fonts origins (`fonts.googleapis.com` AND `fonts.gstatic.com` with `crossorigin`)
- Request only the weights/styles you use, not full families
- Add `font-display: swap` in the font URL query string already, but set the fallback to a system font that matches the metrics (use `size-adjust` in `@font-face` if self-hosting)

## 9. The "fold" doesn't exist anymore, but hero performance still does

**Symptom:** Hero feels heavy. LCP > 2.5s.

**Cause:** Three.js + Framer Motion + anime.js all loading and initialising before first paint.

**Fix:**

- Render the hero text with plain HTML + CSS first. Mount the Three.js canvas behind it AFTER first paint.
- Lazy-import the React island for non-hero sections via dynamic `import()`.
- Three.js: lower `setPixelRatio` cap from `devicePixelRatio` to `Math.min(devicePixelRatio, 2)`. On 3x retina mobiles this halves GPU load with almost no visible difference.

## 10. `agent-browser` screenshots don't match local browser

**Symptom:** Layout looks fine in Chrome on Sam's machine; `agent-browser` screenshot shows broken layout.

**Common causes:**

- `agent-browser` defaults to a smaller default viewport than Sam's monitor
- Local fonts cached, headless browser has to fetch fresh — FOUT visible in screenshot
- Local cache hides a 404 on an asset that's broken in production paths

**Fix:** Always run `agent-browser` at the 4 standard viewports (320 / 768 / 1280 / 1920) and treat its screenshots as the ground truth, not the local browser.
