// Настройки существующих элементов интерфейса. Новые элементы не создаются.
export const WAVE_TYPES = ["pulse", "sawtooth", "square", "triangle"];
export const KNOB_NAMES = ["drive", "sub", "punch", "pattern", "sustain"];
export const KEYBOARD_NOTES = {
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


// UI adapter for the existing React controls.
//
// This file intentionally contains no audio nodes.  It is the single bridge
// from buttons/sliders/knobs to AudioEngine, so a React re-render cannot create
// another instrument, duplicate a loop, or leave a stale callback connected.
export function createSynthController(engine) {
  // Сохраняем только выбор волн. Старый sine мигрируется движком в square.
  const saveWaves = () => {
    try { globalThis.localStorage?.setItem("rnwave.waves", JSON.stringify(engine.waves)); } catch { /* Storage may be disabled. */ }
  };
  try {
    const saved = JSON.parse(globalThis.localStorage?.getItem("rnwave.waves") || "{}");
    for (const id of [1, 2]) if (typeof saved?.[id] === "string") engine.setWave(id, saved[id]);
    saveWaves();
  } catch { /* Invalid old settings fall back to the instrument defaults. */ }
  return {
    engine,
    get analyser() {
      return engine.analyser;
    },
    enableVoice(id) {
      return engine.enableVoice(id);
    },
    disableVoice(id) {
      engine.disableVoice(id);
    },
    toggleDrum(id) {
      return engine.toggleDrum(id);
    },
    startNote(id, frequency) {
      return engine.startNote(id, frequency);
    },
    stopAll() {
      engine.stopAll();
    },
    setWave(id, type) {
      engine.setWave(id, type);
      saveWaves();
    },
    setParameter(id, name, value) {
      engine.setParameter(id, name, value);
    },
    onStep(listener) {
      return engine.onStep(listener);
    },
    dispose() {
      engine.dispose();
    },
  };
}
