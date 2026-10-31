// The transport is deliberately independent from the React render cycle.  All
// voices and drums use the same 16th-note clock, so enabling a layer halfway
// through a phrase joins the current musical position instead of restarting it.
export const FIXED_TEMPO = 112;
const STEPS_PER_BAR = 16;
const BARS_PER_PHRASE = 8;
export const PHRASE_STEPS = STEPS_PER_BAR * BARS_PER_PHRASE;
const LOOK_AHEAD_SECONDS = 0.12;
const SCHEDULER_INTERVAL_MS = 25;

// ---- НОВАЯ ПАРТИТУРА: Em–C–G–D, два прохода по четыре такта ----------------
// Ноты записаны в реальном регистре. Один гармонический план для всех Pattern.
const bassChords = [
  { root: "E1", fifth: "B1", third: "G1", octave: "E2", approach: "D2" },
  { root: "C2", fifth: "G1", third: "E2", octave: "C3", approach: "B1" },
  { root: "G1", fifth: "D2", third: "B1", octave: "G2", approach: "A1" },
  { root: "D2", fifth: "A1", third: "F#2", octave: "D3", approach: "F#1" },
];
const upperChords = [
  { open: ["E3","B3"], third: ["G3"], color: ["E3","G3","B3"], answer: ["B3"], lead: ["E3"], turn: ["G3"] },
  { open: ["C3","G3"], third: ["E3"], color: ["C3","E3","G3"], answer: ["G3"], lead: ["C3"], turn: ["E3"] },
  { open: ["G3","D4"], third: ["B3"], color: ["G3","B3","D4"], answer: ["D4"], lead: ["G3"], turn: ["B3"] },
  { open: ["D3","A3"], third: ["F#3"], color: ["D3","F#3","A3"], answer: ["A3"], lead: ["D3"], turn: ["F#3"] },
];
const BASS_HARMONY = [...bassChords, ...bassChords];
const UPPER_HARMONY = [...upperChords, ...upperChords];
// Событие: [шаг 0..15, имя ноты/созвучия, длина в шестнадцатых, акцент 0..1].
// Рифф «тоника — повтор — квинта»: 0/6/8/14 совпадают с kick, 3/11 дают синкопу.
// Во втором проходе меняется только окончание; восьмой такт ведёт F#1 -> E1.
const BASS_BARS = [
  [[0,"root",2.5,.96],[3,"root",.75,.7],[6,"fifth",1,.8],[8,"root",2.5,.94],[11,"fifth",.75,.72],[14,"root",1,.84]],
  [[0,"root",2.5,.95],[3,"root",.75,.7],[6,"fifth",1,.79],[8,"root",2.5,.93],[11,"fifth",.75,.72],[14,"root",1,.83]],
  [[0,"root",2.5,.96],[3,"root",.75,.7],[6,"fifth",1,.8],[8,"root",2.5,.94],[11,"fifth",.75,.72],[14,"root",1,.84]],
  [[0,"root",2.5,.95],[3,"root",.75,.71],[6,"fifth",1,.8],[8,"root",2.5,.93],[11,"fifth",.75,.73],[14,"root",1,.83]],
  [[0,"root",2.5,.97],[3,"root",.75,.71],[6,"fifth",1,.82],[8,"root",2.5,.94],[11,"octave",.75,.75],[14,"variation",1,.84]],
  [[0,"root",2.5,.96],[3,"root",.75,.7],[6,"fifth",1,.8],[8,"root",2.5,.94],[11,"fifth",.75,.74],[14,"variation",1,.83]],
  [[0,"root",2.5,.97],[3,"root",.75,.71],[6,"fifth",1,.82],[8,"root",2.5,.95],[11,"octave",.75,.75],[14,"variation",1,.85]],
  [[0,"root",2.5,.96],[3,"root",.75,.71],[6,"fifth",1,.81],[8,"root",2.5,.94],[11,"third",.75,.75],[13,"fifth",.75,.77],[15,"approach",.65,.74]],
];
// Узнаваемый ответ «квинта — терция — тоника»: акцент на 4, короткая нота на
// 5.5, разрешение на 12. Второй проход добавляет трезвучия и маленькую реплику.
// Последняя фраза заканчивается до басового перехода 13/15. Паузы намеренные.
const UPPER_BARS = [
  [[4,"open",1.1,.7],[5.5,"third",.6,.59],[12,"lead",1.25,.65]],
  [[4,"open",1.1,.69],[5.5,"third",.6,.58],[12,"lead",1.25,.64]],
  [[4,"open",1.1,.7],[5.5,"third",.6,.6],[12,"lead",1.25,.66]],
  [[4,"open",1.1,.69],[5.5,"third",.6,.59],[12,"lead",1.25,.64]],
  [[4,"color",1.1,.72],[5.5,"third",.6,.6],[10.75,"answer",.65,.62],[12,"variation",1.1,.66]],
  [[4,"open",1.1,.7],[5.5,"third",.6,.59],[10.75,"answer",.65,.61],[12,"variation",1.1,.65]],
  [[4,"color",1.1,.73],[5.5,"third",.6,.61],[10.75,"answer",.65,.63],[12,"variation",1.1,.67]],
  [[4,"open",1.1,.7],[5.5,"third",.6,.59],[10.75,"answer",.55,.61],[12,"lead",.75,.62]],
];
// Pattern 1..10 выбирает окраску событий variation; случайных нот нет.
const PATTERN_COLORS = [
  ["octave","lead"],["fifth","third"],["root","answer"],["octave","open"],
  ["fifth","color"],["root","lead"],["octave","third"],["fifth","answer"],
  ["root","open"],["octave","color"],
];

