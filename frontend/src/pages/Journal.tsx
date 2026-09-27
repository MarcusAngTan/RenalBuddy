import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "../api";
import { Button, Card, ErrorText, PageHeader } from "../components/ui";
import { formatDate } from "../lib/dates";
import type { JournalEntry } from "../types";

export function JournalPage() {
  const queryClient = useQueryClient();
  const [body, setBody] = useState("");
  const [include, setInclude] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const entries = useQuery({
    queryKey: ["journal"],
    queryFn: () => api<JournalEntry[]>("/api/journal"),
  });
  const create = useMutation({
    mutationFn: () =>
      api<JournalEntry>("/api/journal", {
        method: "POST",
        body: JSON.stringify({ body, include_in_summary: include }),
      }),
    onSuccess: async () => {
      setBody("");
      setInclude(false);
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ["journal"] });
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Could not save the note."),
  });
  const toggle = useMutation({
    mutationFn: (entry: JournalEntry) =>
      api<JournalEntry>(`/api/journal/${entry.id}`, {
        method: "PATCH",
        body: JSON.stringify({ include_in_summary: !entry.include_in_summary }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["journal"] }),
  });

  return (
    <div className="space-y-4">
      <PageHeader title="Journal" lede="Optional. Mark a note if you want it on the visit summary." />
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          create.mutate();
        }}
      >
        <textarea
          className="w-full rounded-2xl border border-line bg-white px-3 py-3 text-base"
          rows={4}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="What do you want to remember?"
          required
        />
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" checked={include} onChange={(event) => setInclude(event.target.checked)} />
          Include in visit summary
        </label>
        <ErrorText>{error}</ErrorText>
        <Button type="submit" disabled={create.isPending}>
          {create.isPending ? "Saving…" : "Save note"}
        </Button>
      </form>
      {entries.data?.length === 0 ? <p className="text-sm text-ink/60">No notes yet.</p> : null}
      <div className="space-y-2">
        {(entries.data ?? []).map((entry) => (
          <Card key={entry.id}>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{entry.body}</p>
            <p className="mt-2 text-xs text-ink/50">{formatDate(entry.created_at.slice(0, 10))}</p>
            <button className="mt-2 text-sm font-semibold text-teal" type="button" onClick={() => toggle.mutate(entry)}>
              {entry.include_in_summary ? "Included in visit summary" : "Include in visit summary"}
            </button>
          </Card>
        ))}
      </div>
    </div>
  );
}
