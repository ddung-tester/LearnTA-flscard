import { useCallback, useEffect, useRef, useState } from "react";
import api from "../services/api";
import "./ChatbotWidget.css";

// ---- Markdown renderer cơ bản (không cần thư viện ngoài) ----
function renderMarkdown(text) {
  return text
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

const WELCOME = {
  role: "model",
  parts: [
    {
      text: "Xin chào! Mình là **LearnBot** 🤖\nMình có thể giải thích ngữ pháp, từ vựng, hoặc bất kỳ câu hỏi tiếng Anh nào của bạn!\n\nBạn muốn hỏi gì nào? 😊",
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

  // Auto-scroll khi có tin mới
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Focus textarea khi mở
  useEffect(() => {
    if (open) {
      setTimeout(() => textareaRef.current?.focus(), 150);
      setHasUnread(false);
    }
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
        // Gửi toàn bộ history (bao gồm message mới vừa thêm)
        const { data } = await api.post("/chat", {
          messages: updatedMessages,
        });

        setMessages((prev) => [
          ...prev,
          { role: "model", parts: [{ text: data.reply }] },
        ]);

        // Nếu panel đóng → hiện badge unread
        if (!open) setHasUnread(true);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            role: "model",
            parts: [
              {
                text: "❌ Có lỗi xảy ra. Hãy thử lại nhé!",
              },
            ],
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [messages, loading, open]
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
        className="chatbot-bubble"
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
          // Chat icon
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        )}
        {hasUnread && !open && <span className="chatbot-badge">1</span>}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="chatbot-panel" role="dialog" aria-label="Chatbot tiếng Anh">
          {/* Header */}
          <div className="chatbot-header">
            <div className="chatbot-header-avatar">🤖</div>
            <div className="chatbot-header-info">
              <div className="chatbot-header-name">LearnBot</div>
              <div className="chatbot-header-status">
                <span className="chatbot-status-dot" />
                Hỏi đáp tiếng Anh miễn phí
              </div>
            </div>
            <button
              className="chatbot-clear-btn"
              onClick={handleClear}
              title="Xoá lịch sử hội thoại"
              aria-label="Xoá lịch sử"
            >
              🗑
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
              <div key={i} className={`chatbot-msg ${msg.role}`}>
                <div
                  className="chatbot-bubble-text"
                  dangerouslySetInnerHTML={{
                    __html: renderMarkdown(msg.parts[0].text),
                  }}
                />
              </div>
            ))}
            {loading && (
              <div className="chatbot-typing" aria-label="LearnBot đang trả lời">
                <span /><span /><span />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggested questions (chỉ hiện khi chỉ có tin welcome) */}
          {messages.length === 1 && (
            <div className="chatbot-suggestions">
              {SUGGESTIONS.map((s) => (
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
      )}
    </>
  );
}
