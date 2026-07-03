-- ─────────────────────────────────────────────────────────────────────────────
-- Skema Database D1 untuk tepi.my.id
-- ─────────────────────────────────────────────────────────────────────────────
-- Cara eksekusi:
-- 1. Buka Cloudflare Dashboard → D1 → tepi-db
-- 2. Tab "Console"
-- 3. Paste seluruh isi file ini → klik Execute
-- ─────────────────────────────────────────────────────────────────────────────

-- User profile (ID = Supabase Auth UID)
CREATE TABLE IF NOT EXISTS users (
  id           TEXT PRIMARY KEY,
  email        TEXT NOT NULL,
  full_name    TEXT,
  phone        TEXT,
  country      TEXT,
  created_at   TEXT DEFAULT (datetime('now')),
  is_suspended INTEGER DEFAULT 0
);

-- Subdomain yang sudah diklaim dan aktif
CREATE TABLE IF NOT EXISTS subdomains (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id          TEXT NOT NULL REFERENCES users(id),
  name             TEXT UNIQUE NOT NULL,
  target_type      TEXT NOT NULL,       -- 'CNAME' | 'A'
  target_value     TEXT NOT NULL,       -- domain atau IP tujuan
  cf_record_id     TEXT,               -- ID record di Cloudflare (untuk update/delete)
  status           TEXT DEFAULT 'pending', -- pending | active | expired | suspended | quarantine
  plan             TEXT DEFAULT 'free', -- free | paid
  expires_at       TEXT,               -- ISO datetime
  quarantine_until TEXT,               -- diisi saat masuk quarantine
  created_at       TEXT DEFAULT (datetime('now'))
);

-- Formulir pendaftaran subdomain (pending review admin)
CREATE TABLE IF NOT EXISTS subdomain_applications (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id             TEXT NOT NULL REFERENCES users(id),
  subdomain_name      TEXT NOT NULL,
  target_platform     TEXT NOT NULL,   -- 'github_pages' | 'vercel' | 'cloudflare_pages' | 'vps' | 'other'
  target_url          TEXT NOT NULL,
  project_type        TEXT NOT NULL,   -- 'portfolio' | 'blog' | 'tools_app' | 'dev_testing' | 'community' | 'other'
  project_description TEXT NOT NULL,   -- min 100 karakter
  is_public           INTEGER NOT NULL, -- 1 = ya, 0 = tidak
  has_monetization    INTEGER NOT NULL, -- 1 = ya, 0 = tidak
  github_link         TEXT,
  linkedin_link       TEXT,
  social_link         TEXT,
  status              TEXT DEFAULT 'pending', -- pending | approved | rejected
  reject_reason       TEXT,
  reviewed_at         TEXT,
  created_at          TEXT DEFAULT (datetime('now'))
);

-- Riwayat pembayaran
CREATE TABLE IF NOT EXISTS payments (
  id                     INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id                TEXT NOT NULL REFERENCES users(id),
  subdomain_id           INTEGER REFERENCES subdomains(id),
  order_id               TEXT UNIQUE NOT NULL, -- ID yang KITA generate, dikirim sebagai orderId ke Paywuz
  paywuz_transaction_id  TEXT,                  -- UUID dari Paywuz (field "id" di response mereka)
  amount                 INTEGER NOT NULL,      -- Rupiah, sebelum fee (5000 untuk plan tahunan)
  fee                    INTEGER,               -- fee yang dipotong Paywuz, diisi setelah webhook diterima
  total_payment          INTEGER,               -- amount + fee jika feeByMerchant=false
  payment_method         TEXT DEFAULT 'QRIS',
  status                 TEXT DEFAULT 'pending', -- pending | success | failed | cancelled (mengikuti vocabulary Paywuz)
  paid_at                TEXT,
  created_at             TEXT DEFAULT (datetime('now'))
);

-- Audit log semua aksi penting
CREATE TABLE IF NOT EXISTS activity_logs (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    TEXT,
  action     TEXT NOT NULL,  -- 'claim' | 'update_dns' | 'delete' | 'suspend' | 'approve' | 'reject'
  detail     TEXT,           -- JSON string untuk detail tambahan
  ip_address TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Laporan abuse dari publik
CREATE TABLE IF NOT EXISTS abuse_reports (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  subdomain_name TEXT NOT NULL,
  reporter_email TEXT,
  reason         TEXT NOT NULL,
  status         TEXT DEFAULT 'pending', -- pending | reviewed | actioned
  created_at     TEXT DEFAULT (datetime('now'))
);

-- Indexes untuk query yang sering dipakai
CREATE INDEX IF NOT EXISTS idx_subdomains_user_id ON subdomains(user_id);
CREATE INDEX IF NOT EXISTS idx_subdomains_status ON subdomains(status);
CREATE INDEX IF NOT EXISTS idx_subdomains_expires_at ON subdomains(expires_at);
CREATE INDEX IF NOT EXISTS idx_applications_status ON subdomain_applications(status);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_abuse_reports_status ON abuse_reports(status);
