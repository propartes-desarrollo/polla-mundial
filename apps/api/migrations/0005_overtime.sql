-- Migration 0005: detalle de definición en tiempo extra / penales
-- Permite mostrar "Avanza X por penales" y el marcador de penales / gol en
-- tiempo extra, conservando el marcador de los 90' en home_score/away_score.
-- NOTE: SQLite ALTER TABLE ADD COLUMN no tiene "IF NOT EXISTS"; correr una vez.

ALTER TABLE matches ADD COLUMN duration TEXT;        -- REGULAR | EXTRA_TIME | PENALTY_SHOOTOUT
ALTER TABLE matches ADD COLUMN winner TEXT;          -- HOME | AWAY (quién avanzó)
ALTER TABLE matches ADD COLUMN penalty_home INTEGER; -- marcador de la tanda de penales
ALTER TABLE matches ADD COLUMN penalty_away INTEGER;
ALTER TABLE matches ADD COLUMN full_home INTEGER;    -- marcador final en cancha (incluye tiempo extra)
ALTER TABLE matches ADD COLUMN full_away INTEGER;
