import {
  getContext as getToneContext,
  getTransport,
  PolySynth as TonePolySynth,
  start as startTone,
  Synth as ToneSynth,
} from "tone";
import type {
  PolySynth as TonePolySynthInstance,
  Synth as ToneSynthInstance,
} from "tone";

export type WaveType = "pulse" | "sawtooth" | "sine" | "triangle";

export interface SynthParameters {
  volume: number;
  decay: number;
  tempo: number;
  release: number;
  distort: number;
  sub: number;
  gain: number;
  tone: number;
  res: number;
}

interface Voice {
  sources: AudioScheduledSourceNode[];
  envelope: GainNode;
  subGain: GainNode;
  mainOscillator: OscillatorNode;
  finishedSources: number;
  releaseScheduled: boolean;
}

interface RiffStep {
  note: string;
  duration: "16n" | "8n";
  velocity: number;
}

const rockAndRollRiff: Array<RiffStep | null> = [
  { note: "E3", duration: "16n", velocity: 0.95 },
  { note: "E3", duration: "16n", velocity: 0.72 },
  { note: "G3", duration: "16n", velocity: 0.82 },
  { note: "A3", duration: "8n", velocity: 0.95 },
  null,
  { note: "G3", duration: "16n", velocity: 0.78 },
  { note: "E3", duration: "8n", velocity: 0.92 },
  null,
  { note: "D3", duration: "16n", velocity: 0.9 },
  { note: "D3", duration: "16n", velocity: 0.7 },
  { note: "E3", duration: "16n", velocity: 0.82 },
  { note: "G3", duration: "8n", velocity: 0.94 },
  { note: "B3", duration: "16n", velocity: 0.86 },
  { note: "G3", duration: "16n", velocity: 0.72 },
  { note: "E3", duration: "8n", velocity: 0.98 },
  null,
];

const drumSamplePaths = [
  "/audio/drums/kick.flac",
  "/audio/drums/snare.flac",
  "/audio/drums/closed-hihat.flac",
  "/audio/drums/tom.flac",
  "/audio/drums/crash.flac",
];

const riffSustain = 0.32;

export class SynthEngine {
  private audioContext: AudioContext | null = null;
  private analyserNode: AnalyserNode | null = null;
  private guitarInput: GainNode | null = null;
  private distortion: WaveShaperNode | null = null;
  private toneFilter: BiquadFilterNode | null = null;
  private guitarVolume: GainNode | null = null;
  private drumsVolume: GainNode | null = null;
  private riffSubGain: GainNode | null = null;
  private riffSynth: TonePolySynthInstance<ToneSynthInstance> | null = null;
  private riffSubSynth: TonePolySynthInstance<ToneSynthInstance> | null = null;
  private riffEventId: number | null = null;
  private riffPlaying = false;
  private drumBuffers: AudioBuffer[] | null = null;
  private drumSampleGains: number[] = [];
  private drumLoad: Promise<void> | null = null;
  private drumsLevel = 0.55;
  private voices = new Map<string, Voice>();
  private activeVoices = new Set<Voice>();
  private wave: WaveType = "triangle";
  private parameters: SynthParameters = {
    volume: 0.35,
    decay: 0.12,
    tempo: 126,
    release: 0.18,
    distort: 3,
    sub: 3,
    gain: 5,
    tone: 7,
    res: 5,
  };

  get analyser() {
    return this.analyserNode;
  }

  async loadDrumSamples() {
    if (!this.drumLoad) {
      this.drumLoad = this.decodeDrumSamples().catch((error: unknown) => {
        this.drumLoad = null;
        throw error;
      });
    }
    return this.drumLoad;
  }

  setWave(type: WaveType) {
    this.wave = type;
    this.riffSynth?.set({ oscillator: { type } });
    this.riffSubSynth?.set({ oscillator: { type } });
    this.voices.forEach((voice) => {
      voice.mainOscillator.type = this.oscillatorType(type);
    });
  }

  setDrumVolume(value: number) {
    this.drumsLevel = value;
    if (this.audioContext) {
      this.setGain(this.drumsVolume, this.drumsBusGain(value), this.audioContext.currentTime);
    }
  }

