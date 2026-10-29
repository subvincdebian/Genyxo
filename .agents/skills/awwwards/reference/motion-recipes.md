# Motion recipes

Tight recipes for the proven motion patterns. Pair with `design-motion-principles` for which lens (restraint / polish / play) to apply.

## Framer Motion — velocity-driven marquee

Text physically reverses with scroll direction. Signature Switchyard move between sections.

```jsx
import {
  motion,
  useScroll,
  useVelocity,
  useSpring,
  useTransform,
  useMotionValue,
  useAnimationFrame,
} from "framer-motion";

function VelocityMarquee({ children, baseVelocity = 5 }) {
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
  const directionFactor = React.useRef(1);

  useAnimationFrame((_, delta) => {
    let moveBy = directionFactor.current * baseVelocity * (delta / 1000);
    if (velocityFactor.get() < 0) directionFactor.current = -1;
    else if (velocityFactor.get() > 0) directionFactor.current = 1;
    moveBy += directionFactor.current * moveBy * velocityFactor.get();
    baseX.set(baseX.get() + moveBy);
  });

  // Render 4 copies side by side, wrap with translateX(%)
  return (
    <div className="overflow-hidden whitespace-nowrap">
      <motion.div style={{ x: baseX }} className="inline-block">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="inline-block px-8">
            {children}
          </span>
        ))}
      </motion.div>
    </div>
  );
}
```

## Framer Motion — mouse-tilt 3D card

```jsx
function TiltCard({ children }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useTransform(y, [-100, 100], [10, -10]), {
    damping: 20,
    stiffness: 200,
  });
  const rotateY = useSpring(useTransform(x, [-100, 100], [-10, 10]), {
    damping: 20,
    stiffness: 200,
  });

  function onMove(e) {
    const r = e.currentTarget.getBoundingClientRect();
    x.set(e.clientX - r.left - r.width / 2);
    y.set(e.clientY - r.top - r.height / 2);
  }
  function onLeave() {
    x.set(0);
    y.set(0);
  }

  return (
    <motion.div
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ rotateX, rotateY, transformPerspective: 1000 }}
      className="will-change-transform"
    >
      {children}
    </motion.div>
  );
}
```

## Framer Motion — page-load stagger

```jsx
const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};
const item = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
};

<motion.section variants={container} initial="hidden" animate="show">
  {items.map((i) => (
    <motion.div key={i.id} variants={item}>
      {i.label}
    </motion.div>
  ))}
</motion.section>;
```

Custom easing `[0.22, 1, 0.36, 1]` is the polish-lens default. For restraint use `[0.4, 0, 0.2, 1]`. For play use spring `{ stiffness: 260, damping: 18 }`.

## anime.js — number count-up

```js
import anime from "animejs";

anime({
  targets: "#metric-revenue",
  innerHTML: [0, 12453],
  easing: "easeOutCubic",
  duration: 1800,
  round: 1,
});
```

## anime.js — text scramble

```js
const chars = "!<>-_\\/[]{}—=+*^?#________";
function scramble(el, finalText, duration = 1200) {
  const original = el.textContent;
  const startTime = performance.now();
  function frame(t) {
    const p = Math.min(1, (t - startTime) / duration);
    el.textContent = finalText
      .split("")
      .map((ch, i) =>
        i < Math.floor(p * finalText.length)
          ? ch
          : chars[Math.floor(Math.random() * chars.length)],
      )
      .join("");
    if (p < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
```

## anime.js — stagger pulse

```js
anime({
  targets: ".audit-pin",
  scale: [1, 1.15, 1],
  opacity: [0.6, 1, 0.6],
  delay: anime.stagger(180),
  duration: 1400,
  easing: "easeInOutSine",
  loop: true,
});
```

## Three.js — see `architecture-single-html.md` for full hero pattern

The iridescent icosahedron + procedural envmap + cylinder orbit rings recipe lives there.

## Motion meaning rule (from ui-ux-pro-max)

Every animation must reinforce **what is happening** in the interface. If you can't answer "what does this motion _mean_" in one sentence, cut it. Decoration without meaning is noise.

- Stagger reveals → "these items belong together, scan them in this order"
- Scale-on-hover → "this is interactive, you can press it"
- Layout transition → "this element is the same element, it just moved"
- Page-load fade-up → "the page is settling, you can start reading"

Decoration animations that don't pass this test = cut.
