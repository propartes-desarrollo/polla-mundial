-- Migration 0002: required seed data (idempotent)
-- Phases are REQUIRED: matches.phase_id references them during the API sync.

INSERT OR IGNORE INTO phases (id, name, status) VALUES
  ('phase_groups', 'Fase de Grupos', 'PENDING'),
  ('phase_16', 'Dieciseisavos de Final', 'PENDING'),
  ('phase_8', 'Octavos de Final', 'PENDING'),
  ('phase_4', 'Cuartos de Final', 'PENDING'),
  ('phase_semi', 'Semifinales', 'PENDING'),
  ('phase_3rd', 'Tercer Puesto', 'PENDING'),
  ('phase_final', 'Final', 'PENDING');

-- Initial admin user. CHANGE THIS PASSWORD HASH before going live.
INSERT OR IGNORE INTO users (id, name, phone, password_hash, role) VALUES
  ('admin_001', 'Admin Inicial', '0000000000', 'admin123', 'ADMIN');
