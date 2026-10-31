import type { AudioEngine, SynthParameters, VoiceId, WaveType, StepListener } from "./audio.js";

export interface SynthController {
  readonly engine: AudioEngine;
  readonly analyser: AnalyserNode | null;
  enableVoice(id: VoiceId): Promise<void>;
  disableVoice(id: VoiceId): void;
  toggleDrum(id: number): Promise<void>;
  startNote(id: string, frequency: number): Promise<void>;
  stopAll(): void;
  setWave(id: VoiceId, type: WaveType | "sine"): void;
  setParameter<K extends keyof SynthParameters>(id: VoiceId, name: K, value: SynthParameters[K]): void;
  onStep(listener: StepListener): () => void;
  dispose(): void;
}

export declare function createSynthController(engine: AudioEngine): SynthController;

export declare const WAVE_TYPES: readonly WaveType[];
export declare const KEYBOARD_NOTES: Record<string, number>;
export declare const KNOB_NAMES: readonly ("drive" | "sub" | "punch" | "pattern" | "sustain")[];
