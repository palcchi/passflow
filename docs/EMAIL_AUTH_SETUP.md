# Email authentication setup

PassFlow memakai email/password melalui Supabase Auth. SMTP dikonfigurasi di Supabase, sehingga aplikasi tidak menyimpan kredensial SMTP dan tidak memakai service role key.

## Environment variables

Set di Vercel dan `.env.local`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
NEXT_PUBLIC_APP_URL=https://YOUR_PASSFLOW_DOMAIN
```

Untuk lokal, gunakan `NEXT_PUBLIC_APP_URL=http://localhost:3000`. Pastikan Site URL Supabase memakai domain production dan Redirect URLs mengizinkan:

```text
https://YOUR_PASSFLOW_DOMAIN/auth/callback
https://YOUR_PASSFLOW_DOMAIN/auth/callback?next=*
https://YOUR_PASSFLOW_DOMAIN/auth/reset
http://localhost:3000/auth/callback
http://localhost:3000/auth/callback?next=*
http://localhost:3000/auth/reset
```

## Supabase Auth

1. Buka Authentication → Providers → Email dan aktifkan Email provider.
2. Pastikan Confirm email aktif bila akun harus memverifikasi inbox.
3. Isi SMTP host, port, user, password, sender name, dan sender email sesuai provider SMTP-mu.
4. Atur template email confirmation dan reset password agar link mengarah ke origin PassFlow.
5. Uji `/register`, klik link verifikasi, masuk lewat `/login`, lalu uji `/reset-password`.

Link verifikasi diproses oleh `/auth/callback`. Link reset diproses oleh `/auth/reset` dan sesi recovery ditangani oleh Supabase browser client.

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
- Minta reset password dan simpan password baru dari link email.
- Logout lalu pastikan `/account`, `/admin`, `/scan/*`, dan halaman claim mengarah ke login.
- Pastikan domain custom production dipakai untuk `NEXT_PUBLIC_APP_URL`.
