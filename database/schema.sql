-- Simplified database design for:
-- Phan mem khao sat lay y kien cac ben lien quan trong giao duc
-- Target DBMS: MySQL 8+

CREATE DATABASE IF NOT EXISTS edu_survey
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE edu_survey;

-- 1. Users: store all account types in one table.
-- role: admin, survey_creator, respondent, student
-- stakeholder_group is only used for respondents.
CREATE TABLE users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  student_code VARCHAR(20) UNIQUE,
  full_name VARCHAR(150) NOT NULL,
  class_name VARCHAR(30),
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'survey_creator', 'respondent', 'student') NOT NULL DEFAULT 'student',
  stakeholder_group ENUM('student', 'lecturer', 'alumni', 'employer', 'staff') DEFAULT NULL,
  status ENUM('active', 'locked') NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. Surveys: store survey information.
CREATE TABLE surveys (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  creator_id BIGINT NOT NULL,
  target_group ENUM('student', 'lecturer', 'alumni', 'employer', 'all') NOT NULL DEFAULT 'all',
  start_date DATETIME,
  end_date DATETIME,
  status ENUM('draft', 'published', 'closed') NOT NULL DEFAULT 'draft',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_surveys_creator
    FOREIGN KEY (creator_id) REFERENCES users(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
);

-- 3. Questions: each question belongs directly to one survey.
-- This removes the separate question bank to keep the system simple.
CREATE TABLE questions (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  survey_id BIGINT NOT NULL,
  content TEXT NOT NULL,
  question_type ENUM('single_choice', 'multiple_choice', 'rating', 'text') NOT NULL,
  is_required BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_questions_survey
    FOREIGN KEY (survey_id) REFERENCES surveys(id)
    ON DELETE CASCADE ON UPDATE CASCADE
);

-- 4. Question options: choices for single-choice and multiple-choice questions.
CREATE TABLE question_options (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  question_id BIGINT NOT NULL,
  option_text VARCHAR(255) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  CONSTRAINT fk_question_options_question
    FOREIGN KEY (question_id) REFERENCES questions(id)
    ON DELETE CASCADE ON UPDATE CASCADE
);

-- 5. Responses: one submitted survey response.
-- respondent_id can be NULL if the survey allows public/anonymous access later.
CREATE TABLE responses (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  survey_id BIGINT NOT NULL,
  respondent_id BIGINT,
  submitted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_responses_survey
    FOREIGN KEY (survey_id) REFERENCES surveys(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_responses_respondent
    FOREIGN KEY (respondent_id) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE
);

-- 6. Answers: detail answers for each response.
-- For multiple-choice questions, save one row per selected option.
-- For text questions, use answer_text.
-- For rating questions, use rating_value.
CREATE TABLE answers (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  response_id BIGINT NOT NULL,
  question_id BIGINT NOT NULL,
  option_id BIGINT,
  answer_text TEXT,
  rating_value INT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_answers_response
    FOREIGN KEY (response_id) REFERENCES responses(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_answers_question
    FOREIGN KEY (question_id) REFERENCES questions(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_answers_option
    FOREIGN KEY (option_id) REFERENCES question_options(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT chk_answers_rating_value CHECK (rating_value IS NULL OR rating_value BETWEEN 1 AND 5)
);

CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_surveys_status ON surveys(status);
CREATE INDEX idx_surveys_creator ON surveys(creator_id);
CREATE INDEX idx_questions_survey ON questions(survey_id);
CREATE INDEX idx_responses_survey ON responses(survey_id);
CREATE INDEX idx_answers_response ON answers(response_id);

-- Default password for seed accounts: 123456
INSERT INTO users (full_name, email, password_hash, role, stakeholder_group) VALUES
('Quản trị viên', 'admin@example.com', '$2b$10$JXXWQsv1kvzW1TYcqCmE9u.tAUhWVi0NqHaPtRlII0/AVttD4rQZe', 'admin', 'staff'),
('Cán bộ khảo sát', 'creator@example.com', '$2b$10$JXXWQsv1kvzW1TYcqCmE9u.tAUhWVi0NqHaPtRlII0/AVttD4rQZe', 'survey_creator', 'staff'),
('Người tham gia mẫu', 'student@example.com', '$2b$10$JXXWQsv1kvzW1TYcqCmE9u.tAUhWVi0NqHaPtRlII0/AVttD4rQZe', 'student', 'student');
