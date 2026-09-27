import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api";
import { Card, CrisisNote, PageHeader } from "../components/ui";
import { addDays, formatShort, todayISO } from "../lib/dates";
import type { CopingSuggestion, WellbeingLog } from "../types";

export function FeelPage() {
  const today = todayISO();
  const from = addDays(today, -13);
  const checkins = useQuery({
    queryKey: ["wellbeing", from, today],
    queryFn: () => api<WellbeingLog[]>(`/api/logs/wellbeing?from=${from}&to=${today}`),
  });
  const coping = useQuery({
    queryKey: ["coping"],
    queryFn: () => api<{ suggestions: CopingSuggestion[]; using_defaults: boolean }>("/api/coping"),
  });
  const latest = checkins.data?.[checkins.data.length - 1];

  return (
    <div className="space-y-4">
      <PageHeader title="Feel" lede="Check-ins, a few ideas that match your interests, and a place for notes." />
      {latest?.mood === 1 ? <CrisisNote /> : null}
      <Card>
        <h2 className="font-serif text-2xl">Recent check-ins</h2>
        <p className="mt-1 text-sm text-ink/70">Mood scores from the last two weeks. Log them on Today.</p>
        {checkins.data && checkins.data.length > 0 ? (
          <div className="mt-3 flex gap-2 overflow-x-auto">
            {checkins.data.map((row) => (
              <div key={row.id} className="flex w-12 shrink-0 flex-col items-center text-xs">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-tide font-semibold">{row.mood}</span>
                <span className="mt-1 text-ink/60">{formatShort(row.log_on)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-ink/60">No check-ins yet.</p>
        )}
      </Card>
      <div className="grid gap-2">
        <Link className="rounded-3xl bg-card px-4 py-4" to="/journal">
          <p className="font-medium">Journal</p>
          <p className="text-sm text-ink/70">Optional notes. Mark the ones to show your nephrologist.</p>
        </Link>
        <Link className="rounded-3xl bg-card px-4 py-4" to="/questions">
          <p className="font-medium">Ask my doctor</p>
          <p className="text-sm text-ink/70">Save questions so they are on the visit summary.</p>
        </Link>
        <Link className="rounded-3xl bg-card px-4 py-4" to="/support">
          <p className="font-medium">Support links</p>
          <p className="text-sm text-ink/70">Patient communities and kidney organisations.</p>
        </Link>
      </div>
      <div className="space-y-2">
        <h2 className="font-serif text-2xl">Something that might help</h2>
        {coping.data?.using_defaults ? (
          <p className="text-sm text-ink/70">These are general calm-down ideas. Pick interests in Profile to tune them.</p>
        ) : (
          <p className="text-sm text-ink/70">Matched to the interests on your profile. Stop if something feels wrong for you.</p>
        )}
        {(coping.data?.suggestions ?? []).map((idea) => (
          <Card key={idea.id}>
            <p className="font-medium">{idea.title}</p>
            <p className="mt-1 text-sm leading-relaxed text-ink/80">{idea.body}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
