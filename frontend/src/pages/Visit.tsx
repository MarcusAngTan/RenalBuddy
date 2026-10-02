import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "../api";
import { useAuth } from "../auth";
import { Button, Card, Disclaimer, ErrorText, Field, PageHeader, inputClass } from "../components/ui";
import { formatDate, todayISO } from "../lib/dates";
import type { Narration, NarrationBlock, Summary } from "../types";

function inShortBlocks(summary: Summary, narration: Narration | null | undefined): NarrationBlock[] {
  if (narration?.blocks?.length) return narration.blocks;
  return summary.summary_json.sections
    .map((section) => ({
      key: section.key,
      title: section.title,
      lines: section.lines.filter((line) => line !== "Not logged."),
    }))
    .filter((block) => block.lines.length > 0);
}

function InShortPanel({
  blocks,
  narration,
  variant = "default",
}: {
  blocks: NarrationBlock[];
  narration: Narration | null | undefined;
  variant?: "default" | "handover";
}) {
  const large = variant === "handover";
  return (
    <Card className={large ? "border-0 bg-transparent p-0 shadow-none" : undefined}>
      <h2 className={large ? "text-2xl font-extrabold" : "text-2xl font-extrabold"}>In short</h2>
      <p className={large ? "mt-1 text-base text-ink/70" : "mt-1 text-sm text-ink/70"}>
        Bullet points from what you logged — easy to read aloud or copy into notes. Not medical advice.
      </p>
      {narration ? (
        <p className="mt-1 text-xs font-bold uppercase tracking-wide text-teal">
          {narration.fallback ? "Template (verifier discarded extra numbers)" : "Facts restated"}
        </p>
      ) : null}
      <div className={large ? "mt-4 space-y-5" : "mt-3 space-y-4"}>
        {blocks.map((block) => (
          <section key={block.key} aria-labelledby={`in-short-${block.key}`}>
            <h3
              id={`in-short-${block.key}`}
              className={large ? "text-lg font-extrabold text-teal" : "text-sm font-extrabold text-teal"}
            >
              {block.title}
            </h3>
            <ul
              className={
                large
                  ? "mt-2 list-disc space-y-2 pl-5 text-lg leading-relaxed"
                  : "mt-1.5 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-ink/90"
              }
            >
              {block.lines.map((line, index) => (
                <li key={`${block.key}-${index}`}>{line}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Card>
  );
}

export function VisitPage() {
  const { user, refreshUser } = useAuth();
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [handOver, setHandOver] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [confirmDate, setConfirmDate] = useState("");
  const preview = useQuery({
    queryKey: ["summary-preview"],
    queryFn: () => api<Summary>("/api/summaries/preview"),
    retry: (failureCount, error) => failureCount < 2 && error instanceof ApiError && error.status >= 500,
  });
  const saved = useQuery({
    queryKey: ["summaries"],
    queryFn: () => api<Summary[]>("/api/summaries"),
  });
  const save = useMutation({
    mutationFn: () => api<Summary>("/api/summaries", { method: "POST", body: JSON.stringify({}) }),
    onSuccess: async () => {
      setError(null);
      setNotice("Summary saved.");
      await queryClient.invalidateQueries({ queryKey: ["summaries"] });
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Could not save the summary."),
  });
  const closeVisit = useMutation({
    mutationFn: () =>
      api<{ last_appointment_on: string; summary: Summary }>("/api/appointments/close", {
        method: "POST",
        body: JSON.stringify({}),
      }),
    onSuccess: async (result) => {
      setError(null);
      setConfirmClose(false);
      setConfirmDate("");
      setNotice(`Next interval started. Last appointment is ${formatDate(result.last_appointment_on)}.`);
      await refreshUser();
      await queryClient.invalidateQueries({ queryKey: ["summary-preview"] });
      await queryClient.invalidateQueries({ queryKey: ["summaries"] });
      await queryClient.invalidateQueries({ queryKey: ["today"] });
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Could not close the appointment."),
  });

  useEffect(() => {
    api("/api/profile", { method: "PATCH", body: JSON.stringify({ mark_visit_opened: true }) }).catch(() => undefined);
  }, []);

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const area = document.createElement("textarea");
      area.value = text;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    setNotice("Copied. You can paste it into a note or show the screen.");
  }

  const summary = preview.data;
  const coverage = summary?.summary_json.coverage;
  const timeline = summary?.summary_json.timeline;
  const narration = summary?.narration ?? summary?.summary_json.narration;
  const blocks = summary ? inShortBlocks(summary, narration) : [];
  const previewError =
    preview.error instanceof ApiError ? preview.error.message : preview.isError ? "Could not build the summary." : null;
  const today = todayISO();

  if (handOver && summary) {
    return (
      <div className="min-h-[70vh] space-y-5 bg-white p-2 text-ink">
        <p className="text-sm font-extrabold uppercase tracking-widest text-teal">Hand the phone over</p>
        <h1 className="text-4xl font-extrabold leading-tight">Visit log</h1>
        <p className="text-xl font-semibold">
          {formatDate(summary.period_start)} to {formatDate(summary.period_end)}
        </p>
        {coverage ? (
          <p className="text-lg font-bold">
            Logged {coverage.days_logged} of {coverage.days_in_interval} days.
            {coverage.incomplete ? " This pack is incomplete." : ""}
          </p>
        ) : null}
        {blocks.length > 0 ? <InShortPanel blocks={blocks} narration={narration} variant="handover" /> : null}
        <p className="text-base">This app will not tell you when to call. If you are worried, call the team.</p>
        <Button className="w-full" type="button" variant="quiet" onClick={() => setHandOver(false)}>
          Back to usual view
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-4 lg:space-y-0">
      <div className="space-y-4">
        <PageHeader title="Visit" lede="A concise log to show your nephrologist. It repeats what you entered." />
        <Disclaimer />
        {user ? (
          <p className="text-sm font-medium text-ink/70">
            Logged {user.days_logged_this_interval} of {user.days_in_interval} days this interval · {user.open_questions}{" "}
            open question{user.open_questions === 1 ? "" : "s"}
          </p>
        ) : null}
        {summary ? (
          <p className="text-sm font-medium">
            {formatDate(summary.period_start)} to {formatDate(summary.period_end)}
          </p>
        ) : null}
        {coverage?.incomplete ? (
          <p className="rounded-2xl bg-amber/10 px-3 py-3 text-sm font-semibold text-amber">
            Logged {coverage.days_logged} of {coverage.days_in_interval} days. This pack is incomplete.
          </p>
        ) : null}
        {previewError ? (
          <div className="space-y-2">
            <ErrorText>{previewError}</ErrorText>
            <Button className="w-full" type="button" variant="quiet" onClick={() => preview.refetch()}>
              Try again
            </Button>
          </div>
        ) : null}
        {timeline ? <IntervalTimeline timeline={timeline} /> : null}
        {blocks.length > 0 ? <InShortPanel blocks={blocks} narration={narration} /> : null}
        {summary
          ? summary.summary_json.sections.map((section) => (
              <Card key={section.key}>
                <h2 className="text-2xl font-extrabold">{section.title}</h2>
                <ul className="mt-2 space-y-2 text-sm leading-relaxed">
                  {section.lines.map((line, index) => (
                    <li key={`${section.key}-${index}`} className={line === "Not logged." ? "text-ink/50" : ""}>
                      {line}
                    </li>
                  ))}
                </ul>
              </Card>
            ))
          : null}
        {summary ? (
          <details className="rounded-3xl bg-card p-4 text-sm">
            <summary className="cursor-pointer font-medium">Plain text</summary>
            <pre className="mt-3 whitespace-pre-wrap font-sans leading-relaxed">{summary.summary_text}</pre>
          </details>
        ) : null}
      </div>
      <div className="space-y-3 lg:sticky lg:top-20">
        <ErrorText>{error}</ErrorText>
        {notice ? <p className="text-sm font-bold text-teal">{notice}</p> : null}
        {summary ? (
          <div className="space-y-2">
            <Button className="w-full" type="button" onClick={() => copy(summary.summary_text)}>
              Copy summary
            </Button>
            <Button className="w-full" type="button" variant="quiet" onClick={() => setHandOver(true)}>
              Hand the phone over
            </Button>
            <Button className="w-full" type="button" variant="quiet" disabled={save.isPending} onClick={() => save.mutate()}>
              Save summary
            </Button>
            {confirmClose ? (
              <Card className="space-y-3">
                <p className="font-extrabold">Type today’s date to close this interval</p>
                <p className="text-sm text-ink/70">
                  Last appointment will be set to {formatDate(today)}. This is easy to tap by mistake in a waiting room.
                </p>
                <Field label="Today’s date">
                  <input className={inputClass} type="date" value={confirmDate} onChange={(event) => setConfirmDate(event.target.value)} />
                </Field>
                <Button
                  className="w-full"
                  type="button"
                  disabled={closeVisit.isPending || confirmDate !== today}
                  onClick={() => closeVisit.mutate()}
                >
                  Confirm appointment done
                </Button>
                <Button className="w-full" type="button" variant="quiet" onClick={() => setConfirmClose(false)}>
                  Cancel
                </Button>
              </Card>
            ) : (
              <Button className="w-full" type="button" variant="quiet" onClick={() => setConfirmClose(true)}>
                Appointment done
              </Button>
            )}
          </div>
        ) : null}
        {(saved.data ?? []).length > 0 ? (
          <div className="space-y-2">
            <h2 className="text-2xl font-extrabold">Saved summaries</h2>
            {(saved.data ?? []).map((item) => (
              <Card key={item.id}>
                <p className="text-sm font-extrabold">
                  {formatDate(item.period_start)} to {formatDate(item.period_end)}
                </p>
                <button className="mt-2 text-sm font-extrabold text-teal" type="button" onClick={() => copy(item.summary_text)}>
                  Copy this one
                </button>
              </Card>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function IntervalTimeline({ timeline }: { timeline: NonNullable<Summary["summary_json"]["timeline"]> }) {
  const points = [...timeline.dipstick.map((row) => row.on), ...timeline.weight.map((row) => row.on)].sort();
  const unique = [...new Set(points)];
  if (unique.length === 0 && timeline.taper_steps.length === 0) return null;
  const weights = timeline.weight.map((row) => row.kg);
  const maxW = Math.max(...weights, 1);
  const minW = Math.min(...weights, 0);
  return (
    <Card className="space-y-3">
      <h2 className="text-2xl font-extrabold">Interval timeline</h2>
      <p className="text-sm text-ink/70">Taper steps, dipstick, and weight for this interval. Not a diagnosis.</p>
      {timeline.taper_steps.length > 0 ? (
        <ol className="space-y-2 border-l-2 border-teal/25 pl-3">
          {timeline.taper_steps.map((step, index) => (
            <li key={`${step.title}-${index}`}>
              <p className="text-sm font-extrabold">
                {step.dose} {step.unit}
              </p>
              <p className="text-xs text-ink/60">
                {step.title} · {formatDate(step.start_on)} – {formatDate(step.end_on)}
              </p>
            </li>
          ))}
        </ol>
      ) : null}
      {timeline.dipstick.length > 0 ? (
        <div>
          <p className="text-sm font-bold">Dipstick</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {timeline.dipstick.map((row) => (
              <span key={`${row.on}-${row.result}`} className="rounded-full bg-tide px-3 py-1 text-xs font-extrabold text-teal">
                {formatDate(row.on)} · {row.result}
              </span>
            ))}
          </div>
        </div>
      ) : null}
      {timeline.weight.length > 1 ? (
        <div>
          <p className="text-sm font-bold">Weight</p>
          <svg viewBox="0 0 120 36" className="mt-2 h-16 w-full text-teal" aria-hidden="true">
            <polyline
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              points={timeline.weight
                .map((row, index) => {
                  const x = (index / Math.max(timeline.weight.length - 1, 1)) * 118 + 1;
                  const y = 34 - ((row.kg - minW) / Math.max(maxW - minW, 0.1)) * 30;
                  return `${x},${y}`;
                })
                .join(" ")}
            />
          </svg>
          <p className="text-xs text-ink/60">
            {timeline.weight[0].kg} kg to {timeline.weight[timeline.weight.length - 1].kg} kg
          </p>
        </div>
      ) : null}
    </Card>
  );
}
