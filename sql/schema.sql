-- Librarian thesis prototype — MySQL 8+ schema (utf8mb4, JSON columns).
-- Run: mysql -u root -p < sql/schema.sql

CREATE DATABASE IF NOT EXISTS librarian
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE librarian;

-- Linked to Firebase Auth (Google / email); server verifies ID tokens.
CREATE TABLE users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  firebase_uid VARCHAR(128) NOT NULL,
  email VARCHAR(320) NULL,
  user_role ENUM('librarian', 'architect', 'fabricator') NULL,
  last_seen_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uk_users_firebase (firebase_uid),
  KEY idx_users_email (email(191))
) ENGINE=InnoDB;

-- Full app state blob (includes progress, world, architect quiz session, etc.).
CREATE TABLE user_game_states (
  user_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  state_json JSON NOT NULL,
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_ugs_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Architect question bank (CMS).
CREATE TABLE question_bank_entries (
  id VARCHAR(64) NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  label VARCHAR(512) NOT NULL,
  wing VARCHAR(32) NOT NULL,
  difficulty VARCHAR(16) NOT NULL,
  status VARCHAR(16) NOT NULL,
  tags_json JSON NULL,
  notes TEXT NULL,
  item_json JSON NOT NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  PRIMARY KEY (user_id, id),
  CONSTRAINT fk_qb_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  KEY idx_qb_updated (user_id, updated_at)
) ENGINE=InnoDB;

-- Research / game telemetry (one row per log event from client).
CREATE TABLE research_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NULL,
  local_id VARCHAR(128) NULL,
  payload_json JSON NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_logs_user_created (user_id, created_at),
  KEY idx_logs_local (local_id),
  CONSTRAINT fk_logs_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Aggregated stats for leaderboard (updated from client sync).
CREATE TABLE leaderboard_stats (
  user_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  firebase_uid VARCHAR(128) NOT NULL,
  display_email VARCHAR(320) NULL,
  participant_id VARCHAR(128) NULL,
  correct_count INT NOT NULL DEFAULT 0,
  wrong_count INT NOT NULL DEFAULT 0,
  graded_count INT NOT NULL DEFAULT 0,
  accuracy_pct INT NOT NULL DEFAULT 0,
  total_response_time_ms BIGINT NOT NULL DEFAULT 0,
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_lb_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  KEY idx_lb_accuracy (accuracy_pct DESC, graded_count DESC)
) ENGINE=InnoDB;

-- Extra localStorage mirrors (architect requests + fabricator workflows).
CREATE TABLE user_aux_data (
  user_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  architect_requests_json JSON NULL,
  fabricator_workflows_json JSON NULL,
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_aux_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;
