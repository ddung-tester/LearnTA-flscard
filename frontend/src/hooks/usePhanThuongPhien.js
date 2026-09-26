import { useEffect, useRef, useState } from "react";

/**
 * Chuỗi hiệu ứng của thanh tiến độ + phần thưởng khi đạt mốc số câu đúng.
 * phase: "idle" → "correctPulse" → ("beamLaunch" → hiện thưởng → "rewardComplete") → "idle"
 */
export default function usePhanThuongPhien({ batReward, soCauDungNhanThuong }) {
  const [phase, setPhase] = useState("idle");
  const [hienReward, setHienReward] = useState(false);
  const [dangChoReward, setDangChoReward] = useState(false);
  const [lanReward, setLanReward] = useState(0);
  const timerRef = useRef(null);

  function xoaTimer() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  function henGio(fn, ms) {
    xoaTimer();
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      fn();
    }, ms);
  }

  useEffect(() => xoaTimer, []);

  // Gọi khi trả lời đúng một câu được tính vào tiến độ.
  function ghiNhanCauDung(soCauDungMoi) {
    setPhase("correctPulse");
    const coReward = batReward && soCauDungMoi % soCauDungNhanThuong === 0;

    if (!coReward) {
      setDangChoReward(false);
      henGio(() => setPhase("idle"), 680);
      return;
    }

    setDangChoReward(true);
    henGio(() => {
      setPhase("beamLaunch");
      setLanReward((lan) => lan + 1);
      setHienReward(true);
    }, 560);
  }

  // Gọi khi hiệu ứng thưởng đã đóng hẳn (onHideComplete).
  function ketThucReward() {
    setDangChoReward(false);
    setPhase("rewardComplete");
    henGio(() => setPhase("idle"), 780);
  }

  function datLai() {
    xoaTimer();
    setDangChoReward(false);
    setHienReward(false);
    setPhase("idle");
  }

  return {
    phase,
    hienReward,
    dangChoReward,
    lanReward,
    // Đang chờ hoặc đang hiện thưởng: tạm khóa chuyển câu
    dangBan: hienReward || dangChoReward,
    dongReward: () => setHienReward(false),
    ghiNhanCauDung,
    ketThucReward,
    datLai,
  };
}
