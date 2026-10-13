import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import DrumModule from "./components/DrumModule";
import Knob from "./components/Knob";
import Slider from "./components/Slider";
import WaveVisualizer from "./components/WaveVisualizer";
import { SynthEngine, type SynthParameters, type WaveType } from "./SynthEngine";

const notes: Record<string, number> = {
  a: 261.63,
  w: 277.18,
  s: 293.66,
  e: 311.13,
  d: 329.63,
  f: 349.23,
  t: 369.99,
  g: 392,
  y: 415.3,
  h: 440,
  u: 466.16,
  j: 493.88,
  k: 523.25,
};

const keyboard = ["A", "W", "S", "E", "D", "F", "T", "G", "Y", "H", "U", "J", "K"];
const waveTypes: WaveType[] = ["pulse", "sawtooth", "sine", "triangle"];
const drumKeys: Record<string, number> = {
  d: 0,
  r: 1,
  u: 2,
  m: 3,
  s: 4,
};

function BlinkingText({ children }: { children: string }) {
  return <span className="device-copy__blink">{children}</span>;
}

function CyclingText({ text, delay = 0 }: { text: string; delay?: number }) {
  const [visibleLength, setVisibleLength] = useState(text.length);

  useEffect(() => {
    let length = text.length;
    let phase: "erase" | "pause" | "type" = "erase";
    let timeoutId: number;

    const tick = () => {
      if (phase === "erase") {
        if (length === 0) {
          phase = "pause";
          timeoutId = window.setTimeout(tick, 500);
          return;
        }
        length = Math.max(0, length - 1);
        setVisibleLength(length);
        timeoutId = window.setTimeout(tick, 65);
      } else if (phase === "pause") {
        phase = "type";
        timeoutId = window.setTimeout(tick, 55);
      } else if (phase === "type") {
        length = Math.min(text.length, length + 1);
        setVisibleLength(length);
        if (length === text.length) {
          phase = "erase";
          timeoutId = window.setTimeout(tick, 1500);
        } else {
          timeoutId = window.setTimeout(tick, 55);
        }
      }
    };

    timeoutId = window.setTimeout(tick, delay + 1500);
    return () => window.clearTimeout(timeoutId);
  }, [delay, text]);

  return (
    <span className="device-copy__cycling-text" aria-label={text}>
      <span className="device-copy__cycling-measure" aria-hidden="true">{text}</span>
      <span aria-hidden="true">{text.slice(0, visibleLength)}</span>
    </span>
  );
}

