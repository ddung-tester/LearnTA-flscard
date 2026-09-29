import { useCallback, useEffect, useRef, useState } from "react";
import { matchPath, useLocation } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { useTheDangHoc } from "../contexts/ChatbotContext";
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

function taoGoiY({ tuDangHoc, coDeck, daDangNhap }) {
  const goiY = [];
  if (tuDangHoc) {
    goiY.push(`Giải thích từ "${tuDangHoc}"`, `Đặt 3 câu với "${tuDangHoc}"`, `Mẹo nhớ từ "${tuDangHoc}"`);
  } else if (coDeck) {
    goiY.push("Tóm tắt các từ trong bộ này", "Viết đoạn văn ngắn dùng các từ trong bộ");
  }
  if (daDangNhap) goiY.push("Giúp mình ôn các từ hay sai");
  return goiY.length > 0 ? goiY : SUGGESTIONS;
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
  const deckId = Number(matchPath("/decks/:deckId/*", pathname)?.params.deckId) || null;
  const cardId = theDangHoc?.id ?? null;
  const nhanNguCanh = theDangHoc?.tu
    ? `📌 Đang học: ${theDangHoc.tu}`
    : deckId
      ? "📘 Theo bộ từ hiện tại"
      : "Hỏi đáp tiếng Anh miễn phí";
  const goiY = taoGoiY({ tuDangHoc: theDangHoc?.tu, coDeck: Boolean(deckId), daDangNhap: isAuthenticated });

  // Auto-scroll khi có tin mới
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

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
          context: { deckId, cardId },
        });

        setMessages((prev) => [
          ...prev,
          { role: "model", parts: [{ text: data.reply }] },
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
    [messages, loading, open, deckId, cardId]
  );

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

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
