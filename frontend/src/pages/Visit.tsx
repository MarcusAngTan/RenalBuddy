import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "../api";
import { useAuth } from "../auth";
import { Button, Card, Disclaimer, ErrorText, PageHeader } from "../components/ui";
import { formatDate } from "../lib/dates";
import type { Summary } from "../types";

export function VisitPage() {
  const { refreshUser } = useAuth();
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const preview = useQuery({
    queryKey: ["summary-preview"],
    queryFn: () => api<Summary>("/api/summaries/preview"),
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
    mutationFn: () => api<{ last_appointment_on: string; summary: Summary }>("/api/appointments/close", {
      method: "POST",
      body: JSON.stringify({}),
    }),
    onSuccess: async (result) => {
      setError(null);
      setNotice(`Next interval started. Last appointment is ${formatDate(result.last_appointment_on)}.`);
      await refreshUser();
      await queryClient.invalidateQueries({ queryKey: ["summary-preview"] });
      await queryClient.invalidateQueries({ queryKey: ["summaries"] });
      await queryClient.invalidateQueries({ queryKey: ["today"] });
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Could not close the appointment."),
  });

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
  const previewError = preview.error instanceof ApiError ? preview.error.message : preview.isError ? "Could not build the summary." : null;

  return (
    <div className="space-y-4">
      <PageHeader title="Visit" lede="A concise log to show your nephrologist. It repeats what you entered." />
      <Disclaimer />
      {summary ? (
        <p className="text-sm font-medium">
          {formatDate(summary.period_start)} to {formatDate(summary.period_end)}
        </p>
      ) : null}
      {previewError ? <ErrorText>{previewError}</ErrorText> : null}
      {summary
        ? summary.summary_json.sections.map((section) => (
            <Card key={section.key}>
              <h2 className="font-serif text-2xl">{section.title}</h2>
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
      <ErrorText>{error}</ErrorText>
      {notice ? <p className="text-sm text-teal">{notice}</p> : null}
      {summary ? (
        <div className="space-y-2">
          <Button className="w-full" type="button" onClick={() => copy(summary.summary_text)}>
            Copy summary
          </Button>
          <Button className="w-full" type="button" variant="quiet" disabled={save.isPending} onClick={() => save.mutate()}>
            Save summary
          </Button>
          <Button
            className="w-full"
            type="button"
            variant="quiet"
            disabled={closeVisit.isPending}
            onClick={() => {
              if (
                window.confirm(
                  "Save this summary and start the next interval? Last appointment will be set to today.",
                )
              ) {
                closeVisit.mutate();
              }
            }}
          >
            Appointment done
          </Button>
        </div>
      ) : null}
      {(saved.data ?? []).length > 0 ? (
        <div className="space-y-2">
          <h2 className="font-serif text-2xl">Saved summaries</h2>
          {(saved.data ?? []).map((item) => (
            <Card key={item.id}>
              <p className="text-sm font-medium">
                {formatDate(item.period_start)} to {formatDate(item.period_end)}
              </p>
              <button className="mt-2 text-sm font-semibold text-teal" type="button" onClick={() => copy(item.summary_text)}>
                Copy this one
              </button>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  );
}
