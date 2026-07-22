-- Support multiple DNS records per application
-- Store as JSON array: [{"type": "CNAME", "value": "..."}, {"type": "TXT", "value": "..."}]
ALTER TABLE subdomain_applications ADD COLUMN dns_records TEXT;
