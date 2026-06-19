import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import GoogleSignInButton from "../components/GoogleSignInButton";
import LoginMascot from "../components/LoginMascot";
import AnimatedModal from "../components/common/AnimatedModal";
import { useAuth } from "../contexts/AuthContext";
import { usePageTransition } from "../contexts/PageTransitionContext";

const PASSWORD_MIN_LENGTH = 6;

function TrangDangKy() {
  const { navigateWithLoading } = usePageTransition();
  const { dangKy, isAuthReady, isAuthenticated } = useAuth();
  const [form, setForm] = useState({
    fullname: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusedTextField, setFocusedTextField] = useState(null);
  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [successTick, setSuccessTick] = useState(0);
  const [failTick, setFailTick] = useState(0);
  const [dangMoXacNhanThanhCong, setDangMoXacNhanThanhCong] = useState(false);
  const activeTextValue =
    focusedTextField === "fullname" ? form.fullname : form.email;

  if (isAuthReady && isAuthenticated && !isSubmitting && !dangMoXacNhanThanhCong) {
    return <Navigate to="/decks" replace />;
  }

  function updateForm(event) {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (
      form.password.length < PASSWORD_MIN_LENGTH ||
      form.confirmPassword.length < PASSWORD_MIN_LENGTH
    ) {
      setError("Mật khẩu cần ít nhất 6 ký tự");
      setFailTick((current) => current + 1);
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Mật khẩu nhập lại không khớp");
      setFailTick((current) => current + 1);
      return;
    }

    setIsSubmitting(true);

    try {
      await dangKy({
        fullname: form.fullname.trim(),
        email: form.email.trim(),
        password: form.password,
      });
      setSuccessTick((current) => current + 1);
      setDangMoXacNhanThanhCong(true);
    } catch (submitError) {
      setError(submitError.message);
      setFailTick((current) => current + 1);
    } finally {
      setIsSubmitting(false);
    }
  }

  function chuyenSangDangNhap() {
    setDangMoXacNhanThanhCong(false);
    navigateWithLoading("/login", { replace: true, state: { registered: true } });
  }

  function handleGoogleSuccess() {
    setSuccessTick((current) => current + 1);
    navigateWithLoading("/decks", { replace: true });
  }

  function handleGoogleError(message) {
    setError(message || "Đăng nhập Google thất bại");
    setFailTick((current) => current + 1);
  }

  return (
    <div className="video-bg-page video-bg-page--auth px-4">
      <div className="auth-mascot-wrap auth-mascot-wrap--register">
        <LoginMascot
          isPasswordFocused={isPasswordFocused}
          isChecking={Boolean(focusedTextField) || isEmailFocused || isSubmitting}
          lookValue={activeTextValue.length * 3.3}
          triggerSuccess={successTick}
          triggerFail={failTick}
        />
        <section className="video-auth-card video-auth-card--with-mascot video-auth-card--register">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label
                htmlFor="register-fullname"
                className="mb-1.5 block text-sm font-medium text-[var(--mau-chu)]"
              >
                Họ và tên
              </label>
              <input
                id="register-fullname"
                name="fullname"
                autoComplete="name"
                value={form.fullname}
                onChange={updateForm}
                onFocus={() => setFocusedTextField("fullname")}
                onBlur={() => setFocusedTextField(null)}
                minLength={2}
                maxLength={50}
                required
                className="w-full rounded-lg border border-[var(--mau-vien)] bg-[var(--mau-input)] px-3 py-2.5 text-[var(--mau-chu)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)]"
                placeholder="Nguyễn Văn A"
              />
            </div>

            <div>
              <label
                htmlFor="register-email"
                className="mb-1.5 block text-sm font-medium text-[var(--mau-chu)]"
              >
                Email
              </label>
              <input
                id="register-email"
                name="email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={updateForm}
                onFocus={() => {
                  setFocusedTextField("email");
                  setIsEmailFocused(true);
                }}
                onBlur={() => {
                  setFocusedTextField(null);
                  setIsEmailFocused(false);
                }}
                required
                className="w-full rounded-lg border border-[var(--mau-vien)] bg-[var(--mau-input)] px-3 py-2.5 text-[var(--mau-chu)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)]"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label
                htmlFor="register-password"
                className="mb-1.5 block text-sm font-medium text-[var(--mau-chu)]"
              >
                Mật khẩu
              </label>
              <input
                id="register-password"
                name="password"
                type="password"
                autoComplete="new-password"
                value={form.password}
                onChange={updateForm}
                onFocus={() => setIsPasswordFocused(true)}
                onBlur={() => setIsPasswordFocused(false)}
                minLength={PASSWORD_MIN_LENGTH}
                required
                className="w-full rounded-lg border border-[var(--mau-vien)] bg-[var(--mau-input)] px-3 py-2.5 text-[var(--mau-chu)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)]"
                placeholder="Ít nhất 6 ký tự"
              />
            </div>

            <div>
              <label
                htmlFor="register-confirm-password"
                className="mb-1.5 block text-sm font-medium text-[var(--mau-chu)]"
              >
                Nhập lại mật khẩu
              </label>
              <input
                id="register-confirm-password"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={form.confirmPassword}
                onChange={updateForm}
                onFocus={() => setIsPasswordFocused(true)}
                onBlur={() => setIsPasswordFocused(false)}
                minLength={PASSWORD_MIN_LENGTH}
                required
                className="w-full rounded-lg border border-[var(--mau-vien)] bg-[var(--mau-input)] px-3 py-2.5 text-[var(--mau-chu)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)]"
                placeholder="Nhập lại mật khẩu"
              />
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-lg border border-[var(--mau-loi)]/30 bg-[var(--mau-loi)]/10 px-3 py-2 text-sm text-[var(--mau-loi)]"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting || dangMoXacNhanThanhCong}
              className="ui-button ui-button--primary w-full rounded-lg bg-[var(--mau-chinh)] px-5 py-2.5 font-semibold text-[var(--mau-chu-tren-chinh)] transition-colors hover:bg-[var(--mau-chinh-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)] disabled:cursor-not-allowed disabled:opacity-70"
            >
              <span className="inline-flex min-h-6 items-center justify-center gap-2">
                {isSubmitting && (
                  <span
                    aria-hidden="true"
                    className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                  />
                )}
                {isSubmitting ? "Đang tạo tài khoản" : "Tạo tài khoản"}
              </span>
            </button>
          </form>

          <p className="mt-4 text-sm text-[var(--mau-chu-phu)]">
            Đã có tài khoản?{" "}
            <Link className="ui-link font-semibold text-[var(--mau-chinh)]" to="/login">
              Đăng nhập
            </Link>
          </p>

          {/* Divider */}
          <div className="mt-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-[var(--mau-vien)]" />
            <span className="text-xs text-[var(--mau-chu-phu)]">hoặc tiếp tục với</span>
            <div className="h-px flex-1 bg-[var(--mau-vien)]" />
          </div>

          {/* Google Sign-In */}
          <div className="mt-3">
            <GoogleSignInButton
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              disabled={isSubmitting || dangMoXacNhanThanhCong}
            />
          </div>
        </section>
      </div>

      <AnimatedModal
        open={dangMoXacNhanThanhCong}
        onClose={chuyenSangDangNhap}
        labelledBy="register-success-title"
        className="ui-form-panel max-w-[360px] shadow-[var(--bong-modal)] p-0 overflow-hidden border-none"
      >
        <div className="flex flex-col items-center px-6 pb-6 pt-7 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--mau-thanh-cong)]/10 text-[var(--mau-thanh-cong)]">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-7 w-7"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>

          <h3
            id="register-success-title"
            className="mb-6 text-xl font-semibold text-[var(--mau-chu)]"
          >
            Đăng ký thành công
          </h3>

          <button
            type="button"
            onClick={chuyenSangDangNhap}
            className="ui-button ui-button--primary w-full rounded-lg bg-[var(--mau-chinh)] px-5 py-2.5 font-semibold text-[var(--mau-chu-tren-chinh)] transition-colors hover:bg-[var(--mau-chinh-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)]"
          >
            Đăng nhập
          </button>
        </div>
      </AnimatedModal>
    </div>
  );
}

export default TrangDangKy;