// These are the five vector drum buttons already present in the reference UI.
// The sounds themselves are generated below; no audio files are fetched.
export const drumPatterns = [
  [0, 6, 8, 14, 16, 22, 24, 30, 32, 38, 40, 46, 48, 54, 56, 62],
  [4, 12, 20, 28, 36, 44, 52, 60],
  [14, 15, 30, 31, 46, 47, 62, 63],
  [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 46, 48, 50, 52, 54, 56, 58, 60, 62],
  [0],
].map((pattern) => [...pattern, ...pattern.map((step) => step + 64)]);

const VOICE_TONE = {
  1: {
    peak: 0.6,
    sub: 0.2,
    output: 0.78,
    cutoffMin: 65,
    cutoffMax: 6200,
    lowCut: 26,
    pan: -0.22,
    chorusRate: 0.24,
    delayTime: 60 / FIXED_TEMPO / 2,
  },
  2: {
    peak: 0.6,
    sub: 0.05,
    output: 0.74,
    cutoffMin: 160,
    cutoffMax: 6800,
    lowCut: 110,
    pan: 0.22,
    chorusRate: 0.31,
    delayTime: 60 / FIXED_TEMPO * 0.75,
  },
};

// Match perceived weight without changing the master or the drum bus.
// The octave body makes the deep fundamental translate on smaller speakers.
const WAVE_TONE = {
  square: { gain: 1.0, body: 0.08 },
  triangle: { gain: 1.25, body: 0.18 },
  pulse: { gain: 1.3, body: 0.08 },
  sawtooth: { gain: 1.45, body: 0.08 },
};
const VOICE_IDS = [1, 2];

function clamp01(value) {
  return Math.min(1, Math.max(0, Number(value) || 0));
}

function clamp10(value) {
  return Math.min(10, Math.max(1, Math.round(Number(value) || 1)));
}

function normalized10(value) {
  return (clamp10(value) - 1) / 9;
}

function audioContextConstructor() {
  return globalThis.AudioContext || globalThis.webkitAudioContext;
}

/**
 * One Web Audio graph for the whole instrument.
 *
 * This file owns the composition, transport, note envelopes, synthesis, voice
 * effects, panning, and drums. Keeping those responsibilities here prevents
 * UI renders from creating a second instrument or a second clock.
 */
export class AudioEngine {
  constructor() {
    this.context = null;
    this.masterInput = null;
    this.master = null;
    this.drumBus = null;
    this.analyserNode = null;
    this.buses = new Map();
    this.params = { 1: this.defaults(1), 2: this.defaults(2) };
    this.waves = { 1: "triangle", 2: "sawtooth" };
    this.enabledVoices = new Set();
    this.enabledDrums = new Set();
    this.schedulerId = null;
    this.nextStepTime = 0;
    this.step = 0;
    this.activePatterns = { 1: 1, 2: 1 };
    this.pendingPatterns = { 1: 1, 2: 1 };
    this.stepListeners = new Set();
    this.noiseBuffers = new Map();
    this.pulseWave = null;
    this.activeNotes = new Set();
  }

