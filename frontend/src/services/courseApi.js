import api from "./api";

export async function layDanhSachKhoaHoc() {
  const response = await api.get("/courses");
  return response.data;
}

export async function layBaiHoc(courseId, soBai) {
  const response = await api.get(
    `/courses/${encodeURIComponent(courseId)}/lessons/${encodeURIComponent(soBai)}`
  );
  return response.data;
}

/** Câu bài tập đến hạn ôn (từng làm sai) của mọi khoá, mỗi câu kèm lesson_number và course_id */
export async function layCauHoiCanOn() {
  const response = await api.get("/course-questions/due");
  return response.data;
}

/** Lưu kết quả lần trả lời gần nhất (server tự chấm) để tiến độ bài tập còn sau khi tải lại trang */
export async function luuTraLoiCauHoi(questionId, answer) {
  const response = await api.post(`/course-questions/${encodeURIComponent(questionId)}/answer`, {
    answer,
  });
  return response.data;
}

/** answer: chữ cái lựa chọn (trắc nghiệm) hoặc câu trả lời đã gõ (điền từ) */
export async function giaiThichCauHoi(questionId, answer) {
  const response = await api.post(`/course-questions/${encodeURIComponent(questionId)}/explain`, {
    answer,
  });
  return response.data;
}
