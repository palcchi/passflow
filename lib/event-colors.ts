/** Pick readable text on the event's brand/surface colors. */
export function eventInk(hex: string): string {
  let value = hex.replace("#", "");
  if (value.length === 3 || value.length === 4) value = value.slice(0, 3).split("").map(c => c + c).join("");
  else value = value.slice(0, 6);
  if (!/^[0-9a-f]{6}$/i.test(value)) return "#ffffff";
  const rgb = [0, 2, 4].map(i => parseInt(value.slice(i, i + 2), 16) / 255).map(c => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4);
  const luminance = rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
  return luminance > 0.55 ? "#171717" : "#ffffff";
}
