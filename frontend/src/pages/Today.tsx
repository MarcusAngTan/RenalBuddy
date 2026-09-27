import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "../api";
import { useAuth } from "../auth";
import { Button, Card, Chip, CrisisNote, Empty, ErrorText, PageHeader } from "../components/ui";
import { addDays, formatDate, todayISO, visitPhrase } from "../lib/dates";
import { dailyPayload, formFromToday, validateDay, type DayForm, type DoseDraft } from "../lib/dayForm";
import { DIPSTICKS, EFFECTS, OEDEMA, type TodayPayload } from "../types";

export function TodayPage() {
  const { user, refreshUser } = useAuth();
  const queryClient = useQueryClient();
  const today = todayISO();
  const [day, setDay] = useState(today);
  const [form, setForm] = useState<DayForm | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const todayQuery = useQuery({
    queryKey: ["today", day],
    queryFn: () => api<TodayPayload>(`/api/today?on=${day}`),
  });

  useEffect(() => {
    if (!todayQuery.data) return;
    setForm(formFromToday(todayQuery.data));
  }, [todayQuery.data]);

  const save = useMutation({
    mutationFn: async () => {
      if (!form) throw new Error("Still loading.");
      const problem = validateDay(form);
      if (problem) throw new ApiError(400, problem);
      return api<TodayPayload>("/api/daily-check", {
        method: "POST",
        body: JSON.stringify(dailyPayload(day, form)),
      });
    },
    onSuccess: async (data) => {
      setForm(formFromToday(data));
      setMessage(`Saved for ${formatDate(data.on)}.`);
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ["today", day] });
    },
    onError: (err) => {
      setMessage(null);
      setError(err instanceof ApiError ? err.message : "Could not save today.");
    },
  });

  const sample = useMutation({
    mutationFn: () => api<{ status: string }>("/api/demo/sample-week", { method: "POST" }),
    onSuccess: async () => {
      await refreshUser();
      await queryClient.invalidateQueries();
      setMessage("Sample week added. Open Visit to read the summary.");
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Could not load the sample."),
  });

  function shift(amount: number) {
    const next = addDays(day, amount);
    if (next > today || addDays(today, -30) > next) return;
    setDay(next);
    setForm(null);
  }

  const data = todayQuery.data;

  return (
    <div className="space-y-4">
      <PageHeader title="Today" lede={visitPhrase(data?.next_appointment_on ?? user?.next_appointment_on ?? null, today)} />
      <div className="flex items-center justify-between gap-2">
        <Button type="button" variant="quiet" onClick={() => shift(-1)} disabled={day <= addDays(today, -30)}>
          Previous
        </Button>
        <p className="text-center text-sm font-semibold">
          {formatDate(day)}
          {day === today ? " · Today" : ""}
        </p>
        <Button type="button" variant="quiet" onClick={() => shift(1)} disabled={day >= today}>
          Next
        </Button>
      </div>
      {!user?.last_appointment_on && !user?.next_appointment_on ? (
        <Empty
          title="Add your appointment dates"
          body="The visit summary uses the last appointment as its starting point."
          to="/setup"
          action="Set up dates"
        />
      ) : null}
      {!user?.has_clinical_data ? (
        <Card>
          <p className="font-medium">Try the loop with sample data</p>
          <p className="mt-1 text-sm leading-relaxed text-ink/70">
            Loads a 4-step prednisolone taper, one other medicine, and three logged days into this empty account.
          </p>
          <Button className="mt-3" type="button" variant="quiet" disabled={sample.isPending} onClick={() => sample.mutate()}>
            {sample.isPending ? "Loading…" : "Load sample week"}
          </Button>
        </Card>
      ) : null}
      {todayQuery.isLoading || !form ? <p className="text-sm text-ink/70">Loading this day…</p> : null}
      {todayQuery.isError ? <ErrorText>Could not load this day.</ErrorText> : null}
      {form && data ? (
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            save.mutate();
          }}
        >
          <TaperCard data={data} draft={form.taper} onChange={(taper) => setForm({ ...form, taper })} />
          <Card className="space-y-3">
            <h2 className="font-serif text-2xl">Other medicines</h2>
            {form.meds.length === 0 ? (
              <Empty
                title="No other medicines for this date"
                body="Add medicines you take beside the steroid taper, such as a blood-pressure tablet."
                to="/meds/new"
                action="Add a medicine"
              />
            ) : (
              form.meds.map((draft, index) => (
                <DoseRow
                  key={`${draft.medication_id}-${draft.slot}`}
                  draft={draft}
                  onChange={(next) =>
                    setForm({
                      ...form,
                      meds: form.meds.map((item, itemIndex) => (itemIndex === index ? next : item)),
                    })
                  }
                />
              ))
            )}
          </Card>
          <Card className="space-y-3">
            <h2 className="font-serif text-2xl">Urine dipstick</h2>
            <p className="text-sm text-ink/70">A home result gives your nephrologist protein readings between visits.</p>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Dipstick result">
              {DIPSTICKS.map((item) => (
                <Chip
                  key={item.value}
                  selected={form.dipstick === item.value}
                  onClick={() => setForm({ ...form, dipstick: form.dipstick === item.value ? null : item.value })}
                >
                  {item.label}
                </Chip>
              ))}
            </div>
          </Card>
          <Card className="space-y-3">
            <h2 className="font-serif text-2xl">Weight and swelling</h2>
            <p className="text-sm text-ink/70">Weight and swelling show how fluid changed before the next appointment.</p>
            <label className="block text-sm font-medium">
              Weight (kg)
              <input
                className="mt-1 w-full rounded-2xl border border-line bg-white px-3 py-3 text-base"
                inputMode="decimal"
                value={form.weight}
                onChange={(event) => setForm({ ...form, weight: event.target.value })}
              />
            </label>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Swelling">
              {OEDEMA.map((item) => (
                <Chip
                  key={item.value}
                  selected={form.oedema === item.value}
                  onClick={() => setForm({ ...form, oedema: form.oedema === item.value ? null : item.value })}
                >
                  {item.label}
                </Chip>
              ))}
            </div>
          </Card>
          <Card className="space-y-3">
            <h2 className="font-serif text-2xl">Side effects</h2>
            <p className="text-sm text-ink/70">Common steroid effects. Leave this blank if none showed up.</p>
            <div className="flex flex-wrap gap-2">
              {EFFECTS.map((effect) => {
                const selected = form.effects.some((item) => item.effect_code === effect.code);
                return (
                  <Chip
                    key={effect.code}
                    selected={selected}
                    onClick={() =>
                      setForm({
                        ...form,
                        effects: selected
                          ? form.effects.filter((item) => item.effect_code !== effect.code)
                          : [...form.effects, { effect_code: effect.code, severity: 1, note: "" }],
                      })
                    }
                  >
                    {effect.label}
                  </Chip>
                );
              })}
            </div>
            {form.effects.map((effect) => (
              <div key={effect.effect_code} className="space-y-2">
                <p className="text-sm font-medium">{EFFECTS.find((item) => item.code === effect.effect_code)?.label}</p>
                <div className="flex gap-2">
                  {[
                    [1, "Mild"],
                    [2, "Moderate"],
                    [3, "Severe"],
                  ].map(([severity, label]) => (
                    <Chip
                      key={severity}
                      selected={effect.severity === severity}
                      onClick={() =>
                        setForm({
                          ...form,
                          effects: form.effects.map((item) =>
                            item.effect_code === effect.effect_code ? { ...item, severity: Number(severity) } : item,
                          ),
                        })
                      }
                    >
                      {label}
                    </Chip>
                  ))}
                </div>
                {effect.effect_code === "other" ? (
                  <input
                    className="w-full rounded-2xl border border-line bg-white px-3 py-3 text-base"
                    placeholder="What else?"
                    value={effect.note}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        effects: form.effects.map((item) =>
                          item.effect_code === "other" ? { ...item, note: event.target.value } : item,
                        ),
                      })
                    }
                  />
                ) : null}
              </div>
            ))}
          </Card>
          <Card className="space-y-3">
            <h2 className="font-serif text-2xl">How I feel</h2>
            <p className="text-sm text-ink/70">A quick check-in, not a diagnosis. 1 is low, 5 is high.</p>
            <ScoreRow label="Mood" value={form.mood} onChange={(mood) => setForm({ ...form, mood })} />
            <ScoreRow label="Energy" value={form.energy} onChange={(energy) => setForm({ ...form, energy })} />
            <ScoreRow label="Sleep" value={form.sleep} onChange={(sleep) => setForm({ ...form, sleep })} />
            <label className="block text-sm font-medium">
              A line, optional
              <input
                className="mt-1 w-full rounded-2xl border border-line bg-white px-3 py-3 text-base"
                value={form.wellbeingNote}
                onChange={(event) => setForm({ ...form, wellbeingNote: event.target.value })}
              />
            </label>
            {form.mood === 1 ? <CrisisNote /> : null}
          </Card>
          <p className="text-sm">
            <Link className="font-semibold text-teal" to="/questions">
              {data.open_questions > 0
                ? `${data.open_questions} question${data.open_questions === 1 ? "" : "s"} saved for your nephrologist`
                : "Ask my doctor about this"}
            </Link>
          </p>
          <ErrorText>{error}</ErrorText>
          {message ? <p className="text-sm text-teal">{message}</p> : null}
          <Button className="w-full" type="submit" disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Save this day"}
          </Button>
        </form>
      ) : null}
    </div>
  );
}

