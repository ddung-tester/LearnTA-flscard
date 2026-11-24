import { createContext, useCallback, useContext, useEffect, useState } from "react";

// Thẻ đang hiển thị ở trang học — để LearnBot trả lời "từ này" đúng ngữ cảnh
const ChatbotContext = createContext(null);

export function ChatbotProvider({ children }) {
  const [theDangHoc, setTheDangHoc] = useState(null);
  // Ngữ cảnh trang (buổi học, bước, câu vừa trả lời, tên trang) — chỉ id/mã, server tự đọc nội dung
  const [nguCanhTrang, setNguCanhTrang] = useState(null);
  // Trang khác nhờ LearnBot hỏi giúp một câu: widget mở khung chat và gửi ngay
  const [yeuCauHoi, setYeuCauHoi] = useState(null);
  const hoiLearnBot = useCallback((text) => setYeuCauHoi({ text, luc: Date.now() }), []);
  const xongYeuCauHoi = useCallback(() => setYeuCauHoi(null), []);

  return (
    <ChatbotContext.Provider value={{ theDangHoc, setTheDangHoc, nguCanhTrang, setNguCanhTrang, yeuCauHoi, hoiLearnBot, xongYeuCauHoi }}>
      {children}
    </ChatbotContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheDangHoc() {
  return useContext(ChatbotContext)?.theDangHoc ?? null;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useHoiLearnBot() {
  return useContext(ChatbotContext)?.hoiLearnBot ?? null;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useYeuCauHoiLearnBot() {
  const ctx = useContext(ChatbotContext);
  return { yeuCauHoi: ctx?.yeuCauHoi ?? null, xongYeuCauHoi: ctx?.xongYeuCauHoi };
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

// eslint-disable-next-line react-refresh/only-export-components
export function useNguCanhTrang() {
  return useContext(ChatbotContext)?.nguCanhTrang ?? null;
}

/**
 * Đặt trong JSX của trang để LearnBot biết người học đang ở đâu:
 * <ChatbotNguCanhTrang trang="on-tap" /> hoặc courseId/lessonNumber/buoc, questionId + traLoi (chỉ sau khi đã trả lời).
 * Trang nào đặt sau (lồng bên trong) thì ghi đè các trường của trang ngoài. Tự xoá khi rời trang.
 */
export function ChatbotNguCanhTrang({ trang = null, courseId = null, lessonNumber = null, buoc = null, questionId = null, traLoi = null }) {
  const setNguCanhTrang = useContext(ChatbotContext)?.setNguCanhTrang;
  useEffect(() => {
    if (!setNguCanhTrang) return undefined;
    const moi = Object.fromEntries(
      Object.entries({ trang, courseId, lessonNumber, buoc, questionId, traLoi }).filter(([, giaTri]) => giaTri !== null && giaTri !== undefined && giaTri !== "")
    );
    setNguCanhTrang((cu) => ({ ...(cu || {}), ...moi }));
    return () =>
      setNguCanhTrang((cu) => {
        if (!cu) return cu;
        const conLai = { ...cu };
        for (const khoa of Object.keys(moi)) delete conLai[khoa];
        return Object.keys(conLai).length ? conLai : null;
      });
  }, [setNguCanhTrang, trang, courseId, lessonNumber, buoc, questionId, traLoi]);
  return null;
}
