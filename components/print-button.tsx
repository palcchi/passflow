"use client";

export function PrintButton() {
  return <button className="button button-dark print:hidden" type="button" onClick={() => window.print()}>Print / Save PDF</button>;
}
