"use client";
// What the model can see during a voice call: the user's camera, a shared
// screen, window or tab, or both (the camera then sits in a corner of the
// screen, as in a meeting). Frames are taken from the live streams on demand:
// once a second for Gemini Live, and once per spoken question for other models.

export type VisionSnapshot = {
  camera: MediaStream | null;
  screen: MediaStream | null;
  /** What is being shared, e.g. "Entire screen", "Window" or "Tab". */
  screenKind: string;
  cameras: MediaDeviceInfo[];
  cameraId: string;
};

const empty: VisionSnapshot = { camera: null, screen: null, screenKind: "", cameras: [], cameraId: "" };
let snapshot = empty;
const listeners = new Set<() => void>();
const set = (patch: Partial<VisionSnapshot>) => { snapshot = { ...snapshot, ...patch }; listeners.forEach((listener) => listener()); };

export const subscribeVision = (listener: () => void) => { listeners.add(listener); return () => listeners.delete(listener); };
export const getVisionSnapshot = () => snapshot;
export const getServerVisionSnapshot = () => empty;
export const isSeeing = () => Boolean(snapshot.camera || snapshot.screen);

export const canShareScreen = () => typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getDisplayMedia);
export const canUseCamera = () => typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia);

// Frames are drawn from hidden, muted video elements that follow each stream.
const players = new Map<MediaStream, HTMLVideoElement>();
function player(stream: MediaStream) {
  let video = players.get(stream);
  if (!video) {
    video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.srcObject = stream;
    void video.play().catch(() => {});
    players.set(stream, video);
  }
  return video;
}
function release(stream: MediaStream | null) {
  if (!stream) return;
  stream.getTracks().forEach((track) => track.stop());
  const video = players.get(stream);
  if (video) { video.srcObject = null; players.delete(stream); }
}

const surfaceName: Record<string, string> = { monitor: "Entire screen", window: "Window", browser: "Tab" };

let changeListener: (() => void) | null = null;
/** Called whenever what the model sees changes, so it gets a fresh frame at once. */
export const onVisionChange = (listener: (() => void) | null) => { changeListener = listener; };
const changed = () => changeListener?.();

async function listCameras() {
  const devices = await navigator.mediaDevices.enumerateDevices().catch(() => []);
  return devices.filter((device) => device.kind === "videoinput" && device.deviceId);
}

/** Turns the camera on, or switches to another one. Returns an error message on failure. */
export async function startCamera(deviceId?: string): Promise<string> {
  if (!canUseCamera()) return "This browser cannot use a camera.";
  try {
    const camera = await navigator.mediaDevices.getUserMedia({
      video: { ...(deviceId ? { deviceId: { exact: deviceId } } : { facingMode: "user" }), width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 24, max: 30 } },
      audio: false,
    });
    release(snapshot.camera);
    const track = camera.getVideoTracks()[0];
    track.addEventListener("ended", () => { if (snapshot.camera === camera) stopCamera(); });
    set({ camera, cameraId: track.getSettings().deviceId || deviceId || "", cameras: await listCameras() });
    changed();
    return "";
  } catch (error) {
    const name = (error as DOMException)?.name;
    if (name === "NotAllowedError") return "Allow camera access to show things to the model.";
    if (name === "NotFoundError" || name === "OverconstrainedError") return "No camera was found.";
    if (name === "NotReadableError") return "The camera is busy in another app.";
    return "Could not turn on the camera.";
  }
}

export function stopCamera() {
  release(snapshot.camera);
  set({ camera: null });
  changed();
}

/** The next camera in the list: front and back on a phone, built-in and external on a laptop. */
export function nextCamera() {
  const { cameras, cameraId } = snapshot;
  if (cameras.length < 2) return;
  const index = cameras.findIndex((camera) => camera.deviceId === cameraId);
  void startCamera(cameras[(index + 1) % cameras.length].deviceId);
}

