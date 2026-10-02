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
  const latest = checkins.data?.[checkins.data.length - 1];
  const coping = useQuery({
    queryKey: ["coping", latest?.mood, latest?.energy],
    queryFn: () => {
      const params = new URLSearchParams();
      if (latest?.mood) params.set("mood", String(latest.mood));
      if (latest?.energy) params.set("energy", String(latest.energy));
      const query = params.toString();
      return api<{ suggestions: CopingSuggestion[]; using_defaults: boolean }>(`/api/coping${query ? `?${query}` : ""}`);
    },
  });
  const lowestMood = checkins.data?.reduce(
    (best, row) => (best == null || row.mood < best.mood ? row : best),
    null as WellbeingLog | null,
  );

  return (
    <div className="space-y-4">
      <PageHeader title="Feel" lede="Check-ins, a few ideas that match your interests, and a place for notes." />
      {latest?.mood === 1 ? <CrisisNote /> : null}
      <Card>
        <h2 className="text-2xl font-extrabold">Recent check-ins</h2>
        <p className="mt-1 text-sm text-ink/70">Mood, energy, and sleep from the last two weeks. Log them on Today.</p>
        {checkins.data && checkins.data.length > 0 ? (
          <div className="mt-3 flex gap-2 overflow-x-auto">
            {checkins.data.map((row) => {
              const lowest = lowestMood?.id === row.id;
              return (
                <div key={row.id} className="flex w-16 shrink-0 flex-col items-center text-xs">
                  <span
                    className={
                      lowest
                        ? "flex h-10 w-10 items-center justify-center rounded-full border-2 border-ink bg-white font-extrabold text-ink"
                        : "flex h-10 w-10 items-center justify-center rounded-full bg-lime font-extrabold text-white"
                    }
                    aria-label={`Mood ${row.mood} of 5${lowest ? ", lowest day" : ""}`}
                  >
                    {row.mood}
                  </span>
                  <span className="mt-1 text-ink/60">{formatShort(row.log_on)}</span>
                  <span className="text-[10px] font-bold text-ink/50">E{row.energy} S{row.sleep_quality}</span>
                  {lowest ? <span className="mt-1 text-[10px] font-extrabold text-ink/70">Lowest</span> : null}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="mt-3 text-sm text-ink/60">No check-ins yet.</p>
        )}
      </Card>
      <div className="grid gap-2">
        <Link className="rounded-[1.75rem] bg-card px-4 py-4 shadow-card" to="/journal">
          <p className="font-extrabold">Journal</p>
          <p className="text-sm text-ink/70">Optional notes. Mark the ones to show your nephrologist.</p>
        </Link>
        <Link className="rounded-[1.75rem] bg-card px-4 py-4 shadow-card" to="/questions">
          <p className="font-extrabold">Ask my doctor</p>
          <p className="text-sm text-ink/70">Save questions so they are on the visit summary.</p>
        </Link>
        <Link className="rounded-[1.75rem] bg-card px-4 py-4 shadow-card" to="/support">
          <p className="font-extrabold">Support links</p>
          <p className="text-sm text-ink/70">Singapore organisations first, then English education links.</p>
        </Link>
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-extrabold">Something that might help</h2>
        {coping.data?.using_defaults ? (
          <p className="text-sm text-ink/70">These are general calm-down ideas. Pick interests in Profile to tune them.</p>
        ) : (
          <p className="text-sm text-ink/70">Matched to the interests on your profile. Stop if something feels wrong for you.</p>
        )}
        {(coping.data?.suggestions ?? []).map((idea) => (
          <Card key={idea.id}>
            <p className="font-extrabold">{idea.title}</p>
            <p className="mt-1 text-sm leading-relaxed text-ink/80">{idea.body}</p>
            <p className="mt-2 text-xs font-bold text-ink/50">Stop if you feel unwell.</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
