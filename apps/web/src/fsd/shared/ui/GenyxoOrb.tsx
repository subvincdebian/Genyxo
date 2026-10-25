"use client";
import { useEffect, useRef, type CSSProperties } from "react";

export type OrbState = "idle" | "listening" | "thinking" | "speaking" | "muted";

// Per-state motion: how fast the inner fluid flows, how dense it is, how much colour it keeps.
const motion: Record<OrbState, { speed: number; energy: number; saturation: number }> = {
  idle: { speed: 0.55, energy: 0.45, saturation: 1 },
  listening: { speed: 0.95, energy: 0.75, saturation: 1 },
  thinking: { speed: 1.8, energy: 0.7, saturation: 1 },
  speaking: { speed: 1.25, energy: 0.95, saturation: 1 },
  muted: { speed: 0.25, energy: 0.3, saturation: 0.25 },
};

const vertex = `attribute vec2 p; void main() { gl_Position = vec4(p, 0.0, 1.0); }`;

// A glass sphere holding a slowly folding volume of light. The volume is
// sampled at a few depths along the view ray, so colour sits inside the
// sphere rather than painted on it; Fresnel rim, a specular highlight and a
// warm core make the shell read as a physical object.
const fragment = `
precision highp float;
uniform vec2 uRes;
uniform float uTime, uEnergy, uLevel, uSat;
float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float noise(vec3 x) {
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float fbm(vec3 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.03 + vec3(1.7, 9.2, 4.1); a *= 0.5; } return v; }
void main() {
  vec2 uv = (gl_FragCoord.xy * 2.0 - uRes) / min(uRes.x, uRes.y);
  float R = 0.9 + uLevel * 0.045;
  float r = length(uv);
  if (r > R + 0.01) { gl_FragColor = vec4(0.0); return; }
  float edge = smoothstep(R, R - 0.014, r);
  vec2 q = uv / R;
  float z = sqrt(max(0.0, 1.0 - dot(q, q)));
  vec3 n = normalize(vec3(q, z));
  float t = uTime;
  vec3 w = vec3(q * 1.35, t * 0.11);
  vec3 warp = vec3(fbm(w + t * 0.06), fbm(w + vec3(5.2, 1.3, 2.8) - t * 0.05), fbm(w + vec3(9.1, 4.7, 1.2) + t * 0.04));
  vec3 col = vec3(0.0); float acc = 0.0;
  for (int i = 0; i < 6; i++) {
    float s = float(i) / 5.0;
    vec3 p = vec3(q * (1.0 + s * 0.22), z * (1.0 - 2.0 * s));
    float d = fbm(p * 2.1 + warp * (1.6 + uEnergy) + vec3(0.0, 0.0, t * 0.09));
    float dens = smoothstep(0.5 - uEnergy * 0.14, 0.8, d) * (1.0 - s * 0.3);
    vec3 c = mix(vec3(0.07, 0.48, 0.55), vec3(0.58, 0.97, 0.86), smoothstep(0.3, 0.75, warp.x));
    c = mix(c, vec3(0.22, 0.5, 1.0), smoothstep(0.36, 0.6, warp.y) * 0.9);
    c = mix(c, vec3(0.56, 0.38, 1.0), smoothstep(0.44, 0.66, warp.z) * 0.8);
    float wgt = dens * (1.0 - acc) * 0.5;
    col += c * wgt * 1.3; acc += wgt;
  }
  col += mix(vec3(0.004, 0.02, 0.05), vec3(0.01, 0.07, 0.07), z) * (1.0 - acc);
  col += vec3(0.4, 0.98, 0.86) * pow(max(0.0, 1.0 - r / R), 2.6) * (0.18 + uLevel * 0.75 + uEnergy * 0.12);
  vec3 L = normalize(vec3(-0.55, 0.72, 0.85));
  float rim = pow(1.0 - z, 2.4);
  col += vec3(0.5, 0.97, 0.86) * rim * 0.5;
  col += vec3(0.42, 0.55, 1.0) * pow(1.0 - z, 6.0) * 0.55;
  col += vec3(1.0) * pow(max(dot(reflect(-L, n), vec3(0.0, 0.0, 1.0)), 0.0), 44.0) * 0.7;
  col += vec3(1.0) * smoothstep(0.32, 0.0, length(q - vec2(-0.36, 0.44))) * 0.12;
  col += vec3(0.3, 0.92, 0.82) * pow(max(dot(n, normalize(vec3(0.25, -0.85, 0.45))), 0.0), 7.0) * 0.22;
  col = 1.0 - exp(-col * 1.7);
  float grey = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(vec3(grey), col, uSat);
  gl_FragColor = vec4(col * edge, edge);
}`;

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
}

