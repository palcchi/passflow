"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main className="center-page"><section className="claim-card"><h1>Data belum dapat dimuat.</h1><p className="my-4">Periksa koneksi lalu coba lagi. Perubahan yang tersimpan tidak dihapus.</p><button className="button button-dark" onClick={reset}>Coba lagi</button></section></main>;
}
