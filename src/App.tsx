import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Knob from "./components/Knob";
import Slider from "./components/Slider";
import DrumModule from "./components/DrumModule";
import ReferenceBrand from "./components/ReferenceBrand";
import ReferencePanelTypography from "./components/ReferencePanelTypography";
import ReferenceSwitchGlyph from "./components/ReferenceSwitchGlyph";
import WaveSelector from "./components/WaveSelector";
import WaveVisualizer from "./components/WaveVisualizer";
import { AudioEngine, type SynthParameters, type VoiceId, type WaveType } from "./audio.js";
import { createSynthController, KEYBOARD_NOTES as notes, KNOB_NAMES as knobNames } from "./script.js";


function VoicePanel({
  id,
  parameters,
  wave,
  onParameter,
  onWave,
}: {
  id: VoiceId;
  parameters: SynthParameters;
  wave: WaveType;
  onParameter: <K extends keyof SynthParameters>(name: K, value: SynthParameters[K]) => void;
  onWave: (value: WaveType) => void;
}) {
  const align = id === 1 ? "left" : "right";

  return (
    <section className={`voice-panel voice-panel--${id}`} aria-label={`Voice ${id} controls`}>
      <span className="voice-number">{id}</span>
      <ReferencePanelTypography side={id} />

      <div className="slider-stack">
        <Slider label="Volume" value={parameters.volume} align={align} onChange={(value) => onParameter("volume", value)} />
        <Slider label="Cutoff" value={parameters.cutoff} align={align} onChange={(value) => onParameter("cutoff", value)} />
        <Slider label="Attack" value={parameters.attack} align={align} onChange={(value) => onParameter("attack", value)} />
        <Slider label="Release" value={parameters.release} align={align} onChange={(value) => onParameter("release", value)} />
      </div>

      <div className="knob-bank" aria-label={`Voice ${id} sound controls`}>
        {knobNames.map((name) => (
          <Knob key={name} label={name} value={parameters[name]} onChange={(value) => onParameter(name, value)} />
        ))}
      </div>

      <WaveSelector wave={wave} onWave={onWave} />
    </section>
  );
}

export default function App() {
  const controller = useMemo(() => createSynthController(new AudioEngine()), []);
  const [voices, setVoices] = useState<Record<VoiceId, SynthParameters>>({ 1: controller.engine.defaults(1), 2: controller.engine.defaults(2) });
  const [waves, setWaves] = useState<Record<VoiceId, WaveType>>({ ...controller.engine.waves });
  const [enabled, setEnabled] = useState<Record<VoiceId, boolean>>({ 1: false, 2: false });
  const [drums, setDrums] = useState<boolean[]>([false, false, false, false, false]);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [transportStep, setTransportStep] = useState(-1);
  const [error, setError] = useState("");
  const activeNotes = useRef(new Set<string>());

  const setParameter = useCallback(
    <K extends keyof SynthParameters>(id: VoiceId, name: K, value: SynthParameters[K]) => {
      setVoices((current) => ({ ...current, [id]: { ...current[id], [name]: value } }));
      controller.setParameter(id, name, value);
    },
    [controller],
  );

  const toggleVoice = async (id: VoiceId) => {
    try {
      if (enabled[id]) controller.disableVoice(id);
      else await controller.enableVoice(id);
      setEnabled((current) => ({ ...current, [id]: !current[id] }));
      setAnalyser(controller.analyser);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to start audio.");
    }
  };

  const toggleDrum = async (id: number) => {
    try {
      await controller.toggleDrum(id);
      setDrums((current) => current.map((value, index) => (index === id ? !value : value)));
      setAnalyser(controller.analyser);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to start drum synthesis.");
    }
  };

  const playNote = (key: string) => {
    const normalized = key.toLowerCase();
    if (!notes[normalized] || activeNotes.current.has(normalized)) return;
    activeNotes.current.add(normalized);
    void controller
      .startNote(normalized, notes[normalized])
      .then(() => setAnalyser(controller.analyser))
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Unable to play note."));
  };

  useEffect(() => controller.onStep(setTransportStep), [controller]);

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (!event.repeat && notes[event.key.toLowerCase()] && !(event.target instanceof HTMLInputElement)) {
        event.preventDefault();
        playNote(event.key);
      }
    };
    const up = (event: KeyboardEvent) => activeNotes.current.delete(event.key.toLowerCase());
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      controller.stopAll();
      controller.dispose();
    };
  }, [controller]);

  return (
    <main className="synth-shell">
      <ReferenceBrand />

      <VoicePanel
        id={1}
        parameters={voices[1]}
        wave={waves[1]}
        onParameter={(name, value) => setParameter(1, name, value)}
        onWave={(value) => {
          setWaves((current) => ({ ...current, 1: value }));
          controller.setWave(1, value);
        }}
      />

      <section className="center-stage" aria-label="Transport">
        <div className="wave-position">
          <WaveVisualizer active={Object.values(enabled).some(Boolean) || drums.some(Boolean)} analyser={analyser} />
        </div>
        <div className="voice-switches">
          <button
            type="button"
            aria-label="Voice 1"
            aria-pressed={enabled[1]}
            className={enabled[1] ? "is-active" : ""}
            onClick={() => void toggleVoice(1)}
          >
            <ReferenceSwitchGlyph type="one" />
          </button>
          <button
            type="button"
            aria-label="Voice 2"
            aria-pressed={enabled[2]}
            className={enabled[2] ? "is-active" : ""}
            onClick={() => void toggleVoice(2)}
          >
            <ReferenceSwitchGlyph type="two" />
          </button>
        </div>
      </section>

      <VoicePanel
        id={2}
        parameters={voices[2]}
        wave={waves[2]}
        onParameter={(name, value) => setParameter(2, name, value)}
        onWave={(value) => {
          setWaves((current) => ({ ...current, 2: value }));
          controller.setWave(2, value);
        }}
      />

      <DrumModule active={drums} step={transportStep} onToggle={(id) => void toggleDrum(id)} />

      <div className="keyboard" aria-label="Playable keyboard">
        {Object.keys(notes).map((key) => (
          <button
            className="keyboard__key"
            key={key}
            type="button"
            aria-label={`Play note ${key}`}
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              playNote(key);
            }}
            onPointerUp={() => activeNotes.current.delete(key)}
          >
            {key.toUpperCase()}
          </button>
        ))}
      </div>

      {error && <p className="audio-error" role="alert">{error}</p>}
    </main>
  );
}
