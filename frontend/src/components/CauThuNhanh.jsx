import { useState } from "react";
import { ChatbotNguCanhTrang, useHoiLearnBot } from "../contexts/ChatbotContext";
import { luuTraLoiCoHangCho } from "../services/hangChoTraLoi";
import { laTraLoiDung, layDapAnHienThi, taoCauHoiLearnBot } from "../utils/baiTapKhoaHoc";

/**
 * CauThuNhanh — "Thử ngay" dưới một mục lý thuyết: một câu bài tập của chính mục đó (grammar_id),
 * làm tại chỗ để biết đã hiểu chưa. Câu trả lời được lưu như làm ở bước Bài tập (tính vào tiến độ buổi).
 * cacCau: câu của mục, câu chưa đúng xếp trước; onGhiNhan(cauId, dung) báo trang buổi học.
 */
export default function CauThuNhanh({ cacCau, onGhiNhan }) {
  const hoiLearnBot = useHoiLearnBot();
  const [chiSo, setChiSo] = useState(0);
  const [traLoi, setTraLoi] = useState(null);
  const [go, setGo] = useState("");
  const cau = cacCau[chiSo % cacCau.length];
  if (!cau) return null;
  const laTracNghiem = cau.type === "multiple_choice";
  const dung = traLoi !== null && laTraLoiDung(cau, traLoi);

  function nop(giaTri) {
    const chu = String(giaTri ?? "").trim();
    if (!chu || traLoi !== null) return;
    setTraLoi(chu);
    onGhiNhan?.(cau.id, laTraLoiDung(cau, chu));
    luuTraLoiCoHangCho(cau.id, chu);
  }

  function cauKhac() {
    setChiSo((so) => so + 1);
    setTraLoi(null);
    setGo("");
  }

  return (
    <div className="kh-thu-ngay" aria-label="Thử ngay câu của mục này">
      <p className="kh-thu-ngay__nhan">Thử ngay</p>
      <p className="kh-thu-ngay__de" lang="en">{cau.prompt}</p>
      {laTracNghiem ? (
        <div className="kh-thu-ngay__lua-chon">
          {(cau.options || []).map((luaChon) => (
            <button
              key={luaChon.key}
              type="button"
              disabled={traLoi !== null}
              onClick={() => nop(luaChon.key)}
              className={`kh-thu-ngay__nut${
                traLoi !== null && luaChon.key === cau.answer_key
                  ? " kh-thu-ngay__nut--dung"
                  : traLoi === luaChon.key
                    ? " kh-thu-ngay__nut--sai"
                    : ""
              }`}
            >
              <span aria-hidden="true">{luaChon.key}</span> {luaChon.text}
            </button>
          ))}
        </div>
      ) : (
        <form
          className="kh-thu-ngay__go"
          onSubmit={(event) => {
            event.preventDefault();
            nop(go);
          }}
        >
          <input
            value={go}
            onChange={(event) => setGo(event.target.value)}
            disabled={traLoi !== null}
            aria-label="Câu trả lời"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
          />
          <button type="submit" className="ui-button ui-button--primary" disabled={traLoi !== null || !go.trim()}>
            Kiểm tra
          </button>
        </form>
      )}
      {traLoi !== null && (
        <div className={`kh-thu-ngay__ket-qua${dung ? " kh-thu-ngay__ket-qua--dung" : ""}`} role="status">
          <ChatbotNguCanhTrang questionId={cau.id} traLoi={traLoi} />
          <p>
            {dung ? "Đúng rồi." : `Chưa đúng. Đáp án: ${layDapAnHienThi(cau)}. Đọc lại công thức ở trên rồi thử câu khác.`}
          </p>
          <div className="kh-thu-ngay__hanh-dong">
            {!dung && (
              <button type="button" className="ui-button ui-button--ghost" onClick={() => hoiLearnBot(taoCauHoiLearnBot(cau, traLoi, null))}>
                Vì sao sai? Hỏi LearnBot
              </button>
            )}
            {cacCau.length > 1 && (
              <button type="button" className="ui-button ui-button--ghost" onClick={cauKhac}>
                Thử câu khác
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
