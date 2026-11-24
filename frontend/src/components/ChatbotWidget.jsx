import { useCallback, useEffect, useRef, useState } from "react";
import { matchPath, useLocation, useNavigate } from "react-router-dom";
import api, { THOI_GIAN_CHO_AI_MS } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { useNguCanhTrang, useTheDangHoc, useYeuCauHoiLearnBot } from "../contexts/ChatbotContext";
import { useToast } from "../contexts/ToastContext";
import { luuTuHoiLearnBot, TEN_BO_HOI_LEARNBOT } from "../services/tuHoiLearnBot";
import "./ChatbotWidget.css";

// Dấu chân mèo: đệm chân + 4 đệm ngón (avatar của LearnBot)
function ChanMeo({ className }) {
  return (
    <svg className={className} viewBox="0 0 64 64" aria-hidden="true">
      <path className="chan-meo__dem" d="M32 58c-9.5 0-17.5-5-17.5-12.2C14.5 37.5 23 29 32 29s17.5 8.5 17.5 16.8C49.5 53 41.5 58 32 58z" />
      <ellipse className="chan-meo__ngon" cx="13.5" cy="27" rx="6" ry="7.8" transform="rotate(-22 13.5 27)" />
      <ellipse className="chan-meo__ngon" cx="24.5" cy="14.5" rx="6.3" ry="8.4" transform="rotate(-8 24.5 14.5)" />
      <ellipse className="chan-meo__ngon" cx="39.5" cy="14.5" rx="6.3" ry="8.4" transform="rotate(8 39.5 14.5)" />
      <ellipse className="chan-meo__ngon" cx="50.5" cy="27" rx="6" ry="7.8" transform="rotate(22 50.5 27)" />
    </svg>
  );
}

// ---- Markdown renderer cơ bản (không cần thư viện ngoài) ----
function renderMarkdown(text) {
  return text
    // escape HTML trước — nội dung từ AI/user không được chèn thẻ thật
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    // gạch đầu dòng "- " / "* " → dấu chấm tròn (trước khi xử lý *italic*)
    .replace(/^[ \t]*[-*][ \t]+/gm, "• ")
    // **bold**
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    // *italic*
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    // `code`
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    // xuống dòng kép → paragraph break
    .replace(/\n\n/g, "<br/><br/>")
    // xuống dòng đơn
    .replace(/\n/g, "<br/>");
}

const SUGGESTIONS = [
  "Khi nào dùng 'since' vs 'for'?",
  "Phân biệt 'make' và 'do'",
  "Cách dùng Present Perfect",
  "Giải thích phrasal verb: 'give up'",
];

const TEN_BUOC = { "tu-vung": "Từ vựng", "ly-thuyet": "Lý thuyết", "bai-tap": "Bài tập" };

// Gợi ý câu hỏi theo đúng chỗ người học đang đứng (kế hoạch AI sâu 11/2026)
function taoGoiY({ tuDangHoc, coDeck, daDangNhap, nguCanh }) {
  const goiY = [];
  if (nguCanh?.questionId) {
    goiY.push("Vì sao câu này chọn như vậy?", "Cho mình 2 câu tương tự để luyện", "Mẹo nhớ để không sai lại");
  } else if (nguCanh?.lessonNumber) {
    if (nguCanh.buoc === "ly-thuyet") goiY.push("Tóm tắt lý thuyết buổi này thật ngắn", "Lỗi người Việt hay mắc ở phần này?");
    else if (nguCanh.buoc === "bai-tap") goiY.push("Nhắc lại công thức của buổi này", "Mình đang sai những câu nào?");
    else goiY.push("Đặt câu ví dụ với các từ của buổi này", "Kiểm tra nhanh mình 5 từ của buổi này");
    goiY.push("Cho mình 3 câu luyện tập về buổi này");
  } else if (nguCanh?.trang === "hom-nay" || nguCanh?.trang === "khoa-hoc") {
    goiY.push("Hôm nay mình nên học gì?", "Mình đang yếu phần nào?");
  } else if (nguCanh?.trang === "on-tap") {
    goiY.push("Giải thích nhanh các từ mình hay sai", "Mẹo ôn từ cho nhớ lâu");
  }
  if (tuDangHoc) {
    goiY.push(`Giải thích từ "${tuDangHoc}"`, `Đặt 3 câu với "${tuDangHoc}"`, `Mẹo nhớ từ "${tuDangHoc}"`);
  } else if (coDeck) {
    goiY.push("Tóm tắt các từ trong bộ này", "Viết đoạn văn ngắn dùng các từ trong bộ");
  }
  if (daDangNhap && goiY.length < 4) goiY.push("Giúp mình ôn các từ hay sai");
  return goiY.length > 0 ? goiY.slice(0, 4) : SUGGESTIONS;
}

