# DEPLOY TEPI — STEP BY STEP DARI 0

## PREREQUISITE
- Akun GitHub + repo `AraZharr/tepi`
- Akun Cloudflare (udah ada, domain `tepi.my.id` udah di CF)
- Akun Resend (gratis)
- Akun Turnstile Cloudflare (gratis)

---

## STEP 1: Generate AUTH_SECRET

```bash
openssl rand -hex 32
```
Copy hasilnya. Lo butuh ini buat env var.

---

## STEP 2: Dapatkan API Keys

### Resend
1. Buka https://resend.com
2. Sign up / login
3. API Keys → Create API Key
4. Copy `RE_xxxxxxxxxx`

### Turnstile
1. Buka https://challenges.cloudflare.com
2. Add Site → nama: `tepi`, domain: `tepi.my.id`
3. Pilih mode (disarankan: Managed)
4. Copy **Site key** + **Secret key**

---

## STEP 3: Set GitHub Secrets

Buka: https://github.com/AraZharr/tepi/settings/secrets-and-variables/actions

Klik **New repository secret**, tambahkan satu per satu:

| Name | Value |
|------|-------|
| `AUTH_SECRET` | hasil `openssl rand -hex 32` |
| `RESEND_API_KEY` | `RE_xxxxxxxxxx` dari Resend |
| `TURNSTILE_SECRET_KEY` | Secret key dari Turnstile |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Site key dari Turnstile |
| `NEXT_PUBLIC_APP_URL` | isi nanti setelah deploy, misal `https://tepi.pages.dev` |

---

## STEP 4: Setup D1 Database

Buka Cloudflare Dashboard → D1:
https://dash.cloudflare.com/?account=61ab4b716cac58107abb06ba8619d7e6&d1/database/list

1. Klik **Create database** → nama: `tepi-db`
2. Setelah created, klik **Console**
3. Paste + execute SQL di bawah **satu per satu**:

```sql
-- Migration 0010 — Cloudflare-native auth
ALTER TABLE users ADD COLUMN username TEXT;
ALTER TABLE users ADD COLUMN password_hash TEXT;
ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username);

CREATE TABLE IF NOT EXISTS auth_otps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  purpose TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  attempts INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_auth_otps_email ON auth_otps(email, purpose);
```

---

## STEP 5: Setup Cloudflare Pages

1. Buka https://pages.cloudflare.com
2. **Create a project** → Connect GitHub → pilih repo `AraZharr/tepi`
3. **Build settings:**
   - Build command: `npm run build`
   - Build output directory: `.next`
   - Node version: `18.x` atau `20.x`
4. **Environment variables** (tab Environment):
   - `AUTH_SECRET`
   - `RESEND_API_KEY`
   - `TURNSTILE_SECRET_KEY`
   - `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
   - `NEXT_PUBLIC_APP_URL` → isi `https://tepi.pages.dev` dulu
5. Klik **Save and Deploy**

Tunggu ~3-5 menit. Setelah berhasil, copy URL Pages (misal `https://tepi.pages.dev`).

---

## STEP 6: Update NEXT_PUBLIC_APP_URL

Setelah Pages deploy berhasil dan lo punya URL:
1. Buka lagi https://github.com/AraZharr/tepi/settings/secrets-and-variables/actions
2. Edit secret `NEXT_PUBLIC_APP_URL` → ganti dengan URL Pages yang asli
3. Push commit kecil ke GitHub buat trigger rebuild:

```bash
cd /root/work
echo "NEXT_PUBLIC_APP_URL=https://tepi.pages.dev" >> .env.example
git add .env.example
git commit -m "chore: set NEXT_PUBLIC_APP_URL"
git push origin main
```

---

## STEP 7: Install Resend Domain (Opsional tapi Recommended)

Agar email dari `@tepi.my.id` bukan `onboarding@resend.dev`:

1. Di Resend dashboard → Domains → Add Domain
2. Domain: `tepi.my.id`
3. Lanjutin verifikasi DNS di Cloudflare:
   - Tambah TXT record `_resend.records.spf.tepi.my.id`
   - Tambah MX record untuk `tepi.my.id` → `inbound.mx.resendmail.com`
4. Setelah verified, di `lib/email.ts` ganti `FROM` ke `noreply@tepi.my.id`

---

## STEP 8: Test

Buka URL Pages:
- Homepage: `/`
- Register: `/register`
- Login: `/login`
- Dashboard: `/dashboard`

Test flow:
1. Register → masuk email → cek OTP
2. Login → masuk OTP → redirect dashboard
3. Cek Turnstile widget muncul di form

---

## STEP 9: Custom Domain (Opsional)

Di Cloudflare Pages → Custom domains → Add custom domain:
- Domain: `tepi.my.id`
- Otomatis setup SSL + CNAME

---

## DONE

Setelah step 8 sukses, Tepi live di:
- Pages: `https://tepi.pages.dev` / `https://tepi.my.id`
- API: `https://tepi.pages.dev/api/auth`, `/api/auth/otp`, dll

Yang belum live cuma domain custom kalau lo skip step 9.

---

**Catatan:**
- Workers untuk ChatKu belum di-setup di sini
- D1 untuk ChatKu (`b6acb9e2...`) belum dibuat
- Keduanya butuh langkah terpisah kalo lo mau deploy ChatKu juga
