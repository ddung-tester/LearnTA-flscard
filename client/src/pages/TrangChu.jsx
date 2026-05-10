import { Link } from "react-router-dom";
import TypingEffect from "../components/common/TypingEffect";

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
  return (
    <main className="ui-page-enter min-h-screen flex flex-col items-center justify-center px-6 py-20 overflow-hidden">
      <div className="w-full max-w-2xl flex flex-col items-center text-center">

        {/* Brand Signal */}
        <div className="mb-12 animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <h1 className="text-[clamp(2.5rem,8vw,4.5rem)] font-bold text-[var(--mau-chu)] tracking-tight leading-[0.9] mb-4">
            Streak Drop
          </h1>
          <p className="text-[var(--mau-chu-phu)] text-xs sm:text-sm font-bold tracking-[0.2em] uppercase opacity-60">
            Learn English for Developers
          </p>
        </div>

        {/* Core Interaction (Typing) */}
        <div className="mb-16 min-h-[4rem] flex items-center justify-center animate-in fade-in zoom-in-95 delay-300 duration-1000">
          <TypingEffect words={DEV_WORDS} />
        </div>

        {/* Direct Action */}
        <div className="animate-in fade-in slide-in-from-bottom-4 delay-500 duration-1000">
          <Link
            to="/decks"
            className="ui-button ui-button--primary group relative flex items-center gap-3 bg-[var(--mau-chinh)] text-[var(--mau-chu-tren-chinh)] px-10 py-4 rounded-2xl font-bold text-lg shadow-[0_20px_50px_rgba(15,95,148,0.3)] hover:shadow-[0_25px_60px_rgba(15,95,148,0.45)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
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

      {/* Subtle Background Detail */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[var(--mau-mat)] blur-[120px] opacity-40" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[var(--mau-chinh)] blur-[160px] opacity-[0.08]" />
      </div>
    </main>
  );
}

export default TrangChu;
