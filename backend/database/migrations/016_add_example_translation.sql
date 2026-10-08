-- Run once before deploying the API/UI that uses this field.
ALTER TABLE cards ADD COLUMN example_translation TEXT NULL AFTER example_sentence;
