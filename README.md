# Consultant Schedule Planner

Aplikasi perencanaan jadwal konsultan berbasis **Next.js 14 (App Router) + Supabase** dengan fitur deteksi bentrok jadwal, alur approval, dan dashboard GM.

## Fitur

- 📅 **Kalender bulanan** dengan penanda warna merah untuk jadwal yang bentrok
- ⚠️ **Conflict detector** di frontend maupun backend (`/api/schedules/conflict-check`)
- ✅ **Alur approval**: jadwal berstatus `PENDING` dapat di-`APPROVED` / `REJECTED` oleh GM
- 📊 **GM Dashboard** dengan filter, export CSV, dan overview cards
- 🔐 **Auth & RLS**: login via Supabase Auth, Row Level Security pada tabel `profiles` dan `schedules`, proteksi route via middleware (`/dashboard`, `/gm-dashboard`)

## Tech Stack

| Layer | Teknologi |
| --- | --- |
| Framework | Next.js 14 (App Router, TypeScript) |
| Styling | Tailwind CSS |
| Backend / DB / Auth | Supabase (Postgres + Auth + RLS) |
| Deployment | Vercel |

## Struktur Proyek

```
app/
  page.tsx                      # Halaman utama
  login/                        # Halaman login/register
  dashboard/                    # Kalender & jadwal konsultan
  gm-dashboard/                 # Dashboard GM (approval, filter, export CSV)
  api/schedules/conflict-check/ # API deteksi bentrok jadwal
lib/supabase/                   # Helper Supabase client (browser & server)
supabase/schema.sql             # Skema database (tabel, RLS policy, trigger)
middleware.ts                   # Proteksi route berdasarkan session
```

## Prasyarat

- Node.js 18+
- Proyek Supabase (untuk URL & anon key)

## Cara Install Lokal

1. Clone repo ini, lalu install dependencies:

   ```bash
   npm install
   ```

2. Salin `.env.example` menjadi `.env.local` dan isi nilai berikut:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=<URL proyek Supabase Anda>
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<Anon key proyek Supabase Anda>
   SUPABASE_SERVICE_ROLE_KEY=<Service role key — SERVER ONLY, dipakai fitur ubah password GM. Jangan pernah diprefix NEXT_PUBLIC.>
   ```

3. Jalankan skema database di **Supabase SQL Editor**:

   ```bash
   # salin & jalankan isi supabase/schema.sql di SQL Editor Supabase
   ```

4. Jalankan development server:

   ```bash
   npm run dev
   ```

5. Buka [http://localhost:3000](http://localhost:3000).

## Cara Deploy ke Vercel

1. Push repository ke GitHub.
2. Di Vercel: **New Project → Import repo**.
3. Masukkan Environment Variables yang sama (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).
4. Klik **Deploy**.

## Akun GM

1. Daftar terlebih dahulu dengan `gm@company.com` / `Admin123!`.
2. Buka **Supabase Table Editor → profiles**, ubah `role` akun tersebut menjadi `GM`.

## Skema Database (ringkasan)

- **profiles** — `id` (ref auth.users), `email`, `role` (`CONSULTANT` | `GM`)
- **schedules** — konsultan, klien, proyek, lokasi (`WFO`/`WFH`/`On-site`/`Leave`), tanggal, jam mulai/selesai, status (`PENDING`/`APPROVED`/`REJECTED`), alasan penolakan
- Trigger `handle_new_user()` otomatis membuat baris `profiles` saat user mendaftar (role default `CONSULTANT`)

## Scripts

```bash
npm run dev     # development server
npm run build   # build produksi
npm start       # jalankan hasil build
npm run lint    # ESLint
```
