import { NavLink, Link, useLocation } from "react-router-dom";
import { useEffect, useState, type ReactNode } from "react";
import { cx } from "./ui";
import { useAuth } from "../auth";
import { daysUntil, todayISO } from "../lib/dates";

const tabs = [
  { to: "/", label: "Today", icon: IconToday },
  { to: "/meds", label: "Meds", icon: IconMeds },
  { to: "/feel", label: "Feel", icon: IconFeel },
  { to: "/visit", label: "Visit", icon: IconVisit },
];

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cx(
        "flex h-9 w-9 items-center justify-center rounded-2xl bg-lime text-white shadow-pop",
        className,
      )}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5">
        <path
          d="M8 5c-2.8 1.2-4 3.8-4 6.5 0 4.2 3 8.5 8 10.5 5-2 8-6.3 8-10.5C20 8.8 18.8 6.2 16 5c-1.6 2.4-4 3.2-4 3.2S9.6 7.4 8 5z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  const wide = location.pathname === "/visit";
  const days = daysUntil(user?.next_appointment_on ?? null, todayISO());
  const visitReady = days != null && days >= 0 && days <= 7;
  const [largeText, setLargeText] = useState(() => localStorage.getItem("renalbuddy_text") === "large");

  useEffect(() => {
    document.documentElement.classList.toggle("text-large", largeText);
    localStorage.setItem("renalbuddy_text", largeText ? "large" : "normal");
  }, [largeText]);

  return (
    <div
      className={cx(
        "mx-auto min-h-dvh bg-paper text-ink shadow-[0_24px_60px_rgba(52,120,48,0.16)]",
        wide ? "max-w-[430px] lg:max-w-5xl" : "max-w-[430px]",
      )}
    >
      <header className="sticky top-0 z-10 flex items-center justify-between bg-paper/90 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-2.5">
          <BrandMark />
          <div>
            <div className="text-lg font-extrabold leading-none text-forest">RenalBuddy</div>
            <p className="mt-0.5 text-[11px] font-semibold text-ink/50">Your brighter kidney log</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="flex h-9 items-center rounded-full bg-white px-3 text-sm font-extrabold text-teal shadow-card"
            onClick={() => setLargeText((value) => !value)}
            aria-pressed={largeText}
          >
            {largeText ? "A-" : "A+"}
          </button>
          <Link
            className="flex h-9 items-center rounded-full bg-white px-3 text-sm font-extrabold text-teal shadow-card"
            to="/profile"
          >
            Profile
          </Link>
        </div>
      </header>
      <main className="px-4 py-4 pb-28">{children}</main>
      <nav
        aria-label="Primary"
        className={cx(
          "fixed bottom-0 left-1/2 z-20 flex w-full -translate-x-1/2 rounded-t-[1.75rem] border-t border-line/80 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgba(52,120,48,0.08)] backdrop-blur",
          wide ? "max-w-[430px] lg:max-w-5xl" : "max-w-[430px]",
        )}
      >
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === "/"}
            className={({ isActive }) =>
              cx(
                "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-extrabold",
                isActive ? "text-teal" : "text-ink/40",
              )
            }
          >
            {({ isActive }) => (
              <>
                <span className={cx("relative flex h-8 w-8 items-center justify-center rounded-full", isActive && "bg-tide text-teal")}>
                  <tab.icon />
                  {tab.to === "/visit" && visitReady ? (
                    <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-lime" aria-hidden="true" />
                  ) : null}
                </span>
                {tab.to === "/visit" && visitReady ? "Visit ready" : tab.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

export function AuthFrame({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-[430px] flex-col bg-paper px-5 py-8 text-ink shadow-[0_24px_60px_rgba(52,120,48,0.16)]">
      <BrandMark className="h-12 w-12" />
      <p className="mt-4 text-3xl font-extrabold leading-tight text-forest">RenalBuddy</p>
      <p className="mt-1 text-sm font-medium text-ink/65">A brighter personal log for the days between nephrology visits.</p>
      <div className="mt-8">{children}</div>
    </div>
  );
}

function IconToday() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 8v5l3 2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function IconMeds() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <rect x="3" y="8" width="18" height="8" rx="4" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 8v8" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function IconFeel() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        d="M12 20s-7-4.4-7-9a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 4.6-7 9-7 9z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconVisit() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <rect x="6" y="3" width="12" height="18" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M9 8h6M9 12h6M9 16h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