  get analyser() {
    return this.analyserNode;
  }

  onStep(listener) {
    this.stepListeners.add(listener);
    return () => {
      this.stepListeners.delete(listener);
    };
  }

  async enableVoice(id) {
    await this.ready();
    this.enabledVoices.add(id);
    const bus = this.buses.get(id);
    if (bus) bus.gate.gain.setTargetAtTime(1, this.context.currentTime, 0.012);
    this.ensureTransport();
  }

  disableVoice(id) {
    this.enabledVoices.delete(id);
    const bus = this.buses.get(id);
    if (bus && this.context) bus.gate.gain.setTargetAtTime(0, this.context.currentTime, 0.018);
    this.stopIfIdle();
  }

  async toggleDrum(id) {
    await this.ready();
    if (this.enabledDrums.has(id)) this.enabledDrums.delete(id);
    else this.enabledDrums.add(id);
    this.ensureTransport();
    this.stopIfIdle();
  }

  async startNote(_id, frequency) {
    await this.ready();
    this.buses.get(1).gate.gain.setTargetAtTime(1, this.context.currentTime, 0.012);
    this.playNote(1, frequency, 0.9, this.context.currentTime + 0.01, this.duration("8n"));
  }

  stopAll() {
    VOICE_IDS.forEach((id) => {
      this.enabledVoices.delete(id);
      const bus = this.buses.get(id);
      if (bus && this.context) bus.gate.gain.setTargetAtTime(0, this.context.currentTime, 0.018);
    });
    this.enabledDrums.clear();
    this.stopIfIdle();
  }

  dispose() {
    this.stopAll();
    if (this.context) void this.context.close();
    this.context = null;
    this.buses.clear();
    this.activeNotes.clear();
    this.pulseWave = null;
    this.analyserNode = null;
  }

  setWave(id, type) {
    // Старый sine заменяется на square. Звучащие ноты завершают огибающие;
    // новая форма вступает со следующей ноты с плавной атакой.
    const wave = type === "sine" ? "square" : type;
    if (Object.hasOwn(WAVE_TONE, wave)) this.waves[id] = wave;
  }

  setParameter(id, name, value) {
    if (!Object.hasOwn(this.params[id], name)) return;
    const numericValue = Number(value);
    this.params[id][name] = numericValue;

    // Pattern is musical state. It commits on a quarter-note
    // boundary in scheduleStep(), never by restarting the shared transport.
    if (name === "pattern") {
      this.pendingPatterns[id] = clamp10(numericValue);
      return;
    }

    const bus = this.buses.get(id);
    if (!bus || !this.context) return;
    const now = this.context.currentTime;
    if (["attack", "sustain", "release"].includes(name)) {
      this.activeNotes.forEach((note) => {
        if (note.id === id) this.automateNote(note, now);
      });
    }

    if (name === "volume") {
      bus.output.gain.setTargetAtTime(this.outputGain(id, numericValue), now, 0.035);
    }
    if (name === "cutoff") {
      bus.filter.frequency.setTargetAtTime(this.cutoffFrequency(id, numericValue), now, 0.035);
    }
    if (name === "drive") {
      const mix = this.driveMix(numericValue, id);
      bus.driveInput.gain.setTargetAtTime(this.driveAmount(numericValue, id), now, 0.045);
      bus.driveDry.gain.setTargetAtTime(mix.dry, now, 0.045);
      bus.driveWet.gain.setTargetAtTime(mix.wet, now, 0.045);
    }
    if (name === "sub") {
      bus.subLevel.gain.setTargetAtTime(this.subGain(id, numericValue), now, 0.035);
    }
    if (name === "punch") {
      bus.punchControl.gain.setTargetAtTime(this.punchGain(numericValue), now, 0.025);
    }
  }

  async ready() {
    const context = this.getContext();
    await context.resume();
    return context;
  }

