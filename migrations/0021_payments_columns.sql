-- 0021: ensure payments columns exist (prod may have skipped 0009 ALTER)
-- SQLite/D1: ADD COLUMN fails if exists — deploy workflow continues on error.

ALTER TABLE payments ADD COLUMN invoice_number TEXT;
ALTER TABLE payments ADD COLUMN base_amount INTEGER DEFAULT 5000;
ALTER TABLE payments ADD COLUMN ns_addon_amount INTEGER DEFAULT 0;
ALTER TABLE payments ADD COLUMN receipt_sent INTEGER DEFAULT 0;
ALTER TABLE payments ADD COLUMN receipt_url TEXT;
ALTER TABLE payments ADD COLUMN proration_days INTEGER DEFAULT 0;
ALTER TABLE payments ADD COLUMN auto_renew_enabled INTEGER DEFAULT 0;
ALTER TABLE payments ADD COLUMN fee INTEGER;
ALTER TABLE payments ADD COLUMN total_payment INTEGER;
ALTER TABLE payments ADD COLUMN payment_method TEXT DEFAULT 'QRIS';
ALTER TABLE payments ADD COLUMN paywuz_transaction_id TEXT;
ALTER TABLE payments ADD COLUMN paid_at TEXT;
