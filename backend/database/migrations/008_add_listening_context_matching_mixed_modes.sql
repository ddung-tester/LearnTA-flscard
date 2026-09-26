-- Them 4 che do hoc moi (giong luyentu): nghe viet, ngu canh, noi tu, hon hop.
-- Chi mo rong ENUM, du lieu cu giu nguyen.

ALTER TABLE study_sessions
  MODIFY COLUMN mode ENUM(
    'flashcard', 'quiz', 'written', 'review',
    'listening', 'context', 'matching', 'mixed'
  ) NOT NULL;

ALTER TABLE quiz_results
  MODIFY COLUMN question_type ENUM(
    'multiple_choice', 'written', 'flashcard',
    'listening', 'context', 'matching', 'mixed'
  ) NOT NULL;
