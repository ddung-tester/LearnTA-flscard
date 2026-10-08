import { useEffect, useLayoutEffect, useRef, useState } from "react";
import ModeSwitch from "./ModeSwitch";
import StudySettingsPopover from "./StudySettingsPopover";
import ToggleSwitch from "./ToggleSwitch";

const MOC_TOI_THIEU = 1;
const MOC_TOI_DA = 99;

function kepMoc(so) {
  return Math.min(MOC_TOI_DA, Math.max(MOC_TOI_THIEU, so));
}

/**
 * Ô nhập mốc thưởng: giữ bản nháp riêng để xoá trắng rồi gõ số khác được (trước đây ô trống bị ép về 1 ngay),
 * chỉ báo số hợp lệ lên trên; rời ô mà để trống thì trả lại số cũ. Nút −/+ giữ để tăng giảm liên tục.
 */
function ONhapMocThuong({ id, giaTri, onDoi }) {
  const [nhap, setNhap] = useState(String(giaTri));
  const [dangSua, setDangSua] = useState(false);
  const giuRef = useRef(null);
  const giaTriRef = useRef(giaTri);
  useLayoutEffect(() => {
    giaTriRef.current = giaTri;
  });

  const hienThi = dangSua ? nhap : String(giaTri);

  function dungGiu() {
    window.clearTimeout(giuRef.current?.cho);
    window.clearInterval(giuRef.current?.lap);
    giuRef.current = null;
  }

  useEffect(() => dungGiu, []);

  function buoc(huong) {
    const moi = kepMoc(giaTriRef.current + huong);
    // Chạm mốc thì nút bị disabled, pointerup có thể không tới — tự dừng lặp
    if (moi === giaTriRef.current) dungGiu();
    else onDoi(moi);
  }

  function batDauGiu(huong, e) {
    if (e.button !== undefined && e.button !== 0) return;
    e.preventDefault();
    dungGiu();
    setDangSua(false);
    buoc(huong);
    giuRef.current = { cho: window.setTimeout(() => {
      giuRef.current.lap = window.setInterval(() => buoc(huong), 80);
    }, 380) };
  }

  function doiNhap(e) {
    const chuSo = e.target.value.replace(/\D/g, "").slice(0, 2);
    setNhap(chuSo);
    if (chuSo) onDoi(kepMoc(Number(chuSo)));
  }

  return (
    <div className="ui-stepper">
      <button
        type="button"
        className="ui-stepper__nut"
        disabled={giaTri <= MOC_TOI_THIEU}
        aria-label="Giảm mốc thưởng"
        onPointerDown={(e) => batDauGiu(-1, e)}
        onPointerUp={dungGiu}
        onPointerLeave={dungGiu}
        onPointerCancel={dungGiu}
        onClick={(e) => {
          // Bàn phím (Enter/Space) bấm nút: detail = 0; chuột/chạm đã xử lý ở pointerdown
          if (e.detail === 0) buoc(-1);
        }}
      >
        −
      </button>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        value={hienThi}
        onFocus={(e) => {
          setNhap(String(giaTri));
          setDangSua(true);
          e.target.select();
        }}
        onChange={doiNhap}
        onBlur={() => setDangSua(false)}
        onKeyDown={(e) => {
          if (e.key === "ArrowUp" || e.key === "ArrowDown") {
            e.preventDefault();
            setDangSua(false);
            buoc(e.key === "ArrowUp" ? 1 : -1);
          } else if (e.key === "Enter") {
            e.currentTarget.blur();
          }
        }}
        className="ui-input--compact ui-stepper__o rounded-lg border border-[var(--mau-vien)] bg-[var(--mau-input)] text-[var(--mau-chu)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)]"
      />
      <button
        type="button"
        className="ui-stepper__nut"
        disabled={giaTri >= MOC_TOI_DA}
        aria-label="Tăng mốc thưởng"
        onPointerDown={(e) => batDauGiu(1, e)}
        onPointerUp={dungGiu}
        onPointerLeave={dungGiu}
        onPointerCancel={dungGiu}
        onClick={(e) => {
          // Bàn phím (Enter/Space) bấm nút: detail = 0; chuột/chạm đã xử lý ở pointerdown
          if (e.detail === 0) buoc(1);
        }}
      >
        +
      </button>
    </div>
  );
}

