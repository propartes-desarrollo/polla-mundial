-- Initial Seed for Phases
INSERT INTO phases (id, name, status) VALUES
  ('phase_groups', 'Fase de Grupos', 'PENDING'),
  ('phase_16', 'Dieciseisavos de Final', 'PENDING'),
  ('phase_8', 'Octavos de Final', 'PENDING'),
  ('phase_4', 'Cuartos de Final', 'PENDING'),
  ('phase_semi', 'Semifinales', 'PENDING'),
  ('phase_3rd', 'Tercer Puesto', 'PENDING'),
  ('phase_final', 'Final', 'PENDING');

-- Example Admin User (Password: admin123 -> Hash it in production!)
-- Note: Replace with real bcrypt hash in production
INSERT INTO users (id, name, phone, password_hash, role) VALUES 
  ('admin_001', 'Admin Inicial', '0000000000', 'admin123', 'ADMIN');

-- Example Teams (A subset for testing)
INSERT INTO teams (id, name, group_name) VALUES
  ('team_arg', 'Argentina', 'Group A'),
  ('team_bra', 'Brasil', 'Group B'),
  ('team_col', 'Colombia', 'Group C'),
  ('team_esp', 'España', 'Group D');
