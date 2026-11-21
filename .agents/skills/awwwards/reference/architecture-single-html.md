# Single HTML architecture

The Switchyard signature for showcase pages, client demos, internal artifacts, and creative coding pieces. No build step. No toolchain. Loads in seconds, deploys by copying a file.

## Skeleton

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>...</title>

    <!-- Fonts: pick distinctive ones; never default to Inter/Roboto -->
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300..900&family=JetBrains+Mono:wght@400;700&display=swap"
      rel="stylesheet"
    />

    <!-- Import map: every runtime dep from esm.sh -->
    <script type="importmap">
      {
        "imports": {
          "react": "https://esm.sh/react@18.3.1",
          "react-dom/client": "https://esm.sh/react-dom@18.3.1/client",
          "framer-motion": "https://esm.sh/framer-motion@11.11.17?external=react",
          "three": "https://esm.sh/three@0.169.0",
          "htm": "https://esm.sh/htm@3.1.1",
          "animejs": "https://esm.sh/animejs@3.2.2"
        }
      }
    </script>

    <style>
      :root {
        /* OKLCH tokens from phase 2. Never #000 / #fff. */
        --bg: oklch(0.18 0.01 80);
        --ink: oklch(0.95 0.01 80);
        --accent: oklch(0.78 0.18 70);
        --muted: oklch(0.65 0.02 80);
      }
      html,
      body {
        margin: 0;
        background: var(--bg);
        color: var(--ink);
        font-family: "Fraunces", serif;
      }
      /* ... */
    </style>
  </head>
  <body>
    <main id="page"><!-- vanilla sections here --></main>
    <div id="lens-lab"><!-- React island mount point --></div>

    <script type="module">
      import * as THREE from "three";
      import anime from "animejs";
      // Three.js hero, anime.js effects directly here

      // React island:
      import React from "react";
      import { createRoot } from "react-dom/client";
      import {
        motion,
        AnimatePresence,
        useScroll,
        useVelocity,
        useTransform,
        useSpring,
        useMotionValue,
        useAnimationFrame,
      } from "framer-motion";
      import htm from "htm";
      const html = htm.bind(React.createElement);

      function LensLab() {
        // Framer Motion components built with htm tagged templates — no Babel needed
        return html`<div>...</div>`;
      }
      createRoot(document.getElementById("lens-lab")).render(
        html`<${LensLab} />`,
      );
    </script>
  </body>
</html>
```

## Why this layout

- **Import map** lets you write bare specifiers (`import { motion } from 'framer-motion'`) in browser-native ES modules.
- **`htm` tagged templates** give you JSX-like syntax without a Babel pipeline.
- **React islands** — most of the page is vanilla DOM + Three.js + anime.js for performance. Only the genuinely-interactive bits (the lens lab, the audit theatre) mount React. This keeps the bundle tiny and avoids hydrating a static page.
- **Fonts via Google Fonts** — preconnect both origins, request only the weights you use. Fraunces (display) + JetBrains Mono (mono) is one good pairing; vary by project.

## Three.js hero pattern

```js
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
camera.position.set(0, 0, 5);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(w, h);

// Procedural environment map — bake from a CanvasTexture gradient
const envCanvas = document.createElement("canvas");
envCanvas.width = 1024;
envCanvas.height = 512;
const ctx = envCanvas.getContext("2d");
const g = ctx.createLinearGradient(0, 0, 0, 512);
g.addColorStop(0, "#1a1a2e");
g.addColorStop(1, "#ffb400");
ctx.fillStyle = g;
ctx.fillRect(0, 0, 1024, 512);
const envTexture = new THREE.CanvasTexture(envCanvas);
const pmrem = new THREE.PMREMGenerator(renderer);
const envMap = pmrem.fromEquirectangular(envTexture).texture;

// Hero object — iridescent icosahedron
const geo = new THREE.IcosahedronGeometry(1, 1);
const mat = new THREE.MeshPhysicalMaterial({
  metalness: 0.4,
  roughness: 0.15,
  iridescence: 1,
  iridescenceIOR: 1.6,
  clearcoat: 1,
  envMap,
});
const mesh = new THREE.Mesh(geo, mat);
scene.add(mesh);

// Real 3D orbit text — cylinder + CanvasTexture, FrontSide auto-culls back half
function makeOrbitRing(text, radius, y) {
  const c = document.createElement("canvas");
  c.width = 2048;
  c.height = 256;
  const cx = c.getContext("2d");
  cx.fillStyle = "rgba(255,180,0,0.9)";
  cx.font = 'bold 120px "JetBrains Mono"';
  cx.textBaseline = "middle";
  cx.fillText(text + "  •  ".repeat(4), 0, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  const ringGeo = new THREE.CylinderGeometry(radius, radius, 0.4, 64, 1, true);
  const ringMat = new THREE.MeshBasicMaterial({
    map: tex,
    side: THREE.FrontSide, // critical — culls back half automatically
    transparent: true,
    alphaTest: 0.1,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.position.y = y;
  ring.renderOrder = 1; // icosahedron draws first
  return ring;
}
scene.add(makeOrbitRing("SWITCHYARD", 1.6, 0));
scene.add(makeOrbitRing("END OF LINE", 1.6, -0.3));
```

## Velocity marquee pattern (Framer Motion)

```jsx
function VelocityMarquee({ text, baseVelocity = 5 }) {
  const baseX = useMotionValue(0);
  const { scrollY } = useScroll();
  const scrollVelocity = useVelocity(scrollY);
  const smoothVelocity = useSpring(scrollVelocity, {
    damping: 50,
    stiffness: 400,
  });
  const velocityFactor = useTransform(smoothVelocity, [0, 1000], [0, 5], {
    clamp: false,
  });

  useAnimationFrame((_, delta) => {
    let moveBy = baseVelocity * (delta / 1000);
    moveBy += moveBy * velocityFactor.get();
    baseX.set(baseX.get() + moveBy);
  });

  return html`<motion.div style=${{ x: baseX }}
    >${text} ${text} ${text}</motion.div
  >`;
}
```

## Magnetic CTA pattern

```jsx
function MagneticCTA({ label, href }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { damping: 20, stiffness: 300 });
  const sy = useSpring(y, { damping: 20, stiffness: 300 });

  function onMove(e) {
    const r = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - r.left - r.width / 2) * 0.3);
    y.set((e.clientY - r.top - r.height / 2) * 0.3);
  }
  function onLeave() {
    x.set(0);
    y.set(0);
  }

  return html`<motion.a
    href=${href}
    style=${{ x: sx, y: sy }}
    onMouseMove=${onMove}
    onMouseLeave=${onLeave}
    >${label}</motion.a
  >`;
}
```

**Hooks-in-helpers gotcha:** the above MUST be a real component, not a factory function called from another component. Hooks need their own scope per invocation.