/**
 * Opens the browser's picker for a screen, window or tab. While sharing, the
 * same call swaps the source without stopping the call. Returns an error
 * message, or "" when it started or the user closed the picker.
 */
export async function shareScreen(): Promise<string> {
  if (!canShareScreen()) return "This browser cannot share the screen.";
  try {
    const screen = await navigator.mediaDevices.getDisplayMedia({
      video: { frameRate: { ideal: 8, max: 15 }, width: { max: 2560 }, height: { max: 1600 } },
      audio: false,
      // Chromium options: offer the whole screen first, hide this tab, allow switching tabs later.
      selfBrowserSurface: "exclude",
      surfaceSwitching: "include",
      monitorTypeSurfaces: "include",
    } as DisplayMediaStreamOptions);
    const track = screen.getVideoTracks()[0];
    // Text on a screen matters more than smooth motion.
    if ("contentHint" in track) track.contentHint = "detail";
    track.addEventListener("ended", () => { if (snapshot.screen === screen) stopScreen(); });
    release(snapshot.screen);
    const surface = (track.getSettings() as MediaTrackSettings & { displaySurface?: string }).displaySurface || "";
    set({ screen, screenKind: surfaceName[surface] || "Screen" });
    changed();
    return "";
  } catch (error) {
    const name = (error as DOMException)?.name;
    // Closing the picker is a choice, not an error.
    if (name === "NotAllowedError" || name === "AbortError") return "";
    return "Could not share the screen.";
  }
}

export function stopScreen() {
  release(snapshot.screen);
  set({ screen: null, screenKind: "" });
  changed();
}

export function stopVision() {
  release(snapshot.camera);
  release(snapshot.screen);
  snapshot = { ...empty };
  listeners.forEach((listener) => listener());
}

const ready = (video: HTMLVideoElement) => video.readyState >= 2 && video.videoWidth > 0;
let canvas: HTMLCanvasElement | null = null;

/**
 * One JPEG of what the user shows now. A shared screen fills the frame and the
 * camera sits in its lower-right corner; the longest side is capped so text
 * stays readable without sending large images.
 */
export async function captureFrame(maxSide = 1280, quality = .72): Promise<Blob | null> {
  const main = snapshot.screen || snapshot.camera;
  if (!main) return null;
  const video = player(main);
  const corner = snapshot.screen && snapshot.camera ? player(snapshot.camera) : null;
  if (!ready(video)) {
    await new Promise((resolve) => { video.addEventListener("loadeddata", resolve, { once: true }); window.setTimeout(resolve, 800); });
    if (!ready(video)) return null;
  }
  const scale = Math.min(1, maxSide / Math.max(video.videoWidth, video.videoHeight));
  const width = Math.round(video.videoWidth * scale);
  const height = Math.round(video.videoHeight * scale);
  canvas ||= document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.drawImage(video, 0, 0, width, height);
  if (corner && ready(corner)) {
    const w = Math.round(width * .24);
    const h = Math.round(w * corner.videoHeight / corner.videoWidth);
    const pad = Math.round(width * .015);
    context.save();
    context.beginPath();
    context.roundRect(width - w - pad, height - h - pad, w, h, Math.round(w * .06));
    context.clip();
    context.drawImage(corner, width - w - pad, height - h - pad, w, h);
    context.restore();
  }
  return new Promise((resolve) => canvas!.toBlob(resolve, "image/jpeg", quality));
}

export async function captureBase64(maxSide?: number, quality?: number) {
  const blob = await captureFrame(maxSide, quality);
  if (!blob) return "";
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

/** A short note for the model about what the frames show. */
export function visionNote() {
  if (snapshot.screen && snapshot.camera) return `The user is sharing their ${snapshot.screenKind.toLowerCase()} with their camera in the corner.`;
  if (snapshot.screen) return `The user is sharing their ${snapshot.screenKind.toLowerCase()}.`;
  if (snapshot.camera) return "The user is showing you their camera.";
  return "";
}
