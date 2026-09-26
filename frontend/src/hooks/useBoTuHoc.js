import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePageTransition } from "../contexts/PageTransitionContext";
import { layBoTheoId, layTheoBoId } from "../data/duLieuMau";
import { layDeckTheoId } from "../services/deckApi";
import { layCardsTheoDeck } from "../services/cardApi";

/**
 * Tải bộ từ + danh sách thẻ cho một trang học; lỗi API thì dùng dữ liệu mẫu nếu có.
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
    try {
      const [deck, cards] = await Promise.all([layDeckTheoId(boId), layCardsTheoDeck(boId)]);
      if (requestId !== requestRef.current) return;
      setBo(deck);
      setDanhSachGoc(cards);
    } catch (error) {
      if (requestId !== requestRef.current) return;
      const mockDeck = layBoTheoId(boId);
      const mockCards = layTheoBoId(boId);
      if (mockDeck && mockCards && mockCards.length > 0) {
        setBo(mockDeck);
        setDanhSachGoc(mockCards);
      } else {
        setBo(null);
        setDanhSachGoc([]);
        setLoi(error.message);
      }
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
