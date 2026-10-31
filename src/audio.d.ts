export type WaveType = "pulse" | "sawtooth" | "square" | "triangle";
export type VoiceId = 1 | 2;

export interface SynthParameters {
  volume: number;
  cutoff: number;
  attack: number;
  release: number;
  /** Post-decay amplitude level, stepped from 1 to 10. */
  sustain: number;
  drive: number;
  sub: number;
  punch: number;
  pattern: number;
}

export type StepListener = (step: number) => void;

export declare const FIXED_TEMPO: number;
export declare const PHRASE_STEPS: number;
export declare const drumPatterns: readonly (readonly number[])[];

export declare class AudioEngine {
  readonly waves: Record<VoiceId, WaveType>;
  readonly analyser: AnalyserNode | null;
  defaults(id?: VoiceId): SynthParameters;
  onStep(listener: StepListener): () => void;
  enableVoice(id: VoiceId): Promise<void>;
  disableVoice(id: VoiceId): void;
  toggleDrum(id: number): Promise<void>;
  startNote(id: string, frequency: number): Promise<void>;
  stopAll(): void;
  dispose(): void;
  setWave(id: VoiceId, type: WaveType | "sine"): void;
  setParameter<K extends keyof SynthParameters>(id: VoiceId, name: K, value: SynthParameters[K]): void;
}
