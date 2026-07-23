-- Migration 0016: Auto-renew toggle + NS record IDs tracking
-- Add ns_record_ids to track Cloudflare NS record IDs for cleanup
-- Add auto_renew flag for paid subdomains

ALTER TABLE subdomains ADD COLUMN ns_record_ids TEXT;
ALTER TABLE subdomains ADD COLUMN auto_renew INTEGER DEFAULT 0;

-- Also add to payments for proration tracking
ALTER TABLE payments ADD COLUMN proration_days INTEGER DEFAULT 0;
ALTER TABLE payments ADD COLUMN auto_renew_enabled INTEGER DEFAULT 0;