import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Link } from "react-router-dom";
import { DISCLAIMER } from "../types";

export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export const inputClass =
  "w-full rounded-2xl border border-line bg-white px-3.5 py-3 text-base text-ink outline-none placeholder:text-ink/35";

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "quiet" | "danger" }) {
  const styles = {
    primary: "bg-lime text-white shadow-pop",
    quiet: "border border-line bg-white text-ink",
    danger: "border border-clay/25 bg-white text-clay",
  }[variant];
  return (
    <button
      className={cx(
        "inline-flex min-h-11 items-center justify-center rounded-full px-5 py-2.5 text-sm font-extrabold disabled:opacity-50",
        styles,
        className,
      )}
      {...props}
    />
  );
}

export function Chip({
  selected,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cx(
        "min-h-10 rounded-full px-3.5 py-1.5 text-sm font-bold",
        selected ? "bg-lime text-white shadow-sm" : "border border-line bg-white text-ink/80",
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-bold text-ink/75">{label}</span>
      {children}
    </label>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section className={cx("rounded-[1.75rem] bg-card p-4 shadow-card", className)}>{children}</section>
  );
}

export function PageHeader({ title, lede }: { title: string; lede?: string }) {
  return (
    <header className="mb-4">
      <h1 className="text-3xl font-extrabold tracking-tight text-ink">{title}</h1>
      {lede ? <p className="mt-1 text-sm leading-relaxed text-ink/65">{lede}</p> : null}
    </header>
  );
}

export function Disclaimer() {
  return <p className="rounded-2xl bg-amber/10 px-3 py-3 text-sm leading-relaxed text-amber">{DISCLAIMER}</p>;
}

export function CrisisNote() {
  return (
    <div className="rounded-2xl bg-clay/10 px-3 py-3 text-sm leading-relaxed text-clay">
      <p className="font-extrabold">If you feel unsafe</p>
      <p className="mt-1">
        Call <a className="underline" href="tel:995">995</a> for emergency services in Singapore. You can also call{" "}
        <a className="underline" href="tel:1767">Samaritans of Singapore on 1767</a>, or contact the Institute of Mental
        Health. International helplines are listed at{" "}
        <a className="underline" href="https://www.iasp.info/suicidalthoughts/" target="_blank" rel="noreferrer">
          iasp.info
        </a>
        .
      </p>
    </div>
  );
}

export function Empty({ title, body, to, action }: { title: string; body: string; to?: string; action?: string }) {
  return (
    <div className="rounded-[1.75rem] border border-dashed border-teal/30 bg-tide/60 px-4 py-4">
      <p className="font-extrabold text-ink">{title}</p>
      <p className="mt-1 text-sm leading-relaxed text-ink/70">{body}</p>
      {to && action ? (
        <Link className="mt-3 inline-block text-sm font-extrabold text-teal" to={to}>
          {action}
        </Link>
      ) : null}
    </div>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null;
  return <p className="text-sm font-semibold text-clay">{children}</p>;
}

export function PillIcon({ className }: { className?: string }) {
  return (
    <span
      className={cx(
        "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-tide text-teal",
        className,
      )}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" className="h-6 w-6">
        <rect x="4" y="9" width="16" height="6" rx="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M12 9v6" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    </span>
  );
}