  getContext() {
    if (this.context) return this.context;
    const Context = audioContextConstructor();
    if (!Context) throw new Error("Web Audio API is not available in this browser.");

    const context = new Context();
    const masterInput = context.createGain();
    const master = context.createDynamicsCompressor();
    const safety = context.createWaveShaper();
    const drumBus = context.createGain();
    const drumCompressor = context.createDynamicsCompressor();
    const analyser = context.createAnalyser();

    // Leave headroom in the master.  Loudness is balanced at the voice/drum
    // buses, not by clipping the final output.
    masterInput.gain.value = 0.68;
    master.threshold.value = -7;
    master.knee.value = 10;
    master.ratio.value = 3.5;
    master.attack.value = 0.003;
    master.release.value = 0.18;

    // Procedural drums are intentionally lifted at their own bus.  The
    // compressor keeps the kick/snare transient while preventing the sum from
    // eating all available headroom.
    drumBus.gain.value = 1.42;
    drumCompressor.threshold.value = -16;
    drumCompressor.knee.value = 8;
    drumCompressor.ratio.value = 2.4;
    drumCompressor.attack.value = 0.0015;
    drumCompressor.release.value = 0.1;

    masterInput.connect(master);
    drumBus.connect(drumCompressor);
    drumCompressor.connect(masterInput);
    // Мягкий предохранитель: до 0.75 сигнал не меняется, выше колено
    // плавно ограничивает пики. Это защита суммы, а не источник перегруза.
    const safetyCurve = new Float32Array(4097);
    for (let i = 0; i < safetyCurve.length; i += 1) {
      const x = i * 2 / (safetyCurve.length - 1) - 1;
      const magnitude = Math.abs(x);
      safetyCurve[i] = Math.sign(x) * (magnitude <= 0.75
        ? magnitude : 0.75 + 0.2 * Math.tanh((magnitude - 0.75) / 0.2));
    }
    safety.curve = safetyCurve;
    safety.oversample = "4x";
    master.connect(safety);
    safety.connect(analyser);
    analyser.connect(context.destination);
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.78;

    this.context = context;
    this.masterInput = masterInput;
    this.master = master;
    this.drumBus = drumBus;
    this.analyserNode = analyser;
    VOICE_IDS.forEach((id) => this.createBus(id));
    return context;
  }

