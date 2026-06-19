import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import GoogleSignInButton from "../components/GoogleSignInButton";
import LoginMascot from "../components/LoginMascot";
import { useAuth } from "../contexts/AuthContext";
import { usePageTransition } from "../contexts/PageTransitionContext";

const AUTH_SUCCESS_REDIRECT_DELAY = 1500;
const PASSWORD_MIN_LENGTH = 6;

function TrangDangNhap() {
  const { navigateWithLoading } = usePageTransition();
  const location = useLocation();
  const { dangNhap, isAuthReady, isAuthenticated } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [successTick, setSuccessTick] = useState(0);
  const [failTick, setFailTick] = useState(0);
  const [dangChoChuyenTrang, setDangChoChuyenTrang] = useState(false);
  const redirectTimerRef = useRef(null);
  const redirectTo = location.state?.from?.pathname || "/decks";
  const isLogoutRedirect = location.state?.loggedOut;

  useEffect(
    () => () => {
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
      }
    },
    []
  );

  if (isAuthReady && isAuthenticated && !isLogoutRedirect && !isSubmitting && !dangChoChuyenTrang) {
    return <Navigate to="/decks" replace />;
  }

  function updateForm(event) {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handleInvalidEmail(event) {
    if (!event.currentTarget.validity.typeMismatch) {
      return;
    }

    setError("Email không đúng định dạng");
    setFailTick((current) => current + 1);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (form.password.length < PASSWORD_MIN_LENGTH) {
      setError("Mật khẩu cần ít nhất 6 ký tự");
      setFailTick((current) => current + 1);
      return;
    }

    setIsSubmitting(true);

    try {
      await dangNhap({
        email: form.email.trim(),
        password: form.password,
      });
      setSuccessTick((current) => current + 1);
      setDangChoChuyenTrang(true);
      redirectTimerRef.current = setTimeout(() => {
        navigateWithLoading(redirectTo, { replace: true });
      }, AUTH_SUCCESS_REDIRECT_DELAY);
    } catch (submitError) {
      setError(submitError.message);
      setFailTick((current) => current + 1);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleGoogleSuccess() {
    setSuccessTick((current) => current + 1);
    setDangChoChuyenTrang(true);
    redirectTimerRef.current = setTimeout(() => {
      navigateWithLoading(redirectTo, { replace: true });
    }, AUTH_SUCCESS_REDIRECT_DELAY);
  }

  function handleGoogleError(message) {
    setError(message || "Đăng nhập Google thất bại");
    setFailTick((current) => current + 1);
  }

  return (
    <div className="video-bg-page video-bg-page--auth px-4">
      <div className="auth-mascot-wrap">
        <LoginMascot
          isPasswordFocused={isPasswordFocused}
          isChecking={isEmailFocused || isSubmitting}
          lookValue={form.email.length * 3.3}
          triggerSuccess={successTick}
          triggerFail={failTick}
        />
        <section className="video-auth-card video-auth-card--with-mascot">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="login-email"
                className="mb-1.5 block text-sm font-medium text-[var(--mau-chu)]"
              >
                Email
              </label>
              <input
                id="login-email"
                name="email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={updateForm}
                onInvalid={handleInvalidEmail}
                onFocus={() => setIsEmailFocused(true)}
                onBlur={() => setIsEmailFocused(false)}
                required
                className="w-full rounded-lg border border-[var(--mau-vien)] bg-[var(--mau-input)] px-3 py-2.5 text-[var(--mau-chu)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)]"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="mb-1.5 block text-sm font-medium text-[var(--mau-chu)]"
              >
                Mật khẩu
              </label>
              <input
                id="login-password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={form.password}
                onChange={updateForm}
                onFocus={() => setIsPasswordFocused(true)}
                onBlur={() => setIsPasswordFocused(false)}
                minLength={PASSWORD_MIN_LENGTH}
                required
                className="w-full rounded-lg border border-[var(--mau-vien)] bg-[var(--mau-input)] px-3 py-2.5 text-[var(--mau-chu)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)]"
                placeholder="••••••••"
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
              disabled={isSubmitting || dangChoChuyenTrang}
              className="ui-button ui-button--primary w-full rounded-lg bg-[var(--mau-chinh)] px-5 py-2.5 font-semibold text-[var(--mau-chu-tren-chinh)] transition-colors hover:bg-[var(--mau-chinh-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
            </button>
          </form>

          <p className="mt-5 text-sm text-[var(--mau-chu-phu)]">
            Chưa có tài khoản?{" "}
            <Link className="ui-link font-semibold text-[var(--mau-chinh)]" to="/register">
              Đăng ký
            </Link>
          </p>

          {/* Divider */}
          <div className="mt-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-[var(--mau-vien)]" />
            <span className="text-xs text-[var(--mau-chu-phu)]">hoặc</span>
            <div className="h-px flex-1 bg-[var(--mau-vien)]" />
          </div>

          {/* Google Sign-In */}
          <div className="mt-4">
            <GoogleSignInButton
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              disabled={isSubmitting || dangChoChuyenTrang}
            />
          </div>
        </section>
      </div>
    </div>
  );
}

export default TrangDangNhap;
