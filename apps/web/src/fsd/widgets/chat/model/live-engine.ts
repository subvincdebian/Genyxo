"use client";
// Gemini Live voice calls: the microphone streams to Gemini as 16 kHz PCM over
// a WebSocket and the spoken reply streams back as 24 kHz PCM, so an answer
// starts in about a second. Gemini detects when the user stops talking and
// handles barge-in; the server only issues a single-use token whose model,
// voice, instructions and tools are fixed.

export type LivePhase = "listening" | "thinking" | "speaking";
export type LiveFile = { name: string; language: string; content: string };
export type LiveHooks = {
  onPhase: (phase: LivePhase) => void;
  onLevel: (level: number) => void;
  /** What the user is saying, as Gemini transcribes it (accumulated per turn). */
  onUserText: (text: string) => void;
  /** The reply so far as Markdown: the spoken transcript plus any files. */
  onReply: (markdown: string) => void;
  /** A finished exchange, ready to be saved into the chat. */
  onTurn: (turn: { user: string; reply: string; interrupted: boolean }) => void;
  onError: (message: string) => void;
  /** Runs a map tool the call asked for (Maps page); the card goes into the reply. */
  onMapsTool?: (name: string, args: Record<string, unknown>) => Promise<{ output: unknown; markdown?: string }>;
};
export type LiveSession = { stop: () => void; setMuted: (muted: boolean) => void; interrupt: () => void };

const INPUT_RATE = 16000;
const OUTPUT_RATE = 24000;
const MIC_GAIN = 1.8;
// While the model talks, quieter input is treated as its own echo and sent as
// silence; speaking over it clearly still interrupts.
const BARGE_IN_LEVEL = 0.07;

const toBase64 = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
};

const fence = "```";
const fileMarkdown = (file: LiveFile) => `\n\n${fence}${file.language || ""} file=${file.name.replace(/\s+/g, "-")}\n${file.content.replace(/\n$/, "")}\n${fence}`;

type ServerMessage = {
  setupComplete?: object;
  goAway?: object;
  toolCall?: { functionCalls?: Array<{ id: string; name: string; args?: Record<string, unknown> }> };
  serverContent?: {
    modelTurn?: { parts?: Array<{ inlineData?: { data: string; mimeType?: string } }> };
    inputTranscription?: { text?: string };
    outputTranscription?: { text?: string };
    interrupted?: boolean;
    turnComplete?: boolean;
  };
};

