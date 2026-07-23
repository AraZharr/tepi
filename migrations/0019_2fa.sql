-- Migration 0019: Add 2FA columns to users table
-- Run via: wrangler d1 execute tepi-db --remote --file=migrations/0019_2fa.sql

ALTER TABLE users ADD COLUMN totp_enabled INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN totp_secret TEXT;
ALTER TABLE users ADD COLUMN backup_codes TEXT; -- JSON array of hashed backup codes

CREATE INDEX IF NOT EXISTS idx_users_totp_enabled ON users(totp_enabled);