  createBus(id) {
    // ОТДЕЛЬНЫЙ ТРАКТ КАЖДОГО ГОЛОСА:
    // осцилляторы -> огибающие -> lowCut -> dry + distortion
    // -> dry + chorus + delay -> общий lowpass -> Volume -> gate -> pan.
    // Саб обходит эффекты, но также проходит общий lowpass перед выходом.
    const context = this.context;
    const tone = VOICE_TONE[id];
    const params = this.params[id];
    const input = context.createGain();
    const lowCut = context.createBiquadFilter();
    const subInput = context.createGain();
    const subLevel = context.createGain();
    const subFilter = context.createBiquadFilter();
    const subLowCut = context.createBiquadFilter();
    const drive = context.createWaveShaper();
    const driveInput = context.createGain();
    const driveDry = context.createGain();
    const driveWet = context.createGain();
    const punchControl = context.createGain();
    const filter = context.createBiquadFilter();
    const effectsInput = context.createGain();
    const chorusSend = context.createGain();
    const chorusDelay = context.createDelay(0.1);
    const chorusReturn = context.createGain();
    const chorusLfo = context.createOscillator();
    const chorusDepth = context.createGain();
    const delaySend = context.createGain();
    const delay = context.createDelay(1);
    const delayFeedback = context.createGain();
    const delayReturn = context.createGain();
    const output = context.createGain();
    const gate = context.createGain();
    const panner = context.createStereoPanner();

    input.gain.value = 0.86;
    // Bass keeps its deep fundamental. The rhythm voice reserves the bottom
    // octave for the bass, before either dry signal or saturation is mixed.
    lowCut.type = "highpass";
    lowCut.frequency.value = tone.lowCut;
    lowCut.Q.value = 0.5;
    subLowCut.type = "highpass";
    subLowCut.frequency.value = tone.lowCut;
    subLowCut.Q.value = 0.5;
    subLevel.gain.value = this.subGain(id, params.sub);
    subFilter.type = "lowpass";
    subFilter.frequency.value = id === 1 ? 150 : 260;
    subFilter.Q.value = 0.35;
    drive.oversample = "4x";
    // Automate input gain instead of abruptly replacing the transfer curve.
    drive.curve = this.driveCurve(10);
    driveInput.gain.value = this.driveAmount(params.drive, id);
    const mix = this.driveMix(params.drive, id);
    driveDry.gain.value = mix.dry;
    driveWet.gain.value = mix.wet;
    punchControl.gain.value = this.punchGain(params.punch);
    filter.type = "lowpass";
    filter.frequency.value = this.cutoffFrequency(id, params.cutoff);
    filter.Q.value = id === 1 ? 0.6 : 0.5;

    // Dry signal, saturation and both effect returns enter the final low-pass.
    // No bright return can bypass Cutoff; the fundamental remains in the dry path.
    input.connect(lowCut);
    lowCut.connect(driveDry);
    driveDry.connect(effectsInput);
    lowCut.connect(driveInput);
    driveInput.connect(drive);
    drive.connect(driveWet);
    driveWet.connect(effectsInput);
    effectsInput.connect(filter);
    filter.connect(output);
    punchControl.connect(lowCut);

    chorusSend.gain.value = id === 1 ? 0.02 : 0.09;
    chorusDelay.delayTime.value = 0.018;
    chorusReturn.gain.value = 0.16;
    chorusLfo.frequency.value = tone.chorusRate;
    chorusDepth.gain.value = id === 1 ? 0.0008 : 0.0018;
    effectsInput.connect(chorusSend);
    chorusSend.connect(chorusDelay);
    chorusDelay.connect(chorusReturn);
    chorusReturn.connect(filter);
    chorusLfo.connect(chorusDepth);
    chorusDepth.connect(chorusDelay.delayTime);
    chorusLfo.start();

    // Quiet tempo-synced echo. Both sends exclude the clean sub oscillator.
    delaySend.gain.value = id === 1 ? 0.018 : 0.045;
    delay.delayTime.value = tone.delayTime;
    delayFeedback.gain.value = id === 1 ? 0.08 : 0.12;
    delayReturn.gain.value = 0.2;
    effectsInput.connect(delaySend);
    delaySend.connect(delay);
    delay.connect(delayFeedback);
    delayFeedback.connect(delay);
    delay.connect(delayReturn);
    delayReturn.connect(filter);

    // The clean sub bypasses chorus/echo but still belongs to this voice bus.
    subInput.connect(subLevel);
    subLevel.connect(subLowCut);
    subLowCut.connect(subFilter);
    subFilter.connect(filter);

    output.gain.value = this.outputGain(id, params.volume);
    gate.gain.value = 0;
    output.connect(gate);
    gate.connect(panner);
    panner.pan.value = tone.pan;
    panner.connect(this.masterInput);

    this.buses.set(id, {
      input,
      lowCut,
      subInput,
      subLevel,
      drive,
      driveInput,
      driveDry,
      driveWet,
      punchControl,
      filter,
      chorusSend,
      delaySend,
      output,
      gate,
    });
  }

  ensureTransport() {
    if (!this.context || this.schedulerId !== null) return;
    this.nextStepTime = this.context.currentTime + 0.06;
    this.schedulerId = globalThis.setInterval(() => this.scheduleAhead(), SCHEDULER_INTERVAL_MS);
    this.scheduleAhead();
  }

  scheduleAhead() {
    if (!this.context) return;
    const horizon = this.context.currentTime + LOOK_AHEAD_SECONDS;
    while (this.nextStepTime < horizon) {
      const currentStep = this.step;
      this.scheduleStep(currentStep, this.nextStepTime);
      this.step = (currentStep + 1) % (STEPS_PER_BAR * BARS_PER_PHRASE);
      this.nextStepTime += this.stepDuration();
    }
  }

  scheduleStep(currentStep, time) {
    // Pattern changes commit on the shared quarter-note boundary.
    if (currentStep % 4 === 0) {
      VOICE_IDS.forEach((id) => {
        this.activePatterns[id] = this.pendingPatterns[id];
      });
    }

    const barIndex = Math.floor(currentStep / STEPS_PER_BAR);
    const stepInBar = currentStep % STEPS_PER_BAR;
    this.enabledVoices.forEach((id) => {
      const bass = id === 1;
      const harmony = (bass ? BASS_HARMONY : UPPER_HARMONY)[barIndex];
      const events = (bass ? BASS_BARS : UPPER_BARS)[barIndex];
      const color = PATTERN_COLORS[this.activePatterns[id] - 1][bass ? 0 : 1];
      events.forEach(([step, tone, length, velocity]) => {
        if (Math.floor(step) !== stepInBar) return;
        // Полушаговые ответы используют тот же шестнадцатый clock, без второго таймера.
        const hitTime = time + (step % 1) * this.stepDuration();
        const pitches = harmony[tone === "variation" ? color : tone];
        const notes = Array.isArray(pitches) ? pitches : [pitches];
        // Созвучия звучат одновременно; компенсация числа нот сохраняет запас.
        notes.forEach((note) => this.playNote(id, this.frequency(note),
          velocity / Math.sqrt(notes.length), hitTime, length * this.stepDuration()));
      });
    });

    this.enabledDrums.forEach((id) => {
      if (drumPatterns[id].includes(currentStep)) this.playDrum(id, time, this.drumVelocity(id, currentStep));
    });

    const delay = Math.max(0, (time - this.context.currentTime) * 1000);
    globalThis.setTimeout(() => {
      if (this.schedulerId !== null) this.stepListeners.forEach((listener) => listener(currentStep));
    }, delay);
  }

