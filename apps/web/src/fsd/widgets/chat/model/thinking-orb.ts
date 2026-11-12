/**
 * A small dotted sphere drawn on a canvas while the model works. Each kind of
 * work has its own motion, so the user can tell thinking from a map search or
 * an image being made at a glance.
 */
export type OrbMood = "thinking" | "searching" | "routing" | "creating" | "working";

const POINTS = 110;
const GOLDEN = Math.PI * (3 - Math.sqrt(5));
// Evenly spread points on a unit sphere (Fibonacci lattice).
const SPHERE = Array.from({ length: POINTS }, (_, index) => {
  const y = 1 - (index / (POINTS - 1)) * 2;
  const radius = Math.sqrt(1 - y * y);
  const theta = GOLDEN * index;
  return { x: Math.cos(theta) * radius, y, z: Math.sin(theta) * radius, seed: (index * 9301 + 49297) % 233280 / 233280 };
});

/** Picks the motion from the activity step the server streams. */
export function moodFor(step: string | undefined): OrbMood {
  const text = (step || "").toLowerCase();
  if (/route|direction/.test(text)) return "routing";
  if (/writ|report|drafting/.test(text)) return "creating";
  if (/plan|gap|memory/.test(text)) return "working";
  if (/search|map|look|read|source|browse|find/.test(text)) return "searching";
  if (/generat(ing)? (image|video|speech|music|media)|draw|render|compos/.test(text)) return "creating";
  if (!text || /generating response|thinking/.test(text)) return "thinking";
  return "working";
}

/** What the label says next to the orb. */
export function labelFor(step: string | undefined) {
  const text = (step || "").trim();
  if (!text || /^generating response$/i.test(text)) return "Thinking";
  return text.replace(/[.…]+$/, "");
}

export function drawOrb(context: CanvasRenderingContext2D, size: number, time: number, mood: OrbMood, light: boolean) {
  const center = size / 2;
  const scale = size * 0.4;
  context.clearRect(0, 0, size, size);
  const base = light ? "40, 44, 48" : "232, 236, 240";
  const accent = "94, 224, 196";
  const t = time / 1000;
  const spin = mood === "searching" ? t * 1.6 : mood === "routing" ? t * 1.2 : t * 0.7;
  const tilt = mood === "routing" ? 1.1 : 0.35 + Math.sin(t * 0.6) * 0.15;
  const [sinA, cosA, sinB, cosB] = [Math.sin(spin), Math.cos(spin), Math.sin(tilt), Math.cos(tilt)];
  const scan = Math.sin(t * 2.2);
  for (const point of SPHERE) {
    let { x, y, z } = point;
    if (mood === "routing") {
      // Flatten into an orbiting ring.
      const angle = Math.atan2(z, x);
      const ring = 1 + y * 0.18;
      x = Math.cos(angle) * ring; z = Math.sin(angle) * ring; y = y * 0.2;
    } else if (mood === "creating") {
      // Breathing outwards and back, each point on its own phase.
      const pulse = 1 + Math.sin(t * 2.4 + point.seed * Math.PI * 2) * 0.22;
      x *= pulse; y *= pulse; z *= pulse;
    } else if (mood === "working") {
      const jitter = 0.09;
      x += Math.sin(t * 3 + point.seed * 40) * jitter; y += Math.cos(t * 2.6 + point.seed * 30) * jitter;
    } else if (mood === "thinking") {
      const breathe = 1 + Math.sin(t * 1.8) * 0.05;
      x *= breathe; y *= breathe; z *= breathe;
    }
    // Rotate around Y, then tilt around X.
    const rx = x * cosA - z * sinA;
    const rz = x * sinA + z * cosA;
    const ry = y * cosB - rz * sinB;
    const depth = y * sinB + rz * cosB;
    const near = (depth + 1.3) / 2.3;
    let alpha = 0.18 + near * 0.82;
    let color = base;
    if (mood === "searching" && Math.abs(ry - scan) < 0.16) { alpha = 1; color = accent; }
    const radius = (0.45 + near * 0.8) * (size / 36);
    context.beginPath();
    context.fillStyle = `rgba(${color}, ${alpha.toFixed(3)})`;
    context.arc(center + rx * scale, center + ry * scale, radius, 0, Math.PI * 2);
    context.fill();
  }
}