  setParameter<K extends keyof SynthParameters>(name: K, value: SynthParameters[K]) {
    this.parameters[name] = value;
    if (!this.audioContext) return;

    const now = this.audioContext.currentTime;
    if (name === "volume") {
      this.setGain(this.guitarVolume, this.parameters.volume, now);
    } else if (name === "tempo") {
      getTransport().bpm.value = this.parameters.tempo;
    } else if (name === "decay") {
      this.activeVoices.forEach((voice) => this.applyEnvelope(voice, now));
      this.updateRiffEnvelopes();
    } else if (name === "release") {
      this.updateRiffEnvelopes();
    } else if (name === "distort") {
      if (this.distortion) {
        this.distortion.curve = this.makeDistortionCurve(this.parameters.distort);
      }
    } else if (name === "gain") {
      this.setGain(this.guitarInput, this.gainLevel(this.parameters.gain), now);
    } else if (name === "tone") {
      if (this.toneFilter) {
        this.toneFilter.frequency.setTargetAtTime(
          this.toneFrequency(this.parameters.tone),
          now,
          0.025,
        );
      }
    } else if (name === "res") {
      this.toneFilter?.Q.setTargetAtTime(this.resonanceQ(this.parameters.res), now, 0.025);
    } else if (name === "sub") {
      this.setGain(this.riffSubGain, this.subLevel(this.parameters.sub), now);
      this.activeVoices.forEach((voice) =>
        this.setGain(voice.subGain, this.subLevel(this.parameters.sub), now),
      );
    }
  }

  async startRiff() {
    const context = this.getContext();
    await startTone();
    await context.resume();
    if (this.riffPlaying) return;
    if (!this.riffSynth || !this.riffSubSynth) {
      throw new Error("The synthesizer could not be initialized.");
    }

    const transport = getTransport();
    transport.stop();
    transport.position = "0:0:0";
    let step = 0;
    this.riffEventId = transport.scheduleRepeat((time) => {
      const riffStep = rockAndRollRiff[step];
      step = (step + 1) % rockAndRollRiff.length;
      if (!riffStep) return;
      this.riffSynth?.triggerAttackRelease(
        riffStep.note,
        riffStep.duration,
        time,
        riffStep.velocity,
      );
      this.riffSubSynth?.triggerAttackRelease(
        this.octaveBelow(riffStep.note),
        riffStep.duration,
        time,
        riffStep.velocity,
      );
    }, "8n", 0);
    transport.bpm.value = this.parameters.tempo;
    transport.swing = 0.12;
    transport.swingSubdivision = "8n";
    transport.start("+0.03");
    this.riffPlaying = true;
  }

  stopRiff() {
    if (!this.riffPlaying) return;
    const transport = getTransport();
    transport.stop();
    if (this.riffEventId !== null) transport.clear(this.riffEventId);
    this.riffEventId = null;
    this.riffPlaying = false;
    this.riffSynth?.releaseAll();
    this.riffSubSynth?.releaseAll();
  }

  async startNote(id: string, frequency: number) {
    const context = this.getContext();
    await context.resume();
    this.stopNote(id);
    const now = context.currentTime;
    const envelope = context.createGain();
    const subGain = context.createGain();
    const oscillator = context.createOscillator();
    const subOscillator = context.createOscillator();
    oscillator.type = this.oscillatorType(this.wave);
    oscillator.frequency.value = frequency;
    subOscillator.type = "sine";
    subOscillator.frequency.value = frequency / 2;
    oscillator.connect(envelope);
    subOscillator.connect(subGain);
    subGain.connect(envelope);
    envelope.connect(this.guitarInput!);

    const voice: Voice = {
      sources: [oscillator, subOscillator],
      envelope,
      subGain,
      mainOscillator: oscillator,
      finishedSources: 0,
      releaseScheduled: false,
    };
    this.voices.set(id, voice);
    this.activeVoices.add(voice);
    this.setGain(subGain, this.subLevel(this.parameters.sub), now);
    this.applyEnvelope(voice, now);

    oscillator.onended = () => this.finishSource(voice);
    subOscillator.onended = () => this.finishSource(voice);
    oscillator.start(now);
    subOscillator.start(now);
  }

  stopNote(id: string) {
    const voice = this.voices.get(id);
    if (!voice) return;
    this.voices.delete(id);
    this.releaseVoice(voice);
  }

