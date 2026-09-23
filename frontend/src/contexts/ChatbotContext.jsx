import { createContext, useContext, useEffect, useState } from "react";

// Thẻ đang hiển thị ở trang học — để LearnBot trả lời "từ này" đúng ngữ cảnh
const ChatbotContext = createContext(null);

export function ChatbotProvider({ children }) {
  const [theDangHoc, setTheDangHoc] = useState(null);

  return (
    <ChatbotContext.Provider value={{ theDangHoc, setTheDangHoc }}>
      {children}
    </ChatbotContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheDangHoc() {
  return useContext(ChatbotContext)?.theDangHoc ?? null;
}

/**
 * Đặt trong JSX của trang học: <ChatbotTheDangHoc the={theHienTai} />
 * Tự xoá khi rời trang.
 */
export function ChatbotTheDangHoc({ the }) {
  const setTheDangHoc = useContext(ChatbotContext)?.setTheDangHoc;
  const id = Number(the?.id);
  const tu = the?.term_en ?? the?.word ?? "";
  const hopLe = Number.isInteger(id) && id > 0;

  useEffect(() => {
    if (!setTheDangHoc) return undefined;
    setTheDangHoc(hopLe ? { id, tu } : null);
    return () => setTheDangHoc(null);
  }, [setTheDangHoc, hopLe, id, tu]);

  return null;
}
