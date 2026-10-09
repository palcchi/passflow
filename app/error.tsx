"use client";
import { Sticker } from "@/components/brand-art";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main className="ui-app ui-utility">
    <section className="ui-utility-card">
      <Sticker kind="spark" />
      <h1 className="ui-h1">Something went wrong</h1>
      <p className="ui-lead">We could not load this page. Check your connection and try again.</p>
      <div className="ui-row"><button className="ui-btn ui-btn-primary" onClick={reset}>Try again</button></div>
    </section>
  </main>;
}
