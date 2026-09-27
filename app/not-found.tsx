import Link from "next/link";
import { Sticker } from "@/components/brand-art";
export default function NotFound() {
  return <main className="utility-shell"><section className="utility-card"><Sticker kind="spark"/><span className="section-kicker">404 · A LITTLE DETOUR</span><h1 className="mt-4">Page not found.</h1><p>This page or event is unavailable. Return home to continue exploring PassFlow.</p><Link href="/" className="button button-dark">Back to home ↗</Link></section></main>;
}
