import { useEffect, useRef, useState } from "react";
import { getStoredAuthToken } from "../services/api";
import { getUserStats } from "../services/userApi";
import {
  luuKetQuaPhien,
  dongBoKetQuaPhien,
  taoStudySession,
} from "../services/studyApi";
import { SO_TU_MOI_TIEN_TRINH, taoDanhSachTienTrinh, tongKetDapAnPhien } from "../utils/phienHoc";

/**
 * Tạo study session khi bắt đầu một phiên và lưu kết quả khi phiên xong:
 * quiz result, kết thúc session, đáp án (server tự cập nhật SRS từ đáp án), streak.
 *
 * Mỗi bộ (boId, mode, direction, onlyFavorite, randomOrder, tongSoCau, lanLam) là
 * một phiên riêng: đổi bất kỳ giá trị nào sẽ tạo session mới và cho phép lưu lại.
 *
 * ketQua (đọc lúc phiên xong): { soCauDung, maxCombo, soTienTrinhHoanThanh, progressSegments, answers }
 * onHoanThanh(ketQua): gọi một lần khi phiên xong, trước khi gửi lên server.
 */
export default function useLuuKetQuaPhien({
  bo,
  boId,
  mode,
  questionType,
  direction,
  onlyFavorite,
  randomOrder,
  tongSoCau,
  lanLam,
  daHoanThanh,
  ketQua,
  onHoanThanh,
}) {
  const khoaPhien = [boId, mode, direction, onlyFavorite, randomOrder, tongSoCau, lanLam].join("|");
  const [phien, setPhien] = useState({ khoa: null, id: null });
  const [loiLuu, setLoiLuu] = useState({ khoa: null, message: "" });
  const [thuLuu, setThuLuu] = useState({ khoa: null, lan: 0 });
  const lanThuLuu = thuLuu.khoa === khoaPhien ? thuLuu.lan : 0;
  const [dangLuu, setDangLuu] = useState(false);
  const [streakCelebration, setStreakCelebration] = useState(null);
  const phienDangTaoRef = useRef(null);
  const khoaDaLuuRef = useRef(null);
  const prevStreakRef = useRef(null);
  const ketQuaRef = useRef({ ketQua, onHoanThanh });

  const studySessionId = phien.khoa === khoaPhien ? phien.id : null;

  useEffect(() => {
    ketQuaRef.current = { ketQua, onHoanThanh };
  });

  // Lấy streak hiện tại làm mốc để phát hiện streak tăng sau khi học xong (khách không có streak)
  useEffect(() => {
    if (!getStoredAuthToken()) return;
    getUserStats()
      .then((stats) => {
        prevStreakRef.current = stats.current_streak ?? 0;
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!bo || tongSoCau === 0) return undefined;

    let daHuy = false;
    const danhSachTienTrinh = taoDanhSachTienTrinh(tongSoCau);

    if (phienDangTaoRef.current?.khoa !== khoaPhien) {
      phienDangTaoRef.current = {
        khoa: khoaPhien,
        promise: taoStudySession({
        deck_id: boId,
        mode,
        direction,
        only_favorite: onlyFavorite,
        random_order: randomOrder,
        total: tongSoCau,
        segment_size: SO_TU_MOI_TIEN_TRINH,
        segment_total: danhSachTienTrinh.length,
        segment_completed: 0,
        progress_segments: danhSachTienTrinh.map((tienTrinh) => ({
          segment_index: tienTrinh.index,
          current: 0,
          total: tienTrinh.totalValue,
          is_completed: false,
        })),
        }),
      };
    }
    phienDangTaoRef.current.promise
      .then((session) => {
        if (!daHuy) setPhien({ khoa: khoaPhien, id: session.id });
      })
      .catch((error) => {
        if (!daHuy) setLoiLuu({ khoa: khoaPhien, message: error.message });
      });

    return () => {
      daHuy = true;
    };
    // khoaPhien đã gồm mọi tham số của payload
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bo, khoaPhien]);

  useEffect(() => {
    if (!bo || !daHoanThanh || tongSoCau === 0) return;
    if (!studySessionId) return;
    if (khoaDaLuuRef.current === `${khoaPhien}|${lanThuLuu}`) return;
    khoaDaLuuRef.current = `${khoaPhien}|${lanThuLuu}`;

    const { ketQua: raw, onHoanThanh: xuLyHoanThanh } = ketQuaRef.current;
    const score = tongKetDapAnPhien(raw.answers);
    const kq = { ...raw, soCauDung: score.correct, answers: score.answers };
    const khoaLuc = khoaPhien;
    const sessionId = studySessionId;
    const review = tongSoCau - kq.soCauDung;

    if (lanThuLuu === 0) xuLyHoanThanh?.(kq);

    async function luuLenBackend() {
      try {
        setDangLuu(true);
        setLoiLuu({ khoa: khoaLuc, message: "" });
        if (lanThuLuu > 0) await dongBoKetQuaPhien(sessionId);
        else await luuKetQuaPhien(sessionId, {
          quiz: {
            deck_id: boId, question_type: questionType, direction,
            correct: kq.soCauDung, review, total: tongSoCau,
            progress_segments: kq.progressSegments,
          },
          finish: {
            correct: kq.soCauDung, review, total: tongSoCau,
            xp_earned: kq.soCauDung * 10, max_combo: kq.maxCombo,
            segment_size: SO_TU_MOI_TIEN_TRINH,
            segment_total: kq.progressSegments.length,
            segment_completed: kq.soTienTrinhHoanThanh,
            progress_segments: kq.progressSegments,
          },
          answers: kq.answers,
        });

        if (!getStoredAuthToken()) return;
        try {
          const stats = await getUserStats();
          const newStreak = stats.current_streak ?? 0;
          const prevStreak = prevStreakRef.current;
          prevStreakRef.current = newStreak;

          // BoCuc header cập nhật streak badge
          window.dispatchEvent(new CustomEvent("streak-updated", { detail: { streak: newStreak } }));

          if (prevStreak !== null && newStreak > prevStreak && newStreak > 0) {
            setStreakCelebration(newStreak);
          }
        } catch {
          // silent — không ảnh hưởng UX chính
        }
      } catch (error) {
        setLoiLuu({ khoa: khoaLuc, message: error.message });
      } finally {
        setDangLuu(false);
      }
    }

    luuLenBackend();
    // Chỉ chạy một lần khi phiên vừa xong; các giá trị còn lại đọc tại thời điểm đó
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bo, daHoanThanh, khoaPhien, studySessionId, lanThuLuu]);

  return {
    thuLuuLai: () => setThuLuu({ khoa: khoaPhien, lan: lanThuLuu + 1 }),
    dangLuuKetQua: dangLuu,
    loiLuuKetQua: loiLuu.khoa === khoaPhien ? loiLuu.message : "",
    streakCelebration,
    dongStreakCelebration: () => setStreakCelebration(null),
  };
}
