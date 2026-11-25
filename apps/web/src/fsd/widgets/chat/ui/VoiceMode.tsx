"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { GenyxoOrb } from "@/shared/ui/GenyxoOrb";
import { WorkspaceIcon, WorkspaceMenu, WorkspaceTooltip } from "@/shared/ui/workspace";
import { getServerVoiceSnapshot, getVoiceSnapshot, interruptVoice, previewVoice, startVoice, stopVoice, subscribeVoice, toggleVoiceMute } from "../model/voice-session";
import { canShareScreen, canUseCamera, getServerVisionSnapshot, getVisionSnapshot, nextCamera, shareScreen, startCamera, stopCamera, stopScreen, subscribeVision } from "../model/voice-vision";
import { VOICE_OPTIONS, getServerVoiceName, getVoiceName, setVoiceName, subscribeVoiceName, type VoiceOption } from "../model/voice-preferences";

const useVoice = () => useSyncExternalStore(subscribeVoice, getVoiceSnapshot, getServerVoiceSnapshot);
const useVision = () => useSyncExternalStore(subscribeVision, getVisionSnapshot, getServerVisionSnapshot);

const notify = (message: string) => { if (message) document.dispatchEvent(new CustomEvent("genyxo:workspace-notify", { detail: { message, type: "info" } })); };

function StreamVideo({ stream, className, mirror = false }: { stream: MediaStream; className: string; mirror?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    video.srcObject = stream;
    void video.play().catch(() => {});
    return () => { video.srcObject = null; };
  }, [stream]);
  // A front camera reads like a mirror; a back camera and a screen do not.
  const flip = mirror && stream.getVideoTracks()[0]?.getSettings().facingMode !== "environment";
  return <video ref={ref} className={className} data-mirror={flip ? "" : undefined} muted playsInline autoPlay />;
}

/**
 * What the model sees: a shared screen fills the tile with the camera in its
 * corner, like a meeting. Changing the source or flipping the camera lives on
 * the tile; turning either off lives on the call controls too.
 */
function VisionTile({ engine, modelName }: { engine: "live" | "model"; modelName: string }) {
  const vision = useVision();
  const main = vision.screen || vision.camera;
  if (!main) return null;
  const pip = vision.screen && vision.camera;
  const what = vision.screen ? (vision.screenKind === "Entire screen" ? "your screen" : `your ${vision.screenKind.toLowerCase()}`) : "your camera";
  return <figure className={`gx-vision${vision.screen ? " is-screen" : " is-camera"}`}>
    <StreamVideo key={main.id} stream={main} className="gx-vision-main" mirror={!vision.screen} />
    {pip && <StreamVideo key={pip.id} stream={pip} className="gx-vision-pip" mirror />}
    <figcaption className="gx-vision-meta">
      <span className="gx-vision-live" aria-hidden="true" />
      {engine === "live" ? `${modelName || "The model"} sees ${what}` : `${modelName || "The model"} sees ${what} when you ask`}
    </figcaption>
    <div className="gx-vision-actions">
      {vision.camera && vision.cameras.length > 1 && <WorkspaceTooltip label="Switch camera" side="bottom"><button type="button" aria-label="Switch camera" onClick={nextCamera}><WorkspaceIcon name="flip" size={17} /></button></WorkspaceTooltip>}
      {vision.screen && <WorkspaceTooltip label="Share something else" side="bottom"><button type="button" aria-label="Share something else" onClick={() => void shareScreen().then(notify)}><WorkspaceIcon name="screen" size={17} /></button></WorkspaceTooltip>}
      <WorkspaceTooltip label={vision.screen ? "Stop sharing" : "Turn off camera"} side="bottom"><button type="button" aria-label={vision.screen ? "Stop sharing" : "Turn off camera"} onClick={vision.screen ? stopScreen : stopCamera}><WorkspaceIcon name="close" size={16} /></button></WorkspaceTooltip>
    </div>
  </figure>;
}

