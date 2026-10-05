import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePageTransition } from "../contexts/PageTransitionContext";
import { layDeckTheoId } from "../services/deckApi";
import { layCardsTheoDeck } from "../services/cardApi";

/**
 * Tải bộ từ và thẻ từ API; hiển thị lỗi để người học thử lại.
 * Đồng thời báo trạng thái tải cho overlay chuyển trang.
 */
export default function useBoTuHoc(boId, tenTrang) {
  const { setPageDataLoading } = usePageTransition();
  const [bo, setBo] = useState(null);
  const [danhSachGoc, setDanhSachGoc] = useState([]);
  const [dangTai, setDangTai] = useState(true);
  const [loi, setLoi] = useState("");
  const requestRef = useRef(0);

  async function taiDuLieu(requestId) {
    setDangTai(true);
    setLoi("");
    try {
      const [deck, cards] = await Promise.all([layDeckTheoId(boId), layCardsTheoDeck(boId)]);
      if (requestId !== requestRef.current) return;
      setBo(deck);
      setDanhSachGoc(cards);
    } catch (error) {
      if (requestId !== requestRef.current) return;
      setBo(null);
      setDanhSachGoc([]);
      setLoi(error.message);
    } finally {
      if (requestId === requestRef.current) setDangTai(false);
    }
  }

  useEffect(() => {
    taiDuLieu(++requestRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boId]);

  useLayoutEffect(() => {
    const loadingKey = `${tenTrang}-${boId}`;
    setPageDataLoading(loadingKey, dangTai);

    return () => {
      setPageDataLoading(loadingKey, false);
    };
  }, [boId, dangTai, setPageDataLoading, tenTrang]);

  function taiLai() {
    setDangTai(true);
    setLoi("");
    taiDuLieu(++requestRef.current);
  }

  return { bo, danhSachGoc, dangTai, loi, taiLai };
}
