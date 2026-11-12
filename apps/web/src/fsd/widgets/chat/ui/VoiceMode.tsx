"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { GenyxoOrb } from "@/shared/ui/GenyxoOrb";
import { WorkspaceIcon, WorkspaceMenu, WorkspaceTooltip } from "@/shared/ui/workspace";
import { getServerVoiceSnapshot, getVoiceSnapshot, interruptVoice, previewVoice, startVoice, stopVoice, subscribeVoice, toggleVoiceMute } from "../model/voice-session";
import { VOICE_OPTIONS, getServerVoiceName, getVoiceName, setVoiceName, subscribeVoiceName, type VoiceOption } from "../model/voice-preferences";

const useVoice = () => useSyncExternalStore(subscribeVoice, getVoiceSnapshot, getServerVoiceSnapshot);

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
  useEffect(() => {
    flipComposer(() => document.documentElement.toggleAttribute("data-voice-mode", voice.active));
  }, [voice.active]);
  useEffect(() => () => { document.documentElement.removeAttribute("data-voice-mode"); stopVoice(); }, []);
  if (!voice.active) return null;
  const state = voice.muted ? "muted" : voice.phase === "idle" ? "idle" : voice.phase;
  const prompt = voice.phase === "listening" ? "Go ahead, I'm listening." : voice.phase === "speaking" ? "Tap the orb to interrupt." : " ";
  return <div className="gx-voice-stage" role="region" aria-label="Voice conversation">
    <button type="button" className="gx-voice-orb" onClick={interruptVoice} aria-label={voice.phase === "speaking" || voice.phase === "thinking" ? "Interrupt and speak" : "Voice conversation orb"}>
      <GenyxoOrb size={220} state={state} level={voice.level} logo={false} />
    </button>
    <div className="gx-voice-caption" aria-live="polite">
      <span key={state} className={`gx-voice-phase is-${state}`}><span className="gx-voice-dot" />{voice.muted ? "Microphone muted" : phaseLabel[voice.phase]}</span>
      <p key={voice.error || voice.transcript || prompt} className={voice.error ? "is-error" : voice.transcript ? "is-transcript" : ""}>{voice.error || voice.transcript || prompt}</p>
    </div>
    {!voice.transcript && <small className="gx-voice-note">Speak in any language · replies come back in the language you used</small>}
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
    <WorkspaceTooltip label={voice.muted ? "Unmute microphone" : "Mute microphone"} side="bottom"><button type="button" className={`gx-voice-mute${voice.muted ? " is-muted" : ""}`} aria-pressed={voice.muted} aria-label={voice.muted ? "Unmute microphone" : "Mute microphone"} onClick={toggleVoiceMute}>
      <WorkspaceIcon name={voice.muted ? "mic-off" : "mic"} size={19} />
    </button></WorkspaceTooltip>
    <WorkspaceTooltip label="End voice conversation" side="bottom"><button type="button" className="gx-voice-end" aria-label="End voice conversation" onClick={stopVoice}>
      <WorkspaceIcon name="close" size={18} />
    </button></WorkspaceTooltip>
  </span>;
}
