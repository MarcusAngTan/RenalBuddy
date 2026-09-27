import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "../api";
import { useAuth } from "../auth";
import { addDays, todayISO } from "../lib/dates";
import { UNITS, type TaperPlan } from "../types";
import { Button, Disclaimer, ErrorText, Field, inputClass } from "./ui";

type StepDraft = {
  dose: string;
  start: string;
  end: string;
  instruction: string;
};

function blankStep(): StepDraft {
  const today = todayISO();
  return { dose: "", start: today, end: addDays(today, 6), instruction: "Once each morning" };
}

function sampleSteps(): StepDraft[] {
  const today = todayISO();
  return [
    { dose: "40", start: addDays(today, -10), end: addDays(today, -4), instruction: "Once each morning" },
    { dose: "30", start: addDays(today, -3), end: addDays(today, 3), instruction: "Once each morning" },
    { dose: "20", start: addDays(today, 4), end: addDays(today, 10), instruction: "Once each morning" },
    { dose: "10", start: addDays(today, 11), end: addDays(today, 24), instruction: "Once each morning" },
  ];
}

export function TaperForm({
  replacing,
  onSaved,
  onSkip,
}: {
  replacing: boolean;
  onSaved: () => void;
  onSkip?: () => void;
}) {
  const queryClient = useQueryClient();
  const { refreshUser } = useAuth();
  const [name, setName] = useState("Prednisolone");
  const [unit, setUnit] = useState("mg");
  const [title, setTitle] = useState("Prednisolone taper");
  const [note, setNote] = useState("");
  const [steps, setSteps] = useState<StepDraft[]>([blankStep()]);
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () =>
      api<TaperPlan>("/api/taper-plans", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim() || `${name.trim()} taper`,
          medication_name: name,
          dose_unit: unit,
          prescribed_note: note.trim() || null,
          steps: steps.map((step) => ({
            dose_amount: step.dose,
            start_on: step.start,
            end_on: step.end,
            instruction: step.instruction.trim() || null,
          })),
        }),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["tapers"] });
      await queryClient.invalidateQueries({ queryKey: ["today"] });
      await refreshUser();
      onSaved();
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Could not save the taper."),
  });

  function updateStep(index: number, patch: Partial<StepDraft>) {
    setSteps((current) => current.map((step, stepIndex) => (stepIndex === index ? { ...step, ...patch } : step)));
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        save.mutate();
      }}
    >
      <Disclaimer />
      <p className="text-sm leading-relaxed text-ink/70">
        Type the steps your nephrologist already prescribed. RenalBuddy shows the dose for each date. It does not
        calculate the next dose.
      </p>
      {replacing ? (
        <p className="rounded-2xl bg-amber/10 px-3 py-2 text-sm text-amber">
          Saving replaces the current taper. The old steps stay in your log.
        </p>
      ) : null}
      <Field label="Medicine">
        <input className={inputClass} value={name} onChange={(event) => setName(event.target.value)} required />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Unit">
          <select className={inputClass} value={unit} onChange={(event) => setUnit(event.target.value)}>
            {UNITS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Plan name">
          <input className={inputClass} value={title} onChange={(event) => setTitle(event.target.value)} />
        </Field>
      </div>
      <Field label="Where this plan came from, optional">
        <input
          className={inputClass}
          placeholder="Clinic date or doctor"
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </Field>
      <div className="space-y-3">
        {steps.map((step, index) => (
          <div key={index} className="rounded-3xl border border-line bg-white p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold">Step {index + 1}</p>
              {steps.length > 1 ? (
                <button
                  type="button"
                  className="text-sm text-clay"
                  onClick={() => setSteps((current) => current.filter((_, stepIndex) => stepIndex !== index))}
                >
                  Remove
                </button>
              ) : null}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Dose">
                <input
                  className={inputClass}
                  inputMode="decimal"
                  value={step.dose}
                  onChange={(event) => updateStep(index, { dose: event.target.value })}
                  required
                />
              </Field>
              <Field label="Instruction">
                <input
                  className={inputClass}
                  value={step.instruction}
                  onChange={(event) => updateStep(index, { instruction: event.target.value })}
                />
              </Field>
              <Field label="Start">
                <input
                  className={inputClass}
                  type="date"
                  value={step.start}
                  onChange={(event) => updateStep(index, { start: event.target.value })}
                  required
                />
              </Field>
              <Field label="End">
                <input
                  className={inputClass}
                  type="date"
                  value={step.end}
                  onChange={(event) => updateStep(index, { end: event.target.value })}
                  required
                />
              </Field>
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="quiet" onClick={() => setSteps((current) => [...current, blankStep()])}>
          Add step
        </Button>
        <Button type="button" variant="quiet" onClick={() => setSteps(sampleSteps())}>
          Fill sample steps
        </Button>
      </div>
      <ErrorText>{error}</ErrorText>
      <Button className="w-full" type="submit" disabled={save.isPending}>
        {save.isPending ? "Saving…" : "Save prescribed plan"}
      </Button>
      {onSkip ? (
        <Button className="w-full" type="button" variant="quiet" onClick={onSkip}>
          Skip for now
        </Button>
      ) : null}
    </form>
  );
}
