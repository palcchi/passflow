# PassFlow

> One event platform. One attendee identity. One QR across digital and physical experiences.

PassFlow adalah platform manajemen event multi-event untuk organizer. Produk ini menyatukan event website, registrasi peserta, attendee management, QR credentials, digital passes, access control, scanner, event experiences, dan desain event berbasis Figma.

- **Website:** https://passflow.my.id
- **Repository:** https://github.com/palcchi/passflow
- **Status:** aplikasi aktif dikembangkan dan digunakan sebagai produk end-to-end.

## Product capabilities

### Organizer workspace
- Workspace untuk mengelola beberapa event.
- Overview, People, Access, Experience, Appearance, Design, dan Settings.
- Pengaturan status event: Draft, Coming soon, dan Live.
- Event dapat bersifat Public atau Private (link only).
- Pengaturan kapasitas, venue, jadwal, branding, dan registrasi.

### Registration and attendees
- Registrasi peserta melalui public event page.
- Opsi persetujuan organizer sebelum credential diterbitkan.
- Pengelolaan data peserta, pencarian, pembuatan attendee, dan CSV import.
- Profil peserta dan foto yang disimpan melalui storage.
- Crew invitation dan event membership.

### QR credentials and check-in
- QR credential menjadi identitas attendee yang sama untuk pass digital maupun kebutuhan fisik.
- Claim flow untuk attendee mengambil digital pass.
- Scanner berbasis browser dengan pemilihan kamera.
- Validasi akses dilakukan di server, bukan berdasarkan state frontend.
- Dukungan station access, hasil check-in, dan manual attendee lookup.
- Credential lifecycle mencakup validasi, revoke, dan penggantian credential.

### Event experience
- Activities dan checkpoints.
- Activity logs.
- Benefits dan one-time benefit claims.
- Keterkaitan aktivitas dan benefit dengan attendee credential.

### Figma design integration
- Figma account connection dan event design pairing.
- Figma plugin untuk memasukkan dan menghubungkan elemen desain dengan data PassFlow.
- Metadata binding untuk menghubungkan elemen desain dengan konten event.
- Published Figma design dirender pada public event website.
- Figma mengelola visual, layout, dan typography. PassFlow mengelola data event, registrasi, credential, dan publishing.
- Sync dari plugin menerapkan desain ke event. Jika ditemukan masalah yang menghalangi publish, plugin menampilkan lokasi masalah di Figma.

## Application routes

| Area | Route |
| --- | --- |
| Homepage | `/` |
| Public event | `/e/[slug]` |
| Event subpage | `/e/[slug]/[page]` |
| Claim digital pass | `/e/[slug]/claim` |
| QR scanner | `/scan/[stationId]` |
| Organizer home | `/organizer` |
| Organizer events | `/organizer/events` |
| Event workspace | `/organizer/events/[eventId]` |
| Account | `/account` |
| Profile | `/profile` |
| Authentication | `/login`, `/register`, `/forgot-password` |

## Technology

| Layer | Technology |
| --- | --- |
| Application | Next.js 16, React 19, TypeScript |
| Styling | Tailwind CSS 4, custom UI system |
| Motion | Motion |
| Icons | lucide-react |
| Database | Supabase PostgreSQL |
| Authentication | Supabase Auth with server-side session handling |
| Storage | Supabase Storage |
| QR scanning | html5-qrcode |
| QR generation | qrcode |
| Design integration | Figma Plugin API |
| Hosting | Vercel |

Optional self-hosting and infrastructure notes are maintained in [deploy/](deploy/).

## Local development

Requirements:
- Node.js 22 or compatible version supported by the project.
- npm.
- A configured Supabase project for the standard application workflow.

Clone and install dependencies:

```bash
git clone https://github.com/palcchi/passflow.git
cd passflow
npm ci
```

Create a local environment file based on the example:

```bash
cp .env.example .env.local
```

Fill in the required values for your Supabase project and any integrations you intend to use. Then start the development server:

```bash
npm run dev
```

Open http://localhost:3000.

## Environment configuration

See [`.env.example`](.env.example) for the supported variable names and descriptions.

Common configuration:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_APP_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only)
- Figma OAuth and webhook configuration
- Optional event subdomain configuration

Never expose service-role keys, OAuth secrets, webhook passcodes, or other private credentials through `NEXT_PUBLIC_*` variables. SMTP and Google OAuth provider secrets belong in their intended authentication provider configuration.

## Verification

Run the standard checks before committing:

```bash
npm run lint
npm run typecheck
npm run build
```

The repository also contains focused regression and integration checks under `scripts/`. The GitHub Actions workflow runs the configured test suites, typecheck, production build, and responsive route verification.

Examples:

```bash
node --experimental-strip-types --test scripts/auth-unit.test.mjs scripts/customize-actions.test.mjs scripts/studio-model.test.mjs
node scripts/management-lifecycle.test.mjs
node scripts/phase1-credential.test.mjs
node scripts/delete-credentials.test.mjs
node scripts/event-approval.test.mjs
node scripts/event-lifecycle.test.mjs
node scripts/figma-plugin.test.mjs
node scripts/figma-website.test.mjs
```

## Repository structure

```text
app/                  Next.js routes, layouts, actions, and API endpoints
components/           Shared UI and product components
lib/                  Authentication, database, event, Figma, and service logic
supabase/             Database migrations, policies, and tests
figma-plugin-standard/ Figma plugin source and publishing assets
public/               Static assets
scripts/              Verification, maintenance, and test scripts
deploy/               Self-hosting and deployment configuration
docs/                 Product and engineering documentation
```

## Security and deployment policy

- Local environment files are excluded from Git. Only the placeholder `.env.example` is tracked.
- User-uploaded files under `public/uploads/` are not source code and must not be committed.
- Database backups, local build output, dependency directories, and generated artifacts should stay out of commits.
- Server-side authorization and database Row Level Security are part of the security boundary. Do not rely on frontend visibility alone.
- Git-triggered Vercel deployments are disabled in `vercel.json`. A push or commit must not be treated as deployment approval.
- Preview or production deployment requires an explicit instruction from the project owner.

## Project principles

1. One attendee has one active credential identity across supported pass formats.
2. Scanner decisions are validated server-side.
3. Event data and permissions are scoped to the correct event and membership.
4. Figma owns advanced event visuals; PassFlow owns event data and operational workflows.
5. Mobile and iPad usage are supported product requirements.
6. Keep the interface clear, responsive, and operationally reliable before adding decorative complexity.

---

Maintained for the current PassFlow application source.
