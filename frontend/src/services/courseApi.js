import api, { getStoredAuthToken } from "./api";
import { buildApiUrl } from "../config/api";

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

/** File nghe riêng tư của câu bài tập (cần đăng nhập) → Blob để phát bằng object URL */
export async function layAudioCauHoi(questionId) {
  const response = await api.get(`/course-questions/${encodeURIComponent(questionId)}/audio`, {
    responseType: "blob",
  });
  return response.data;
}

/** Lưu kết quả lần trả lời gần nhất (server tự chấm) để tiến độ bài tập còn sau khi tải lại trang */
export async function luuTraLoiCauHoi(questionId, answer) {
  const response = await api.post(`/course-questions/${encodeURIComponent(questionId)}/answer`, {
    answer,
  });
  return response.data;
}

/**
 * answer: chữ cái lựa chọn (trắc nghiệm) hoặc câu trả lời đã gõ (điền từ).
 * onChunk (tuỳ chọn): nhận toàn bộ chữ đã có mỗi khi AI viết thêm (server gửi dần, ?stream=1).
 * Trả về { explanation } khi xong.
 */
export async function giaiThichCauHoi(questionId, answer, { onChunk } = {}) {
  const duongDan = `/course-questions/${encodeURIComponent(questionId)}/explain`;
  if (!onChunk || typeof ReadableStream === "undefined") {
    const response = await api.post(duongDan, { answer });
    return response.data;
  }

  // axios không đọc được luồng trong trình duyệt, nên dùng fetch
  const token = getStoredAuthToken();
  const response = await fetch(buildApiUrl(`/api${duongDan}?stream=1`), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ answer }),
  });
  if (!response.ok) {
    const loi = await response.json().catch(() => ({}));
    throw new Error(loi.message || "AI chưa giải thích được, thử lại sau");
  }

  const doc = response.body.getReader();
  const giaiMa = new TextDecoder();
  let explanation = "";
  for (;;) {
    const { done, value } = await doc.read();
    if (done) break;
    explanation += giaiMa.decode(value, { stream: true });
    onChunk(explanation);
  }
  explanation += giaiMa.decode();
  return { explanation: explanation.trim() };
}
