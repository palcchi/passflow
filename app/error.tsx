"use client";
import { Sticker } from "@/components/brand-art";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main className="utility-shell"><section className="utility-card"><Sticker kind="spark"/><h1>Sebentar, coba lagi.</h1><p>Data belum dapat dimuat. Periksa koneksi, lalu coba kembali.</p><button className="button button-dark" onClick={reset}>Coba lagi ↗</button></section></main>;
}
