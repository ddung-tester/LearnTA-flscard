import { useEffect, useState } from "react";
import { getUserSettings, updateUserSettings } from "../services/userApi";
import { getUserStats } from "../services/userApi";

function TrangCaiDat() {
  const [settings, setSettings] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    Promise.all([getUserSettings(), getUserStats()])
      .then(([s, st]) => {
        setSettings(s);
        setStats(st);
      })
      .catch(() => setToast({ type: "error", message: "Không tải được cài đặt" }))
      .finally(() => setLoading(false));
  }, []);

  function showToast(type, message) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleToggle(field, value) {
    if (saving) return;
    const prev = settings;
    // Optimistic update
    setSettings((s) => ({ ...s, [field]: value }));
    setSaving(true);
    try {
      const updated = await updateUserSettings({ [field]: value });
      setSettings(updated);
      showToast("success", "Đã lưu cài đặt");
    } catch {
      setSettings(prev);
      showToast("error", "Không lưu được, thử lại nhé!");
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

      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 rounded-xl px-4 py-3 text-sm font-semibold shadow-lg transition-all ${
            toast.type === "success"
              ? "bg-green-500 text-white"
              : "bg-red-500 text-white"
          }`}
        >
          {toast.type === "success" ? "✅ " : "❌ "}
          {toast.message}
        </div>
      )}

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

            {/* Toggle switch */}
            <button
              type="button"
              role="switch"
              aria-checked={settings?.email_reminders ?? true}
              disabled={saving}
              onClick={() => handleToggle("email_reminders", !(settings?.email_reminders ?? true))}
              className={[
                "relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full",
                "border-2 border-transparent transition-colors duration-200 ease-in-out",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                settings?.email_reminders
                  ? "bg-[var(--mau-chinh)]"
                  : "bg-[var(--mau-vien-manh,#d1d5db)]",
              ].join(" ")}
            >
              <span
                className={[
                  "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg",
                  "transform transition-transform duration-200 ease-in-out",
                  settings?.email_reminders ? "translate-x-5" : "translate-x-0",
                ].join(" ")}
              />
            </button>
          </div>

          <p className="mt-3 text-xs text-[var(--mau-chu-mo)]">
            💡 Email chỉ được gửi khi bạn chưa học trong ngày. Không bao giờ spam.
          </p>
        </section>

      </div>
    </div>
  );
}

export default TrangCaiDat;
