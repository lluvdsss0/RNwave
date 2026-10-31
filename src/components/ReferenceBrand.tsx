import referenceSvg, { scopeReferenceMarkup } from "../referenceSvg";

const sourceLines = referenceSvg.split(/\r?\n/);
const referenceDefs = referenceSvg.match(/<defs>[\s\S]*?<\/defs>/)?.[0] ?? "";
const brandArtwork = scopeReferenceMarkup(`${referenceDefs}${sourceLines.slice(2, 9).join("\n")}`, "brand");

export default function ReferenceBrand() {
  // Keep the reference coordinate system intact. The original wave path
  // extends past x=1011, so a cropped logo viewBox cuts off its final glyph.
  return (
    <svg
      className="brand"
      viewBox="0 0 1680 1024"
      preserveAspectRatio="none"
      role="img"
      aria-label="RNwave"
      dangerouslySetInnerHTML={{ __html: brandArtwork }}
    />
  );
}
