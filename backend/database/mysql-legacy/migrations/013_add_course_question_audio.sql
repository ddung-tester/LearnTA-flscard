-- Câu bài tập nghe của khoá học riêng:
-- audio_path: file nghe của đề thi (object private trên Cloud Storage, backend chỉ phát cho chủ khoá)
-- listen_text: lời thoại để trình duyệt đọc (Quiz nghe trong tài liệu học có lời thoại nhưng không có file audio)
ALTER TABLE course_questions
  ADD COLUMN audio_path VARCHAR(255) NULL AFTER image_description,
  ADD COLUMN listen_text TEXT NULL AFTER audio_path;
