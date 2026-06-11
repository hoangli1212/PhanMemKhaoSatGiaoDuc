USE edu_survey;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS student_code VARCHAR(20) UNIQUE AFTER id;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS class_name VARCHAR(30) AFTER full_name;

ALTER TABLE users
  MODIFY role ENUM('admin', 'survey_creator', 'respondent', 'student') NOT NULL DEFAULT 'student';

UPDATE users
SET role = 'student'
WHERE email = 'student@example.com';
