import {
  PET_ANIMATION,
  PET_CELL,
  PET_STATES,
  type PetState,
} from "@/shared/lib/pets";

/**
 * Sprite animation and movement for one pet. It only touches the two elements
 * it is given, so the host can be a web page today and a desktop overlay later.
 */
export type PetEngineOptions = {
  root: HTMLElement;
  sprite: HTMLElement;
  size: number;
  start: { x: number; y: number };
  reducedMotion: () => boolean;
  onMoved: (x: number, y: number) => void;
  onClick: () => void;
  onStateChange?: (state: PetState) => void;
};

const SLEEP_AFTER_MS = 5 * 60 * 1000;
const ONE_SHOT: PetState[] = ["wave", "jump", "failed", "happy"];

export function createPetEngine(options: PetEngineOptions) {
  const { root, sprite } = options;
  let size = options.size;
  const width = () => (size * PET_CELL.width) / PET_CELL.height;

  // Position of the sprite's top-left corner in viewport pixels.
  let x = 0;
  let y = 0;
  let targetX = 0;
  let targetY = 0;
  let velocityX = 0;
  let velocityY = 0;
  let tilt = 0;
  let facing = 1;

  let base: PetState = "idle";
  let shot: PetState | null = null;
  let state: PetState = "idle";
  let frame = 0;
  let frameClock = 0;
  let lastTime = 0;
  let raf = 0;
  let lastActivity = performance.now();
  let talkUntil = 0;
  let dragging = false;
  let pressed: { id: number; x: number; y: number; dx: number; dy: number; moved: boolean } | null = null;
  let thrown = false;
  let destroyed = false;

  const bounds = () => ({
    maxX: Math.max(0, innerWidth - width()),
    maxY: Math.max(0, innerHeight - size),
  });
  const clampToViewport = () => {
    const limit = bounds();
    x = Math.max(0, Math.min(limit.maxX, x));
    y = Math.max(0, Math.min(limit.maxY, y));
  };
  const place = (nx: number, ny: number) => {
    const limit = bounds();
    x = targetX = nx * limit.maxX;
    y = targetY = ny * limit.maxY;
  };
  place(options.start.x, options.start.y);

  function layout() {
    sprite.style.width = `${width()}px`;
    sprite.style.height = `${size}px`;
    sprite.style.backgroundSize = `${width() * 8}px ${size * PET_STATES.length}px`;
  }
  layout();

  function current(): PetState {
    if (dragging || thrown) return "run";
    if (shot) return shot;
    if (performance.now() < talkUntil) return "talk";
    return base;
  }

  function draw() {
    const row = PET_STATES.indexOf(state);
    sprite.style.backgroundPosition = `${-frame * width()}px ${-row * size}px`;
    root.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`;
    sprite.style.transform = `scaleX(${facing}) rotate(${tilt.toFixed(2)}deg)`;
  }

  function tick(time: number) {
    if (destroyed) return;
    raf = requestAnimationFrame(tick);
    const delta = Math.min(48, time - (lastTime || time));
    lastTime = time;
    const reduced = options.reducedMotion();

    // Movement: follow the pointer with a soft spring, then coast when thrown.
    if (dragging) {
      const follow = reduced ? 1 : 1 - Math.pow(0.0015, delta / 1000);
      const previousX = x;
      const previousY = y;
      x += (targetX - x) * follow;
      y += (targetY - y) * follow;
      velocityX = ((x - previousX) / delta) * 16;
      velocityY = ((y - previousY) / delta) * 16;
      if (Math.abs(velocityX) > 0.6) facing = velocityX > 0 ? 1 : -1;
      tilt += (Math.max(-14, Math.min(14, velocityX * 0.9)) - tilt) * 0.2;
      clampToViewport();
    } else if (thrown) {
      const limit = bounds();
      x += velocityX * (delta / 16);
      y += velocityY * (delta / 16);
      const friction = Math.pow(0.93, delta / 16);
      velocityX *= friction;
      velocityY *= friction;
      if (x < 0 || x > limit.maxX) {
        x = Math.max(0, Math.min(limit.maxX, x));
        velocityX *= -0.45;
        facing = velocityX > 0 ? 1 : -1;
      }
      if (y < 0 || y > limit.maxY) {
        y = Math.max(0, Math.min(limit.maxY, y));
        velocityY *= -0.45;
      }
      tilt *= 0.86;
      if (Math.hypot(velocityX, velocityY) < 0.35) {
        thrown = false;
        tilt = 0;
        facing = 1;
        options.onMoved(limit.maxX ? x / limit.maxX : 0, limit.maxY ? y / limit.maxY : 0);
        play("jump");
      }
    } else if (tilt) tilt = Math.abs(tilt) < 0.1 ? 0 : tilt * 0.8;

    // Falling asleep after five quiet minutes; any attention wakes it.
    if (
      base === "idle" &&
      !shot &&
      !dragging &&
      time - lastActivity > SLEEP_AFTER_MS
    )
      base = "sleep";

    const next = current();
    if (next !== state) {
      state = next;
      frame = 0;
      frameClock = 0;
      options.onStateChange?.(state);
    }
    const animation = PET_ANIMATION[state];
    if (reduced) frame = state === "sleep" ? animation.frames - 1 : 0;
    else {
      frameClock += delta;
      const step = 1000 / animation.fps;
      while (frameClock >= step) {
        frameClock -= step;
        frame += 1;
        if (frame >= animation.frames) {
          if (ONE_SHOT.includes(state)) {
            shot = null;
            frame = animation.frames - 1;
          } else frame = animation.loop ? (animation.from ?? 0) : animation.frames - 1;
        }
      }
    }
    draw();
  }

  function touch() {
    lastActivity = performance.now();
    if (base === "sleep") {
      base = "idle";
      play("wave");
    }
  }
  function play(next: PetState) {
    if (dragging) return;
    shot = next;
    if (state === next) frame = 0;
  }

  const down = (event: PointerEvent) => {
    if (event.button !== 0) return;
    touch();
    pressed = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      dx: event.clientX - x,
      dy: event.clientY - y,
      moved: false,
    };
    thrown = false;
    sprite.setPointerCapture(event.pointerId);
  };
  const move = (event: PointerEvent) => {
    if (!pressed || event.pointerId !== pressed.id) return;
    if (
      !pressed.moved &&
      Math.hypot(event.clientX - pressed.x, event.clientY - pressed.y) < 5
    )
      return;
    if (!pressed.moved) {
      pressed.moved = true;
      dragging = true;
      shot = null;
      root.dataset.dragging = "true";
    }
    targetX = event.clientX - pressed.dx;
    targetY = event.clientY - pressed.dy;
  };
  const up = (event: PointerEvent) => {
    if (!pressed || event.pointerId !== pressed.id) return;
    const wasDrag = pressed.moved;
    pressed = null;
    if (sprite.hasPointerCapture(event.pointerId))
      sprite.releasePointerCapture(event.pointerId);
    delete root.dataset.dragging;
    if (!wasDrag) {
      options.onClick();
      return;
    }
    dragging = false;
    if (options.reducedMotion()) {
      x = targetX;
      y = targetY;
      clampToViewport();
      velocityX = velocityY = 0;
    }
    thrown = true;
  };
  const enter = () => {
    const asleep = base === "sleep";
    const quiet = performance.now() - lastActivity > 20000;
    touch();
    if (!asleep && quiet && !shot && base === "idle") play("wave");
  };
  const resize = () => {
    clampToViewport();
    targetX = x;
    targetY = y;
  };

  // Only the sprite itself drags and toggles the chat; clicks inside the chat
  // panel or the menu (children of root) must never reach these handlers.
  sprite.addEventListener("pointerdown", down);
  sprite.addEventListener("pointermove", move);
  sprite.addEventListener("pointerup", up);
  sprite.addEventListener("pointercancel", up);
  sprite.addEventListener("pointerenter", enter);
  window.addEventListener("resize", resize);
  raf = requestAnimationFrame(tick);

  return {
    /** Long-running mood: idle, listen, think or sleep. */
    setBase(next: Extract<PetState, "idle" | "listen" | "think" | "sleep">) {
      if (next !== "sleep") lastActivity = performance.now();
      base = next;
    },
    /** A reaction that plays once and returns to the base mood. */
    play(next: Extract<PetState, "wave" | "jump" | "failed" | "happy">) {
      touch();
      play(next);
    },
    /** Keep the mouth moving while answer text or speech arrives. */
    talk(ms = 700) {
      lastActivity = performance.now();
      if (base === "sleep") base = "idle";
      talkUntil = performance.now() + ms;
    },
    touch,
    setSize(next: number) {
      size = next;
      layout();
      resize();
    },
    position: () => ({ x, y, width: width(), height: size }),
    destroy() {
      destroyed = true;
      cancelAnimationFrame(raf);
      sprite.removeEventListener("pointerdown", down);
      sprite.removeEventListener("pointermove", move);
      sprite.removeEventListener("pointerup", up);
      sprite.removeEventListener("pointercancel", up);
      sprite.removeEventListener("pointerenter", enter);
      window.removeEventListener("resize", resize);
    },
  };
}
export type PetEngine = ReturnType<typeof createPetEngine>;
