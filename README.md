# PassFlow

> **Satu QR, dua media, satu identitas pengunjung.**

PassFlow adalah platform **multi-event berbasis web** untuk mengelola event, attendee, Claim-Based QR Wristband, Digital Event Pass, access control, activity tracking, merchandise claim, dan monitoring melalui QR Scanner Station.

Project ini dibuat untuk mata kuliah **Manajemen Proyek Teknologi Informasi, Kelompok 7**.

---

## 1. Gambaran Project

PassFlow bukan website untuk satu event saja. Satu deployment dapat memiliki banyak event, dan setiap event mempunyai:

- halaman publik sendiri;
- slug sendiri;
- warna dan visual branding sendiri;
- ticket/pass type sendiri;
- attendee sendiri;
- QR credential sendiri;
- access zone sendiri;
- Scanner Station sendiri;
- scan log dan activity log sendiri.

Contoh:

```text
passflow.vercel.app/e/discoveries-2026
passflow.vercel.app/e/night-shift-sessions
passflow.vercel.app/e/festival-of-ideas
```

Semua halaman tersebut menggunakan source code yang sama. Data dan tema event dibaca secara dinamis dari database.

---

## 2. Konsep Utama

### Claim-Based QR Pass

Panitia tidak perlu mencetak wristband berdasarkan nama peserta satu per satu.

Alurnya:

```text
REGISTER
  ↓
ATTENDEE CREATED
  ↓
RECEIVE ANY AVAILABLE WRISTBAND
  ↓
SCAN WRISTBAND QR FROM PHONE
  ↓
CLAIM QR
  ↓
QR BOUND TO ATTENDEE
  ↓
SAME QR APPEARS ON DIGITAL EVENT PASS
  ↓
WRISTBAND OR PHONE
  ↓
ACCESS SCANNER
  ↓
VALIDATE
  ↓
GRANTED / DENIED / INVALID
  ↓
WRITE LOG
```

QR wristband awalnya memiliki status:

```text
UNCLAIMED
ACTIVE
REVOKED
REPLACED
```

Setelah pengunjung melakukan claim, QR yang sama dapat digunakan dari:

1. **Physical QR Wristband**
2. **Digital Event Pass pada HP**

Keduanya merupakan **satu credential yang sama dalam dua media**, bukan dua identitas berbeda.

---

## 3. Tech Stack

### Application

- **Next.js 16**
- **React 19**
- **TypeScript**
- **App Router**
- **Server Components + Client Components sesuai kebutuhan**
- **Native dynamic routes**
- **Vercel deployment**

### UI

