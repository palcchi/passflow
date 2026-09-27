import Link from "next/link";
import { Sticker } from "@/components/brand-art";
export default function NotFound() {
  return <main className="utility-shell"><section className="utility-card"><Sticker kind="spark"/><span className="section-kicker">404 · A LITTLE DETOUR</span><h1 className="mt-4">Belum ketemu.</h1><p>Halaman atau event ini belum tersedia. Coba kembali ke beranda untuk menemukan momen lainnya.</p><Link href="/" className="button button-dark">Kembali ke beranda ↗</Link></section></main>;
}
