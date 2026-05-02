USE english_flashcard_quiz_app;

INSERT INTO decks (title, description)
VALUES
  ('IELTS Basic Words', 'Một số từ vựng IELTS cơ bản'),
  ('Daily English', 'Từ vựng giao tiếp hằng ngày');

INSERT INTO cards (deck_id, term_en, meaning_vi, example_sentence, note)
VALUES
  (1, 'improve', 'cải thiện', 'I want to improve my English.', 'verb'),
  (1, 'important', 'quan trọng', 'This is an important lesson.', 'adjective'),
  (1, 'remember', 'ghi nhớ', 'Please remember this word.', 'verb'),
  (1, 'practice', 'luyện tập', 'You should practice every day.', 'verb');
