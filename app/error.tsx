"use client";
import { Sticker } from "@/components/brand-art";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main className="utility-shell"><section className="utility-card"><Sticker kind="spark"/><h1>Something went wrong.</h1><p>We could not load this page. Check your connection and try again.</p><button className="button button-dark" onClick={reset}>Try again ↗</button></section></main>;
}