export async function startLiveSession(stream: MediaStream, session: { token: string; model: string; url: string }, hooks: LiveHooks): Promise<LiveSession> {
  const audio = new AudioContext();
  if (audio.state === "suspended") await audio.resume().catch(() => {});
  // Served as a static file: the site CSP does not allow worklets from blob: URLs.
  await audio.audioWorklet.addModule("/worklets/genyxo-pcm.js");

  const source = audio.createMediaStreamSource(stream);
  const gain = audio.createGain();
  gain.gain.value = MIC_GAIN;
  const micMeter = audio.createAnalyser();
  micMeter.fftSize = 512;
  const pcm = new AudioWorkletNode(audio, "genyxo-pcm");
  const sink = audio.createGain();
  sink.gain.value = 0;
  source.connect(gain).connect(micMeter);
  gain.connect(pcm).connect(sink).connect(audio.destination);
  const speaker = audio.createAnalyser();
  speaker.fftSize = 512;
  speaker.connect(audio.destination);

  const socket = new WebSocket(`${session.url}?access_token=${encodeURIComponent(session.token)}`);
  let ready = false;
  let closed = false;
  let muted = false;
  let phase: LivePhase = "listening";
  let userText = "";
  let spoken = "";
  let files = "";
  let playhead = 0;
  const sources = new Set<AudioBufferSourceNode>();
  let thinkingTimer = 0;
  // After a tap on the orb the rest of that answer is dropped until the model's turn ends.
  let dropping = false;
  let frame = 0;

  const setPhase = (next: LivePhase) => { if (next !== phase) { phase = next; hooks.onPhase(next); } };
  const send = (message: unknown) => { if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message)); };
  const level = (analyser: AnalyserNode) => {
    const data = new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(data);
    let sum = 0;
    for (const value of data) sum += ((value - 128) / 128) ** 2;
    return Math.sqrt(sum / data.length);
  };
  const talking = () => sources.size > 0;

  const stopPlayback = () => {
    sources.forEach((node) => { try { node.stop(); } catch { /* Already ended. */ } });
    sources.clear();
    playhead = 0;
  };
  const play = (base64: string) => {
    const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
    const samples = new Int16Array(bytes.buffer, 0, bytes.byteLength >> 1);
    if (!samples.length) return;
    const buffer = audio.createBuffer(1, samples.length, OUTPUT_RATE);
    const channel = buffer.getChannelData(0);
    for (let i = 0; i < samples.length; i++) channel[i] = samples[i] / 0x8000;
    const node = audio.createBufferSource();
    node.buffer = buffer;
    node.connect(speaker);
    playhead = Math.max(playhead, audio.currentTime + 0.04);
    node.start(playhead);
    playhead += buffer.duration;
    sources.add(node);
    node.onended = () => {
      sources.delete(node);
      if (!sources.size && phase === "speaking") setPhase("listening");
    };
    window.clearTimeout(thinkingTimer);
    setPhase("speaking");
  };
  const reply = () => (spoken.trim() + files).trim();
  const finishTurn = (interrupted: boolean) => {
    const markdown = reply();
    if (markdown) hooks.onTurn({ user: userText.trim(), reply: interrupted && spoken ? `${markdown}…` : markdown, interrupted });
    userText = ""; spoken = ""; files = "";
  };

  pcm.port.onmessage = (event: MessageEvent<ArrayBuffer>) => {
    if (!ready || muted) return;
    let buffer = event.data;
    if (talking() && level(micMeter) < BARGE_IN_LEVEL) buffer = new ArrayBuffer(buffer.byteLength);
    send({ realtimeInput: { audio: { data: toBase64(buffer), mimeType: `audio/pcm;rate=${INPUT_RATE}` } } });
  };

  const meter = () => {
    hooks.onLevel(Math.min(1, (talking() ? level(speaker) : muted ? 0 : level(micMeter)) * 3.2));
    frame = requestAnimationFrame(meter);
  };
  frame = requestAnimationFrame(meter);

  const stop = () => {
    if (closed) return;
    closed = true;
    cancelAnimationFrame(frame);
    window.clearTimeout(thinkingTimer);
    stopPlayback();
    pcm.port.onmessage = null;
    try { socket.close(1000); } catch { /* Already closed. */ }
    void audio.close();
  };

  await new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error("The live voice service did not answer.")), 12000);
    socket.onopen = () => send({ setup: { model: `models/${session.model}` } });
    socket.onerror = () => { window.clearTimeout(timeout); reject(new Error("Could not connect to the live voice service.")); };
    socket.onclose = (event) => {
      window.clearTimeout(timeout);
      if (!ready) { reject(new Error(event.reason || "The live voice call could not start.")); return; }
      if (!closed) { finishTurn(true); stop(); hooks.onError(event.code === 1000 ? "The call ended." : "The voice connection dropped."); }
    };
    socket.onmessage = async (event) => {
      const text = typeof event.data === "string" ? event.data : await (event.data as Blob).text();
      let message: ServerMessage;
      try { message = JSON.parse(text); } catch { return; }
      if (message.setupComplete) { ready = true; window.clearTimeout(timeout); resolve(); return; }
      if (message.goAway) hooks.onError("The call is about to time out.");
      for (const call of message.toolCall?.functionCalls || []) {
        const args = call.args || {};
        if (call.name.startsWith("genyxo_maps_") && hooks.onMapsTool) {
          // Places and routes come from the server; the map card joins the reply.
          setPhase("thinking");
          const found = await hooks.onMapsTool(call.name, args).catch((error: Error) => ({ output: { error: error.message }, markdown: undefined }));
          if (found.markdown) { files += found.markdown; hooks.onReply(reply()); }
          send({ toolResponse: { functionResponses: [{ id: call.id, name: call.name, response: { result: found.output } }] } });
          continue;
        }
        if (call.name === "create_file" && typeof args.content === "string") {
          files += fileMarkdown({ name: String(args.name || "file.txt").slice(0, 120), language: String(args.language || ""), content: args.content });
          hooks.onReply(reply());
        }
        send({ toolResponse: { functionResponses: [{ id: call.id, name: call.name, response: { result: "The file is now shown in the chat." } }] } });
      }
      const content = message.serverContent;
      if (!content) return;
      if (content.inputTranscription?.text) {
        // A new question while an answer with only files is pending closes that answer first.
        if (!spoken && files && !talking()) finishTurn(false);
        userText += content.inputTranscription.text;
        hooks.onUserText(userText.trim());
        window.clearTimeout(thinkingTimer);
        if (!talking()) thinkingTimer = window.setTimeout(() => { if (!talking()) setPhase("thinking"); }, 450);
      }
      if (dropping) {
        if (content.turnComplete || content.interrupted) dropping = false;
        return;
      }
      for (const part of content.modelTurn?.parts || []) if (part.inlineData?.data) play(part.inlineData.data);
      if (content.outputTranscription?.text) {
        spoken += content.outputTranscription.text;
        hooks.onReply(reply());
      }
      if (content.interrupted) {
        stopPlayback();
        finishTurn(true);
        setPhase("listening");
      }
      // A turn that only called a tool continues with speech; save once something was said.
      if (content.turnComplete && spoken.trim()) {
        finishTurn(false);
        if (!talking()) setPhase("listening");
      }
    };
  }).catch((error) => { stop(); throw error; });

  hooks.onPhase("listening");
  return {
    stop,
    setMuted: (value) => { muted = value; },
    interrupt: () => {
      if (!talking() && phase !== "thinking") return;
      dropping = true;
      stopPlayback();
      if (spoken) finishTurn(true);
      setPhase("listening");
    },
  };
}
