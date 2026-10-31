import type { KeyboardEvent } from "react";
import referenceSvg, { scopeReferenceMarkup } from "../referenceSvg";
import { drumPatterns } from "../audio.js";

interface DrumModuleProps {
  active: boolean[];
  step: number;
  onToggle: (instrument: number) => void;
}

const referenceLines = referenceSvg.split(/\r?\n/);
const referenceDefs = referenceSvg.match(/<defs>[\s\S]*?<\/defs>/)?.[0] ?? "";

// These are the original vector nodes at the bottom of the reference SVG:
// the white five-circle “Drums” mark and its outlined letterforms. Keeping
// the source paths as SVG preserves the masks and the two referenced glyphs.
const drumArtwork = scopeReferenceMarkup(`${referenceDefs}${referenceLines.slice(15, 31).join("\n")}`, "drums");

const instruments = [
  { name: "Kick", cx: 667.085, cy: 871.085 },
  { name: "Snare", cx: 752.772, cy: 926.17 },
  { name: "Tom", cx: 840.5, cy: 871.085 },
  { name: "Closed hi-hat", cx: 926.188, cy: 926.17 },
  { name: "Crash", cx: 1013.92, cy: 871.085 },
] as const;

function handleKeyDown(event: KeyboardEvent<SVGGElement>, onToggle: () => void) {
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  onToggle();
}

export default function DrumModule({ active, step, onToggle }: DrumModuleProps) {
  return (
    <section className="drum-position" aria-label="Drums">
      <svg
        className="drum-module"
        viewBox="616 816 453 166"
        role="group"
        aria-label="Drum layers"
      >
        <g
          className="drum-reference-art"
          aria-hidden="true"
          dangerouslySetInnerHTML={{ __html: drumArtwork }}
        />
        {instruments.map((instrument, index) => (
          <g
            className={`drum-hit ${active[index] ? "is-active" : ""} ${active[index] && drumPatterns[index].includes(step) ? "is-hit" : ""}`}
            key={instrument.name}
            role="button"
            tabIndex={0}
            aria-label={`${active[index] ? "Disable" : "Enable"} ${instrument.name}`}
            aria-pressed={active[index]}
            onClick={() => onToggle(index)}
            onKeyDown={(event) => handleKeyDown(event, () => onToggle(index))}
          >
            <circle cx={instrument.cx} cy={instrument.cy} r="42" />
          </g>
        ))}
      </svg>
    </section>
  );
}
