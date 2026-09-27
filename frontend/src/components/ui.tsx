import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Link } from "react-router-dom";
import { DISCLAIMER } from "../types";

export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export const inputClass =
  "w-full rounded-2xl border border-line bg-white px-3 py-3 text-base text-ink outline-none";

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "quiet" | "danger" }) {
  const styles = {
    primary: "bg-teal text-white",
    quiet: "border border-line bg-white text-ink",
    danger: "border border-clay/30 bg-white text-clay",
  }[variant];
  return (
    <button
      className={cx(
        "inline-flex min-h-11 items-center justify-center rounded-2xl px-4 py-2 text-sm font-semibold disabled:opacity-50",
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
        "min-h-10 rounded-full px-3 py-1 text-sm",
        selected ? "bg-teal text-white" : "border border-line bg-white text-ink",
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
      <span className="mb-1 block text-sm font-medium text-ink/80">{label}</span>
      {children}
    </label>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section className={cx("rounded-3xl bg-card p-4 shadow-[0_1px_0_rgba(28,36,48,0.04)]", className)}>
      {children}
    </section>
  );
}

export function PageHeader({ title, lede }: { title: string; lede?: string }) {
  return (
    <header className="mb-4">
      <h1 className="font-serif text-3xl text-ink">{title}</h1>
      {lede ? <p className="mt-1 text-sm leading-relaxed text-ink/70">{lede}</p> : null}
    </header>
  );
}

export function Disclaimer() {
  return <p className="rounded-2xl bg-amber/10 px-3 py-3 text-sm leading-relaxed text-amber">{DISCLAIMER}</p>;
}

export function CrisisNote() {
  return (
    <p className="rounded-2xl bg-clay/10 px-3 py-3 text-sm leading-relaxed text-clay">
      If you feel unsafe, contact local emergency services. You can find a local helpline at{" "}
      <a className="underline" href="https://www.iasp.info/suicidalthoughts/" target="_blank" rel="noreferrer">
        iasp.info
      </a>
      .
    </p>
  );
}

export function Empty({ title, body, to, action }: { title: string; body: string; to?: string; action?: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-line bg-card px-4 py-4">
      <p className="font-medium text-ink">{title}</p>
      <p className="mt-1 text-sm leading-relaxed text-ink/70">{body}</p>
      {to && action ? (
        <Link className="mt-3 inline-block text-sm font-semibold text-teal" to={to}>
          {action}
        </Link>
      ) : null}
    </div>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null;
  return <p className="text-sm text-clay">{children}</p>;
}
