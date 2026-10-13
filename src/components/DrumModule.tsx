interface DrumModuleProps {
  value: number;
  onChange: (value: number) => void;
  onHit: (instrument: number) => void;
}

const instruments = [
  { letter: "d", name: "kick", className: "drum-node--kick" },
  { letter: "r", name: "snare", className: "drum-node--snare" },
  { letter: "u", name: "closed hi-hat", className: "drum-node--tom" },
  { letter: "m", name: "tom", className: "drum-node--cymbal" },
  { letter: "s", name: "crash", className: "drum-node--rim" },
];

export default function DrumModule({ value, onChange, onHit }: DrumModuleProps) {
  return (
    <section className="drum-section" aria-label="Drum module">
      <label className="analog-slider analog-slider--right drum-section__slider">
        <span className="analog-slider__label">drums volume</span>
        <input
          aria-label="drums volume"
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={value}
          onChange={(event) => onChange(Number(event.currentTarget.value))}
        />
      </label>
      <div className="drum-module">
        <svg className="drum-module__wires" viewBox="0 0 540 190" aria-hidden="true">
          <path d="M70 63 L170 115 L270 63 L370 115 L470 63" />
          <path d="M70 63 L270 63 L470 63" />
        </svg>
        {instruments.map((instrument, index) => (
          <button
            key={instrument.name}
            type="button"
            className={`drum-node ${instrument.className}`}
            aria-label={`Play ${instrument.name}`}
            onClick={() => onHit(index)}
          >
            <span className="drum-node__letter">{instrument.letter}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
