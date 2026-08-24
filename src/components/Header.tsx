import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { isAuthenticated, clearAuthUser } from "@/lib/auth";
import { useI18n, Language } from "@/lib/i18n";
import ThemeToggle from "./ThemeToggle";

export default function Header() {
  const navigate = useNavigate();
  const { lang, setLang, t } = useI18n();
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    setAuthed(isAuthenticated());
    const handleAuthChange = () => setAuthed(isAuthenticated());
    window.addEventListener("hydrogrid_auth_change", handleAuthChange);
    return () => window.removeEventListener("hydrogrid_auth_change", handleAuthChange);
  }, []);

  const handleLogout = () => {
    clearAuthUser();
    navigate({ to: "/login" });
  };

  return (
    <header className="sticky top-0 z-50 border-b border-[#4b5d16]/20 bg-[#f6f4f1]/90 dark:bg-[#0f1a1e]/90 px-4 backdrop-blur-md transition-colors duration-300">
      <nav className="page-wrap flex flex-wrap items-center gap-x-3 gap-y-2 py-3 sm:py-3.5">
        <h2 className="m-0 flex-shrink-0 text-base font-semibold tracking-tight">
          <Link
            to={authed ? "/desktop" : "/login"}
            className="inline-flex items-center gap-2 rounded-full border border-[#4b5d16]/30 bg-[#f6f4f1] dark:bg-[#101d22] px-3 py-1.5 text-sm text-[#223300] dark:text-[#d7ece8] no-underline shadow-sm hover:border-[#4b5d16] sm:px-4 sm:py-2 transition"
          >
            <span className="h-2.5 w-2.5 rounded-full bg-[#4b5d16] animate-pulse" />
            <span className="font-extrabold tracking-tight">HydroGrid</span>
          </Link>
        </h2>

        {/* Navigation Links */}
        <div className="order-3 flex w-full flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm font-semibold sm:order-none sm:w-auto sm:flex-nowrap">
          <Link
            to="/login"
            className="nav-link text-[#223300] dark:text-[#d7ece8] hover:text-[#4b5d16]"
            activeProps={{ className: "nav-link is-active text-[#4b5d16] dark:text-[#8de5db] font-bold" }}
          >
            {t.login}
          </Link>

          <Link
            to="/signup"
            className="nav-link text-[#223300] dark:text-[#d7ece8] hover:text-[#4b5d16]"
            activeProps={{ className: "nav-link is-active text-[#4b5d16] dark:text-[#8de5db] font-bold" }}
          >
            {t.signup}
          </Link>

          <Link
            to="/admin/login"
            className="nav-link text-[#223300] dark:text-[#d7ece8] hover:text-[#e45c10]"
            activeProps={{ className: "nav-link is-active text-[#e45c10] font-bold" }}
          >
            {t.admin}
          </Link>

          <Link
            to="/desktop"
            className="nav-link text-[#223300] dark:text-[#d7ece8] hover:text-[#4b5d16]"
            activeProps={{ className: "nav-link is-active text-[#4b5d16] dark:text-[#8de5db] font-bold" }}
          >
            {t.desktop}
          </Link>
        </div>

        {/* Header Right Controls: Language Selector + Theme Toggle + Logout */}
        <div className="ml-auto flex items-center gap-2">
          {/* Language Selector Dropdown */}
          <div className="relative flex items-center">
            <span className="sr-only">Select Language</span>
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as Language)}
              className="appearance-none bg-[#f6f4f1] dark:bg-[#101d22] border border-[#4b5d16]/30 text-[#223300] dark:text-[#d7ece8] font-bold text-xs rounded-xl px-2.5 py-1.5 pr-6 cursor-pointer focus:outline-none focus:border-[#4b5d16]"
            >
              <option value="en">🌐 English</option>
              <option value="hi">🌐 हिंदी (Hindi)</option>
            </select>
            <div className="pointer-events-none absolute right-2 text-[#4b5d16] dark:text-[#8de5db] text-xs">▼</div>
          </div>

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Sign Out Button if Authenticated */}
          {authed && (
            <button
              onClick={handleLogout}
              className="text-xs font-bold px-3 py-1.5 rounded-xl bg-[#e45c10] text-[#f6f4f1] hover:bg-[#e45c10]/90 transition cursor-pointer shadow-sm"
            >
              {t.signOut}
            </button>
          )}
        </div>
      </nav>
    </header>
  );
}
