import type { WaveType } from "../audio.js";

// Rectangles and top-left rotation pivots from ref/Desktop - 10.svg,
// expressed relative to the panel's (44,39) origin. Both panels share them.
const tiles: { type: WaveType; x: number; y: number; width: number; angle: number }[] = [
  { type: "pulse", x: 142.604, y: 748.328, width: 240, angle: 3.11348 },
  { type: "sawtooth", x: 111.038, y: 797.397, width: 300, angle: -1.73665 },
  { type: "square", x: 152.813, y: 823.831, width: 219, angle: 3.6736 },
  { type: "triangle", x: 125.859, y: 875.22, width: 271, angle: -2.67686 },
];

export default function WaveSelector({ wave, onWave }: { wave: WaveType; onWave: (wave: WaveType) => void }) {
  return (
    <div className="wave-selector">
      <svg className="wave-selector__buttons" viewBox="0 0 523 945" preserveAspectRatio="none" aria-label="Wave type">
        {tiles.map(({ type, x, y, width, angle }) => (
          <foreignObject key={type} x={x} y={y} width={width} height={35}
            transform={`rotate(${angle} ${x} ${y})`} overflow="visible">
            <button type="button" className={`wave-button wave-button--${type} ${wave === type ? "is-active" : ""}`}
              aria-pressed={wave === type} onClick={() => onWave(type)}>{type}</button>
          </foreignObject>
        ))}
      </svg>
    </div>
  );
}
