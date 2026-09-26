# Authentication setup

PassFlow memakai email/password sebagai alur pendaftaran utama, dengan Google sebagai pilihan tambahan. SMTP serta Google OAuth dikonfigurasi di Supabase, sehingga aplikasi tidak menyimpan kredensial SMTP, Google client secret, atau service role key.

## Environment variables

Set di Vercel dan `.env.local`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
NEXT_PUBLIC_APP_URL=https://passflow.my.id
```

Untuk lokal, gunakan `NEXT_PUBLIC_APP_URL=http://localhost:3000`. Di Supabase Authentication → URL Configuration, gunakan Site URL `https://passflow.my.id` dan tambahkan Redirect URLs berikut:

```text
https://passflow.my.id/auth/callback
https://passflow.my.id/auth/callback?next=*
https://passflow.my.id/auth/confirm?next=*
https://passflow.my.id
https://passflow.my.id/auth/reset
http://localhost:3000/auth/callback
http://localhost:3000/auth/callback?next=*
http://localhost:3000/auth/reset
```

## Email/password (alur utama)

1. Buka Authentication → Providers → Email dan aktifkan Email provider.
2. Pastikan Confirm email aktif bila akun harus memverifikasi inbox.
3. Isi SMTP host, port, user, password, sender name, dan sender email sesuai provider SMTP-mu.
4. Atur template email confirmation dan reset password agar link mengarah ke origin PassFlow.
5. Uji `/register`, klik link verifikasi, masuk lewat `/login`, lalu uji `/reset-password`.

Link verifikasi email memakai token hash dan diproses oleh `/auth/confirm`, sehingga sesi bisa dibuat dari browser yang membuka email. Login Google tetap memakai `/auth/callback`. Link reset diproses oleh `/auth/reset`.

## Google (opsional)

1. Buka Authentication → Providers → Google di Supabase dan aktifkan provider tersebut.
2. Simpan Google Client ID dan Client Secret hanya di halaman provider Supabase. Jangan menaruhnya di `.env.local`, repository, atau Vercel.
3. Di Google Auth Platform, tambahkan Authorized JavaScript origins berikut:

   ```text
   https://passflow.my.id
   http://localhost:3000
   ```

4. Tambahkan Authorized redirect URI yang ditampilkan oleh halaman provider Google di Supabase. Untuk project saat ini, nilainya adalah:

   ```text
   https://tghllarxwuhdbmtfewsa.supabase.co/auth/v1/callback
   ```

5. Uji tombol Google dari `/register` atau `/login`. Setelah persetujuan Google, Supabase mengembalikan user ke `https://passflow.my.id/auth/callback`, lalu PassFlow menyimpan sesi PKCE di cookie.

Tombol Google dapat membuat akun Supabase saat pertama kali digunakan. Pengguna email/password tetap dapat memakai reset password; pengguna Google mengelola password melalui Google.

## Organizer pertama

Setelah membuat akun, ambil UUID user dari Supabase Authentication → Users. Jalankan SQL berikut sebagai pemilik project untuk memberi role owner:

```sql
begin;
insert into public.organizations (name, slug)
values ('PassFlow workspace', 'passflow-workspace')
on conflict (slug) do nothing;

insert into public.organization_members (organization_id, user_id, role)
select id, 'REPLACE_WITH_AUTH_USER_UUID'::uuid, 'owner'
from public.organizations
where slug = 'passflow-workspace'
on conflict (organization_id, user_id) do update set role = 'owner';
commit;
```

Role disimpan di `organization_members`, bukan di metadata user. Visitor tidak mendapat akses organizer sampai diberi membership.

## Checklist uji

- Daftar dengan email baru dan verifikasi email.
- Masuk ulang setelah refresh browser.
- Gunakan Google dari `/register`, batalkan sekali untuk menguji error callback, lalu ulangi sampai kembali ke `/account`.
- Minta reset password dan simpan password baru dari link email.
- Logout lalu pastikan `/account`, `/admin`, `/scan/*`, dan halaman claim mengarah ke login.
- Pastikan domain custom production dipakai untuk `NEXT_PUBLIC_APP_URL`.
