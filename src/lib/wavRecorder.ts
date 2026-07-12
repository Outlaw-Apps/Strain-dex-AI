// Captures mic audio via Web Audio API and encodes a complete 16 kHz mono WAV
// on stop — works across Chrome, Firefox, and iOS Safari without MediaRecorder
// container quirks.

export class WavRecorder {
  private stream?: MediaStream;
  private ctx?: AudioContext;
  private source?: MediaStreamAudioSourceNode;
  private processor?: ScriptProcessorNode;
  private chunks: Float32Array[] = [];
  private sampleRate = 44100;

  async start() {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.ctx = new AudioContext();
    this.sampleRate = this.ctx.sampleRate;
    this.source = this.ctx.createMediaStreamSource(this.stream);
    this.processor = this.ctx.createScriptProcessor(4096, 1, 1);
    this.chunks = [];
    this.processor.onaudioprocess = (e) => {
      this.chunks.push(new Float32Array(e.inputBuffer.getChannelData(0)));
    };
    this.source.connect(this.processor);
    this.processor.connect(this.ctx.destination);
  }

  async stop(): Promise<Blob> {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.processor?.disconnect();
    this.source?.disconnect();
    const merged = mergeChunks(this.chunks);
    const downsampled = downsample(merged, this.sampleRate, 16000);
    await this.ctx?.close();
    return encodeWav(downsampled, 16000);
  }
}

function mergeChunks(chunks: Float32Array[]) {
  const length = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Float32Array(length);
  let offset = 0;
  for (const c of chunks) { out.set(c, offset); offset += c.length; }
  return out;
}

function downsample(buffer: Float32Array, from: number, to: number) {
  if (from === to) return buffer;
  const ratio = from / to;
  const newLen = Math.round(buffer.length / ratio);
  const result = new Float32Array(newLen);
  let pos = 0;
  let idx = 0;
  while (pos < newLen) {
    const nextIdx = Math.round((pos + 1) * ratio);
    let sum = 0;
    let count = 0;
    for (let i = idx; i < nextIdx && i < buffer.length; i++) { sum += buffer[i]; count++; }
    result[pos] = count > 0 ? sum / count : 0;
    pos++;
    idx = nextIdx;
  }
  return result;
}

function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, samples.length * 2, true);
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buffer], { type: "audio/wav" });
}
