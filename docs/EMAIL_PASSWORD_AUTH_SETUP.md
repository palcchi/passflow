# Email + password authentication setup

PassFlow menggunakan Supabase Auth dengan alur:

```text
REGISTER
email + password
  ↓
email verification
  ↓
account active

LOGIN
email + password
  ↓
session
```

Akun baru selalu dianggap **visitor** sampai organizer memberi membership `staff`, `admin`, atau `owner` melalui database.

## 1. Supabase project

1. Buat project Supabase.
2. Jalankan migration secara berurutan:
   - `supabase/migrations/0001_initial_schema.sql`
   - `supabase/migrations/0002_auth_read_policies.sql`
3. Ambil Project URL dan publishable key.
4. Tambahkan ke `.env.local` dan Vercel:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
NEXT_PUBLIC_APP_URL=https://YOUR_PASSFLOW_DOMAIN
```

Untuk local development:

```dotenv
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 2. Enable email + password

Pada Supabase Dashboard:

```text
Authentication
→ Providers
→ Email
```

Pastikan:

- Email provider aktif.
- Email + password signup aktif.
- Confirm email aktif untuk production.

PassFlow tidak membutuhkan Google Cloud atau Google OAuth.

## 3. URL configuration

Pada:

```text
Authentication
→ URL Configuration
```

Set:

```text
Site URL:
https://YOUR_PASSFLOW_DOMAIN
```

Tambahkan redirect URL yang benar-benar digunakan, termasuk local development bila diperlukan.

Contoh:

```text
https://YOUR_PASSFLOW_DOMAIN/**
http://localhost:3000/**
```

Hindari wildcard domain yang terlalu luas pada production.

## 4. Confirm signup email template

PassFlow memakai token-hash confirmation agar SSR/cookie session dapat dibuat secara aman.

Buka:

```text
Authentication
→ Email Templates
→ Confirm signup
```

Gunakan link seperti:

```html
<h2>Verifikasi akun PassFlow</h2>
<p>Klik tombol berikut untuk mengaktifkan akunmu.</p>
<p>
  <a href="{{ .RedirectTo }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/account">
    Verifikasi email
  </a>
</p>
```

`{{ .RedirectTo }}` berasal dari `NEXT_PUBLIC_APP_URL` yang dikirim aplikasi saat register.

## 5. Reset password email template

Pada:

```text
Authentication
→ Email Templates
→ Reset password
```

Gunakan:

```html
<h2>Reset password PassFlow</h2>
<p>Klik tombol berikut untuk membuat password baru.</p>
<p>
  <a href="{{ .RedirectTo }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password">
    Reset password
  </a>
</p>
```

Flow:

```text
/forgot-password
→ email reset
→ /auth/confirm
→ /reset-password
→ password updated
→ /account
```

## 6. First organizer

Daftar akun PassFlow melalui `/register`, verifikasi email, lalu ambil UUID user dari:

```text
Authentication
→ Users
```

Sebagai project owner, jalankan SQL berikut dan ganti UUID:

```sql
begin;

insert into public.organizations (name, slug)
values ('Kelompok 7', 'kelompok-7')
on conflict (slug) do nothing;

insert into public.organization_members (organization_id, user_id, role)
select id, 'REPLACE_WITH_AUTH_USER_UUID'::uuid, 'owner'
from public.organizations
where slug = 'kelompok-7'
on conflict (organization_id, user_id)
do update set role = 'owner';

commit;
```

Role:

```text
no membership → visitor
staff         → scanner/operator access
admin         → organizer dashboard
owner         → organizer dashboard + trusted project owner
```

User tidak boleh memilih role saat register.

## 7. Real acceptance checks

- Register dengan nama, email, password, dan confirm password.
- Email verifikasi diterima.
- Link verifikasi membuka `/auth/confirm` lalu masuk ke `/account`.
- User baru tetap visitor.
- Login berikutnya cukup email + password.
- Password salah menampilkan error generik.
- Email belum diverifikasi tidak dapat login.
- Forgot password mengirim email tanpa membocorkan apakah akun ada.
- Reset password menghasilkan session recovery dan password baru dapat dipakai.
- Logout menghapus session perangkat saat ini.
- Visitor tidak dapat membuka `/admin`.
- Staff tidak mendapat organizer dashboard.
- Owner/admin mendapat dashboard.
- Test juga di iPhone/iPad Safari.

## 8. Email delivery

Supabase menyediakan sender bawaan untuk development/testing dengan limit tertentu. Untuk penggunaan production yang lebih serius, gunakan custom SMTP.

Jangan menyimpan SMTP password, database password, atau secret lain di GitHub.

## Current limits

Authentication dan role guards sudah diimplementasikan di code, tetapi live email flow baru dapat diuji setelah project Supabase dan email templates dikonfigurasi.

Event data, QR claim transaction, scanner validation, uploads, dan dashboard writes masih tahap berikutnya.