  stopIfIdle() {
    if (this.enabledVoices.size || this.enabledDrums.size) return;
    if (this.schedulerId !== null) globalThis.clearInterval(this.schedulerId);
    this.schedulerId = null;
    this.nextStepTime = 0;
    this.step = 0;
  }

  envelopeTimes(id) {
    // Attack не обрезается длиной ноты: длинная атака может не дойти до пика
    // перед отпусканием. Release всегда начинается с реально достигнутого уровня.
    const p = this.params[id];
    return { attack: 0.003 + 0.45 * clamp01(p.attack) ** 2,
      decay: id === 1 ? 0.055 : 0.085,
      release: 0.018 + 1.18 * clamp01(p.release) ** 2 };
  }

  timelineValue(points, time) {
    if (time <= points[0].time) return points[0].value;
    for (let i = 1; i < points.length; i += 1) {
      if (time <= points[i].time) {
        const a = points[i - 1], b = points[i];
        return a.value + (b.value - a.value) * (time - a.time) / (b.time - a.time);
      }
    }
    return points.at(-1).value;
  }

  automateNote(note, now) {
    // Один непротиворечивый график GainNode для каждой составляющей.
    // При движении ручки удерживаем текущую амплитуду и меняем будущие точки.
    const settings = this.envelopeTimes(note.id);
    const attackEnd = note.start + settings.attack;
    const decayEnd = attackEnd + settings.decay;
    let releaseEnd = note.noteEnd + settings.release;
    const sustain = this.sustainLevel(this.params[note.id].sustain);
    note.parts.forEach((part) => {
      const held = part.transient ? 0 : sustain;
      const levelAt = (t) => t <= attackEnd
        ? Math.max(0, (t - note.start) / settings.attack)
        : t < decayEnd ? 1 + (held - 1) * (t - attackEnd) / settings.decay : held;
      const points = [{time:note.start,value:0}];
      if (attackEnd < note.noteEnd) points.push({time:attackEnd,value:part.peak});
      if (decayEnd < note.noteEnd) points.push({time:decayEnd,value:held * part.peak});
      points.push({time:note.noteEnd,value:part.peak * levelAt(note.noteEnd)});
      points.push({time:releaseEnd,value:0});
      const from = Math.max(note.start, now);
      const current = part.timeline ? this.timelineValue(part.timeline, from) : 0;
      let future = points.filter((point) => point.time > from);
      if (part.timeline && from > attackEnd && from + 0.025 < note.noteEnd) {
        future = [{time:from + 0.025,value:part.peak * levelAt(from + 0.025)},
          ...future.filter((point) => point.time > from + 0.025)];
      }
      if (!future.length) {
        releaseEnd = Math.max(releaseEnd, from + 0.012);
        future = [{time:releaseEnd,value:0}];
      }
      // Cancel the previous schedule before writing one continuous envelope.
      if (part.gain.gain.cancelAndHoldAtTime) part.gain.gain.cancelAndHoldAtTime(from);
      else part.gain.gain.cancelScheduledValues(from);
      part.gain.gain.setValueAtTime(current, from);
      future.forEach((point) => part.gain.gain.linearRampToValueAtTime(point.value, point.time));
      part.timeline = [{time:from,value:current}, ...future];
    });
    note.stop = releaseEnd + 0.02;
    note.oscillators.forEach((osc) => osc.stop(note.stop));
  }

