
# Consultant Schedule Planner - Siap Deploy

## Cara Install Lokal
1. npm install
2. Copy .env.example ke .env.local dan isi SUPABASE_URL & ANON_KEY
3. npm run dev -> buka http://localhost:3000

## Cara Deploy Vercel
1. Push ke GitHub
2. Vercel -> New Project -> Import repo
3. Masukkan Environment Variables yang sama
4. Deploy

## Akun GM
Daftar dulu dengan gm@company.com / Admin123! lalu di Supabase Table Editor > profiles ubah role jadi GM

## Fitur
- Kalender bulanan dengan warna bentrok merah
- Conflict detector frontend + backend (/api/schedules/conflict-check)
- Approval PENDING -> APPROVED/REJECTED
- GM Dashboard dengan filter, export CSV, overview cards
