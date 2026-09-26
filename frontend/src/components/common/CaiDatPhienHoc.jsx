import ModeSwitch from "./ModeSwitch";
import StudySettingsPopover from "./StudySettingsPopover";
import ToggleSwitch from "./ToggleSwitch";

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
          <input
            id={idMocReward}
            type="number"
            min="1"
            value={soCauDungNhanThuong}
            onChange={onDoiMocReward}
            className="ui-input--compact rounded-lg border border-[var(--mau-vien)] bg-[var(--mau-input)] text-[var(--mau-chu)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)]"
          />
        </div>
      </section>
    </StudySettingsPopover>
  );
}
