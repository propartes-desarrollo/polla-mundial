-- Migration 0003: payment tracking + configurable inscription fee
-- NOTE: SQLite ALTER TABLE ADD COLUMN has no "IF NOT EXISTS"; run this once.

ALTER TABLE users ADD COLUMN paid BOOLEAN NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT OR IGNORE INTO settings (key, value) VALUES ('inscription_fee', '50000');
