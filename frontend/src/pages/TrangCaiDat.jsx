import { useEffect, useState, useSyncExternalStore } from "react";
import { getUserSettings, updateUserSettings } from "../services/userApi";
import { getUserStats } from "../services/userApi";
import { useToast } from "../contexts/ToastContext";
import { datGiaoDien, layGiaoDien, theoDoiGiaoDien } from "../utils/giaoDien";
import { amThanhDangBat, datAmThanh, theoDoiAmThanh } from "../utils/amThanh";

function CongTac({ bat, disabled = false, onDoi, nhan }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={bat}
      aria-label={nhan}
      disabled={disabled}
      onClick={() => onDoi(!bat)}
      className={[
        "relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full",
        "border-2 border-transparent transition-colors duration-200 ease-in-out",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        bat ? "bg-[var(--mau-chinh)]" : "bg-[var(--mau-vien-manh,#d1d5db)]",
      ].join(" ")}
    >
      <span
        className={[
          "ui-cong-tac-num pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg",
          "transform transition-transform duration-200 ease-in-out",
          bat ? "translate-x-5" : "translate-x-0",
        ].join(" ")}
      />
    </button>
  );
}

// Giao diện và âm thanh lưu trên máy ngay, đồng thời vào tài khoản (utils/caiDatTaiKhoan)
function GiaoDienVaAmThanh() {
  const denBan = useSyncExternalStore(theoDoiGiaoDien, layGiaoDien, () => "sang") === "den-ban";
  const amThanh = useSyncExternalStore(theoDoiAmThanh, amThanhDangBat, () => true);

  return (
    <section className="rounded-2xl border border-[var(--mau-vien)] bg-[var(--mau-mat)] p-5">
      <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-[var(--mau-chu-phu)]">
        Giao diện &amp; âm thanh
      </h3>

      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-semibold text-[var(--mau-chu)]">Chế độ tối (đèn bàn)</p>
            <p className="mt-1 text-sm text-[var(--mau-chu-phu)]">Nền gỗ tối, thẻ học vẫn sáng dưới đèn.</p>
          </div>
          <CongTac nhan="Chế độ tối" bat={denBan} onDoi={(bat) => datGiaoDien(bat ? "den-ban" : "sang")} />
        </div>

        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-semibold text-[var(--mau-chu)]">Âm thanh phản hồi</p>
            <p className="mt-1 text-sm text-[var(--mau-chu-phu)]">Tiếng đúng, sai, lật thẻ khi học.</p>
          </div>
          <CongTac nhan="Âm thanh phản hồi" bat={amThanh} onDoi={datAmThanh} />
        </div>
      </div>

      <p className="mt-4 text-xs text-[var(--mau-chu-mo)]">
        Các cài đặt này cùng cài đặt trong từng phiên học (chiều hỏi, trộn thẻ, phần thưởng, cách xem lý thuyết)
        được lưu theo tài khoản, đăng nhập máy khác vẫn giữ nguyên.
      </p>
    </section>
  );
}

function TrangCaiDat() {
  const [settings, setSettings] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    Promise.all([getUserSettings(), getUserStats()])
      .then(([s, st]) => {
        setSettings(s);
        setStats(st);
      })
      .catch(() => toast.error("Không tải được cài đặt"))
      .finally(() => setLoading(false));
  }, []);



  async function handleToggle(field, value) {
    if (saving) return;
    const prev = settings;
    // Optimistic update
    setSettings((s) => ({ ...s, [field]: value }));
    setSaving(true);
    try {
      const updated = await updateUserSettings({ [field]: value });
      setSettings(updated);
      toast.success("Đã lưu cài đặt");
    } catch {
      setSettings(prev);
      toast.error("Không lưu được, thử lại nhé!");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="ui-page-stack">
        <div className="ui-page-header">
          <div className="ui-page-header__title">
            <h2 className="text-2xl font-semibold text-[var(--mau-chu)]">Cài đặt</h2>
          </div>
        </div>
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 rounded-full border-4 border-[var(--mau-chinh)] border-t-transparent animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="ui-page-stack">
      {/* Header */}
      <div className="ui-page-header">
        <div className="ui-page-header__title">
          <h2 className="text-2xl font-semibold text-[var(--mau-chu)]">Cài đặt</h2>
        </div>
      </div>



      <div className="max-w-xl space-y-4">

        {/* Streak stats */}
        {stats && (
          <section className="rounded-2xl border border-[var(--mau-vien)] bg-[var(--mau-mat)] p-5">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-[var(--mau-chu-phu)]">
              Thống kê học tập
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <p className="text-2xl font-bold text-[var(--mau-chu)]">
                  {stats.current_streak}
                </p>
                <p className="mt-1 text-xs text-[var(--mau-chu-phu)]">Streak hiện tại</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-[var(--mau-chu)]">
                  {stats.longest_streak}
                </p>
                <p className="mt-1 text-xs text-[var(--mau-chu-phu)]">Streak dài nhất</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-[var(--mau-chu)]">
                  {stats.total_xp}
                </p>
                <p className="mt-1 text-xs text-[var(--mau-chu-phu)]">Tổng XP</p>
              </div>
            </div>
          </section>
        )}

        <GiaoDienVaAmThanh />

        {/* Email reminders */}
        <section className="rounded-2xl border border-[var(--mau-vien)] bg-[var(--mau-mat)] p-5">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-[var(--mau-chu-phu)]">
            Thông báo qua email
          </h3>

          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="font-semibold text-[var(--mau-chu)]">
                📧 Nhắc nhở học tập hàng ngày
              </p>
              <p className="mt-1 text-sm text-[var(--mau-chu-phu)]">
                Nếu bạn chưa học vào buổi tối, LearnTA sẽ gửi email nhắc nhở lúc{" "}
                <strong>20:00</strong> để giúp bạn giữ streak.
              </p>
            </div>

            <CongTac
              nhan="Nhắc nhở học tập qua email"
              bat={settings?.email_reminders ?? true}
              disabled={saving}
              onDoi={(bat) => handleToggle("email_reminders", bat)}
            />
          </div>

          <p className="mt-3 text-xs text-[var(--mau-chu-mo)]">
            💡 Email chỉ được gửi khi bạn chưa học trong ngày. Không bao giờ spam.
          </p>
        </section>

        <p className="px-1 text-xs text-[var(--mau-chu-mo)]">
          Hình minh hoạ từ vựng:{" "}
          <a
            href="https://googlefonts.github.io/noto-emoji-animation/"
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            Noto Emoji Animation
          </a>{" "}
          © Google, giấy phép{" "}
          <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer" className="underline">
            CC BY 4.0
          </a>
          .
        </p>
      </div>
    </div>
  );
}

export default TrangCaiDat;
