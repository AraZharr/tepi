-- Migration 0018: Subdomain lock + activity log improvements
-- Run via: wrangler d1 execute tepi-db --remote --file=migrations/0018_subdomain_lock.sql

-- subdomains: add lock column to prevent accidental changes/deletion
ALTER TABLE subdomains ADD COLUMN locked INTEGER DEFAULT 0;

-- activity_logs: add subdomain_id for better filtering
ALTER TABLE activity_logs ADD COLUMN subdomain_id INTEGER REFERENCES subdomains(id);

CREATE INDEX IF NOT EXISTS idx_activity_logs_subdomain ON activity_logs(subdomain_id);