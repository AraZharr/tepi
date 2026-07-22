-- is-a.dev model: explicit DNS record type + value on applications
ALTER TABLE subdomain_applications ADD COLUMN record_type TEXT;
ALTER TABLE subdomain_applications ADD COLUMN record_value TEXT;
