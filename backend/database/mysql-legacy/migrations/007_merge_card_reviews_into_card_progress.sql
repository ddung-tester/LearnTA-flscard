-- Gop lich on SRS ve mot noi: card_progress (moi user + card chi co mot level).
-- Truoc day card_reviews va card_progress luu level rieng theo 2 luat khac nhau.
-- Neu ca hai deu co du lieu, giu ban duoc on gan nhat.
-- card_reviews duoc giu lai de doi chieu, code khong con doc/ghi bang nay.

INSERT INTO card_progress
  (user_id, card_id, mastery_level, review_count, last_reviewed_at, next_review_at)
SELECT
  cr.user_id,
  cr.card_id,
  LEAST(cr.level, 5),
  cr.review_count,
  cr.last_reviewed_at,
  cr.next_review_at
FROM card_reviews cr
WHERE cr.card_id IS NOT NULL
ON DUPLICATE KEY UPDATE
  -- MySQL gan tu trai sang phai: so sanh last_reviewed_at truoc khi cot nay bi ghi de.
  mastery_level = IF(
    COALESCE(VALUES(last_reviewed_at), '1970-01-02') > COALESCE(card_progress.last_reviewed_at, '1970-01-02'),
    VALUES(mastery_level),
    card_progress.mastery_level
  ),
  next_review_at = IF(
    COALESCE(VALUES(last_reviewed_at), '1970-01-02') > COALESCE(card_progress.last_reviewed_at, '1970-01-02'),
    VALUES(next_review_at),
    card_progress.next_review_at
  ),
  review_count = GREATEST(card_progress.review_count, VALUES(review_count)),
  last_reviewed_at = COALESCE(
    GREATEST(card_progress.last_reviewed_at, VALUES(last_reviewed_at)),
    card_progress.last_reviewed_at,
    VALUES(last_reviewed_at)
  );