- Tailwind CSS
- shadcn/ui
- **Magic UI** dari [magicui.design](https://magicui.design)
- lucide-react

### QR

- `html5-qrcode` untuk camera-based QR scanning
- `qrcode` untuk QR generation

### Backend

- **Supabase PostgreSQL**
- **Supabase Auth**
- **Supabase Storage**
- Row Level Security

### Repository & Deployment

- GitHub: `palcchi/passflow`
- Production: Vercel
- Secret disimpan sebagai Vercel Environment Variables
- Database dan data user **tidak pernah disimpan di GitHub**

---

## 4. Current Progress

### Sudah dibuat

- [x] Repository PassFlow
- [x] Next.js App Router foundation
- [x] TypeScript
- [x] Landing page
- [x] Admin dashboard prototype
- [x] Multi-event dynamic public route
- [x] Event theme system menggunakan CSS variables
- [x] Event Appearance Editor prototype
- [x] Digital Event Pass prototype
- [x] Claim Wristband prototype
- [x] Browser camera QR Scanner prototype
- [x] Scanner auto-reset setelah result
- [x] Supabase browser/server client scaffold
- [x] Initial PostgreSQL migration
- [x] Database structure sudah multi-event
- [x] Environment variable template
- [x] Git ignore untuk secrets

### Masih mock / belum production-ready

- [ ] Supabase project belum diprovision
- [ ] Database migration belum dijalankan ke production Supabase
- [ ] Authentication belum aktif
- [ ] Dashboard masih menggunakan demo data
- [ ] Event page masih menggunakan demo data
- [ ] Claim belum menulis ke database
- [ ] Scanner belum melakukan server validation
- [ ] Event theme belum tersimpan ke database
- [ ] Image upload belum tersimpan ke Storage
- [ ] Access rules belum benar-benar dieksekusi
- [ ] Activity dan claim log belum tersambung
- [ ] Deployment production belum final

---

## 5. Current Routes

### Public

```text
/
```

Landing page PassFlow.

```text
/e/[slug]
```

Halaman publik event.

Contoh:

```text
/e/discoveries-2026
```

```text
/e/[slug]/claim
```

Digital Event Pass dan Claim Wristband.

---

### Admin

```text
/admin
```

Dashboard utama organizer.

```text
/admin/events/[eventId]/appearance
```

Custom event theme.

Target berikutnya:

```text
/admin/events
/admin/events/new
/admin/events/[eventId]
/admin/events/[eventId]/attendees
/admin/events/[eventId]/passes
/admin/events/[eventId]/zones
/admin/events/[eventId]/stations
/admin/events/[eventId]/activities
/admin/events/[eventId]/logs
/admin/events/[eventId]/settings
```

---

### Scanner

```text
/scan/[stationId]
```

Contoh:

```text
/scan/main-entrance
/scan/vip-lounge
/scan/workshop-a
/scan/merch-claim
```

Scanner harus dapat berjalan fullscreen/kiosk dan terus kembali ke kamera setelah hasil scan selesai ditampilkan.

---

## 6. Database Model

Initial schema:

```text
organizations
organization_members
events
ticket_types
attendees
qr_credentials
access_zones
access_rules
scanner_stations
scan_logs
activities
activity_logs
benefit_claims
event_assets
```

Relasi utama:

```text
Organization
    │
    └── Event
         │
         ├── Ticket Types
         ├── Attendees
         │     │
         │     └── QR Credentials
         │
         ├── Access Zones
         │     └── Access Rules
         │
         ├── Scanner Stations
         │
         ├── Scan Logs
         ├── Activities
         │     └── Activity Logs
         │
         ├── Benefit Claims
         └── Event Assets
```

**Rule penting:** hampir seluruh data operasional harus memiliki `event_id`.

Ini mencegah data attendee, scanner, zone, dan log dari event berbeda tercampur.

---

## 7. QR Credential Rules

Tabel `qr_credentials` menjadi inti sistem wristband.

Contoh:

```text
WR-0192

event_id: EVT-001
attendee_id: null
status: UNCLAIMED
```

Setelah claim:

```text
WR-0192

event_id: EVT-001
attendee_id: ATT-0248
status: ACTIVE
claimed_at: ...
```

Jika hilang:

```text
WR-0192 → REVOKED
WR-0421 → ACTIVE
```

### Rules

- Satu QR hanya dapat di-claim satu kali.
- QR ACTIVE harus memiliki attendee.
- Satu attendee hanya boleh memiliki satu QR ACTIVE.
- QR REVOKED tidak boleh valid di Scanner Station.
- QR lama tetap disimpan sebagai history.
- Digital Event Pass menampilkan QR ACTIVE yang sama dengan wristband.

---

## 8. Access Validation

Scanner tidak boleh sekadar membaca QR dan langsung menampilkan hijau.

Flow production:

```text
QR DETECTED
   ↓
LOCK SCANNER
   ↓
SEND TOKEN TO SERVER
   ↓
LOOKUP QR CREDENTIAL
   ↓
CHECK STATUS
   ↓
LOOKUP ATTENDEE
   ↓
LOOKUP SCANNER STATION
   ↓
CHECK TICKET TYPE
   ↓
CHECK ACCESS RULE / ACTIVITY / CLAIM
   ↓
WRITE SCAN LOG
   ↓
RETURN RESULT
   ↓
SHOW RESULT ~3 SECONDS
   ↓
RESET CAMERA
```

Possible result:

```text
ACCESS GRANTED
ACCESS DENIED
INVALID PASS
ALREADY CHECKED IN
ALREADY CLAIMED
PASS REVOKED
```

Scanner harus melakukan debounce/lock agar QR yang sama tidak diproses berkali-kali selama result screen muncul.

---

## 9. Event Customization

Setiap event harus dapat mempunyai tampilan berbeda tanpa membuat source page baru.

Minimum field:

```text
name
slug
description
venue
starts_at
ends_at

primary_color
secondary_color
background_color
foreground_color
surface_color

logo_url
hero_image_url
poster_url
```

Tema diterapkan melalui CSS variables:

```css
--event-primary
--event-secondary
--event-background
--event-foreground
--event-surface
```

### Appearance Editor target

Organizer dapat:

- upload logo;
- upload hero image;
- upload poster;
- memilih primary color;
- memilih secondary color;
- memilih background;
- memilih text color;
- melihat live preview;
- save;
- melihat halaman event langsung.

File tidak disimpan ke GitHub. Upload disimpan ke **Supabase Storage**, database hanya menyimpan path/URL.

---

## 10. Magic UI Design Direction

PassFlow akan memakai komponen dan motion dari **Magic UI** supaya terasa interaktif, modern, dan tidak seperti dashboard tugas kuliah default.

Magic UI mengikuti workflow instalasi bergaya shadcn, jadi komponennya masuk ke project dan tetap bisa kita edit sendiri.

### Komponen yang direncanakan

#### Landing Page

- **Interactive Grid Pattern**
  - background hero yang bereaksi dengan pointer;
- **Blur Fade**
  - entrance animation untuk headline dan section;
- **Hyper Text**
  - micro-interaction untuk label tertentu;
- **Shimmer Button / Interactive Hover Button**
  - CTA utama;
- **Border Beam**
  - highlight Digital Pass card;
- **Animated Beam**
  - visualisasi flow Wristband → Scanner → Database → Dashboard;
- **Number Ticker**
  - angka event, attendee, scan, dan activity;
- **Magic Card**
  - feature cards;
- **Marquee**
  - event / feature showcase bila diperlukan.

#### Admin Dashboard

Gunakan motion lebih ringan:

- Number Ticker untuk statistik;
- Magic Card untuk overview cards;
- Blur Fade untuk page transition/section reveal;
- Border Beam hanya untuk status penting;
- Animated List untuk recent scan log bila cocok.

#### Public Event Page

Theme Magic UI harus mengikuti warna event:

```text
Magic UI effect
      ↓
CSS variable event
      ↓
custom event identity
```

Jangan hardcode seluruh Magic UI ke warna ungu PassFlow.

#### Scanner

Scanner adalah critical operational UI.

**Jangan membuat scanner terlalu dekoratif.**

Boleh memakai animation untuk:

- scan line;
- result transition;
- success/error feedback;
- progress menuju reset.

Hindari:

- heavy background particles;
- animation yang mengganggu kamera;
- animation lambat;
- efek yang memperburuk readability.

Scanner harus memprioritaskan:

```text
FAST
CLEAR
HIGH CONTRAST
LARGE TYPE
LOW LATENCY
```

---

## 11. Magic UI Setup

Magic UI menggunakan pola instalasi yang sama seperti shadcn/ui.

Target setup saat UI phase:

```bash
npx shadcn@latest init
```

Lalu tambahkan komponen yang diperlukan, misalnya:

```bash
npx shadcn@latest add @magicui/interactive-grid-pattern
npx shadcn@latest add @magicui/blur-fade
npx shadcn@latest add @magicui/magic-card
npx shadcn@latest add @magicui/number-ticker
npx shadcn@latest add @magicui/border-beam
npx shadcn@latest add @magicui/animated-beam
npx shadcn@latest add @magicui/shimmer-button
npx shadcn@latest add @magicui/hyper-text
```

Komponen harus disesuaikan dengan design system PassFlow, bukan ditempel mentah satu per satu.

---

## 12. Design Principles

UI PassFlow harus:

- terasa native web app;
- mobile responsive;
- cepat;
- tidak bergantung pada hover;
- tetap bagus di iPhone/iPad;
- usable dengan touch;
- menggunakan spacing yang konsisten;
- memakai typography yang kuat;
- memiliki dark/light contrast yang jelas;
- motion singkat dan memiliki fungsi;
- menghindari gradient berlebihan;
- menghindari glassmorphism berlebihan;
- tidak memakai efek hanya karena efek tersebut tersedia.

Magic UI dipakai sebagai **micro-interaction dan visual enhancement**, bukan sebagai alasan membuat semua benda bergerak.

---

# ROADMAP SAMPAI FINAL

## Phase 0, Foundation

Status: **IN PROGRESS**

- [x] Buat repository
- [x] Setup Next.js + TypeScript
- [x] Buat struktur App Router
- [x] Buat landing prototype
- [x] Buat dashboard prototype
- [x] Buat event dynamic route
- [x] Buat scanner prototype
- [x] Buat claim prototype
- [x] Buat database schema awal
- [x] Konfigurasi Tailwind CSS v4 + shadcn (Button, cn, registry)
- [x] Integrasikan Magic UI foundation (Blur Fade + Number Ticker)
- [x] Buat design tokens PassFlow

**Definition of Done:** app build tanpa error, semua prototype route dapat dibuka, responsive basic selesai.

---

## Phase 1, Supabase Infrastructure

- [ ] Buat Supabase project
- [ ] Simpan URL dan keys di Vercel / local env
- [ ] Jalankan `0001_initial_schema.sql`
- [ ] Buat Storage bucket untuk event assets
- [ ] Setup RLS
- [ ] Setup policy organizer
- [ ] Setup policy staff
- [ ] Setup policy visitor
- [ ] Buat seed development data

**Definition of Done:** data event dapat dibuat dan dibaca dari Supabase tanpa mock data.

---

## Phase 2, Authentication & Roles

Roles:

```text
ORGANIZER / ADMIN
STAFF
VISITOR
```

Tasks:

- [ ] Sign in
- [ ] Sign out
- [ ] Organizer protected routes
- [ ] Staff permissions
- [ ] Visitor account/pass
- [ ] Session persistence
- [ ] Unauthorized state
- [ ] Route protection

**Definition of Done:** user hanya dapat mengakses fungsi sesuai role.

---

## Phase 3, Event Management

- [ ] Event list
- [ ] Create event
- [ ] Edit event
- [ ] Draft/publish/archive state
- [ ] Event slug
- [ ] Date & location
- [ ] Capacity
- [ ] Ticket type management
- [ ] Delete/archive confirmation
- [ ] Dashboard event metrics

**Definition of Done:** organizer dapat membuat event baru tanpa mengubah source code.

---

## Phase 4, Event Appearance & Assets

- [ ] Event color customization
- [ ] Logo upload
- [ ] Hero image upload
- [ ] Poster upload
- [ ] Supabase Storage integration
- [ ] Image validation
- [ ] Image compression/resizing bila diperlukan
- [ ] Live preview
- [ ] Save theme
- [ ] Public page membaca theme dari DB
- [ ] Mobile preview

**Definition of Done:** dua event dapat memiliki visual yang berbeda dari admin panel.

---

## Phase 5, Attendees & Ticket Types

- [ ] Attendee list
- [ ] Search attendee
- [ ] Create/import attendee
- [ ] Ticket types
- [ ] General / VIP / Crew examples
- [ ] Registration status
- [ ] Checked-in state
- [ ] Attendee detail
- [ ] Attendance metrics

**Definition of Done:** satu event memiliki attendee dan kategori pass nyata di database.

---

## Phase 6, QR Wristband Generation

- [ ] Generate batch QR credential
- [ ] Prefix / unique token strategy
- [ ] UNCLAIMED state
- [ ] QR printable layout
- [ ] Batch print/download
- [ ] QR status dashboard
- [ ] Active / revoked / replaced filters
- [ ] Manual revoke
- [ ] Replacement flow

**Important:** production token sebaiknya tidak hanya menggunakan urutan mudah ditebak seperti `WR-0001`. ID yang ditampilkan boleh sederhana, tetapi QR credential harus menggunakan token yang sulit ditebak.

**Definition of Done:** organizer dapat menghasilkan batch wristband yang belum mempunyai pemilik.

---

## Phase 7, Visitor Claim Flow

- [ ] Visitor membuka Event Pass
- [ ] Status awal Not Claimed
- [ ] Open camera
- [ ] Scan wristband
- [ ] Validate UNCLAIMED
- [ ] Confirm claim
- [ ] Atomic database claim
- [ ] Prevent double claim
- [ ] Bind credential to attendee
- [ ] Digital Pass menampilkan QR yang sama
- [ ] Lost wristband flow
- [ ] Replacement flow

**Definition of Done:** dua akun tidak dapat claim QR yang sama, dan QR aktif langsung muncul di Digital Event Pass.

---

## Phase 8, Access Zones & Scanner Stations

- [ ] Create zone
- [ ] Create access rule
- [ ] Create Scanner Station
- [ ] Assign station mode
- [ ] Assign station to zone
- [ ] Station active/inactive
- [ ] Camera permission state
- [ ] Loading state
- [ ] QR decode
- [ ] Server validation
- [ ] Granted screen
- [ ] Denied screen
- [ ] Invalid screen
- [ ] Auto reset
- [ ] Duplicate scan protection
- [ ] Write scan log

Modes:

```text
CHECK_IN
ZONE_ACCESS
ACTIVITY
CLAIM
```

**Definition of Done:** scanner nyata dapat memutuskan akses berdasarkan attendee, ticket type, zone, dan station.

---

## Phase 9, Activities & Benefits

- [ ] Create activity
- [ ] Workshop check-in
- [ ] Activity checkpoint
- [ ] Activity history
- [ ] Benefit definition
- [ ] Merchandise claim
- [ ] Prevent duplicate claim
- [ ] Already Claimed state
- [ ] Visitor activity view

**Definition of Done:** satu QR dapat dipakai untuk aktivitas dan benefit tanpa mengubah QR.

---

## Phase 10, Dashboard & Analytics

- [ ] Total registered
- [ ] Total checked-in
- [ ] QR claimed
- [ ] QR unclaimed
- [ ] Granted scans
- [ ] Denied scans
- [ ] Zone traffic
- [ ] Activity participation
- [ ] Benefit claims
- [ ] Recent scan feed
- [ ] Number Ticker animation
- [ ] Simple charts
- [ ] Filter by date/station/zone

**Definition of Done:** organizer dapat memahami kondisi event dari dashboard tanpa membuka database.

---

## Phase 11, UI Polish + Magic UI

- [ ] Install Magic UI components yang dipilih
- [ ] Landing motion
- [ ] Dashboard micro-interactions
- [ ] Event page transitions
- [ ] Interactive Grid Pattern
- [ ] Blur Fade
- [ ] Number Ticker
- [ ] Magic Card
- [ ] Border Beam
- [ ] Animated Beam untuk system flow
- [ ] Button interactions
- [ ] Loading skeleton
- [ ] Empty states
- [ ] Error states
- [ ] Reduced-motion support
- [ ] Touch/mobile testing

**Definition of Done:** motion terasa deliberate, tidak mengganggu fungsi, dan tampilan konsisten di desktop, iPad, dan iPhone.

---

## Phase 12, Security & Reliability

- [ ] Review RLS
- [ ] Service role hanya server-side
- [ ] Validate all server inputs
- [ ] Rate-limit sensitive endpoints bila diperlukan
- [ ] Prevent client-side privilege decisions
- [ ] Claim transaction server-side
- [ ] Scanner validation server-side
- [ ] QR revoke enforced server-side
- [ ] File upload MIME/type/size validation
- [ ] Graceful camera failure
- [ ] Manual attendee lookup fallback
- [ ] Error logging
- [ ] No secrets in Git history

**Definition of Done:** browser tidak dapat mengubah role, akses, claim, atau status hanya dengan memanipulasi frontend.

---

## Phase 13, Testing

### Functional

- [ ] Create event
- [ ] Customize event
- [ ] Register attendee
- [ ] Generate QR
- [ ] Claim QR
- [ ] Claim same QR twice
- [ ] Scan valid QR
- [ ] Scan invalid QR
- [ ] Scan revoked QR
- [ ] General enters VIP area
- [ ] VIP enters VIP area
- [ ] Duplicate check-in
- [ ] Merchandise claim twice
- [ ] Replace wristband
- [ ] Digital Pass updates

### Device

- [ ] iPhone Safari
- [ ] iPad Safari
- [ ] Android Chrome jika tersedia
- [ ] Desktop Chrome
- [ ] Camera permission denied
- [ ] Camera permission granted
- [ ] Dark venue / low-light practical test

### Responsive

- [ ] 320px
- [ ] 375px
- [ ] 430px
- [ ] tablet
- [ ] desktop
- [ ] kiosk landscape

---

## Phase 14, Vercel Deployment

- [ ] Connect GitHub repo to Vercel
- [ ] Configure framework as Next.js
- [ ] Add Supabase environment variables
- [ ] Preview deployment
- [ ] Run build verification
- [ ] Fix runtime/build errors
- [ ] Production deployment
- [ ] Verify HTTPS camera access
- [ ] Verify image uploads
- [ ] Verify Supabase production policies
- [ ] Verify scanner on deployed HTTPS domain

---

## Phase 15, Final Demo Preparation

Demo flow yang harus bisa dilakukan di depan dosen:

```text
1. Organizer opens dashboard
2. Show multiple events
3. Open one event
4. Change event theme
5. Show attendee list
6. Generate / show available QR wristband
7. Visitor opens Digital Event Pass
8. Visitor claims wristband
9. Same QR appears on phone
10. Scan QR at Main Entrance
11. Result: CHECKED IN / ACCESS GRANTED
12. Scan General pass at VIP Lounge
13. Result: ACCESS DENIED
14. Scan VIP pass at VIP Lounge
15. Result: ACCESS GRANTED
16. Scan merchandise claim
17. Claim succeeds
18. Scan again
19. Result: ALREADY CLAIMED
20. Dashboard shows new logs
```

Jika semua 20 langkah tersebut berjalan, core project dianggap final.

---

## 13. Final Acceptance Criteria

Project dianggap selesai jika:

- [ ] satu deployment menangani beberapa event;
- [ ] organizer dapat membuat event tanpa coding;
- [ ] tiap event dapat memiliki theme dan asset berbeda;
- [ ] attendee tersimpan per event;
- [ ] QR batch dapat dibuat sebelum pemilik ditentukan;
- [ ] visitor dapat claim QR;
- [ ] satu QR muncul di wristband dan Digital Pass;
- [ ] scanner kamera bekerja di deployed HTTPS;
- [ ] scanner memvalidasi berdasarkan database;
- [ ] access rule bekerja;
- [ ] revoke/replacement bekerja;
- [ ] activity tracking bekerja;
- [ ] duplicate claim ditolak;
- [ ] dashboard membaca data aktual;
- [ ] upload image tersimpan di Storage;
- [ ] role & RLS aman;
- [ ] UI mobile responsive;
- [ ] Magic UI terintegrasi tanpa mengganggu usability;
- [ ] Vercel production build sukses;
- [ ] demo scenario end-to-end sukses.

---

## 14. Environment Variables

Copy `.env.example` menjadi `.env.local`.

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Rules

- Jangan commit `.env.local`.
- Jangan commit database password.
- Jangan commit Supabase service role key.
- Jangan prefix secret dengan `NEXT_PUBLIC_`.
- Production secret disimpan di Vercel Environment Variables.
- `SUPABASE_SERVICE_ROLE_KEY` hanya boleh dipakai di server.

---

## 15. Local Development

```bash
git clone https://github.com/palcchi/passflow.git
cd passflow
npm install
npm run dev
```

Buka:

```text
http://localhost:3000
```

Untuk Codespaces:

```bash
git pull origin main
npm install
npm run dev
```

Lalu buka forwarded port Next.js.

---

## 16. Important Project Decisions

Jangan mengubah keputusan ini tanpa alasan yang jelas:

1. Framework tetap **Next.js App Router + TypeScript**.
2. Satu repository untuk seluruh platform.
3. Sistem harus **multi-event**.
4. Public event route menggunakan `/e/[slug]`.
5. QR wristband dibuat sebelum pemilik ditentukan.
6. Visitor melakukan **claim QR**.
7. QR pada wristband dan HP adalah credential yang sama.
8. Database berada di Supabase, bukan GitHub.
9. Event assets berada di object storage, bukan repository.
10. Scanner harus web-based dan menggunakan kamera browser.
11. Scanner result harus otomatis kembali ke kamera.
12. Access decision harus divalidasi server/database.
13. Magic UI digunakan secara selektif.
14. Project harus tetap nyaman digunakan di iPhone dan iPad.

---

## 17. Handoff ke Chat Berikutnya

Jika project dilanjutkan di percakapan baru, gunakan konteks berikut:

```text
Project: PassFlow
Repo: palcchi/passflow

Tujuan:
Membangun platform multi-event berbasis Next.js untuk registrasi, attendee,
Claim-Based QR Wristband, Digital Event Pass, access control, activity tracking,
merchandise claim, scanner kamera, dan dashboard monitoring.

Stack:
Next.js 16 App Router
React 19
TypeScript
Supabase PostgreSQL/Auth/Storage
html5-qrcode
Vercel
Magic UI + shadcn untuk interactive UI

Konsep QR:
Panitia generate batch wristband QR dengan status UNCLAIMED.
Visitor yang sudah terdaftar menerima wristband mana saja lalu scan melalui HP.
QR di-claim dan di-bind ke Attendee ID.
QR yang sama kemudian tampil sebagai Digital Event Pass.
Wristband dan HP adalah dua media untuk satu credential.
Scanner memvalidasi QR ke backend/database lalu mencatat scan log.

Current status:
Frontend prototype, admin dashboard, dynamic event page, claim prototype,
scanner camera prototype, appearance editor, Supabase client scaffold,
dan initial database migration sudah ada.
Tailwind v4/PostCSS, shadcn Button, semantic design tokens, Magic UI Blur Fade
dan Number Ticker sudah diintegrasikan. Reduced-motion dan SSR fallback tersedia.
Build lokal terhalang akses npm; install, lint, typecheck, dan production build
sudah lolos GitHub Actions pada commit a20646a.
Workflow GitHub Actions juga memeriksa route responsive memakai Chromium.

Next priority:
1. verify foundation build/CI and responsive rendering,
2. provision Supabase,
3. run migration + RLS,
4. auth,
5. replace mock data,
6. implement real QR claim,
7. implement scanner validation,
8. storage upload,
9. analytics,
10. Vercel production deployment.

Design:
Modern, native, editorial SaaS feel.
Interactive tetapi tidak norak.
Use Magic UI selectively.
Per-event public UI harus mengikuti custom event theme.
Scanner harus minimal, cepat, high contrast, dan tidak penuh efek.
Mobile/iPad support wajib.
```

---

## Foundation continuation, 25 September 2026

- Tailwind v4 menggunakan `postcss.config.mjs`; shadcn menggunakan `components.json`.
- Token berada di `app/tokens.css`. CSS prototype berada dalam `@layer components` agar utility Tailwind tetap dapat mengoverride style.
- Button diambil dari source resmi shadcn dan disesuaikan untuk target sentuh minimum 44px. Blur Fade dan Number Ticker diadaptasi dari Magic UI; lisensi tersimpan di `THIRD_PARTY_NOTICES.md`.
- Landing memakai Blur Fade dan Button. Dashboard memakai Number Ticker, label data demo, dan tombol New event nonaktif sampai Phase 3.
- Scanner tetap memakai UI operasional yang ada. Claim, scanner validation, appearance save, dan dashboard data masih prototype.
- Phase 0 tetap IN PROGRESS sampai build dan pemeriksaan responsive selesai. Setup konfigurasi tidak sama dengan bukti build sukses.
- Validasi: diff lokal bersih. Install, lint, typecheck, dan production build lolos GitHub Actions pada commit `a20646a`. Pemeriksaan responsive Chromium ditambahkan untuk 320, 375, 430, 820, dan 1440px, termasuk screenshot artifact. Perangkat iPhone/iPad dan kamera nyata tetap perlu uji manual.
- Belum ada lockfile terverifikasi. Setelah install berhasil di environment dengan npm, commit `package-lock.json` dan ubah CI menjadi `npm ci`.
- Berikutnya: selesaikan verifikasi Phase 0, provision Supabase, lalu migration/RLS dan auth. Jangan aktifkan claim/scanner production sebelum validasi server siap.

---

## 18. Team

**Kelompok 7**  
Mata Kuliah: **Manajemen Proyek Teknologi Informasi**

- Vallian Tito Aprilio, 240103051
- Fadilllah Ardi Maisandy, 240103046
- Winda Lestari Gea, 240103059
- Reggy Pratama Sinulingga, 240103061

---

## 19. Documentation References

- Next.js: https://nextjs.org/docs
- Supabase: https://supabase.com/docs
- Vercel: https://vercel.com/docs
- Magic UI: https://magicui.design/docs
- shadcn/ui: https://ui.shadcn.com

