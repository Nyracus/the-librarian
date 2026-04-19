-- Optional: raw PostgreSQL view of the same model (Data Connect generates DDL
-- from the .gql schema; use this only if you need SQL text for Gemini or DBA review).

CREATE TABLE study_participant (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_uid VARCHAR(128) NOT NULL UNIQUE,
  cohort_code VARCHAR(32),
  notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE game_event (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_uid VARCHAR(128) NOT NULL,
  auth_email VARCHAR(320),
  participant_id VARCHAR(64),
  condition VARCHAR(32),
  phase VARCHAR(64),
  screen_id VARCHAR(128),
  item_id VARCHAR(256),
  domain VARCHAR(32) NOT NULL,
  response_json TEXT,
  correctness BOOLEAN,
  response_time_ms INTEGER,
  client_local_id VARCHAR(160),
  client_timestamp TIMESTAMPTZ,
  server_created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_game_event_auth_uid ON game_event (auth_uid);
CREATE INDEX idx_game_event_domain ON game_event (domain);
CREATE INDEX idx_game_event_screen ON game_event (screen_id);
CREATE INDEX idx_game_event_server_created ON game_event (server_created_at);
