import { Link } from "react-router-dom";
import TypingEffect from "../components/common/TypingEffect";
import { useAuth } from "../contexts/AuthContext";

const DEV_WORDS = [
  "Frontend",
  "Backend",
  "React",
  "TypeScript",
  "API",
  "Algorithm",
  "Database",
  "Authentication",
  "Deployment",
  "Debugging",
];

/**
 * TrangChu — Trang giới thiệu chính.
 * Tuân thủ DESIGN.md: Base warm paper, ink-dark text, no marketing cards.
 * Một không gian học tập tĩnh lặng với một điểm nhấn typing animation năng động.
 */
function TrangChu() {
  const { isAuthenticated } = useAuth();
  const startPath = isAuthenticated ? "/decks" : "/login";
  const startState = isAuthenticated ? undefined : { from: { pathname: "/decks" } };

  return (
    <main className="video-bg-page px-4">
      <div className="ui-page-enter w-full max-w-2xl flex flex-col items-center text-center">

          {/* Brand Signal */}
          <div className="mb-12 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <h1 className="text-[clamp(2.5rem,8vw,4.5rem)] font-bold video-bg-home-text tracking-tight leading-[0.9] mb-4">
              Streak Drop
            </h1>
            <p className="video-bg-home-kicker text-xs sm:text-sm font-bold tracking-[0.2em] uppercase">
              Learn English for Developers
            </p>
          </div>

          {/* Core Interaction (Typing) */}
          <div className="mb-16 min-h-[4rem] flex items-center justify-center animate-in fade-in zoom-in-95 delay-300 duration-1000">
            <TypingEffect words={DEV_WORDS} className="video-home-typing" />
          </div>

          {/* Direct Action */}
          <div className="animate-in fade-in slide-in-from-bottom-4 delay-500 duration-1000">
            <Link
              to={startPath}
              state={startState}
              className="ui-button ui-button--primary group relative flex items-center gap-3 bg-[var(--mau-chinh)] text-[var(--mau-chu-tren-chinh)] px-10 py-4 rounded-2xl font-bold text-lg shadow-[0_20px_50px_oklch(17%_0.035_220_/_0.28)] hover:shadow-[0_25px_60px_oklch(17%_0.035_220_/_0.36)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
            >
              <span>Bắt đầu học ngay</span>
              <svg
                viewBox="0 0 24 24"
                className="w-5 h-5 fill-none stroke-current stroke-[3] transition-transform duration-300 group-hover:translate-x-1"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>

          </div>
      </div>
    </main>
  );
}

export default TrangChu;