function TaperCard({
  data,
  draft,
  onChange,
}: {
  data: TodayPayload;
  draft: DoseDraft | null;
  onChange: (draft: DoseDraft | null) => void;
}) {
  const taper = data.taper;
  return (
    <Card className="space-y-3">
      <h2 className="font-serif text-2xl">Prescribed steroid</h2>
      {!taper ? (
        <Empty
          title="No steroid taper yet"
          body="Add the plan your nephrologist wrote down. The app will not invent the next dose."
          to="/taper/new"
          action="Add taper plan"
        />
      ) : (
        <>
          <p className="text-sm text-ink/60">{taper.title}</p>
          {taper.step && taper.prescribed_dose != null ? (
            <>
              <p className="font-serif text-4xl text-ink">
                {taper.prescribed_dose} <span className="text-lg">{taper.dose_unit}</span>
              </p>
              <p className="text-sm">Prescribed for {formatDate(data.on)}. This is the entered plan, not a recommendation.</p>
              {taper.step.instruction ? <p className="text-sm text-ink/70">{taper.step.instruction}</p> : null}
            </>
          ) : (
            <p className="text-sm">No prescribed dose falls on this date.</p>
          )}
          {taper.next_step ? (
            <p className="text-sm">
              Next change: {taper.next_step.dose_amount} {taper.dose_unit} on {formatDate(taper.next_step.start_on)}.
            </p>
          ) : (
            <p className="text-sm text-ink/70">No further step is entered after this date.</p>
          )}
          {draft ? <DoseRow draft={draft} onChange={onChange} /> : null}
          <Link className="inline-block text-sm font-semibold text-teal" to="/taper">
            View timeline
          </Link>
        </>
      )}
    </Card>
  );
}

