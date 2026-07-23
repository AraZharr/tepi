-- Migration 0016: Auto-renew toggle + NS record IDs + payment receipt tracking
-- Run via: wrangler d1 execute tepi-db --remote --file=migrations/0016_auto_renew.sql

-- subdomains: add auto_renew toggle
ALTER TABLE subdomains ADD COLUMN auto_renew INTEGER DEFAULT 0;

-- subdomains: store NS record IDs for proper cleanup (JSON array of Cloudflare record IDs)
ALTER TABLE subdomains ADD COLUMN ns_record_ids TEXT;

-- payments: track receipt sent status + receipt URL
ALTER TABLE payments ADD COLUMN receipt_sent INTEGER DEFAULT 0;
ALTER TABLE payments ADD COLUMN receipt_url TEXT;

-- Index for auto-renew queries
CREATE INDEX IF NOT EXISTS idx_subdomains_auto_renew ON subdomains(auto_renew, expires_at);