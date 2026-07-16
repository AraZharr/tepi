#!/usr/bin/env python3
"""Generate tepi.my.id architecture PDF using fpdf2."""

from fpdf import FPDF
import textwrap

class TepiPDF(FPDF):
    def __init__(self):
        super().__init__()
        self.set_auto_page_break(auto=True, margin=18)
        self.add_font("DejaVu", "", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", uni=True)
        self.add_font("DejaVu", "B", "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf", uni=True)
        self.add_font("DejaVuMono", "", "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf", uni=True)

    def header(self):
        if self.page_no() > 1:
            self.set_font("DejaVu", "", 7)
            self.set_text_color(100, 100, 100)
            self.cell(0, 6, "tepi.my.id — Arsitektur & Flow", align="L")
            self.cell(0, 6, f"Hal {self.page_no()}", align="R", new_x="LMARGIN", new_y="NEXT")
            self.line(10, 14, 200, 14)
            self.ln(4)

    def footer(self):
        self.set_y(-15)
        self.set_font("DejaVu", "", 6)
        self.set_text_color(150, 150, 150)
        self.cell(0, 10, "Free subdomain for developers Indonesia · Next.js 15 + CF Workers D1 + Supabase Auth", align="C")

    def section_title(self, title, color=(30, 64, 175)):
        self.set_font("DejaVu", "B", 13)
        self.set_text_color(*color)
        self.cell(0, 10, title, new_x="LMARGIN", new_y="NEXT")
        self.set_draw_color(*color)
        self.line(10, self.get_y(), 200, self.get_y())
        self.ln(3)

    def body_text(self, text, size=8):
        self.set_font("DejaVuMono", "", size)
        self.set_text_color(30, 30, 30)
        self.multi_cell(0, 4, text)

    def legend_text(self, text, size=9):
        self.set_font("DejaVu", "", size)
        self.set_text_color(60, 60, 60)
        self.multi_cell(0, 5, text)


pdf = TepiPDF()
pdf.add_page()

# ─── COVER ───
pdf.ln(20)
pdf.set_font("DejaVu", "B", 26)
pdf.set_text_color(30, 64, 175)
pdf.cell(0, 14, "Tepi.my.id", align="C", new_x="LMARGIN", new_y="NEXT")
pdf.set_font("DejaVu", "", 11)
pdf.set_text_color(100, 100, 100)
pdf.cell(0, 8, "Arsitektur & Alur Sistem Lengkap", align="C", new_x="LMARGIN", new_y="NEXT")
pdf.ln(4)
pdf.set_draw_color(30, 64, 175)
pdf.line(60, pdf.get_y(), 150, pdf.get_y())
pdf.ln(8)
pdf.set_font("DejaVu", "", 9)
pdf.set_text_color(80, 80, 80)
for line in [
    "35+ file · 8 tabel D1 · 22 API endpoint · 13 halaman publik",
    "4 layanan eksternal · 70+ reserved subdomain · GitHub Actions CI/CD",
    "Juli 2026",
]:
    pdf.cell(0, 6, line, align="C", new_x="LMARGIN", new_y="NEXT")

pdf.ln(20)
pdf.set_font("DejaVu", "B", 11)
pdf.set_text_color(30, 64, 175)

# ─── LEGENDA ───
pdf.section_title("Legenda Warna")
pdf.legend_text("""
BIRU      File Tree & Kode
HIJAU     Full Flow & Arsitektur
MERAH     Critical Path & Admin Notif
UNGU      Admin Panel
KUNING    CI/CD & Cron
ABU-ABU   Referensi & Dokumentasi
""".strip())
pdf.ln(4)

# ─── 1. FILE TREE ───
pdf.add_page()
pdf.section_title("1. File Tree — 35+ File Inti")
tree = """\
.github/workflows/
  ├── deploy.yml              CI/CD: build + deploy + auto D1 migration
  ├── expiry-cron.yml         Harian: hapus expired subdomain H+14
  └── keep-supabase-alive.yml

app/[locale]/ — 13 halaman publik + admin (i18n id/en)
  ├── page.tsx                Landing page
  ├── login/page.tsx          Login + Turnstile + Google OAuth
  ├── register/page.tsx       Register + Turnstile
  ├── pricing/page.tsx        Free vs Paid comparison table
  ├── blog/
  │   ├── page.tsx            Blog listing + testimoni
  │   └── [slug]/page.tsx     Blog detail
  ├── contact/page.tsx        Contact form
  ├── report/page.tsx         Abuse report form
  ├── dashboard/
  │   ├── page.tsx            User dashboard + countdown
  │   └── invoices/
  │       ├── page.tsx        Invoice list
  │       └── [id]/page.tsx   Invoice detail
  └── admin/
      ├── layout.tsx          Admin layout + sidebar
      ├── page.tsx            Review applications
      ├── blog/page.tsx       Blog CRUD
      ├── abuse/page.tsx      Abuse reports panel
      ├── users/page.tsx      User management
      ├── activity/page.tsx   Activity logs
      ├── payments/page.tsx   Payment history + invoice link
      └── settings/page.tsx   Site settings editor

app/api/ — 22 API endpoint
  ├── user/
  │   ├── subdomains/route.ts   Claim new + list owned
  │   ├── renew/route.ts        Renew free subdomain (3 months)
  │   └── invoices/
  │       ├── route.ts          List invoice
  │       └── [id]/route.ts     Invoice detail
  ├── payment/create/route.ts   Generate QRIS order + invoice
  ├── webhook/paywuz/route.ts   Paywuz payment callback
  ├── cron/expiry/route.ts      Expiry engine (H-7, H+14)
  ├── contact/route.ts          Submit contact message
  ├── abuse/route.ts            Submit abuse report
  ├── blog/route.ts             Public blog list
  ├── admin/                    Admin guard + 7 endpoint
  └── auth/callback/route.ts    Supabase OAuth callback

lib/ — 14 utility files
  ├── reserved.ts              70+ subdomain blocklist
  ├── validators.ts            Subdomain + URL + IP validation
  ├── auto-scan.ts             DNS resolve + HTTP status + keyword scan
  ├── turnstile.ts             Cloudflare Turnstile server verify
  ├── cloudflare-dns.ts        CF DNS API wrapper (CNAME/A)
  ├── invoice.ts               INV-YYYYMMDD-XXXXX generator + rupiah format
  ├── admin-notif.ts           Push notif email (4 event templates)
  ├── resend.ts                Resend transactional email client
  ├── paywuz.ts                Paywuz payment client
  ├── db.ts                    D1 database helper
  ├── users.ts                 User record helper
  ├── theme.ts                 Dark/light theme
  └── supabase/client.ts       Supabase browser client

migrations/
  └── 0009_complete.sql        8 CREATE TABLE + 2 ALTER

wrangler.toml                  CF Workers config + D1 binding
next.config.ts                 Next.js config + i18n routing
middleware.ts                  i18n middleware + locale detection"""
pdf.body_text(tree)
pdf.ln(4)

# ─── 2. ARSITEKTUR ───
pdf.add_page()
pdf.section_title("2. Arsitektur Sistem")
arch = """\
+--------------------------------------------------+
|              FRONTEND (Next.js 15)                |
|  13 halaman [locale]/  +  components/  +  mw     |
+-------------------+------------------------------+
                    |  22 API Routes
                    v
+-------------------+------------------------------+
|              LIBRARY LAYER                       |
|  validators  auto-scan  turnstile  cf-dns        |
|  admin-notif  invoice  reserved  paywuz          |
+-------------------+------------------------------+
                    |  D1 Queries
                    v
+-------------------+------------------------------+
|           D1 DATABASE — 8 Tables                  |
|  users  subdomains  payments  posts               |
|  abuse_reports  activity_logs  site_settings      |
|  contact_messages  subdomain_applications         |
+--------------------------------------------------+
                    |  HTTP/fetch
                    v
+--------------------------------------------------+
|           EXTERNAL SERVICES                       |
|  Supabase Auth  |  Cloudflare DNS API             |
|  Paywuz (QRIS)  |  Resend (Email)                |
|  Turnstile      |  Google DNS                     |
+--------------------------------------------------+"""
pdf.body_text(arch)
pdf.ln(4)

# ─── 3. D1 SCHEMA ───
pdf.section_title("3. D1 Database — 8 Tables")
schema = """\
users
  id, email, full_name, avatar_url, role (user|admin),
  subdomain_limit (default 2), created_at

subdomain_applications
  id, user_id, subdomain_name, target_platform, target_url,
  project_type, project_description, is_public, has_monetization,
  github_link, linkedin_link, social_link,
  status (pending|approved|rejected), reject_reason,
  reviewed_at, created_at

subdomains
  id, user_id, name, target_type (CNAME|A), target_value,
  cf_record_id, status (active|expired|suspended|quarantine),
  plan (free|paid), expires_at, created_at

payments
  id, user_id, subdomain_id, order_id, paywuz_transaction_id,
  invoice_number (INV-YYYYMMDD-XXXXX), amount (5000),
  fee, total_payment, payment_method (QRIS),
  status (pending|success|failed|cancelled), paid_at, created_at

posts
  id, slug, title, content, excerpt, cover_image, author_name,
  tags, is_featured, is_published, published_at, created_at, updated_at

contact_messages
  id, name, email, subject, message, is_read, created_at

abuse_reports
  id, subdomain_name, reporter_email, reason,
  status (pending|reviewed|actioned), created_at

activity_logs
  id, user_id, action, detail (JSON), ip_address, created_at

site_settings
  key (PRIMARY KEY), value, updated_at
  14 default settings: site_name, site_description,
  maintenance_mode, ads codes, social links, WA, OG image"""
pdf.body_text(schema)
pdf.ln(4)

# ─── 4. FLOW ───
pdf.add_page()
pdf.section_title("4. Complete Flow — User + System + Admin")
flow = """\
┌─────────────────────────────────────────────────────────────────┐
│                    USER (CUSTOMER)                               │
│                                                                  │
│  1. Buka tepi.my.id                                              │
│  2. Register / Login                                             │
│     ├── Turnstile CAPTCHA (anti-bot)                             │
│     ├── Email + password atau Google OAuth                       │
│     └── Supabase Auth session                                    │
│                                                                  │
│  3. Dashboard                                                    │
│     ├── Lihat subdomain aktif + countdown expired                │
│     ├── Tombol perpanjang (free / upgrade)                       │
│     └── Riwayat invoice                                          │
│                                                                  │
│  4. AJUKAN SUBDOMAIN                                             │
│     ├── Tulis nama + pilih platform + URL target + deskripsi     │
│     ├── Validasi: min 3 char, no reserved name, no duplicate     │
│     ├── Auto-scan: DNS resolve, HTTP status, keyword check       │
│     ├── Status: QUARANTINE (menunggu review admin)               │
│     └── Notif email ke ADMIN ─── aplikasi baru                   │
│                                                                  │
│  5. SUBDOMAIN AKTIF (setelah admin approve)                      │
│     ├── CNAME/A record dibuat di Cloudflare DNS                  │
│     ├── Masa aktif: 3 bulan (free)                               │
│     ├── Email konfirmasi ke user                                  │
│     └── Dashboard countdown mulai                                 │
│                                                                  │
│  6. PERPANJANGAN                                                 │
│     ├── FREE: Cek target masih hidup → extend 3 bulan            │
│     └── PAID (Rp5.000/thn):                                      │
│         ├── Generate invoice INV-20260715-XXXXX                  │
│         ├── Simpan ke payments table (pending)                   │
│         ├── Tampilkan QRIS Paywuz                                │
│         ├── User scan → bayar                                    │
│         ├── Webhook Paywuz → update status → extend 1 tahun      │
│         ├── Email user: konfirmasi                               │
│         ├── Notif email ADMIN ─── pembayaran masuk               │
│         └── User lihat invoice di /dashboard/invoices            │
│                                                                  │
│  7. EXPIRED (jika tidak perpanjang)                              │
│     ├── H-7: Email peringatan ke user                            │
│     ├── H-0: Status subdomain → 'expired'                        │
│     ├── Grace period 14 hari (DNS masih jalan)                   │
│     ├── H+14: Hapus DNS Cloudflare + hapus dari DB               │
│     └── Subdomain release → bisa diklaim orang lain              │
│                                                                  │
│  8. FITUR LAIN                                                   │
│     ├── Contact: form → D1 + notif email ADMIN                   │
│     └── Abuse report: form → D1 + notif email ADMIN              │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                    ADMIN (ARAZHAR)                                │
│                                                                  │
│  NOTIF EMAIL (push, 4 event):                                   │
│  ├── "Aplikasi Baru: subdomain.tepi.my.id"                       │
│  ├── "[MERAH] Abuse Report: subdomain.tepi.my.id"                │
│  ├── "Pesan Baru dari [nama]"                                    │
│  └── "Pembayaran Berhasil: subdomain — Rp5.000"                  │
│                                                                  │
│  ADMIN PANEL (/admin):                                           │
│  ├── Review aplikasi → approve (auto DNS) / tolak (email)        │
│  ├── Blog CRUD (posting testimoni)                               │
│  ├── Abuse reports → suspend / tandai selesai                    │
│  ├── Users management                                            │
│  ├── Activity logs timeline                                      │
│  ├── Payments + invoice link                                     │
│  └── Site settings (nama, deskripsi, sosmed, OG, WA, ads)       │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                    CI/CD (GITHUB ACTIONS)                         │
│                                                                  │
│  DEPLOY WORKFLOW (push ke main):                                 │
│  ├── npm ci                                                      │
│  ├── npx wrangler d1 execute tepi-db --remote (auto migrasi)     │
│  ├── npm run deploy (opennextjs-cloudflare)                      │
│  └── Deploy ke tepi.azhr.workers.dev                             │
│                                                                  │
│  EXPIRY CRON (setiap hari 00:00 UTC):                            │
│  ├── H-7: Kirim reminder email                                   │
│  ├── H-0: Update status expired                                  │
│  └── H+14: Hapus DNS + DB + release                              │
└─────────────────────────────────────────────────────────────────┘"""
pdf.body_text(flow, size=7.5)
pdf.ln(4)

# ─── 5. RESERVED ───
pdf.add_page()
pdf.section_title("5. Reserved Subdomain List (70+ Nama)")
reserved = """\
ADMIN & SYSTEM:    admin, adm, root, system, sys, server, panel,
                    dashboard, cpanel, whm, plesk, directadmin
EMAIL:             mail, email, noreply, no-reply, no_reply,
                    reply, contact, support, help, cs, care,
                    service, info
DNS:               ns1, ns2, ns3, ns4, dns, mx, smtp, pop3, imap
SECURITY:          ssl, tls, auth, login, register, signup,
                    signin, logout, signout, verify, verification,
                    captcha
WEB:               www, wwww, web, site, home, index, main, app,
                    dev, test, beta, alpha, staging, demo, stage,
                    prod, production, api, rest, graphql, cdn,
                    static, assets, media, upload, files, download,
                    status, health, monitor, ping
SOCIAL:            blog, news, forum, community, chat, group, event
MONITORING:        tracker, analytics, stats, log, logs, debug
PAYMENT:           payment, billing, invoice, receipt, order, cart
LEGAL:             legal, terms, privacy, policy, copyright, dmca
COMPANY:           about, company, team, career, job, office
DANGEROUS:         null, undefined, localhost, 0, 127001,
                    *, wildcard, any, all"""
pdf.body_text(reserved)
pdf.ln(4)

# ─── 6. CI/CD ───
pdf.section_title("6. CI/CD Pipeline")
cicd = """\
+-------+     +-------------+     +-------------+     +-----------+
| PUSH  | --> | npm ci      | --> | Migrate D1  | --> | Build &   |
| main  |     | install     |     | (auto .sql)  |     | Deploy CF |
+-------+     +-------------+     +-------------+     +-----------+
                                                             |
                                                             v
                                                    +-------------------+
                                                    | tepi.azhr.workers |
                                                    | .dev LIVE         |
                                                    +-------------------+

CRON JOBS (GitHub Actions):
  expiry-cron.yml (00:00 UTC daily):
    GET /api/cron/expiry?key=<CRON_SECRET>
    ├── H-7: Find about-to-expire subdomains → send reminder
    ├── H-0: Set status='expired', send notification
    └── H+14: Delete DNS record + remove from DB → release"""
pdf.body_text(cicd)
pdf.ln(4)

# ─── 7. PENDING ───
pdf.section_title("7. Checklist — Biar Live", color=(200, 50, 50))
pending = """\
[  ] 1. CF Workers → Settings → Variables:
         NEXT_PUBLIC_SUPABASE_URL
         NEXT_PUBLIC_SUPABASE_ANON_KEY
         ADMIN_USER_ID
         ADMIN_NOTIF_EMAIL = rizalrahmadi13@gmail.com
         NEXT_PUBLIC_APP_URL = https://tepi.azhr.workers.dev

[  ] 2. GitHub → Settings → Secrets → Actions:
         CF_API_TOKEN
         CF_ACCOUNT_ID
         NEXT_PUBLIC_SUPABASE_URL
         NEXT_PUBLIC_SUPABASE_ANON_KEY
         ADMIN_USER_ID
         ADMIN_NOTIF_EMAIL
         CRON_SECRET (random 32 char)

[  ] 3. Buka /api/admin/setup (jadikan lo admin)
[  ] 4. Turnstile keys (CF Dashboard → Turnstile)
[  ] 5. Resend API key (notif email)
[  ] 6. Paywuz API key + merchant ID (QRIS)"""
pdf.body_text(pending)
pdf.ln(8)

# ─── FOOTER NOTE ───
pdf.set_font("DejaVu", "", 7)
pdf.set_text_color(150, 150, 150)
pdf.cell(0, 5, "Dokumentasi ini digenerate otomatis — Juli 2026", align="C", new_x="LMARGIN", new_y="NEXT")
pdf.cell(0, 5, "Tepi.my.id — Free subdomain for developers Indonesia", align="C")

# ─── SAVE ───
pdf.output("/root/work/tepi-arsitektur.pdf")
print("✅ PDF generated: /root/work/tepi-arsitektur.pdf")
print(f"Pages: {pdf.pages_count}")
