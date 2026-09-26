import QRCode from "qrcode";

export type QrModuleStyle = "square" | "rounded" | "dots";

export function qrSvgMarkup(payload: string, x: number, y: number, width: number, height: number, foreground: string, background: string, style: QrModuleStyle) {
  const matrix = QRCode.create(payload, { errorCorrectionLevel: "M" }).modules;
  const quiet = 4;
  const codeSize = Math.min(width, height);
  const moduleSize = codeSize / (matrix.size + quiet * 2);
  const left = (width - codeSize) / 2, top = (height - codeSize) / 2;
  const radius = style === "dots" ? moduleSize / 2 : style === "rounded" ? moduleSize * .28 : 0;
  let marks = "";
  for (let row = 0; row < matrix.size; row++) {
    for (let col = 0; col < matrix.size;) {
      if (!matrix.data[row * matrix.size + col]) { col++; continue; }
      const start = col;
      while (col < matrix.size && matrix.data[row * matrix.size + col]) col++;
      const px = left + (start + quiet) * moduleSize, py = top + (row + quiet) * moduleSize;
      if (style === "square") {
        const runWidth = (col - start) * moduleSize;
        marks += `<path d="M${px} ${py}h${runWidth}v${moduleSize}h-${runWidth}z" fill="${foreground}"/>`;
      } else {
        for (let cell = start; cell < col; cell++) {
          const cx = left + (cell + quiet) * moduleSize;
          const finder = (cell < 7 && row < 7) || (cell >= matrix.size - 7 && row < 7) || (cell < 7 && row >= matrix.size - 7);
          marks += `<rect x="${cx}" y="${py}" width="${moduleSize * 1.04}" height="${moduleSize * 1.04}" rx="${finder ? 0 : radius}" fill="${foreground}"/>`;
        }
      }
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" x="${x}" y="${y}" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" fill="${background}"/><g shape-rendering="crispEdges">${marks}</g></svg>`;
}

export function qrSvgDataUri(payload: string, width: number, height: number, foreground: string, background: string, style: QrModuleStyle) {
  return `data:image/svg+xml;base64,${Buffer.from(qrSvgMarkup(payload, 0, 0, width, height, foreground, background, style)).toString("base64")}`;
}
