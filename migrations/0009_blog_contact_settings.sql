-- 0009_posts.sql
-- Blog / testimonial posts table

CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  cover_image TEXT,
  author_name TEXT DEFAULT 'tepi.my.id',
  tags TEXT, -- comma-separated
  is_featured INTEGER DEFAULT 0,
  is_published INTEGER DEFAULT 0,
  published_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug);
CREATE INDEX IF NOT EXISTS idx_posts_published ON posts(is_published, published_at);

-- 0010_contact_messages.sql

CREATE TABLE IF NOT EXISTS contact_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT,
  message TEXT NOT NULL,
  is_read INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 0011_site_settings.sql

CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT
);

-- Default settings
INSERT OR IGNORE INTO site_settings (key, value) VALUES
  ('site_name', 'tepi.my.id'),
  ('site_description', 'Free subdomain for Indonesian developers'),
  ('maintenance_mode', 'false'),
  ('ads_enabled', 'true'),
  ('ads_header_code', ''),
  ('ads_footer_code', ''),
  ('social_github', ''),
  ('social_twitter', ''),
  ('social_instagram', ''),
  ('social_tiktok', ''),
  ('social_email', 'hello@tepi.my.id'),
  ('wa_number', '6281234567890'),
  ('og_image_default', '/og-default.png'),
  ('footer_text', '© 2025 tepi.my.id — Free subdomain for developers Indonesia');
