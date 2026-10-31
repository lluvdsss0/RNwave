import referenceSvg from "../referenceSvg";

const sourceLines = referenceSvg.split(/\r?\n/);
const toCurrentColor = (markup: string) => markup.replace(/fill="#[A-Fa-f0-9]+"/g, 'fill="currentColor"');
const glyphs = {
  // Keep the source contours, but compensate for their original side
  // bearings so the visible path (not its whitespace) is centred in the
  // switch rectangle.
  one: { viewBox: "760 528 20 40", offset: "0.205 0.584", markup: toCurrentColor(sourceLines[35]) },
  two: { viewBox: "892 532 28 36", offset: "0.642 2.606", markup: toCurrentColor(sourceLines[36]) },
} as const;

export default function ReferenceSwitchGlyph({ type }: { type: keyof typeof glyphs }) {
  const glyph = glyphs[type];
  return (
    <svg
      className={`reference-switch-glyph reference-switch-glyph--${type}`}
      viewBox={glyph.viewBox}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      <g transform={`translate(${glyph.offset})`} dangerouslySetInnerHTML={{ __html: glyph.markup }} />
    </svg>
  );
}
