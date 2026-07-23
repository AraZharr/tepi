-- Migration 0017: Webhook subscriptions table
-- Run via: wrangler d1 execute tepi-db --remote --file=migrations/0017_webhooks.sql

CREATE TABLE IF NOT EXISTS webhook_subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id),
  url TEXT NOT NULL,           -- Target URL to receive webhooks
  secret TEXT NOT NULL,        -- HMAC secret for signature verification
  events TEXT NOT NULL,        -- JSON array of subscribed events
  active INTEGER DEFAULT 1,    -- 1 = active, 0 = disabled
  created_at TEXT DEFAULT (datetime('now')),
  last_triggered_at TEXT       -- Last successful delivery timestamp
);

CREATE INDEX IF NOT EXISTS idx_webhook_subscriptions_user ON webhook_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_webhook_subscriptions_active ON webhook_subscriptions(active);