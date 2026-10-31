import referenceSvg from "../ref/Desktop - 10.svg?raw";

export function scopeReferenceMarkup(markup: string, prefix: string) {
  return markup
    .replace(/id="((?:stroke|filter)[^"]+)"/g, `id="${prefix}-$1"`)
    .replace(/#((?:stroke|filter)[A-Za-z0-9_.-]+)/g, `#${prefix}-$1`);
}

export default referenceSvg;
