USE edu_survey;

-- Default password for demo accounts: 123456
UPDATE users
SET password_hash = '$2b$10$JXXWQsv1kvzW1TYcqCmE9u.tAUhWVi0NqHaPtRlII0/AVttD4rQZe'
WHERE email IN ('admin@example.com', 'creator@example.com', 'student@example.com');
