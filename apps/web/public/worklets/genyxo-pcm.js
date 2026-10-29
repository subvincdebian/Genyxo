// Gemini Live microphone tap: averages input down to 16 kHz and posts 40 ms
// frames of 16-bit PCM to the page. Loaded by widgets/chat/model/live-engine.ts.
class GenyxoPcm extends AudioWorkletProcessor {
  constructor() { super(); this.ratio = sampleRate / 16000; this.t = 0; this.acc = 0; this.count = 0; this.out = []; }
  process(inputs) {
    const input = inputs[0] && inputs[0][0];
    if (!input) return true;
    for (let i = 0; i < input.length; i++) {
      this.acc += input[i]; this.count++; this.t += 1;
      if (this.t >= this.ratio) { this.t -= this.ratio; this.out.push(this.acc / this.count); this.acc = 0; this.count = 0; }
    }
    if (this.out.length >= 640) {
      const pcm = new Int16Array(this.out.length);
      for (let j = 0; j < this.out.length; j++) { const s = Math.max(-1, Math.min(1, this.out[j])); pcm[j] = s < 0 ? s * 0x8000 : s * 0x7fff; }
      this.port.postMessage(pcm.buffer, [pcm.buffer]);
      this.out = [];
    }
    return true;
  }
}
registerProcessor("genyxo-pcm", GenyxoPcm);
