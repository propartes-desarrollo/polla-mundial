-- Migration 0004: recarga de apuesta para las fases finales
-- NOTE: SQLite ALTER TABLE ADD COLUMN has no "IF NOT EXISTS"; run this once.

ALTER TABLE users ADD COLUMN recharged BOOLEAN NOT NULL DEFAULT 0;

INSERT OR IGNORE INTO settings (key, value) VALUES ('recharge_fee', '30000');