/**
 * Genyxo's orb: a WebGL glass sphere with a living interior, falling back to
 * the layered CSS orb where WebGL is unavailable. `level` (0..1) lets audio
 * drive its glow; it pauses off screen and holds one frame under reduced motion.
 */
export function GenyxoOrb({ size = 76, state = "idle", level = 0, logo = true, className = "" }: { size?: number; state?: OrbState; level?: number; logo?: boolean; className?: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const root = useRef<HTMLSpanElement>(null);
  const live = useRef({ state, level });
  useEffect(() => { live.current = { state, level }; }, [state, level]);

  useEffect(() => {
    const element = canvas.current;
    const host = root.current;
    if (!element || !host) return;
    const gl = element.getContext("webgl", { premultipliedAlpha: true, antialias: true, alpha: true });
    if (!gl) return;
    const program = gl.createProgram();
    const vs = compile(gl, gl.VERTEX_SHADER, vertex);
    const fs = compile(gl, gl.FRAGMENT_SHADER, fragment);
    if (!program || !vs || !fs) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "p");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const uniform = (name: string) => gl.getUniformLocation(program, name);
    const uRes = uniform("uRes"), uTime = uniform("uTime"), uEnergy = uniform("uEnergy"), uLevel = uniform("uLevel"), uSat = uniform("uSat");
    host.classList.add("is-gl");

    const scale = Math.min(window.devicePixelRatio || 1, 2);
    element.width = Math.round(size * scale);
    element.height = Math.round(size * scale);
    gl.viewport(0, 0, element.width, element.height);

    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Phase advances at the state's speed, and speed/energy ease between states
    // so a state change accelerates the fluid instead of jumping.
    let phase = 7.3, speed = motion[live.current.state].speed, energy = motion[live.current.state].energy, sat = 1, glow = 0;
    let last = performance.now(), frame = 0, visible = true;
    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const target = motion[live.current.state];
      speed += (target.speed - speed) * Math.min(1, dt * 3);
      energy += (target.energy - energy) * Math.min(1, dt * 3);
      sat += (target.saturation - sat) * Math.min(1, dt * 4);
      glow += (live.current.level - glow) * Math.min(1, dt * 10);
      phase += dt * speed;
      gl.uniform2f(uRes, element.width, element.height);
      gl.uniform1f(uTime, phase);
      gl.uniform1f(uEnergy, energy);
      gl.uniform1f(uLevel, glow);
      gl.uniform1f(uSat, sat);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      if (!reduced && visible && !document.hidden) frame = requestAnimationFrame(draw);
    };
    const resume = () => { cancelAnimationFrame(frame); last = performance.now(); frame = requestAnimationFrame(draw); };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) resume(); });
    observer.observe(element);
    const onVisibility = () => { if (!document.hidden && visible) resume(); };
    document.addEventListener("visibilitychange", onVisibility);
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      host.classList.remove("is-gl");
      // Free GPU objects but keep the context: React may re-run this effect on
      // the same canvas, and a deliberately lost context cannot be reused.
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    };
  }, [size]);

  return <span ref={root} className={`gx-orb ${className}`} data-state={state} style={{ "--gx-orb-size": `${size}px`, "--gx-orb-level": Math.min(1, Math.max(0, level)).toFixed(3) } as CSSProperties} aria-hidden="true">
    <span className="gx-orb-aura" />
    <span className="gx-orb-body">
      <span className="gx-orb-field gx-orb-field-1" />
      <span className="gx-orb-field gx-orb-field-2" />
      <span className="gx-orb-field gx-orb-field-3" />
      <span className="gx-orb-field gx-orb-field-4" />
      <span className="gx-orb-sheen" />
    </span>
    <canvas ref={canvas} className="gx-orb-canvas" width={size} height={size} />
    {logo && <img className="gx-orb-logo" src="/images/logo.svg" alt="" width={Math.round(size * 0.34)} height={Math.round(size * 0.34)} />}
  </span>;
}
