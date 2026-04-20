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

-- Architect-authored quizzes (saved for assignment to librarians).
CREATE TABLE architect_quizzes (
  id VARCHAR(64) NOT NULL,
  architect_user_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(512) NOT NULL,
  template_id VARCHAR(64) NOT NULL DEFAULT 'custom',
  items_json JSON NOT NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  PRIMARY KEY (architect_user_id, id),
  KEY idx_aq_updated (architect_user_id, updated_at),
  CONSTRAINT fk_aq_architect FOREIGN KEY (architect_user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Which librarians receive which quiz (by architect).
CREATE TABLE quiz_assignments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  quiz_id VARCHAR(64) NOT NULL,
  architect_user_id BIGINT UNSIGNED NOT NULL,
  librarian_user_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_quiz_lib (quiz_id, architect_user_id, librarian_user_id),
  KEY idx_qa_lib (librarian_user_id),
  CONSTRAINT fk_qa_quiz FOREIGN KEY (architect_user_id, quiz_id)
    REFERENCES architect_quizzes (architect_user_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_qa_librarian FOREIGN KEY (librarian_user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Architect requests assigned to Fabricators.
CREATE TABLE architect_requests (
  id VARCHAR(64) NOT NULL,
  architect_user_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(512) NOT NULL,
  wing VARCHAR(64) NOT NULL DEFAULT 'general',
  difficulty VARCHAR(32) NOT NULL DEFAULT 'mixed',
  framing VARCHAR(32) NOT NULL DEFAULT 'either',
  tags TEXT NULL,
  notes TEXT NULL,
  requester_hint VARCHAR(512) NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  PRIMARY KEY (architect_user_id, id),
  KEY idx_ar_updated (architect_user_id, updated_at),
  CONSTRAINT fk_ar_architect FOREIGN KEY (architect_user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE fabricator_request_assignments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  request_id VARCHAR(64) NOT NULL,
  architect_user_id BIGINT UNSIGNED NOT NULL,
  fabricator_user_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_req_fab (request_id, architect_user_id, fabricator_user_id),
  KEY idx_fra_fabricator (fabricator_user_id),
  CONSTRAINT fk_fra_request FOREIGN KEY (architect_user_id, request_id)
    REFERENCES architect_requests (architect_user_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_fra_fabricator FOREIGN KEY (fabricator_user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE fabricator_request_workflows (
  request_id VARCHAR(64) NOT NULL,
  architect_user_id BIGINT UNSIGNED NOT NULL,
  fabricator_user_id BIGINT UNSIGNED NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'queued',
  fabricator_notes TEXT NULL,
  handoff_summary TEXT NULL,
  fabricator_wing_id VARCHAR(64) NULL,
  architect_notes TEXT NULL,
  claimed_at DATETIME(3) NULL,
  submitted_for_review_at DATETIME(3) NULL,
  last_decision_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  PRIMARY KEY (architect_user_id, request_id),
  KEY idx_frw_status (architect_user_id, status, updated_at),
  KEY idx_frw_fabricator (fabricator_user_id, updated_at),
  CONSTRAINT fk_frw_request FOREIGN KEY (architect_user_id, request_id)
    REFERENCES architect_requests (architect_user_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_frw_fabricator FOREIGN KEY (fabricator_user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE fabricator_wings (
  id VARCHAR(64) NOT NULL,
  architect_user_id BIGINT UNSIGNED NOT NULL,
  request_id VARCHAR(64) NOT NULL,
  fabricator_user_id BIGINT UNSIGNED NULL,
  wing_name VARCHAR(512) NOT NULL,
  shelves_json JSON NOT NULL,
  platforms_json JSON NOT NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  PRIMARY KEY (architect_user_id, id),
  KEY idx_fw_request (architect_user_id, request_id),
  CONSTRAINT fk_fw_request FOREIGN KEY (architect_user_id, request_id)
    REFERENCES architect_requests (architect_user_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_fw_fabricator FOREIGN KEY (fabricator_user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE fabricator_wing_assignments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  wing_id VARCHAR(64) NOT NULL,
  architect_user_id BIGINT UNSIGNED NOT NULL,
  librarian_user_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_fwa (wing_id, architect_user_id, librarian_user_id),
  KEY idx_fwa_librarian (librarian_user_id),
  CONSTRAINT fk_fwa_wing FOREIGN KEY (architect_user_id, wing_id)
    REFERENCES fabricator_wings (architect_user_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_fwa_librarian FOREIGN KEY (librarian_user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;
