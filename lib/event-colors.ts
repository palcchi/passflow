/** Relative luminance (WCAG) of a #rgb / #rrggbb colour; null when the value is not a hex colour. */
export function luminance(hex: string): number | null {
  let value = hex.replace("#", "");
  if (value.length === 3 || value.length === 4) value = value.slice(0, 3).split("").map(c => c + c).join("");
  else value = value.slice(0, 6);
  if (!/^[0-9a-f]{6}$/i.test(value)) return null;
  const rgb = [0, 2, 4].map(i => parseInt(value.slice(i, i + 2), 16) / 255).map(c => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4);
  return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
}

/** WCAG contrast ratio between two hex colours (1–21); 1 when either is invalid. */
export function contrastRatio(a: string, b: string): number {
  const x = luminance(a), y = luminance(b);
  return x === null || y === null ? 1 : (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
}

/** Pick readable text on the event's brand/surface colors. */
export function eventInk(hex: string): string {
  return (luminance(hex) ?? 0) > 0.55 ? "#171717" : "#ffffff";
}
