-- Architect -> Fabricator request assignment tables (MySQL/MariaDB)
-- Run on the same DB used by api/.env (typically `librarian`):
--   mysql -u root -p librarian < sql/migration_fabricator_requests_2026.sql

CREATE TABLE IF NOT EXISTS architect_requests (
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

CREATE TABLE IF NOT EXISTS fabricator_request_assignments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  request_id VARCHAR(64) NOT NULL,
  architect_user_id BIGINT UNSIGNED NOT NULL,
  fabricator_user_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_req_fab (request_id, architect_user_id, fabricator_user_id),
  KEY idx_fra_fabricator (fabricator_user_id),
  CONSTRAINT fk_fra_request FOREIGN KEY (architect_user_id, request_id)
    REFERENCES architect_requests (architect_user_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_fra_fabricator FOREIGN KEY (fabricator_user_id)
    REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;