  async triggerDrum(instrument: number) {
    if (!Number.isInteger(instrument) || instrument < 0 || instrument >= drumSamplePaths.length) {
      throw new RangeError("Unknown drum instrument.");
    }
    const context = this.getContext();
    await context.resume();
    await this.loadDrumSamples();
    const buffer = this.drumBuffers?.[instrument];
    if (!buffer) throw new Error("Drum sample could not be loaded.");

    const source = context.createBufferSource();
    const level = context.createGain();
    source.buffer = buffer;
    level.gain.value = this.drumSampleGains[instrument] ?? 1;
    source.connect(level);
    level.connect(this.drumsVolume!);
    source.onended = () => {
      source.disconnect();
      level.disconnect();
    };
    source.start();
  }

  private async decodeDrumSamples() {
    const context = this.getContext();
    const samples = await Promise.all(
      drumSamplePaths.map(async (path) => {
        const response = await fetch(new URL(path, document.baseURI));
        if (!response.ok) throw new Error(`Unable to load drum sample (${response.status}): ${path}`);
        return context.decodeAudioData(await response.arrayBuffer());
      }),
    );
    this.drumBuffers = samples;
    this.drumSampleGains = samples.map((sample) => this.normalizedSampleGain(sample));
  }

  private getContext() {
    if (!this.audioContext) {
      const toneContext = getToneContext();
      const context = toneContext.rawContext as AudioContext;
      const guitarInput = context.createGain();
      const distortion = context.createWaveShaper();
      const toneFilter = context.createBiquadFilter();
      const guitarVolume = context.createGain();
      const drumsVolume = context.createGain();
      const riffSubGain = context.createGain();
      const guitarCompressor = context.createDynamicsCompressor();
      const drumsCompressor = context.createDynamicsCompressor();
      const outputLimiter = context.createDynamicsCompressor();
      const guitarMakeup = context.createGain();
      const outputGain = context.createGain();
      const analyser = context.createAnalyser();
      analyser.fftSize = 256;

      guitarInput.gain.value = this.gainLevel(this.parameters.gain);
      distortion.curve = this.makeDistortionCurve(this.parameters.distort);
      distortion.oversample = "4x";
      toneFilter.type = "lowpass";
      toneFilter.frequency.value = this.toneFrequency(this.parameters.tone);
      toneFilter.Q.value = this.resonanceQ(this.parameters.res);
      guitarVolume.gain.value = this.parameters.volume;
      drumsVolume.gain.value = this.drumsBusGain(this.drumsLevel);
      guitarMakeup.gain.value = 1 / this.outputHeadroom();
      outputGain.gain.value = this.outputHeadroom();
      this.configureCompressor(guitarCompressor, -6, 6);
      this.configureCompressor(drumsCompressor, -8, 8);
      this.configureCompressor(outputLimiter, -6, 20);
      outputLimiter.knee.value = 0;
      outputLimiter.attack.value = 0.001;

      guitarInput.connect(distortion);
      distortion.connect(toneFilter);
      toneFilter.connect(guitarVolume);
      guitarVolume.connect(guitarCompressor);
      guitarCompressor.connect(guitarMakeup);
      guitarMakeup.connect(outputLimiter);
      drumsVolume.connect(drumsCompressor);
      drumsCompressor.connect(outputLimiter);
      outputLimiter.connect(outputGain);
      outputGain.connect(analyser);
      analyser.connect(context.destination);

      this.audioContext = context;
      this.guitarInput = guitarInput;
      this.distortion = distortion;
      this.toneFilter = toneFilter;
      this.guitarVolume = guitarVolume;
      this.drumsVolume = drumsVolume;
      this.riffSubGain = riffSubGain;
      this.analyserNode = analyser;

      this.riffSynth = new TonePolySynth({
        context: toneContext,
        maxPolyphony: 16,
        voice: ToneSynth,
        options: {
          volume: -3,
          oscillator: { type: this.wave },
          envelope: this.instrumentEnvelope(),
        },
      });
      this.riffSubSynth = new TonePolySynth({
        context: toneContext,
        maxPolyphony: 16,
        voice: ToneSynth,
        options: {
          volume: -3,
          oscillator: { type: this.wave },
          envelope: this.instrumentEnvelope(),
        },
      });
      this.riffSynth.connect(guitarInput);
      this.riffSubSynth.connect(riffSubGain);
      riffSubGain.connect(guitarInput);
      riffSubGain.gain.value = this.subLevel(this.parameters.sub);
    }
    return this.audioContext;
  }

  private updateRiffEnvelopes() {
    const envelope = this.instrumentEnvelope();
    this.riffSynth?.set({ envelope });
    this.riffSubSynth?.set({ envelope });
  }

