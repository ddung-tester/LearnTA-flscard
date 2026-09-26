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

/** answer: chữ cái lựa chọn (trắc nghiệm) hoặc câu trả lời đã gõ (điền từ) */
export async function giaiThichCauHoi(questionId, answer) {
  const response = await api.post(`/course-questions/${encodeURIComponent(questionId)}/explain`, {
    answer,
  });
  return response.data;
}