function VisionButtons() {
  const vision = useVision();
  const [busy, setBusy] = useState("");
  const run = (kind: string, action: () => Promise<string>) => {
    if (busy) return;
    setBusy(kind);
    void action().then(notify).finally(() => setBusy(""));
  };
  const camera = Boolean(vision.camera);
  const screen = Boolean(vision.screen);
  return <>
    {canUseCamera() && <WorkspaceTooltip label={camera ? "Turn off camera" : "Show your camera"} side="bottom"><button type="button" className={`gx-voice-tool${camera ? " is-on" : ""}`} aria-pressed={camera} aria-busy={busy === "camera"} aria-label={camera ? "Turn off camera" : "Show your camera"} onClick={() => (camera ? stopCamera() : run("camera", () => startCamera(vision.cameraId || undefined)))}>
      <WorkspaceIcon name={camera ? "video" : "video-off"} size={19} />
    </button></WorkspaceTooltip>}
    {canShareScreen() && <WorkspaceTooltip label={screen ? "Stop sharing" : "Share your screen"} side="bottom"><button type="button" className={`gx-voice-tool${screen ? " is-on" : ""}`} aria-pressed={screen} aria-busy={busy === "screen"} aria-label={screen ? "Stop sharing" : "Share your screen"} onClick={() => (screen ? stopScreen() : run("screen", shareScreen))}>
      <WorkspaceIcon name="screen" size={19} />
    </button></WorkspaceTooltip>}
  </>;
}

