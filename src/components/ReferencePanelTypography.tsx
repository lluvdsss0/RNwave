import referenceSvg, { scopeReferenceMarkup } from "../referenceSvg";

const sourceLines = referenceSvg.split(/\r?\n/);
const headingTextLines = [127];

function makeMarkup(side: 1 | 2) {
  const translate = side === 2 ? '<g transform="translate(1072 0)">' : "<g>";
  const headingText = headingTextLines.map((line) => sourceLines[line]).join("\n");
  return scopeReferenceMarkup(
    `${translate}${headingText}</g>`,
    `panel-${side}`,
  );
}

export default function ReferencePanelTypography({ side }: { side: 1 | 2 }) {
  return (
    <svg
      className="panel-reference-typography"
      viewBox={side === 1 ? "44 39 523 945" : "1116 39 523 945"}
      preserveAspectRatio="none"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: makeMarkup(side) }}
    />
  );
}