function DoseRow({ draft, onChange }: { draft: DoseDraft; onChange: (draft: DoseDraft) => void }) {
  function choose(status: DoseDraft["status"]) {
    onChange({ ...draft, status: draft.status === status ? null : status });
  }
  return (
    <div className="rounded-2xl bg-paper px-3 py-3">
      <p className="font-medium">{draft.label}</p>
      <p className="text-sm text-ink/60">{draft.detail}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <Chip selected={draft.status === "taken"} onClick={() => choose("taken")}>
          Taken
        </Chip>
        <Chip selected={draft.status === "missed"} onClick={() => choose("missed")}>
          Missed
        </Chip>
        <Chip selected={draft.status === "different_dose"} onClick={() => choose("different_dose")}>
          Different amount
        </Chip>
      </div>
      {draft.status === "different_dose" ? (
        <label className="mt-2 block text-sm">
          Amount taken
          <input
            className="mt-1 w-full rounded-2xl border border-line bg-white px-3 py-2 text-base"
            inputMode="decimal"
            value={draft.taken_dose}
            onChange={(event) => onChange({ ...draft, taken_dose: event.target.value })}
          />
        </label>
      ) : null}
    </div>
  );
}

function ScoreRow({ label, value, onChange }: { label: string; value: number | null; onChange: (value: number) => void }) {
  return (
    <div>
      <p className="mb-1 text-sm font-medium">{label}</p>
      <div className="flex gap-2" role="group" aria-label={label}>
        {[1, 2, 3, 4, 5].map((score) => (
          <Chip key={score} selected={value === score} onClick={() => onChange(score)}>
            {score}
          </Chip>
        ))}
      </div>
    </div>
  );
}
