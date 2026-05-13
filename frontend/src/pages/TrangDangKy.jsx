import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

function TrangDangKy() {
  const navigate = useNavigate();
  const location = useLocation();
  const { dangKy, isAuthReady, isAuthenticated } = useAuth();
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const redirectTo = location.state?.from?.pathname || "/decks";

  if (isAuthReady && isAuthenticated) {
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
    setIsSubmitting(true);

    try {
      await dangKy({
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
      });
      navigate(redirectTo, { replace: true });
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="video-bg-page px-4">
      <section className="video-auth-card">
        <div className="mb-6">
          <p className="mb-1 text-xs font-mono uppercase tracking-wider text-[var(--mau-chu-phu)]">
            Tài khoản
          </p>
          <h2 className="text-2xl font-semibold text-[var(--mau-chu)]">
            Đăng ký
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="register-username"
              className="mb-1.5 block text-sm font-medium text-[var(--mau-chu)]"
            >
              Username
            </label>
            <input
              id="register-username"
              name="username"
              autoComplete="username"
              value={form.username}
              onChange={updateForm}
              minLength={3}
              maxLength={50}
              required
              className="w-full rounded-lg border border-[var(--mau-vien)] bg-[var(--mau-input)] px-3 py-2.5 text-[var(--mau-chu)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)]"
              placeholder="nguyenvan_a"
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
              minLength={6}
              required
              className="w-full rounded-lg border border-[var(--mau-vien)] bg-[var(--mau-input)] px-3 py-2.5 text-[var(--mau-chu)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)]"
              placeholder="Ít nhất 6 ký tự"
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
            disabled={isSubmitting}
            className="ui-button ui-button--primary w-full rounded-lg bg-[var(--mau-chinh)] px-5 py-2.5 font-semibold text-[var(--mau-chu-tren-chinh)] transition-colors hover:bg-[var(--mau-chinh-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Đang tạo tài khoản..." : "Tạo tài khoản"}
          </button>
        </form>

        <p className="mt-5 text-sm text-[var(--mau-chu-phu)]">
          Đã có tài khoản?{" "}
          <Link className="ui-link font-semibold text-[var(--mau-chinh)]" to="/login">
            Đăng nhập
          </Link>
        </p>
      </section>
    </div>
  );
}

export default TrangDangKy;