/**
 * CaiDatPhienHoc — popover cài đặt dùng chung cho các chế độ học:
 * chiều hỏi (bỏ qua nếu không truyền dsCheDo), chỉ từ yêu thích, thứ tự ngẫu nhiên,
 * phần thưởng và mốc thưởng.
 */
export default function CaiDatPhienHoc({
  label,
  idMocReward,
  dsCheDo,
  cheDo,
  onDoiCheDo,
  chiHocTuYeuThich,
  onDoiYeuThich,
  batRandom,
  onDoiRandom,
  batReward,
  onDoiReward,
  soCauDungNhanThuong,
  onDoiMocReward,
}) {
  return (
    <StudySettingsPopover label={label}>
      <section className="ui-settings-popover__section">
        <p className="ui-settings-popover__title">Học tập</p>
        {dsCheDo && (
          <div className="ui-settings-popover__row">
            <div className="ui-settings-popover__field">
              <span className="ui-settings-popover__label">Ngôn ngữ</span>
              <span className="ui-settings-popover__hint">Đổi chiều câu hỏi và đáp án</span>
            </div>
            <ModeSwitch
              value={cheDo}
              onChange={onDoiCheDo}
              options={dsCheDo}
              ariaLabel="Đổi chiều câu hỏi"
              variant="compact"
            />
          </div>
        )}
        <div className="ui-settings-popover__row">
          <div className="ui-settings-popover__field">
            <span className="ui-settings-popover__label">Chỉ học từ yêu thích</span>
            <span className="ui-settings-popover__hint">Chỉ hỏi các từ đã thả tim</span>
          </div>
          <ToggleSwitch
            checked={chiHocTuYeuThich}
            onChange={onDoiYeuThich}
            ariaLabel={`Chỉ học từ yêu thích ${chiHocTuYeuThich ? "bật" : "tắt"}`}
          />
        </div>
        <div className="ui-settings-popover__row">
          <div className="ui-settings-popover__field">
            <span className="ui-settings-popover__label">Thứ tự ngẫu nhiên</span>
            <span className="ui-settings-popover__hint">Xáo trộn thứ tự câu hỏi mỗi lần chơi</span>
          </div>
          <ToggleSwitch
            checked={batRandom}
            onChange={onDoiRandom}
            ariaLabel={`Ngẫu nhiên ${batRandom ? "bật" : "tắt"}`}
          />
        </div>
      </section>
      <section className="ui-settings-popover__section">
        <p className="ui-settings-popover__title">Phần thưởng</p>
        <div className="ui-settings-popover__row">
          <div className="ui-settings-popover__field">
            <span className="ui-settings-popover__label">Reward</span>
            <span className="ui-settings-popover__hint">Bật hoặc tắt hiệu ứng thưởng</span>
          </div>
          <ToggleSwitch
            checked={batReward}
            onChange={onDoiReward}
            ariaLabel={`Reward ${batReward ? "bật" : "tắt"}`}
          />
        </div>
        <div className="ui-settings-popover__row">
          <div className="ui-settings-popover__field">
            <label htmlFor={idMocReward} className="ui-settings-popover__label">
              Mốc thưởng
            </label>
            <span className="ui-settings-popover__hint">Số câu đúng để kích hoạt thưởng</span>
          </div>
          <ONhapMocThuong id={idMocReward} giaTri={soCauDungNhanThuong} onDoi={onDoiMocReward} />
        </div>
      </section>
    </StudySettingsPopover>
  );
}
