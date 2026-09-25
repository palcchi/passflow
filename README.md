# PassFlow

PassFlow adalah platform multi-event berbasis **Next.js App Router + TypeScript** untuk mengelola event, Claim-Based QR Wristband, Digital Event Pass, camera-based access validation, activity tracking, dan monitoring.

## Current foundation

Sudah tersedia:

- Landing page PassFlow
- Native Next.js multi-event route: `/e/[slug]`
- Admin dashboard: `/admin`
- Event appearance editor prototype: `/admin/events/[eventId]/appearance`
- Digital Event Pass + claim prototype: `/e/[slug]/claim`
- Live browser camera scanner: `/scan/[stationId]`
- Dynamic per-event theme using CSS variables
- Supabase server/client scaffold
- Initial PostgreSQL schema under `supabase/migrations`

## Core flow

```text
REGISTER
  -> RECEIVE WRISTBAND
  -> SCAN & CLAIM
  -> QR BOUND TO ATTENDEE
  -> WRISTBAND / PHONE
  -> ACCESS SCANNER
  -> VALIDATION & LOG
```

Satu claimed QR credential aktif ditampilkan melalui dua media: QR Wristband fisik dan Digital Event Pass pada HP.

## Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Supabase PostgreSQL
- Supabase Auth
- Supabase Storage
- html5-qrcode
- Vercel deployment
- GitHub source control

## Development

```bash
npm install
npm run dev
```

Lalu buka `http://localhost:3000`.

## Environment variables

Copy `.env.example` menjadi `.env.local`.

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Jangan commit `.env.local`, service role key, database password, atau data peserta ke GitHub.**

## Data model

Initial schema mencakup:

- organizations
- organization_members
- events
- ticket_types
- attendees
- qr_credentials
- access_zones
- access_rules
- scanner_stations
- scan_logs
- activities
- activity_logs
- benefit_claims
- event_assets

Hampir seluruh data operasional terikat ke `event_id` supaya satu instance PassFlow dapat melayani banyak event tanpa mencampur data.

## Next milestones

1. Provision Supabase project dan jalankan migration.
2. Implement authentication organizer, staff, visitor.
3. Ganti mock event data dengan query database.
4. Implement real QR claim transaction.
5. Persist theme + upload logo/hero ke Supabase Storage.
6. Connect scanner result ke validation API dan scan logs.
7. Deploy ke Vercel dan konfigurasi environment variables.
