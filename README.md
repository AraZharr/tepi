# tepi.my.id

Free subdomain provider untuk Indonesia.  
Klaim `nama.tepi.my.id` dan arahkan ke GitHub Pages, Vercel, Cloudflare Pages, atau VPS kamu.

---

## Stack

| Komponen | Teknologi |
|---|---|
| Frontend + Backend | Next.js 15 (App Router) |
| Hosting | Cloudflare Workers (OpenNext adapter) |
| Database | Cloudflare D1 (SQLite) |
| Auth | Supabase Auth |
| Email | Resend |
| Payment | Paywuz.id (QRIS) |

---

## Setup Awal (GitHub Codespace)

```bash
# Setelah upload dan unzip file proyek:
bash setup.sh
```

Script akan otomatis install dependencies, buat `.env.local`, dan push ke GitHub.

---

## Konfigurasi Cloudflare Workers Builds

Bukan Cloudflare **Pages** — proyek ini pakai Cloudflare **Workers** karena
butuh full SSR (API routes, middleware auth). Cloudflare Pages tidak lagi
didukung penuh untuk Next.js mode server per dokumentasi resmi mereka.

1. Buka [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Workers Builds** (atau **Import a repository**)
2. Hubungkan ke repo GitHub `tepi`, branch `main`
3. Setting build:

| Setting | Nilai |
|---|---|
| Build command | `npm run deploy` |
| Root directory | `/` |

**D1 Binding (wajib):** sudah dikonfigurasi lewat `wrangler.toml` di repo — tidak perlu diatur manual lagi di dashboard, Workers Builds otomatis membacanya.

**Custom Domain:** setelah `tepi.my.id` dibeli, tambahkan lewat Worker → **Settings** → **Domains & Routes** → **Add Custom Domain**.

---

## Environment Variables

Lihat `.env.example` untuk daftar lengkap.  
Set di Cloudflare Pages → Settings → Environment Variables untuk production.

---

## Database

Jalankan `db/schema.sql` di Cloudflare D1 Console setelah membuat database.

---

## GitHub Secrets (untuk keep-alive Supabase)

Set di repo → Settings → Secrets → Actions:
- `SUPABASE_PROJECT_REF`
- `SUPABASE_ANON_KEY`

---

## Development

```bash
# Hanya untuk referensi — development dilakukan via Codespace, bukan lokal
npm run dev
```
