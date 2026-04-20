-- Run if upgrading an existing DB that predates architect_quizzes / quiz_assignments.
USE librarian;

CREATE TABLE IF NOT EXISTS architect_quizzes (
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

CREATE TABLE IF NOT EXISTS quiz_assignments (
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
