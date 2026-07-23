-- Migration 0017: API tokens + webhook outgoing
ALTER TABLE users ADD COLUMN api_token TEXT UNIQUE;
ALTER TABLE users ADD COLUMN api_token_created_at TEXT;
ALTER TABLE users ADD COLUMN api_token_last_used_at TEXT;
ALTER TABLE users ADD COLUMN api_token_name TEXT;

-- Webhook subscriptions for outgoing events
CREATE TABLE IF NOT EXISTS webhook_subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id),
  url TEXT NOT NULL,
  secret TEXT NOT NULL,
  events TEXT NOT NULL, -- JSON array: ['subdomain.created', 'subdomain.renewed', 'subdomain.expired', 'payment.paid']
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  last_triggered_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_webhook_subscriptions_user ON webhook_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_webhook_subscriptions_active ON webhook_subscriptions(active);