const WELCOME = {
  role: "model",
  parts: [
    {
      text: "Xin chào! Mình là **LearnBot** 🐾\nMình có thể giải thích ngữ pháp, từ vựng, hoặc bất kỳ câu hỏi tiếng Anh nào của bạn!\n\nBạn muốn hỏi gì nào? 😊",
    },
  ],
};

export default function ChatbotWidget() {
  const [open, setOpen] = useState(false);

  // Esc đóng hộp chat (role="dialog") và trả focus về nút mở
  useEffect(() => {
    if (!open) return undefined;
    function dongBangEsc(event) {
      if (event.key !== "Escape") return;
      setOpen(false);
      document.querySelector(".chatbot-bubble")?.focus?.();
    }
    window.addEventListener("keydown", dongBangEsc);
    return () => window.removeEventListener("keydown", dongBangEsc);
  }, [open]);
  const [messages, setMessages] = useState([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const panelWrapperRef = useRef(null);

  // Ngữ cảnh học: server tự đọc nội dung từ DB theo id và kiểm tra quyền
  const { pathname } = useLocation();
  const { isAuthenticated } = useAuth();
  const theDangHoc = useTheDangHoc();
  const nguCanhTrangDaBao = useNguCanhTrang();
  const { yeuCauHoi, xongYeuCauHoi } = useYeuCauHoiLearnBot();
  const dieuHuong = useNavigate();
  const toast = useToast();
  const deckId = Number(matchPath("/decks/:deckId/*", pathname)?.params.deckId) || null;
  // Học từ của buổi (/khoa-hoc/:c/bai/:n/hoc/...) không qua trang buổi học: đọc buổi từ đường dẫn
  const khopBuoi = matchPath("/khoa-hoc/:courseId/bai/:soBai/*", pathname)?.params;
  const nguCanh = {
    ...(khopBuoi && Number(khopBuoi.courseId) > 0
      ? { courseId: Number(khopBuoi.courseId), lessonNumber: Number(khopBuoi.soBai) || null }
      : {}),
    ...(nguCanhTrangDaBao || {}),
  };
  const cardId = theDangHoc?.id ?? null;
  const nhanNguCanh = nguCanh.questionId
    ? `📌 Câu bài tập vừa làm${nguCanh.lessonNumber ? ` · Buổi ${nguCanh.lessonNumber}` : ""}`
    : theDangHoc?.tu
      ? `📌 Đang học: ${theDangHoc.tu}`
      : nguCanh.lessonNumber
        ? `📘 Buổi ${nguCanh.lessonNumber}${TEN_BUOC[nguCanh.buoc] ? ` · ${TEN_BUOC[nguCanh.buoc]}` : ""}`
        : deckId
          ? "📘 Theo bộ từ hiện tại"
          : isAuthenticated
            ? "Biết tiến độ học của bạn"
            : "Hỏi đáp tiếng Anh miễn phí";
  const goiY = taoGoiY({ tuDangHoc: theDangHoc?.tu, coDeck: Boolean(deckId), daDangNhap: isAuthenticated, nguCanh });
  const khoaNguCanh = JSON.stringify(nguCanh);

  // Auto-scroll khi có tin mới hoặc vừa mở khung. Khung đóng thì bỏ qua: scrollIntoView ép tính
  // bố cục cả trang (~100 ms trên điện thoại) ngay lúc trang đang tải
  useEffect(() => {
    if (!open) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, open]);

  // Focus textarea khi mở — chỉ khi có chuột: trên điện thoại bàn phím bật lên sẽ che khung chat
  useEffect(() => {
    if (open) {
      if (window.matchMedia?.("(pointer: fine)").matches) {
        setTimeout(() => textareaRef.current?.focus(), 150);
      }
      setHasUnread(false);
    }
  }, [open]);

  // Điện thoại: khung chat toàn màn hình, co theo vùng nhìn thấy khi bàn phím mở
  useEffect(() => {
    const vv = window.visualViewport;
    const wrapper = panelWrapperRef.current;
    if (!open || !vv || !wrapper) return undefined;
    const capNhat = () => {
      wrapper.style.setProperty("--chatbot-vh", `${vv.height}px`);
      wrapper.style.setProperty("--chatbot-top", `${vv.offsetTop}px`);
    };
    capNhat();
    vv.addEventListener("resize", capNhat);
    vv.addEventListener("scroll", capNhat);
    return () => {
      vv.removeEventListener("resize", capNhat);
      vv.removeEventListener("scroll", capNhat);
    };
  }, [open]);

  const sendMessage = useCallback(
    async (text) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      const newUserMsg = { role: "user", parts: [{ text: trimmed }] };
      const updatedMessages = [...messages, newUserMsg];

      setMessages(updatedMessages);
      setInput("");
      setLoading(true);

      try {
        // Gửi 20 tin gần nhất (bao gồm message mới vừa thêm) — server giới hạn history.
        // Bỏ tin báo lỗi: không phải lời thật của bot, và có thể làm hai tin "model" đứng liền nhau
        const { data } = await api.post("/chat", {
          messages: updatedMessages.filter((tin) => !tin.laLoi).slice(-20),
          context: { deckId, cardId, ...JSON.parse(khoaNguCanh) },
        }, { timeout: THOI_GIAN_CHO_AI_MS });

        setMessages((prev) => [
          ...prev,
          { role: "model", parts: [{ text: data.reply }], actions: Array.isArray(data.actions) ? data.actions : [] },
        ]);

        // Nếu panel đóng → hiện badge unread
        if (!open) setHasUnread(true);
      } catch (error) {
        // Server trả lời rõ lý do (vd. AI đang bận) qua error.message
        setMessages((prev) => [
          ...prev,
          {
            role: "model",
            laLoi: true,
            parts: [{ text: error.message || "Có lỗi xảy ra. Bạn thử lại nhé!" }],
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [messages, loading, open, deckId, cardId, khoaNguCanh]
  );

  // Trang học nhờ hỏi (vd "Hỏi LearnBot thêm" dưới lời giải thích): mở khung và gửi luôn
  useEffect(() => {
    if (!yeuCauHoi || loading) return;
    xongYeuCauHoi();
    setOpen(true);
    sendMessage(yeuCauHoi.text);
  }, [yeuCauHoi, loading, xongYeuCauHoi, sendMessage]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  // Nút trong câu trả lời: mở trang trong app (server đã kiểm tra đường dẫn) hoặc lưu từ mới
  const [dangLuuTu, setDangLuuTu] = useState({});
  async function bamHanhDong(hanhDong) {
    if (hanhDong.loai === "mo") {
      dieuHuong(hanhDong.to);
      if (!window.matchMedia?.("(min-width: 768px)").matches) setOpen(false);
      return;
    }
    if (hanhDong.loai === "them-tu") {
      const khoa = hanhDong.tu.toLowerCase();
      if (dangLuuTu[khoa]) return;
      setDangLuuTu((cu) => ({ ...cu, [khoa]: "dang-luu" }));
      try {
        const { daCo } = await luuTuHoiLearnBot(hanhDong);
        setDangLuuTu((cu) => ({ ...cu, [khoa]: "xong" }));
        toast.success(daCo ? `"${hanhDong.tu}" đã có trong bộ ${TEN_BO_HOI_LEARNBOT}` : `Đã lưu "${hanhDong.tu}" vào bộ ${TEN_BO_HOI_LEARNBOT}`);
      } catch (error) {
        setDangLuuTu((cu) => ({ ...cu, [khoa]: undefined }));
        toast.error(error.message || "Chưa lưu được từ, thử lại nhé");
      }
    }
  }

  const handleClear = () => {
    setMessages([WELCOME]);
  };

  return (
    <>
      {/* Floating bubble */}
      <button
        className={`chatbot-bubble${open ? " is-open" : ""}`}
        onClick={() => setOpen((v) => !v)}
        title="Hỏi đáp tiếng Anh"
        aria-label="Mở chatbot tiếng Anh"
        id="chatbot-bubble-btn"
      >
        {open ? (
          // X icon
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <ChanMeo className="chan-meo chatbot-bubble__chan" />
        )}
        {hasUnread && !open && <span className="chatbot-badge">1</span>}
      </button>

      {/* Chat panel — always mounted, shown/hidden via CSS transition to avoid jank */}
      <div
        ref={panelWrapperRef}
        className={`chatbot-panel-wrapper${open ? " is-open" : ""}`}
        role="dialog"
        aria-label="Chatbot tiếng Anh"
        aria-hidden={!open}
        inert={!open}
      >
        <div className="chatbot-panel">
          {/* Header */}
          <div className="chatbot-header">
            <div className="chatbot-header-avatar" aria-hidden="true">
              <ChanMeo className="chan-meo" />
            </div>
            <div className="chatbot-header-info">
              <div className="chatbot-header-name">LearnBot</div>
              <div className="chatbot-header-status">
                <span className="chatbot-status-dot" />
                {nhanNguCanh}
              </div>
            </div>
            <button
              className="chatbot-clear-btn"
              onClick={handleClear}
              title="Xoá lịch sử hội thoại"
              aria-label="Xoá lịch sử"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15" aria-hidden="true">
                <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" />
              </svg>
            </button>
            <button
              className="chatbot-close-btn"
              onClick={() => setOpen(false)}
              aria-label="Đóng chatbot"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="chatbot-messages" role="log" aria-live="polite">
            {messages.map((msg, i) => (
              <div key={i} className={`chatbot-msg ${msg.role}${msg.laLoi ? " is-loi" : ""}`}>
                <div
                  className="chatbot-bubble-text"
                  dangerouslySetInnerHTML={{
                    __html: renderMarkdown(msg.parts[0].text),
                  }}
                />
                {msg.actions?.length > 0 && (
                  <div className="chatbot-actions">
                    {msg.actions.map((hanhDong) => {
                      const trangThai = hanhDong.loai === "them-tu" ? dangLuuTu[hanhDong.tu.toLowerCase()] : null;
                      return (
                        <button
                          key={`${hanhDong.loai}-${hanhDong.to || hanhDong.tu}`}
                          type="button"
                          className={`chatbot-action-btn${hanhDong.loai === "them-tu" ? " chatbot-action-btn--tu" : ""}`}
                          onClick={() => bamHanhDong(hanhDong)}
                          disabled={trangThai === "dang-luu" || trangThai === "xong"}
                          title={hanhDong.loai === "them-tu" ? `Lưu vào bộ ${TEN_BO_HOI_LEARNBOT}` : hanhDong.to}
                        >
                          {hanhDong.loai === "mo"
                            ? `${hanhDong.nhan} →`
                            : trangThai === "xong"
                              ? `✓ Đã lưu "${hanhDong.tu}"`
                              : trangThai === "dang-luu"
                                ? "Đang lưu..."
                                : `+ Lưu từ "${hanhDong.tu}"${hanhDong.nghia ? ` (${hanhDong.nghia})` : ""}`}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="chatbot-typing" role="status" aria-label="LearnBot đang trả lời">
                <ChanMeo className="chan-meo" />
                <ChanMeo className="chan-meo" />
                <ChanMeo className="chan-meo" />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggested questions (chỉ hiện khi chỉ có tin welcome) */}
          {messages.length === 1 && (
            <div className="chatbot-suggestions">
              {goiY.map((s) => (
                <button
                  key={s}
                  className="chatbot-suggestion-btn"
                  onClick={() => sendMessage(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="chatbot-input-row">
            <textarea
              ref={textareaRef}
              className="chatbot-textarea"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                // Auto-resize
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 96) + "px";
              }}
              onKeyDown={handleKeyDown}
              placeholder="Nhập câu hỏi tiếng Anh..."
              rows={1}
              disabled={loading}
              aria-label="Nhập câu hỏi"
              id="chatbot-input"
            />
            <button
              className="chatbot-send-btn"
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading}
              aria-label="Gửi tin nhắn"
              id="chatbot-send-btn"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