// Moves the composer to its new place with a FLIP transform so the layout
// change reads as one continuous motion instead of a jump.
function flipComposer(change: () => void) {
  const composer = document.querySelector<HTMLElement>("#chatContainer > .chat-input-container");
  const before = composer?.getBoundingClientRect();
  change();
  if (!composer || !before || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  requestAnimationFrame(() => {
    const after = composer.getBoundingClientRect();
    const dy = before.top - after.top;
    if (Math.abs(dy) < 2) return;
    composer.animate([{ transform: `translateY(${dy}px)` }, { transform: "none" }], { duration: 560, easing: "cubic-bezier(.22, 1, .36, 1)" });
  });
}

// Shows a detected language in its own name, e.g. "Українська" for "uk".
function languageName(code: string) {
  try {
    const name = new Intl.DisplayNames([code], { type: "language" }).of(code) || code;
    return name.charAt(0).toUpperCase() + name.slice(1);
  } catch {
    return code;
  }
}

const phaseLabel = { idle: "Starting…", listening: "Listening", thinking: "Thinking", speaking: "Speaking" };

export function VoiceStage() {
  const voice = useVoice();
  const vision = useVision();
  const seeing = Boolean(vision.screen || vision.camera);
  useEffect(() => {
    flipComposer(() => document.documentElement.toggleAttribute("data-voice-mode", voice.active));
  }, [voice.active]);
  useEffect(() => () => { document.documentElement.removeAttribute("data-voice-mode"); stopVoice(); }, []);
  if (!voice.active) return null;
  const state = voice.muted ? "muted" : voice.phase === "idle" ? "idle" : voice.phase;
  const prompt = voice.phase === "listening" ? (seeing ? "Ask about what you're showing." : "Go ahead, I'm listening.") : voice.phase === "speaking" ? "Just start talking to interrupt." : " ";
  const orb = <button type="button" className="gx-voice-orb" onClick={interruptVoice} aria-label={voice.phase === "speaking" || voice.phase === "thinking" ? "Interrupt and speak" : "Voice conversation orb"}>
    <GenyxoOrb size={seeing ? 56 : 220} state={state} level={voice.level} logo={false} />
  </button>;
  const caption = <div className="gx-voice-caption" aria-live="polite">
    <span key={state} className={`gx-voice-phase is-${state}`}><span className="gx-voice-dot" />{voice.muted ? "Microphone muted" : phaseLabel[voice.phase]}</span>
    <p key={voice.error || voice.transcript || prompt} className={voice.error ? "is-error" : voice.transcript ? "is-transcript" : ""}>{voice.error || voice.transcript || prompt}</p>
  </div>;
  if (seeing) return <div className="gx-voice-stage is-seeing" role="region" aria-label="Voice conversation">
    <VisionTile engine={voice.engine} modelName={voice.modelName} />
    <div className="gx-voice-bar">{orb}{caption}</div>
  </div>;
  return <div className="gx-voice-stage" role="region" aria-label="Voice conversation">
    {orb}
    {caption}
    {!voice.transcript && <small className="gx-voice-note">{voice.engine === "model" && voice.modelName ? `${voice.modelName} · ` : ""}Speak in any language · show your camera or screen anytime</small>}
  </div>;
}

// A stable hue per voice so each one gets its own small gradient mark.
const voiceHue = (name: string) => [...name].reduce((sum, char) => sum + char.charCodeAt(0) * 7, 0) % 360;

function VoiceRow({ option, selected, previewing, onPick, onPreview }: { option: VoiceOption; selected: boolean; previewing: boolean; onPick: () => void; onPreview: () => void }) {
  return <div className={`gx-voice-option${selected ? " is-selected" : ""}`} style={{ "--voice-hue": voiceHue(option.name) } as React.CSSProperties}>
    <button type="button" role="menuitemradio" aria-checked={selected} className="gx-voice-option-pick" onClick={onPick}>
      <span className="gx-voice-avatar" aria-hidden="true">{selected ? <span className="gx-voice-avatar-bars"><span /><span /><span /></span> : option.name[0]}</span>
      <span className="gx-voice-option-text"><strong>{option.name}</strong><small>{option.tone}</small></span>
      {selected && <span className="gx-voice-check" aria-hidden="true"><WorkspaceIcon name="check" size={15} /></span>}
    </button>
    <button type="button" className={`gx-voice-preview${previewing ? " is-playing" : ""}`} aria-label={`Preview ${option.name}`} onClick={onPreview}>
      <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><path d="M5 3.5v9l7.5-4.5z" fill="currentColor" /></svg>
    </button>
  </div>;
}

function VoicePicker({ language }: { language: string }) {
  const voiceName = useSyncExternalStore(subscribeVoiceName, getVoiceName, getServerVoiceName);
  const [open, setOpen] = useState(false);
  const [previewing, setPreviewing] = useState("");
  const [notice, setNotice] = useState("");
  // The menu opens against the button; state (not a ref) so render may read it.
  const [button, setButton] = useState<HTMLButtonElement | null>(null);
  const featured = VOICE_OPTIONS.filter((option) => option.featured || option.name === voiceName);
  const rest = VOICE_OPTIONS.filter((option) => !featured.includes(option));
  const preview = async (name: string) => {
    setPreviewing(name); setNotice("");
    const played = await previewVoice(name);
    if (!played) setNotice("Voice previews are paused: today's free speech quota is used up.");
    window.setTimeout(() => setPreviewing((current) => (current === name ? "" : current)), 1800);
  };
  const row = (option: VoiceOption) => <VoiceRow key={option.name} option={option} selected={option.name === voiceName} previewing={previewing === option.name} onPick={() => setVoiceName(option.name)} onPreview={() => void preview(option.name)} />;
  return <>
    <WorkspaceTooltip label="Choose the voice" side="bottom"><button ref={setButton} type="button" className={`gx-voice-picker-btn${open ? " is-open" : ""}`} aria-haspopup="menu" aria-expanded={open} aria-label={`Voice: ${voiceName}`} onClick={() => setOpen((value) => !value)}>
      <span className="gx-voice-picker-mark" style={{ "--voice-hue": voiceHue(voiceName) } as React.CSSProperties} aria-hidden="true" />
      <span>{voiceName}</span>
      <WorkspaceIcon name="chevron" size={14} />
    </button></WorkspaceTooltip>
    {open && <WorkspaceMenu trigger={button} placement="top" className="gx-voice-menu" onClose={() => setOpen(false)}>
      <div className="gx-voice-menu-head">
        <strong>Voice</strong>
        <small>{language ? `Replying in ${languageName(language)}` : "Replies follow the language you speak"}</small>
      </div>
      <div className="gx-voice-menu-scroll">
        <div className="gx-voice-menu-list">{featured.map(row)}</div>
        <span className="gx-voice-menu-label">More voices</span>
        <div className="gx-voice-menu-list">{rest.map(row)}</div>
      </div>
      {notice && <p className="gx-voice-menu-notice" role="status">{notice}</p>}
    </WorkspaceMenu>}
  </>;
}

export function VoiceControls() {
  const voice = useVoice();
  if (!voice.active) return <WorkspaceTooltip label="Talk with the model" side="bottom"><button type="button" className="gx-call-btn" aria-label="Start voice conversation" onClick={() => void startVoice()}>
    <span className="gx-call-bars" aria-hidden="true"><span /><span /><span /><span /></span>
  </button></WorkspaceTooltip>;
  return <span className="gx-voice-controls">
    <VoicePicker language={voice.language} />
    <VisionButtons />
    <WorkspaceTooltip label={voice.muted ? "Unmute microphone" : "Mute microphone"} side="bottom"><button type="button" className={`gx-voice-mute${voice.muted ? " is-muted" : ""}`} aria-pressed={voice.muted} aria-label={voice.muted ? "Unmute microphone" : "Mute microphone"} onClick={toggleVoiceMute}>
      <WorkspaceIcon name={voice.muted ? "mic-off" : "mic"} size={19} />
    </button></WorkspaceTooltip>
    <WorkspaceTooltip label="End voice conversation" side="bottom"><button type="button" className="gx-voice-end" aria-label="End voice conversation" onClick={stopVoice}>
      <WorkspaceIcon name="close" size={18} />
    </button></WorkspaceTooltip>
  </span>;
}
