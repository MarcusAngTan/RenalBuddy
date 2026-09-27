import { NavLink, Link } from "react-router-dom";
import type { ReactNode } from "react";

const tabs = [
  { to: "/", label: "Today", icon: IconToday },
  { to: "/meds", label: "Meds", icon: IconMeds },
  { to: "/feel", label: "Feel", icon: IconFeel },
  { to: "/visit", label: "Visit", icon: IconVisit },
];

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto min-h-dvh max-w-[430px] bg-paper text-ink shadow-xl">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-paper/95 px-4 py-3 backdrop-blur">
        <div>
          <div className="font-serif text-xl leading-none">RenalBuddy</div>
          <p className="mt-1 text-xs text-ink/60">Personal log between visits</p>
        </div>
        <Link className="text-sm font-semibold text-teal" to="/profile">
          Profile
        </Link>
      </header>
      <main className="px-4 py-4 pb-28">{children}</main>
      <nav
        aria-label="Primary"
        className="fixed bottom-0 left-1/2 z-20 flex w-full max-w-[430px] -translate-x-1/2 border-t border-line bg-card pb-[env(safe-area-inset-bottom)]"
      >
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === "/"}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-1 py-2 text-xs font-medium ${isActive ? "text-teal" : "text-ink/50"}`
            }
          >
            <tab.icon />
            {tab.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

export function AuthFrame({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-[430px] flex-col bg-paper px-5 py-8 text-ink shadow-xl">
      <p className="font-serif text-3xl">RenalBuddy</p>
      <p className="mt-1 text-sm text-ink/70">A personal log for the days between nephrology visits.</p>
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