  private instrumentEnvelope() {
    return {
      attack: 0.005,
      decay: this.decaySeconds(this.parameters.decay),
      sustain: riffSustain,
      release: this.releaseSeconds(this.parameters.release),
    };
  }

  private applyEnvelope(voice: Voice, time: number) {
    if (voice.releaseScheduled) return;
    const gain = voice.envelope.gain;
    gain.cancelScheduledValues(time);
    gain.setValueAtTime(Math.max(0.0001, gain.value), time);
    gain.linearRampToValueAtTime(
      Math.max(0.0001, riffSustain),
      time + this.decaySeconds(this.parameters.decay),
    );
  }

  private releaseVoice(voice: Voice) {
    if (voice.releaseScheduled || !this.audioContext) return;
    voice.releaseScheduled = true;
    const context = this.audioContext;
    const now = context.currentTime;
    const end = now + this.releaseSeconds(this.parameters.release);
    voice.envelope.gain.cancelScheduledValues(now);
    voice.envelope.gain.setValueAtTime(Math.max(0.0001, voice.envelope.gain.value), now);
    voice.envelope.gain.linearRampToValueAtTime(0, end);
    voice.sources.forEach((source) => source.stop(end + 0.025));
  }

  private finishSource(voice: Voice) {
    voice.finishedSources += 1;
    if (voice.finishedSources < voice.sources.length) return;
    voice.sources.forEach((source) => {
      source.disconnect();
      source.onended = null;
    });
    voice.envelope.disconnect();
    voice.subGain.disconnect();
    this.activeVoices.delete(voice);
  }

  private setGain(node: GainNode | null, value: number, time: number) {
    node?.gain.setTargetAtTime(value, time, 0.025);
  }

  private drumsBusGain(value: number) {
    return value * 2.2;
  }

  private normalizedSampleGain(buffer: AudioBuffer) {
    let sumSquares = 0;
    let peak = 0;
    let sampleCount = 0;
    for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
      const data = buffer.getChannelData(channel);
      for (let index = 0; index < data.length; index += 1) {
        const absolute = Math.abs(data[index]);
        sumSquares += absolute * absolute;
        peak = Math.max(peak, absolute);
      }
      sampleCount += data.length;
    }
    const rms = Math.sqrt(sumSquares / Math.max(1, sampleCount));
    const rmsGain = 0.2 / Math.max(0.0001, rms);
    const peakGain = 0.82 / Math.max(0.0001, peak);
    return Math.min(rmsGain, peakGain);
  }

  private outputHeadroom() {
    return 0.75;
  }

  private oscillatorType(type: WaveType): OscillatorType {
    return type === "pulse" ? "square" : type;
  }

  private configureCompressor(
    compressor: DynamicsCompressorNode,
    threshold: number,
    ratio: number,
  ) {
    compressor.threshold.value = threshold;
    compressor.knee.value = 6;
    compressor.ratio.value = ratio;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.12;
  }

  private subLevel(value: number) {
    if (value <= 1) return 0;
    return 1.1 * ((value - 1) / 9) ** 1.5;
  }

  private gainLevel(value: number) {
    return 0.2 * 16 ** ((value - 1) / 9);
  }

  private octaveBelow(note: string) {
    const octave = Number(note.charAt(note.length - 1));
    return `${note.slice(0, -1)}${octave - 1}`;
  }

  private resonanceQ(value: number) {
    return 0.5 + ((value - 1) / 9) * 9.5;
  }

  private toneFrequency(value: number) {
    return 250 + (value / 10) ** 2 * 19_750;
  }

  private decaySeconds(value: number) {
    return 0.015 + value * 0.435;
  }

  private releaseSeconds(value: number) {
    return 0.015 + value * 1.485;
  }

  private makeDistortionCurve(amount: number) {
    const samples = 44100;
    const curve = new Float32Array(samples);
    const drive = 1 + amount * 2.5;
    const peak = ((3 + drive) * 20 * (Math.PI / 180)) / (Math.PI + drive);
    for (let index = 0; index < samples; index += 1) {
      const x = (index * 2) / samples - 1;
      curve[index] =
        ((3 + drive) * x * 20 * (Math.PI / 180)) /
        ((Math.PI + drive * Math.abs(x)) * peak);
    }
    return curve;
  }
}
