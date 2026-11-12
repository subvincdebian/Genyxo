"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Select } from "@/shared/ui/Select";
import { WorkspaceDialog, WorkspaceIcon } from "@/shared/ui/workspace";
import {
  CALL_LANGUAGES,
  getInteractions,
  getServerInteractions,
  subscribeInteractions,
  updateInteractions,
} from "@/shared/lib/interaction-settings";
import {
  DEFAULT_AUDIO,
  getAudioSettings,
  microphoneConstraints,
  routeAudioOutput,
  setAudioSettings,
  subscribeAudioSettings,
  type AudioSettings,
} from "@/shared/lib/audio-settings";
import { VOICE_OPTIONS } from "@/shared/lib/voice-catalog";
import { Action, Row, Section, useAccountText } from "./account-ui";
import page from "./ProfilePage.module.css";
import styles from "./AccountExtensions.module.css";

const subscribeCapabilities = () => () => {};
const serverOutputSupport = () => false;
const getOutputSupport = () =>
  typeof AudioContext !== "undefined" && "setSinkId" in AudioContext.prototype;

export function AccountVoice() {
  const { text } = useAccountText();
  const { settings, saving, error } = useSyncExternalStore(
    subscribeInteractions,
    getInteractions,
    getServerInteractions,
  );
  const [hardware, setHardware] = useState(DEFAULT_AUDIO);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [testing, setTesting] = useState(false);
  const [pending, setPending] = useState(false);
  const [level, setLevel] = useState(0);
  const [problem, setProblem] = useState("");
  const [voices, setVoices] = useState(false);
  const [draft, setDraft] = useState(settings.voice);
  const cleanup = useRef<() => void>(() => {});
  const attempt = useRef(0);
  const mounted = useRef(false);
  const outputSupported = useSyncExternalStore(
    subscribeCapabilities,
    getOutputSupport,
    serverOutputSupport,
  );
  const refresh = async () => {
    if (navigator.mediaDevices?.enumerateDevices) {
      const list = await navigator.mediaDevices.enumerateDevices();
      if (mounted.current) setDevices(list);
    }
  };
  useEffect(() => {
    mounted.current = true;
    const sync = () => setHardware(getAudioSettings());
    sync();
    const unsubscribe = subscribeAudioSettings(sync);
    const changed = () => {
      void refresh().catch(() => {});
    };
    changed();
    navigator.mediaDevices?.addEventListener("devicechange", changed);
    return () => {
      mounted.current = false;
      cleanup.current();
      unsubscribe();
      navigator.mediaDevices?.removeEventListener("devicechange", changed);
    };
  }, []);
  function stop() {
    attempt.current++;
    cleanup.current();
    cleanup.current = () => {};
    setTesting(false);
    setPending(false);
    setLevel(0);
  }
  async function permissions() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setProblem(
        "Audio devices require a supported browser and a secure connection.",
      );
      return;
    }
    setPending(true);
    setProblem("");
    const revision = ++attempt.current;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: microphoneConstraints(),
      });
      stream.getTracks().forEach((track) => track.stop());
      if (revision === attempt.current) await refresh();
    } catch {
      if (mounted.current)
        setProblem(
          "Allow microphone access in your browser to choose and test devices.",
        );
    } finally {
      if (mounted.current) setPending(false);
    }
  }
  async function testMicrophone() {
    if (testing || pending) {
      stop();
      return;
    }
    stop();
    setPending(true);
    setProblem("");
    const revision = attempt.current;
    let stream: MediaStream | undefined;
    let context: AudioContext | undefined;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: microphoneConstraints(),
      });
      if (!mounted.current || revision !== attempt.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      context = new AudioContext();
      await context.resume();
      await routeAudioOutput(context);
      if (!mounted.current || revision !== attempt.current) {
        stream.getTracks().forEach((track) => track.stop());
        await context.close();
        return;
      }
      const mic = context.createGain();
      const output = context.createGain();
      const meter = context.createAnalyser();
      meter.fftSize = 512;
      context
        .createMediaStreamSource(stream)
        .connect(mic)
        .connect(meter)
        .connect(output)
        .connect(context.destination);
      const sync = () => {
        const pref = getAudioSettings();
        mic.gain.value = pref.microphone;
        output.gain.value = pref.speaker;
        void routeAudioOutput(context!).catch(() =>
          setProblem(
            "The selected output is unavailable. Choose another device.",
          ),
        );
      };
      sync();
      const unsubscribe = subscribeAudioSettings(sync);
      let frame = 0;
      const data = new Uint8Array(meter.fftSize);
      const update = () => {
        meter.getByteTimeDomainData(data);
        const rms = Math.sqrt(
          data.reduce((sum, sample) => sum + ((sample - 128) / 128) ** 2, 0) /
            data.length,
        );
        setLevel(Math.min(1, rms * 5));
        frame = requestAnimationFrame(update);
      };
      update();
      const timer = window.setTimeout(stop, 30000);
      cleanup.current = () => {
        cancelAnimationFrame(frame);
        clearTimeout(timer);
        unsubscribe();
        stream?.getTracks().forEach((track) => track.stop());
        void context?.close().catch(() => {});
      };
      setTesting(true);
      await refresh();
    } catch {
      stream?.getTracks().forEach((track) => track.stop());
      void context?.close().catch(() => {});
      if (mounted.current)
        setProblem(
          "Could not start the microphone test. Check browser permissions and your selected device.",
        );
    } finally {
      if (mounted.current) setPending(false);
    }
  }
  async function testSpeaker() {
    setProblem("");
    const context = new AudioContext();
    try {
      await context.resume();
      await routeAudioOutput(context);
      const gain = context.createGain();
      gain.gain.value = hardware.speaker * 0.12;
      gain.connect(context.destination);
      const oscillator = context.createOscillator();
      oscillator.frequency.setValueAtTime(440, context.currentTime);
      oscillator.frequency.setValueAtTime(660, context.currentTime + 0.15);
      oscillator.connect(gain);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.32);
      oscillator.onended = () => {
        void context.close();
      };
    } catch {
      await context.close();
      setProblem("The selected output is unavailable. Choose another device.");
    }
  }
  const change = (patch: Partial<AudioSettings>) => {
    if ((patch.input || patch.output) && testing) stop();
    setAudioSettings(patch);
  };
  function volume(key: "microphone" | "speaker", title: string) {
    return (
      <div className={styles.volume}>
        <input
          aria-label={title}
          className={styles.range}
          type="range"
          min="0"
          max="100"
          value={Math.round(hardware[key] * 100)}
          onChange={(event) =>
            change({ [key]: Number(event.target.value) / 100 })
          }
        />
        <output>{Math.round(hardware[key] * 100)}%</output>
      </div>
    );
  }
  return (
    <>
      <Section
        title={text("audio_devices", "Audio devices")}
        description={text(
          "audio_devices_help",
          "Device choices stay in this browser. Your microphone is used only when you start a test, call or dictation.",
        )}
        action={
          <Action busy={pending} onClick={() => void permissions()}>
            {text("enable_devices", "Enable devices")}
          </Action>
        }
      >
        <div className={page.group}>
          <Row title={text("microphone", "Microphone")}>
            <Select
              aria-label={text("microphone", "Microphone")}
              value={hardware.input}
              onChange={(event) => change({ input: event.target.value })}
            >
              <option value="default">
                {text("system_default", "System default")}
              </option>
              {devices
                .filter(
                  (device) =>
                    device.kind === "audioinput" &&
                    device.deviceId !== "default" &&
                    device.deviceId,
                )
                .map((device, index) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Microphone ${index + 1}`}
                  </option>
                ))}
            </Select>
          </Row>
          <Row title={text("microphone_volume", "Microphone volume")}>
            {volume(
              "microphone",
              text("microphone_volume", "Microphone volume"),
            )}
          </Row>
          <Row
            title={text("speaker", "Speaker")}
            description={
              !outputSupported
                ? text(
                    "output_system",
                    "This browser uses your system’s output device.",
                  )
                : undefined
            }
          >
            <Select
              aria-label={text("speaker", "Speaker")}
              value={hardware.output}
              disabled={!outputSupported}
              onChange={(event) => change({ output: event.target.value })}
            >
              <option value="default">
                {text("system_default", "System default")}
              </option>
              {devices
                .filter(
                  (device) =>
                    device.kind === "audiooutput" &&
                    device.deviceId !== "default" &&
                    device.deviceId,
                )
                .map((device, index) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Speaker ${index + 1}`}
                  </option>
                ))}
            </Select>
          </Row>
          <Row title={text("speaker_volume", "Speaker volume")}>
            <div className={styles.controls}>
              {volume("speaker", text("speaker_volume", "Speaker volume"))}
              <Action onClick={() => void testSpeaker()}>
                {text("test", "Test")}
              </Action>
            </div>
          </Row>
          <div className={styles.test}>
            <Action busy={pending} onClick={() => void testMicrophone()}>
              {testing
                ? text("stop_testing", "Stop testing")
                : text("mic_test", "Mic test")}
            </Action>
            <div
              className={styles.meter}
              role="meter"
              aria-label={text("mic_level", "Microphone level")}
              aria-valuenow={Math.round(level * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              {Array.from({ length: 80 }, (_, i) => (
                <i key={i} data-lit={i / 80 < level} />
              ))}
            </div>
          </div>
        </div>
        <p className={styles.note}>
          {text(
            "mic_test_help",
            "Use headphones while testing. You’ll hear your microphone locally; test audio is never uploaded. The test stops after 30 seconds.",
          )}
        </p>
        {problem && (
          <p className={page.error} role="alert">
            {problem}
          </p>
        )}
      </Section>
      <Section
        title={text("voice_call", "Voice call")}
        description={text(
          "voice_sync",
          "Synced with voice calls in your chats.",
        )}
      >
        <div className={page.group}>
          <Row
            title={text("voice", "Voice")}
            description={text(
              "voice_help",
              "Choose a speaking voice for the AI.",
            )}
          >
            <Action
              onClick={() => {
                setDraft(settings.voice);
                setVoices(true);
              }}
            >
              {settings.voice}
              <WorkspaceIcon name="chevron" size={16} />
            </Action>
          </Row>
          <Row
            title={text("call_language", "Language")}
            description={text(
              "call_language_help",
              "Applied when your next voice call starts. Autodetection follows the language you speak.",
            )}
          >
            <Select
              aria-label={text("call_language_select", "Voice call language")}
              value={settings.callLanguage}
              onChange={(event) =>
                void updateInteractions({ callLanguage: event.target.value })
              }
            >
              {CALL_LANGUAGES.map(([value, label]) => (
                <option key={value} value={value}>
                  {value === "auto" ? text("autodetection", "Autodetection") : label}
                </option>
              ))}
            </Select>
          </Row>
        </div>
      </Section>
      <Section title={text("dictation", "Dictation")}>
        <div className={page.group}>
          <Row
            title={text("enable_dictation", "Enable dictation")}
            description={text(
              "dictation_help",
              "Use your selected microphone and input volume in the message editor.",
            )}
          >
            <button
              type="button"
              role="switch"
              className={page.switch}
              aria-label={text("enable_dictation", "Enable dictation")}
              aria-checked={settings.dictationEnabled}
              onClick={() =>
                void updateInteractions({
                  dictationEnabled: !settings.dictationEnabled,
                })
              }
            >
              <span />
            </button>
          </Row>
        </div>
      </Section>
      <p className={styles.note} role="status">
        {saving
          ? text("saving", "Saving…")
          : error || text("saved_automatically", "Changes save automatically.")}
      </p>
      {voices && (
        <WorkspaceDialog
          title={text("choose_voice", "Choose a voice")}
          onClose={() => setVoices(false)}
          className={page.dialog}
        >
          <div className={styles.voiceChoices}>
            {VOICE_OPTIONS.map((voice) => (
              <button
                type="button"
                className={styles.voiceChoice}
                key={voice.name}
                aria-pressed={draft === voice.name}
                onClick={() => setDraft(voice.name)}
              >
                <WorkspaceIcon
                  name={draft === voice.name ? "check" : "volume"}
                  size={18}
                />
                <strong>{voice.name}</strong>
                <small>{voice.tone}</small>
              </button>
            ))}
          </div>
          <div className={styles.controls}>
            <Action onClick={() => setVoices(false)}>
              {text("cancel", "Cancel")}
            </Action>
            <Action
              primary
              onClick={() => {
                void updateInteractions({ voice: draft });
                setVoices(false);
              }}
            >
              {text("done", "Done")}
            </Action>
          </div>
        </WorkspaceDialog>
      )}
    </>
  );
}
