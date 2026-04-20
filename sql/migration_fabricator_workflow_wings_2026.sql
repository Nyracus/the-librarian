-- Shared Fabricator workflow + explorable wing publishing
-- Run on configured DB (api/.env MYSQL_DATABASE):
--   mysql -u root -p librarian < sql/migration_fabricator_workflow_wings_2026.sql

CREATE TABLE IF NOT EXISTS fabricator_request_workflows (
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
  CONSTRAINT fk_frw_fabricator FOREIGN KEY (fabricator_user_id)
    REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS fabricator_wings (
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
  CONSTRAINT fk_fw_fabricator FOREIGN KEY (fabricator_user_id)
    REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS fabricator_wing_assignments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  wing_id VARCHAR(64) NOT NULL,
  architect_user_id BIGINT UNSIGNED NOT NULL,
  librarian_user_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_fwa (wing_id, architect_user_id, librarian_user_id),
  KEY idx_fwa_librarian (librarian_user_id),
  CONSTRAINT fk_fwa_wing FOREIGN KEY (architect_user_id, wing_id)
    REFERENCES fabricator_wings (architect_user_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_fwa_librarian FOREIGN KEY (librarian_user_id)
    REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;