  playNote(id, frequency, velocity, time, duration) {
    const context = this.context, bus = this.buses.get(id);
    if (!context || !bus) return;
    const wave = WAVE_TONE[this.waves[id]], tone = VOICE_TONE[id];
    const start = Math.max(time, context.currentTime + 0.001);
    const peak = velocity * tone.peak * wave.gain;
    const main = context.createOscillator();
    if (this.waves[id] === "pulse") main.setPeriodicWave(this.getPulseWave(context));
    else main.type = this.waves[id];
    const body = context.createOscillator(); body.type = id === 1 ? "triangle" : "sine";
    const sub = context.createOscillator(); sub.type = "sine";
    const punch = context.createOscillator(); punch.type = "sine";
    const oscillators = [main, body, sub, punch];
    // Clean sine reinforces the real fundamental instead of an inaudible sub-octave.
    [frequency, frequency * 2, frequency, frequency * 2]
      .forEach((hz, index) => oscillators[index].frequency.setValueAtTime(hz, start));
    const levels = [peak, peak * wave.body * (id === 1 ? 0.8 : 1.35),
      velocity * tone.sub, velocity * 0.035];
    const destinations = [bus.input, bus.input, bus.subInput, bus.punchControl];
    const parts = oscillators.map((osc, index) => {
      const gain = context.createGain(); osc.connect(gain); gain.connect(destinations[index]);
      return {gain, peak:levels[index], transient:index === 3, timeline:null};
    });
    const note = {id,start,noteEnd:start+duration,parts,oscillators,stop:0};
    this.activeNotes.add(note);
    oscillators.forEach((osc) => osc.start(start));
    this.automateNote(note, start);
    main.onended = () => {
      this.activeNotes.delete(note);
      oscillators.forEach((osc) => osc.disconnect());
      parts.forEach((part) => part.gain.disconnect());
    };
    return note;
  }

  getPulseWave(context) {
    if (this.pulseWave) return this.pulseWave;
    const real = new Float32Array(33);
    const imaginary = new Float32Array(33);
    const duty = 0.25;
    for (let harmonic = 1; harmonic < imaginary.length; harmonic += 1) {
      // Complete Fourier series for a DC-free pulse with 25% duty.
      const phase = Math.PI * 2 * harmonic * duty;
      real[harmonic] = Math.sin(phase) * 2 / (Math.PI * harmonic);
      imaginary[harmonic] = (1 - Math.cos(phase)) * 2 / (Math.PI * harmonic);
    }
    this.pulseWave = context.createPeriodicWave(real, imaginary);
    return this.pulseWave;
  }

  playDrum(id, time, velocity) {
    if (!this.context || !this.drumBus) return;
    if (id === 0) this.playKick(time, velocity);
    if (id === 1) this.playSnare(time, velocity);
    if (id === 2) this.playTom(time, velocity);
    if (id === 3) this.playNoiseDrum("hat", time, velocity, 0.075, 6400, 0.0, 0.16);
    if (id === 4) this.playNoiseDrum("crash", time, velocity, 0.62, 3600, 0.0, 0.22);
  }

  playKick(time, velocity) {
    const context = this.context;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const peak = 0.72 * velocity;
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(142, time);
    oscillator.frequency.exponentialRampToValueAtTime(46, time + 0.13);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(peak, time + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.24);
    oscillator.connect(gain);
    gain.connect(this.drumBus);
    oscillator.start(time);
    oscillator.stop(time + 0.25);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
  }

  playSnare(time, velocity) {
    const context = this.context;
    const body = context.createOscillator();
    const bodyGain = context.createGain();
    body.type = "triangle";
    body.frequency.setValueAtTime(190, time);
    body.frequency.exponentialRampToValueAtTime(112, time + 0.08);
    bodyGain.gain.setValueAtTime(0.0001, time);
    bodyGain.gain.linearRampToValueAtTime(0.28 * velocity, time + 0.001);
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.16);
    body.connect(bodyGain);
    bodyGain.connect(this.drumBus);
    body.start(time);
    body.stop(time + 0.17);