export default function App() {
  const engine = useMemo(() => new SynthEngine(), []);
  const [parameters, setParameters] = useState<SynthParameters>({
    volume: 0.35,
    decay: 0.12,
    tempo: 126,
    release: 0.18,
    distort: 3,
    sub: 3,
    gain: 5,
    tone: 7,
    res: 5,
  });
  const [waveType, setWaveType] = useState<WaveType>("triangle");
  const [activeNotes, setActiveNotes] = useState<Set<string>>(() => new Set());
  const activeNotesRef = useRef(activeNotes);
  const [drumValue, setDrumValue] = useState(0.55);
  const [drumHits, setDrumHits] = useState(0);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [audioError, setAudioError] = useState("");
  const [isRiffPlaying, setIsRiffPlaying] = useState(false);
  const riffPlayingRef = useRef(false);
  const riffActionInProgressRef = useRef(false);

  const updateParameter = useCallback(
    <K extends keyof SynthParameters>(name: K, value: SynthParameters[K]) => {
      setParameters((current) => ({ ...current, [name]: value }));
      engine.setParameter(name, value);
    },
    [engine],
  );

  useEffect(() => {
    void engine
      .loadDrumSamples()
      .then(() => setAnalyser(engine.analyser))
      .catch((error: unknown) =>
        setAudioError(error instanceof Error ? error.message : "Unable to load audio samples."),
      );
  }, [engine]);

  const playNote = useCallback(
    (key: string) => {
      const normalized = key.toLowerCase();
      const frequency = notes[normalized];
      if (!frequency || activeNotesRef.current.has(normalized)) return;
      const next = new Set(activeNotesRef.current).add(normalized);
      activeNotesRef.current = next;
      setActiveNotes(next);
      void engine
        .startNote(normalized, frequency)
        .then(() => {
          setAudioError("");
          setAnalyser(engine.analyser);
          if (!activeNotesRef.current.has(normalized)) engine.stopNote(normalized);
        })
        .catch((error: unknown) => {
          const failedNotes = new Set(activeNotesRef.current);
          failedNotes.delete(normalized);
          activeNotesRef.current = failedNotes;
          setActiveNotes(failedNotes);
          setAudioError(error instanceof Error ? error.message : "Unable to start audio.");
        });
    },
    [engine],
  );

  const releaseNote = useCallback(
    (key: string) => {
      const normalized = key.toLowerCase();
      const next = new Set(activeNotesRef.current);
      next.delete(normalized);
      activeNotesRef.current = next;
      setActiveNotes(next);
      engine.stopNote(normalized);
    },
    [engine],
  );

  const playDrum = useCallback(
    (instrument: number) => {
      setDrumHits((count) => count + 1);
      window.setTimeout(() => setDrumHits((count) => Math.max(0, count - 1)), 260);
      void engine
        .triggerDrum(instrument)
        .then(() => {
          setAudioError("");
          setAnalyser(engine.analyser);
        })
        .catch((error: unknown) =>
          setAudioError(error instanceof Error ? error.message : "Unable to play drum."),
        );
    },
    [engine],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
      if (
        event.target instanceof HTMLElement &&
        (["INPUT", "TEXTAREA", "SELECT"].includes(event.target.tagName) ||
          event.target.isContentEditable)
      ) return;
      const key = event.key.toLowerCase();
      if (notes[key] || drumKeys[key] !== undefined) {
        event.preventDefault();
        if (notes[key]) playNote(event.key);
        if (drumKeys[key] !== undefined) playDrum(drumKeys[key]);
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (notes[event.key.toLowerCase()]) releaseNote(event.key);
    };
    const onBlur = () => {
      activeNotesRef.current.forEach((key) => engine.stopNote(key));
      activeNotesRef.current = new Set();
      setActiveNotes(activeNotesRef.current);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      activeNotesRef.current.forEach((key) => engine.stopNote(key));
    };
  }, [engine, playDrum, playNote, releaseNote]);

  const changeWave = (type: WaveType) => {
    setWaveType(type);
    engine.setWave(type);
  };

  const handleStartClick = () => {
    if (riffActionInProgressRef.current) return;
    if (riffPlayingRef.current) {
      engine.stopRiff();
      riffPlayingRef.current = false;
      setIsRiffPlaying(false);
      setAudioError("");
      return;
    }
    riffActionInProgressRef.current = true;
    void engine
      .startRiff()
      .then(() => {
        riffPlayingRef.current = true;
        setIsRiffPlaying(true);
        setAnalyser(engine.analyser);
        setAudioError("");
      })
      .catch((error: unknown) => {
        setAudioError(error instanceof Error ? error.message : "Unable to start the synthesizer.");
      })
      .finally(() => {
        riffActionInProgressRef.current = false;
      });
  };

  return (
    <main className="synth-shell">
      <header className="brand" aria-label="RN wave">
        <span className="brand__raw">RN</span>
        <span className="brand__wave">wave</span>
      </header>

      <section className="left-controls" aria-label="Sound controls">
        <Slider label="volume" value={parameters.volume} onChange={(value) => updateParameter("volume", value)} />
        <Slider label="decay" value={parameters.decay} onChange={(value) => updateParameter("decay", value)} />
        <Slider label="tempo" value={parameters.tempo} min={60} max={200} step={1} onChange={(value) => updateParameter("tempo", value)} />
        <Slider label="release" value={parameters.release} onChange={(value) => updateParameter("release", value)} />
      </section>

      <div className="wave-position">
        <WaveVisualizer
          active={isRiffPlaying || activeNotes.size > 0 || drumHits > 0}
          analyser={analyser}
        />
      </div>

      <div className="start-button-position">
        <button
          type="button"
          className="start-button"
          onClick={handleStartClick}
        >
          START
        </button>
      </div>

      <div className="drum-position">
        <DrumModule
          value={drumValue}
          onChange={(value) => {
            setDrumValue(value);
            engine.setDrumVolume(value);
          }}
          onHit={playDrum}
        />
      </div>

      <section className="knob-bank" aria-label="Analog effects">
        <Knob label="Distort" value={parameters.distort} onChange={(value) => updateParameter("distort", value)} />
        <Knob label="Sub" value={parameters.sub} onChange={(value) => updateParameter("sub", value)} />
        <Knob label="Gain" value={parameters.gain} onChange={(value) => updateParameter("gain", value)} />
        <Knob label="Tone" value={parameters.tone} onChange={(value) => updateParameter("tone", value)} />
        <Knob label="Res" value={parameters.res} onChange={(value) => updateParameter("res", value)} />
      </section>

      <section className="wave-selector" aria-label="Oscillator wave type">
        <h2>wave type</h2>
        <div className="wave-selector__buttons">
          {waveTypes.map((type) => (
            <button
              key={type}
              type="button"
              className={`wave-button ${waveType === type ? "is-active" : ""}`}
              aria-pressed={waveType === type}
              onClick={() => changeWave(type)}
            >
              {type}
            </button>
          ))}
        </div>
      </section>

      <aside className="device-copy" aria-label="Device status">
        <p className="device-copy__restart">
          <CyclingText text={"press cmd + R\nto restart your\nrock'n'roll drive"} delay={350} />
        </p>
        <p className="device-copy__loading">
          <BlinkingText>loading</BlinkingText>
          <CyclingText text="broken hearts" delay={0} />
        </p>
        <p className="device-copy__signal">
          <BlinkingText>signal</BlinkingText>
          <CyclingText text="overdrive" delay={250} />
        </p>
      </aside>

      <p className="soul-copy">
        <CyclingText text={"your soul is a guitar\nmake it scream out loud"} delay={900} />
      </p>

      <div className="keyboard" aria-label="Playable keyboard">
        {keyboard.map((key) => (
          <button
            key={key}
            type="button"
            className={`keyboard__key ${"WETYU".includes(key) ? "keyboard__key--sharp" : ""} ${activeNotes.has(key.toLowerCase()) ? "is-pressed" : ""}`}
            aria-label={`Play note ${key}`}
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              playNote(key);
            }}
            onPointerUp={() => releaseNote(key)}
            onPointerCancel={() => releaseNote(key)}
            onPointerLeave={(event) => {
              if (event.buttons > 0) releaseNote(key);
            }}
          >
            {key}
          </button>
        ))}
      </div>
      <span className="keyboard-hint">A W S E D F T G Y H U J K &nbsp; / &nbsp; PLAY NOTES</span>
      {audioError && (
        <p className="audio-error" role="alert">
          {audioError}
        </p>
      )}
    </main>
  );
}
