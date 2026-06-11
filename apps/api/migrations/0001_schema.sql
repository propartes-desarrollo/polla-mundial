-- Migration 0001: initial schema
-- Applied with: wrangler d1 migrations apply polla-db [--remote]

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'USER', -- 'ADMIN' or 'USER'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Invitations Table
CREATE TABLE IF NOT EXISTS invitations (
  id TEXT PRIMARY KEY,
  token TEXT UNIQUE NOT NULL,
  used BOOLEAN NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME
);

-- Phases Table
CREATE TABLE IF NOT EXISTS phases (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'OPEN', 'CLOSED'
  open_at DATETIME,
  close_at DATETIME
);

-- Teams Table
CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  group_name TEXT,
  flag_url TEXT
);

-- Matches Table
CREATE TABLE IF NOT EXISTS matches (
  id TEXT PRIMARY KEY,
  api_match_id TEXT UNIQUE,
  phase_id TEXT NOT NULL,
  home_team_id TEXT NOT NULL,
  away_team_id TEXT NOT NULL,
  match_date DATETIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'SCHEDULED', -- 'SCHEDULED', 'IN_PLAY', 'FINISHED'
  home_score INTEGER,
  away_score INTEGER,
  FOREIGN KEY (phase_id) REFERENCES phases(id),
  FOREIGN KEY (home_team_id) REFERENCES teams(id),
  FOREIGN KEY (away_team_id) REFERENCES teams(id)
);

-- Predictions Table
CREATE TABLE IF NOT EXISTS predictions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  match_id TEXT NOT NULL,
  predicted_home INTEGER NOT NULL,
  predicted_away INTEGER NOT NULL,
  locked BOOLEAN NOT NULL DEFAULT 0,
  points INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (match_id) REFERENCES matches(id),
  UNIQUE(user_id, match_id)
);

-- Special Predictions Table (Champion, Runner up, Top Scorer)
CREATE TABLE IF NOT EXISTS special_predictions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  champion_team_id TEXT,
  runner_up_team_id TEXT,
  top_scorer_name TEXT,
  locked BOOLEAN NOT NULL DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (champion_team_id) REFERENCES teams(id),
  FOREIGN KEY (runner_up_team_id) REFERENCES teams(id)
);

-- Rankings Table
CREATE TABLE IF NOT EXISTS rankings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  total_points INTEGER NOT NULL DEFAULT 0,
  exact_scores INTEGER NOT NULL DEFAULT 0,
  correct_winners INTEGER NOT NULL DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
