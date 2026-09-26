import ComboDisplay from "./ComboDisplay";
import SegmentedRewardProgressBar from "./SegmentedRewardProgressBar";

/**
 * ThanhTienDoPhien — chip chiều hỏi, "Câu x/y", thanh tiến độ theo đoạn và combo.
 * tienTrinh: kết quả của tinhTienTrinh() trong utils/phienHoc.
 */
export default function ThanhTienDoPhien({
  className = "",
  nhanCheDo,
  soCauDung,
  tongSoCau,
  tienTrinh,
  phase,
  originRef,
  endpointRef,
  combo,
  comboPhase,
}) {
  return (
    <div className={className}>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="ui-mode-chip">{nhanCheDo}</span>
        <span className="text-xs font-semibold tabular-nums text-[var(--mau-chu-phu)]">
          Câu <span className="text-[var(--mau-chu)]">{Math.min(soCauDung + 1, tongSoCau)}</span>/{tongSoCau}
        </span>
      </div>
      <SegmentedRewardProgressBar
        segments={tienTrinh.cacThanh}
        totalCorrect={soCauDung}
        totalTarget={tongSoCau}
        activeSegmentIndex={tienTrinh.chiSoDangHoatDong}
        phase={phase}
        activeEndRef={originRef}
        endpointRef={endpointRef}
        combo={combo}
      />
      <div className="mt-2 flex justify-end">
        <ComboDisplay
          combo={combo}
          phase={comboPhase}
          progressPercent={tienTrinh.tienDoDoanHienTai}
        />
      </div>
    </div>
  );
}
