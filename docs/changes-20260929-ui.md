# PassFlow: perubahan UI 29 September 2026

Status: source lokal, belum deploy. Typecheck, lint, 10 suite tes dan `next build` lolos.

## Bug yang diperbaiki
- Indikator tab aktif di navigasi event (`event-nav-active-pill`) tidak punya CSS sehingga animasinya tidak terlihat. Sekarang menjadi garis bawah beranimasi dengan warna aksen event.
- Ctrl/Cmd/Shift-klik pada tab navigasi membuat indikator aktif salah (menunjuk tab yang dibuka di tab browser lain). Sekarang hanya klik kiri biasa yang mengubah state.
- Di ponsel, tab aktif bisa tersembunyi di luar area scroll dock. Dock sekarang otomatis menggeser tab aktif ke dalam layar.
- Halaman Website content dan Preview memakai `<main>` di dalam `<main>` layout (HTML tidak valid). Diganti `<div>`.
- Halaman Legacy: teks campuran bahasa Indonesia di UI English-first (“Latar QR”, “Bentuk modul”, “Kotak”, dll.) dan redirect OAuth kembali ke `/design`, bukan `/design/legacy`. Allowlist redirect OAuth diperluas hanya untuk `/design/legacy`.
- Tombol di Quick Setup dipisah dengan spasi literal. Diganti baris aksi yang responsif.

## Navigasi
- Tab “Appearance” diganti “Customize” agar sama dengan istilah halaman. Tombol Customize/Design yang dobel di hero event dihapus (sudah ada di dock); “Public page” tetap.
- Sub-navigasi Design baru (Figma website · Website content · Pass layouts · Legacy sync) di semua halaman Design, menggantikan tautan polos di bagian bawah.
- Focus ring terlihat untuk navigasi keyboard, target sentuh ≥36–40 px, tanpa tap highlight abu-abu di iOS.

## Customize & Design
- Kartu **Setup progress** di Customize: brand basics → pair Figma → sync draft → publish website → publish event, dengan tautan langsung ke langkah berikutnya.
- Kode pairing: tombol Copy, hitung mundur 10 menit, dan tombol “Generate new code”.
- Status koneksi dan versi berwarna (Synced / perlu perhatian / nonaktif), ringkasan versi live dan jumlah draft.
- Pesan sukses spesifik (revoke, publish, restore, unpublish), bisa ditutup, dan halaman refresh setelah aksi.
- Waktu ditampilkan dalam zona waktu perangkat (UTC saat render server).
- Website content: label per kolom dengan format dan jumlah baris, font 16 px di ponsel agar Safari tidak zoom.

## Perlu dicek manual
Halaman admin butuh login Supabase, jadi belum dilihat langsung. Cek di `npm run dev`: dock event (desktop + iPhone), Customize, Design beserta sub-navigasinya, pairing code, dan Legacy.