    this.playNoiseDrum("snare", time, velocity, 0.18, 1200, 0.0, 0.48);
    body.onended = () => {
      body.disconnect();
      bodyGain.disconnect();
    };
  }

  playTom(time, velocity) {
    const context = this.context;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(220, time);
    oscillator.frequency.exponentialRampToValueAtTime(108, time + 0.16);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(0.44 * velocity, time + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.31);
    oscillator.connect(gain);
    gain.connect(this.drumBus);
    oscillator.start(time);
    oscillator.stop(time + 0.32);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
  }

  playNoiseDrum(kind, time, velocity, duration, highpass, lowpass, level) {
    const context = this.context;
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    source.buffer = this.noiseBuffer(kind, duration);
    filter.type = lowpass > 0 ? "bandpass" : "highpass";
    filter.frequency.value = highpass;
    if (lowpass > 0) filter.Q.value = Math.max(0.2, lowpass / highpass);
    const peak = level * velocity;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(peak, time + 0.001);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.drumBus);
    source.start(time);
    source.stop(time + duration + 0.01);
    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
  }

  noiseBuffer(kind, duration) {
    const key = `${kind}:${duration}`;
    if (this.noiseBuffers.has(key)) return this.noiseBuffers.get(key);
    const context = this.context;
    const length = Math.ceil(context.sampleRate * duration);
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    let seed = kind.length * 7919 + length;
    for (let index = 0; index < data.length; index += 1) {
      // Deterministic noise makes the generated percussion stable between
      // runs while remaining a synthesis source rather than a sample asset.
      seed = (seed * 1664525 + 1013904223) >>> 0;
      data[index] = (seed / 4294967296) * 2 - 1;
    }
    this.noiseBuffers.set(key, buffer);
    return buffer;
  }

  drumVelocity(id, step) {
    if (id === 0) return step % 8 === 0 ? 1 : 0.84;
    if (id === 1) return 0.94;
    if (id === 2) return 0.78;
    if (id === 3) return step % 4 === 0 ? 0.74 : 0.5;
    return 0.88;
  }

  defaults(id = 1) {
    return {
      volume: 0.5,
      cutoff: id === 1 ? 0.6 : 0.63,
      attack: id === 1 ? 0.045 : 0.08,
      release: id === 1 ? 0.18 : 0.16,
      sustain: id === 1 ? 6 : 5,
      drive: 3,
      sub: id === 1 ? 3 : 1,
      punch: id === 1 ? 4 : 3,
      pattern: 1,
    };
  }

  outputGain(id, value) {
    return clamp01(value) * VOICE_TONE[id].output;
  }

  cutoffFrequency(id, value) {
    const tone = VOICE_TONE[id];
    return tone.cutoffMin * (tone.cutoffMax / tone.cutoffMin) ** clamp01(value);
  }

  subGain(id, value) {
    return normalized10(value) * VOICE_TONE[id].sub;
  }

  sustainLevel(value) {
    // The peak and release time stay fixed. Only the post-decay plateau moves.
    return 0.12 + Math.pow(normalized10(value), 0.85) * 0.88;
  }

  punchGain(value) {
    return 0.24 + normalized10(value) * 0.76;
  }

  driveAmount(value, id = 1) {
    return id === 1 ? 0.3 + normalized10(value) * 0.7 : 0.5 + normalized10(value) * 0.85;
  }

  driveMix(value, id = 1) {
    const amount = normalized10(value);
    return id === 1
      ? { dry: 0.98 - amount * 0.2, wet: 0.02 + amount * 0.28 }
      : { dry: 0.92 - amount * 0.22, wet: 0.08 + amount * 0.32 };
  }

  driveCurve(value) {
    const amount = 1.08 + normalized10(value) * 2.35;
    const normalization = Math.tanh(amount);
    const curve = new Float32Array(2049);
    for (let index = 0; index < curve.length; index += 1) {
      const x = (index * 2) / (curve.length - 1) - 1;
      curve[index] = Math.tanh(x * amount) / normalization;
    }
    return curve;
  }

  stepDuration() {
    return 60 / FIXED_TEMPO / 4;
  }

  duration(value) {
    if (value === "16n") return this.stepDuration();
    if (value === "8n") return this.stepDuration() * 2;
    return this.stepDuration() * 4;
  }

  frequency(note) {
    const match = note.match(/^([A-G])([#]?)(\d)$/);
    if (!match) return 110;
    const semitones = {
      C: 0,
      "C#": 1,
      D: 2,
      "D#": 3,
      E: 4,
      F: 5,
      "F#": 6,
      G: 7,
      "G#": 8,
      A: 9,
      "A#": 10,
      B: 11,
    };
    return 440 * 2 ** ((semitones[match[1] + match[2]] + (Number(match[3]) - 4) * 12 - 9) / 12);
  }
}
