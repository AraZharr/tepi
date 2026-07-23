-- NS Add-on: NS records + pricing
-- subdomain_applications: add ns_records JSON + ns_addon boolean
ALTER TABLE subdomain_applications ADD COLUMN ns_records TEXT;
ALTER TABLE subdomain_applications ADD COLUMN ns_addon INTEGER DEFAULT 0;

-- subdomains: add ns_records JSON + ns_addon boolean + plan stays free/paid
ALTER TABLE subdomains ADD COLUMN ns_records TEXT;
ALTER TABLE subdomains ADD COLUMN ns_addon INTEGER DEFAULT 0;

-- payments: store base_amount + ns_addon_amount for transparency
ALTER TABLE payments ADD COLUMN base_amount INTEGER DEFAULT 5000;
ALTER TABLE payments ADD COLUMN ns_addon_amount INTEGER DEFAULT 0;