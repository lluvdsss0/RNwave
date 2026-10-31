import referenceSvg, { scopeReferenceMarkup } from "../referenceSvg";

const sourceLines = referenceSvg.split(/\r?\n/);
const designs: Record<string, { numberLine: number; viewBox: string }> = {
  drive: { numberLine: 70, viewBox: "144.4275 395.3155 153.329 153.329" },
  sub: { numberLine: 82, viewBox: "313.6615 395.3155 153.329 153.329" },
  punch: { numberLine: 94, viewBox: "59.0775 565.0765 153.329 153.329" },
  pattern: { numberLine: 106, viewBox: "228.3105 565.0775 153.329 153.329" },
  sustain: { numberLine: 118, viewBox: "397.5455 565.0775 153.329 153.329" },
};

export default function ReferenceKnobArtwork({ label }: { label: string }) {
  const design = designs[label] ?? designs.drive;
  return (
    <svg
      className="knob__reference-art"
      viewBox={design.viewBox}
      preserveAspectRatio="none"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: scopeReferenceMarkup(sourceLines[design.numberLine], `knob-scale-${label}`) }}
    />
  );
}
