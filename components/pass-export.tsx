"use client";
import { useState, type ReactNode } from "react";

const DPI = 300;

async function toDataUrl(url: string) {
  if (url.startsWith("data:")) return url;
  const blob = await (await fetch(url, { mode: "cors" })).blob();
  return await new Promise<string>((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(String(r.result)); r.onerror = reject; r.readAsDataURL(blob); });
}

// SVG-as-image cannot load remote files, so artwork and photos are inlined before rasterizing at print resolution.
async function exportCard(card: HTMLElement, format: "png" | "jpeg") {
  const svg = card.querySelector("svg");
  if (!svg) throw Error("missing_svg");
  const widthMm = Number(card.dataset.widthMm), heightMm = Number(card.dataset.heightMm);
  const clone = svg.cloneNode(true) as SVGSVGElement;
  await Promise.all([...clone.querySelectorAll("image")].map(async (img) => {
    const href = img.getAttribute("href");
    if (href) img.setAttribute("href", await toDataUrl(href));
  }));
  const width = Math.round(widthMm / 25.4 * DPI), height = Math.round(heightMm / 25.4 * DPI);
  clone.setAttribute("width", String(width)); clone.setAttribute("height", String(height));
  const source = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: "image/svg+xml" }));
  try {
    const image = new Image();
    await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject; image.src = source; });
    const canvas = document.createElement("canvas");
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext("2d")!;
    if (format === "jpeg") { ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, width, height); }
    ctx.drawImage(image, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, `image/${format}`, 0.95));
    if (!blob) throw Error("encode_failed");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${card.dataset.fileName || "pass"}.${format === "jpeg" ? "jpg" : "png"}`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  } finally { URL.revokeObjectURL(source); }
}

export function ExportCard({ fileName, widthMm, heightMm, children }: { fileName: string; widthMm: number; heightMm: number; children: ReactNode }) {
  const [state, setState] = useState("");
  async function run(target: HTMLElement, format: "png" | "jpeg") {
    setState("Saving…");
    try { await exportCard(target, format); setState(""); } catch { setState("Could not save. Try Print instead."); }
  }
  return <figure className="pass-export-card" data-pass-export data-file-name={fileName} data-width-mm={widthMm} data-height-mm={heightMm} style={{ width: `${widthMm}mm` }}>
    <div className="pass-export-art" style={{ aspectRatio: `${widthMm}/${heightMm}` }}>{children}</div>
    <figcaption className="print:hidden">
      <span>{state || fileName}</span>
      <button type="button" onClick={(e) => run(e.currentTarget.closest("figure")!, "png")}>PNG</button>
      <button type="button" onClick={(e) => run(e.currentTarget.closest("figure")!, "jpeg")}>JPG</button>
    </figcaption>
  </figure>;
}

export function DownloadAll() {
  const [state, setState] = useState<string | null>(null);
  const [format, setFormat] = useState<"png" | "jpeg">("png");
  async function run() {
    const cards = [...document.querySelectorAll<HTMLElement>("[data-pass-export]")];
    let failed = 0;
    for (const [i, card] of cards.entries()) {
      setState(`Saving ${i + 1} of ${cards.length}…`);
      try { await exportCard(card, format); } catch { failed++; }
      await new Promise((r) => setTimeout(r, 150)); // browsers drop back-to-back downloads
    }
    setState(failed ? `${failed} could not be saved.` : null);
  }
  return <div className="pass-export-all">
    <select aria-label="File format" value={format} onChange={(e) => setFormat(e.target.value as "png" | "jpeg")}><option value="png">PNG</option><option value="jpeg">JPG</option></select>
    <button type="button" className="button button-ghost" disabled={state?.startsWith("Saving")} onClick={run}>{state ?? "Download all"}</button>
  </div>;
}
