import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "../api";
import { useAuth } from "../auth";
import { Button, Card, Chip, CrisisNote, Empty, ErrorText, PillIcon } from "../components/ui";
import { addDays, daysUntil, formatDate, todayISO, visitPhrase } from "../lib/dates";
import { dailyPayload, formFromToday, validateDay, type DayForm, type DoseDraft } from "../lib/dayForm";
import { DIPSTICKS, EFFECTS, OEDEMA, type QuestionSuggestion, type TodayPayload } from "../types";

const quickActions = [
  { to: "/meds/new", label: "Add", icon: IconAdd, filled: true },
  { to: "/meds", label: "Meds", icon: IconPill, filled: false },
  { to: "/feel", label: "Feel", icon: IconHeart, filled: false },
  { to: "/taper", label: "Plan", icon: IconBell, filled: false },
];

export function TodayPage() {
  const { user, refreshUser } = useAuth();
  const queryClient = useQueryClient();
  const today = todayISO();
  const yesterday = addDays(today, -1);
  const [day, setDay] = useState(today);
  const [form, setForm] = useState<DayForm | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showMore, setShowMore] = useState(false);
  const [questionBody, setQuestionBody] = useState("");
  const firstName = (user?.display_name ?? "there").trim().split(" ")[0] || "there";
  const daysToVisit = daysUntil(user?.next_appointment_on ?? null, today);

  const todayQuery = useQuery({
    queryKey: ["today", day],
    queryFn: () => api<TodayPayload>(`/api/today?on=${day}`),
  });
  const yesterdayQuery = useQuery({
    queryKey: ["today", yesterday],
    queryFn: () => api<TodayPayload>(`/api/today?on=${yesterday}`),
    enabled: day === today,
  });
  const suggestions = useQuery({
    queryKey: ["question-suggestions"],
    queryFn: () => api<QuestionSuggestion[]>("/api/questions/suggestions"),
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
      await refreshUser();
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
      setMessage("Demo data added. Open Visit to read the summary.");
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Could not load the sample."),
  });

  const addQuestion = useMutation({
    mutationFn: (body: string) => api("/api/questions", { method: "POST", body: JSON.stringify({ body }) }),
    onSuccess: async () => {
      setQuestionBody("");
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ["questions"] });
      await queryClient.invalidateQueries({ queryKey: ["question-suggestions"] });
      await queryClient.invalidateQueries({ queryKey: ["today"] });
      setMessage("Question saved for your nephrologist.");
    },
    onError: (err) => {
      setMessage(null);
      setError(err instanceof ApiError ? err.message : "Could not save the question.");
    },
  });

  function saveQuestion() {
    const text = questionBody.trim();
    if (!text || addQuestion.isPending) return;
    addQuestion.mutate(text);
  }

  function shift(amount: number) {
    const next = addDays(day, amount);
    if (next > today || addDays(today, -30) > next) return;
    setDay(next);
    setForm(null);
  }

  const data = todayQuery.data;
  const medCount = (data?.taper ? 1 : 0) + (data?.medications.length ?? 0);
  const yesterdayEmpty =
    day === today &&
    Boolean(user?.has_clinical_data) &&
    yesterdayQuery.data &&
    !yesterdayQuery.data.taper?.log_status &&
    yesterdayQuery.data.medications.every((med) => med.slots.every((slot) => !slot.status)) &&
    !yesterdayQuery.data.dipstick_result &&
    yesterdayQuery.data.mood == null;
  const openChips = (suggestions.data ?? []).filter((item) => !item.already_saved).slice(0, 4);

  return (
    <div className="space-y-4">
      <section className="relative overflow-hidden rounded-[1.85rem] bg-[#173036] px-5 py-5 text-white shadow-card">
        <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-lime/30 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-12 -left-8 h-32 w-32 rounded-full bg-teal/25 blur-2xl" />
        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-white/55">My log</p>
        <h1 className="mt-1 text-[2rem] font-extrabold leading-tight">Hello, {firstName}!</h1>
        <p className="mt-1 text-sm font-medium text-white/75">
          {visitPhrase(data?.next_appointment_on ?? user?.next_appointment_on ?? null, today)}
        </p>
        {daysToVisit != null && daysToVisit >= 0 && daysToVisit <= 7 ? (
          <p className="mt-2 rounded-2xl bg-white/10 px-3 py-2 text-sm font-semibold">
            Visit ready in {daysToVisit === 0 ? "today" : `${daysToVisit} day${daysToVisit === 1 ? "" : "s"}`}. Open Visit to
            hand the phone over.
          </p>
        ) : null}
        <p className="mt-3 text-sm font-semibold text-lime">
          {medCount === 0
            ? "No medicines listed for today yet"
            : `You have ${medCount} medication${medCount === 1 ? "" : "s"} for today`}
        </p>
        <p className="mt-1 text-xs font-medium text-white/60">
          Vaccines while on immunosuppression are a clinic question, not something this app decides.
        </p>
        <div className="mt-5 grid grid-cols-4 gap-2">
          {quickActions.map((action) => (
            <Link key={action.label} to={action.to} className="flex flex-col items-center gap-1.5">
              <span
                className={
                  action.filled
                    ? "flex h-12 w-12 items-center justify-center rounded-full bg-lime text-white shadow-pop"
                    : "flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white"
                }
              >
                <action.icon />
              </span>
              <span className="text-[11px] font-extrabold text-white/80">{action.label}</span>
            </Link>
          ))}
        </div>
      </section>
      <div className="flex items-center justify-between gap-2">
        <Button type="button" variant="quiet" onClick={() => shift(-1)} disabled={day <= addDays(today, -30)}>
          Previous
        </Button>
        <p className="rounded-full bg-white px-3 py-2 text-center text-sm font-extrabold shadow-card">
          {formatDate(day)}
          {day === today ? " · Today" : ""}
        </p>
        <Button type="button" variant="quiet" onClick={() => shift(1)} disabled={day >= today}>
          Next
        </Button>
      </div>
      {yesterdayEmpty ? (
        <Card>
          <p className="font-extrabold">Log yesterday? 20 seconds.</p>
          <p className="mt-1 text-sm text-ink/70">No score for missing a day. Just catch up if you want the visit pack to be fuller.</p>
          <Button className="mt-3" type="button" variant="quiet" onClick={() => setDay(yesterday)}>
            Open yesterday
          </Button>
        </Card>
      ) : null}
      {!user?.last_appointment_on && !user?.next_appointment_on ? (
        <Empty
          title="Add your appointment dates"
          body="The visit summary uses the last appointment as its starting point. You can skip this and add it later."
          to="/setup"
          action="Set up dates"
        />
      ) : null}
      {!user?.has_clinical_data ? (
        <Card>
          <p className="font-extrabold">The loop in three steps</p>
          <p className="mt-1 text-sm leading-relaxed text-ink/70">
            Add the plan you were given, check in for today, then open Visit. Demo data fills an empty account so you can
            see the pack without waiting a month.
          </p>
          <Button className="mt-3" type="button" variant="quiet" disabled={sample.isPending} onClick={() => sample.mutate()}>
            {sample.isPending ? "Loading…" : "Demo data"}
          </Button>
        </Card>
      ) : null}
      {todayQuery.isLoading || !form ? <p className="text-sm font-semibold text-ink/70">Loading this day…</p> : null}
      {todayQuery.isError ? <ErrorText>Could not load this day.</ErrorText> : null}
      {form && data ? (
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            save.mutate();
          }}
        >
          <TaperCard data={data} form={form} setForm={setForm} />
          <ErrorText>{error}</ErrorText>
          {message ? <p className="text-sm font-bold text-teal">{message}</p> : null}
          <Button className="w-full" type="submit" disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Save this day"}
          </Button>
          <button
            type="button"
            className="w-full text-sm font-extrabold text-teal"
            onClick={() => setShowMore((value) => !value)}
          >
            {showMore ? "Hide extra for this visit" : "More for this visit"}
          </button>
          {showMore ? (
            <>
              <Card className="space-y-3">
                <h2 className="text-2xl font-extrabold">Urine dipstick</h2>
                <p className="text-sm text-ink/70">
                  Log the result your clinic asked you to check. This app will not tell you when to call.
                </p>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Dipstick result">
                  {DIPSTICKS.map((item) => (
                    <Chip
                      key={item.value}
                      selected={form.dipstick === item.value}
                      aria-label={`Dipstick ${item.label}`}
                      onClick={() => setForm({ ...form, dipstick: form.dipstick === item.value ? null : item.value })}
                    >
                      {item.label}
                    </Chip>
                  ))}
                </div>
              </Card>
              <Card className="space-y-3">
                <h2 className="text-2xl font-extrabold">Weight and swelling</h2>
                <p className="text-sm text-ink/70">Weight and swelling show how fluid changed before the next appointment.</p>
                <label className="block text-sm font-bold">
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
                      aria-label={`Swelling ${item.label}`}
                      onClick={() => setForm({ ...form, oedema: form.oedema === item.value ? null : item.value })}
                    >
                      {item.label}
                    </Chip>
                  ))}
                </div>
              </Card>
              <Card className="space-y-3">
                <h2 className="text-2xl font-extrabold">Side effects</h2>
                <p className="text-sm text-ink/70">Common steroid effects. Leave this blank if none showed up.</p>
                <div className="flex flex-wrap gap-2">
                  {EFFECTS.map((effect) => {
                    const selected = form.effects.some((item) => item.effect_code === effect.code);
                    return (
                      <Chip
                        key={effect.code}
                        selected={selected}
                        aria-label={effect.label}
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
                    <p className="text-sm font-bold">{EFFECTS.find((item) => item.code === effect.effect_code)?.label}</p>
                    <div className="flex gap-2">
                      {[
                        [1, "Mild"],
                        [2, "Moderate"],
                        [3, "Severe"],
                      ].map(([severity, label]) => (
                        <Chip
                          key={severity}
                          selected={effect.severity === severity}
                          aria-label={`${label} severity`}
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
                <h2 className="text-2xl font-extrabold">How I feel</h2>
                <p className="text-sm text-ink/70">A quick check-in, not a diagnosis. 1 is low, 5 is high.</p>
                <ScoreRow label="Mood" value={form.mood} onChange={(mood) => setForm({ ...form, mood })} />
                <ScoreRow label="Energy" value={form.energy} onChange={(energy) => setForm({ ...form, energy })} />
                <ScoreRow label="Sleep" value={form.sleep} onChange={(sleep) => setForm({ ...form, sleep })} />
                <label className="block text-sm font-bold">
                  A line, optional
                  <input
                    className="mt-1 w-full rounded-2xl border border-line bg-white px-3 py-3 text-base"
                    value={form.wellbeingNote}
                    onChange={(event) => setForm({ ...form, wellbeingNote: event.target.value })}
                  />
                </label>
                {form.mood === 1 ? <CrisisNote /> : null}
              </Card>
            </>
          ) : null}
          <Card className="space-y-3">
            <h2 className="text-lg font-extrabold">Questions for your nephrologist</h2>
            <p className="text-sm text-ink/70">
              Type your own or tap a suggestion. Open questions appear on the visit summary. Nothing is sent to a clinician
              from here.
            </p>
            <textarea
              className="w-full rounded-2xl border border-line bg-white px-3 py-3 text-base"
              rows={2}
              value={questionBody}
              onChange={(event) => setQuestionBody(event.target.value)}
              placeholder="What do you want to ask?"
            />
            <Button type="button" disabled={!questionBody.trim() || addQuestion.isPending} onClick={saveQuestion}>
              Save question
            </Button>
            {openChips.length > 0 ? (
              <div className="space-y-2 border-t border-line pt-3">
                <p className="text-sm font-bold">Suggestions</p>
                <div className="flex flex-wrap gap-2">
                  {openChips.map((item) => (
                    <Chip key={item.id} onClick={() => addQuestion.mutate(item.body)}>
                      {item.body}
                    </Chip>
                  ))}
                </div>
              </div>
            ) : null}
          </Card>
          <p className="text-sm">
            <Link className="font-extrabold text-teal" to="/questions">
              {data.open_questions > 0
                ? `${data.open_questions} question${data.open_questions === 1 ? "" : "s"} saved for your nephrologist`
                : "Ask my doctor about this"}
            </Link>
          </p>
        </form>
      ) : null}
    </div>
  );
}

function TaperCard({
  data,
  form,
  setForm,
}: {
  data: TodayPayload;
  form: DayForm;
  setForm: (form: DayForm) => void;
}) {
  const taper = data.taper;
  return (
    <Card className="space-y-3">
      <div className="flex items-end justify-between gap-2">
        <h2 className="text-2xl font-extrabold">Today’s medicines</h2>
        <Link className="text-sm font-extrabold text-teal" to="/taper">
          See all
        </Link>
      </div>
      {!taper && data.medications.length === 0 ? (
        <Empty
          title="No medicines for today"
          body="Add the plan your nephrologist wrote down. The app will not invent the next dose."
          to="/taper/new"
          action="Add taper plan"
        />
      ) : (
        <div className="space-y-2">
          {taper?.step && taper.prescribed_dose != null && form.taper ? (
            <ScheduleRow name={taper.medication_name} dose={`${taper.prescribed_dose} ${taper.dose_unit}`} note={taper.step.instruction}>
              <DoseRow draft={form.taper} onChange={(taperDraft) => setForm({ ...form, taper: taperDraft })} />
            </ScheduleRow>
          ) : taper && !taper.step ? (
            <p className="text-sm">No prescribed taper dose falls on this date.</p>
          ) : null}
          {form.meds.map((draft, index) => (
            <ScheduleRow key={`${draft.medication_id}-${draft.slot}`} name={draft.label} dose={draft.detail}>
              <DoseRow
                draft={draft}
                onChange={(next) =>
                  setForm({
                    ...form,
                    meds: form.meds.map((item, itemIndex) => (itemIndex === index ? next : item)),
                  })
                }
              />
            </ScheduleRow>
          ))}
        </div>
      )}
      {taper?.next_step ? (
        <p className="text-sm">
          {taper.medication_name} taper — next change: {taper.next_step.dose_amount} {taper.dose_unit} on{" "}
          {formatDate(taper.next_step.start_on)}.
        </p>
      ) : taper ? (
        <p className="text-sm text-ink/70">No further {taper.medication_name} taper step is entered after this date.</p>
      ) : null}
    </Card>
  );
}

function ScheduleRow({
  name,
  dose,
  note,
  children,
}: {
  name: string;
  dose: string;
  note?: string | null;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-[1.35rem] bg-paper px-3 py-3">
      <div className="flex items-start gap-3">
        <PillIcon />
        <div className="min-w-0 flex-1">
          <p className="font-extrabold text-ink">{name}</p>
          <p className="text-sm font-bold text-teal">{dose}</p>
          {note ? <p className="text-xs font-medium text-ink/55">{note}</p> : null}
        </div>
      </div>
      {children}
    </div>
  );
}

function DoseRow({ draft, onChange }: { draft: DoseDraft; onChange: (draft: DoseDraft) => void }) {
  function choose(status: DoseDraft["status"]) {
    onChange({ ...draft, status: draft.status === status ? null : status });
  }
  return (
    <div className="mt-3">
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button
          type="button"
          aria-pressed={draft.status === "missed"}
          className={
            draft.status === "missed"
              ? "min-h-10 rounded-full bg-clay/15 text-sm font-extrabold text-clay"
              : "min-h-10 rounded-full border border-line bg-white text-sm font-bold text-ink/70"
          }
          onClick={() => choose("missed")}
        >
          Missed
        </button>
        <button
          type="button"
          aria-pressed={draft.status === "taken"}
          className={
            draft.status === "taken"
              ? "min-h-10 rounded-full bg-lime text-sm font-extrabold text-white shadow-sm"
              : "min-h-10 rounded-full border border-line bg-white text-sm font-bold text-ink/70"
          }
          onClick={() => choose("taken")}
        >
          Taken
        </button>
      </div>
      <div className="mt-2">
        <Chip selected={draft.status === "different_dose"} onClick={() => choose("different_dose")}>
          Different amount
        </Chip>
      </div>
      {draft.status === "different_dose" ? (
        <label className="mt-2 block text-sm font-bold">
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
      <p className="mb-1 text-sm font-bold">{label}</p>
      <div className="flex gap-2" role="group" aria-label={label}>
        {[1, 2, 3, 4, 5].map((score) => (
          <Chip key={score} selected={value === score} aria-label={`${label} ${score} of 5`} onClick={() => onChange(score)}>
            {score}
          </Chip>
        ))}
      </div>
    </div>
  );
}

function IconAdd() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path d="M12 6v12M6 12h12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function IconPill() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <rect x="3" y="8" width="18" height="8" rx="4" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 8v8" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function IconHeart() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        d="M12 19s-7-4.2-7-9a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 4.8-7 9-7 9z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconBell() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        d="M7 16h10l-1-2.4V10a4 4 0 1 0-8 0v3.6L7 16z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M10 16a2 2 0 0 0 4 0" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}
