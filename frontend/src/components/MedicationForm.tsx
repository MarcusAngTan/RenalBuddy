import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "../api";
import { useAuth } from "../auth";
import { SCHEDULES, UNITS, type Medication } from "../types";
import { todayISO } from "../lib/dates";
import { Button, ErrorText, Field, inputClass } from "./ui";

export function MedicationForm({
  initial,
  onSaved,
  submitLabel,
}: {
  initial?: Medication;
  onSaved: (med: Medication) => void;
  submitLabel: string;
}) {
  const queryClient = useQueryClient();
  const { refreshUser } = useAuth();
  const [name, setName] = useState(initial?.name ?? "");
  const [dose, setDose] = useState(initial ? String(initial.dose_amount) : "");
  const [unit, setUnit] = useState(initial?.dose_unit ?? "mg");
  const [schedule, setSchedule] = useState<Medication["schedule"]>(initial?.schedule ?? "daily");
  const [started, setStarted] = useState(initial?.started_on ?? todayISO());
  const [steroid, setSteroid] = useState(initial?.is_steroid ?? false);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: async () => {
      const body = {
        name,
        dose_amount: dose,
        dose_unit: unit,
        schedule,
        is_steroid: steroid,
        started_on: started,
        notes: notes.trim() || null,
      };
      if (initial) {
        return api<Medication>(`/api/medications/${initial.id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
      }
      return api<Medication>("/api/medications", { method: "POST", body: JSON.stringify(body) });
    },
    onSuccess: async (med) => {
      await queryClient.invalidateQueries({ queryKey: ["medications"] });
      await queryClient.invalidateQueries({ queryKey: ["today"] });
      await refreshUser();
      onSaved(med);
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Could not save this medicine."),
  });

  const stop = useMutation({
    mutationFn: () =>
      api<Medication>(`/api/medications/${initial?.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "stopped" }),
      }),
    onSuccess: async (med) => {
      await queryClient.invalidateQueries({ queryKey: ["medications"] });
      await queryClient.invalidateQueries({ queryKey: ["today"] });
      onSaved(med);
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Could not stop this medicine."),
  });

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        save.mutate();
      }}
    >
      <p className="text-sm leading-relaxed text-ink/70">
        If this steroid already has a taper, track it on the Taper screen and leave it out of this list.
      </p>
      <Field label="Name">
        <input className={inputClass} value={name} onChange={(event) => setName(event.target.value)} required />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Dose">
          <input
            className={inputClass}
            inputMode="decimal"
            value={dose}
            onChange={(event) => setDose(event.target.value)}
            required
          />
        </Field>
        <Field label="Unit">
          <select className={inputClass} value={unit} onChange={(event) => setUnit(event.target.value)}>
            {!UNITS.includes(unit as (typeof UNITS)[number]) ? <option value={unit}>{unit}</option> : null}
            {UNITS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Schedule">
        <select
          className={inputClass}
          value={schedule}
          onChange={(event) => setSchedule(event.target.value as Medication["schedule"])}
        >
          {SCHEDULES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </Field>
      {!initial ? (
        <Field label="Started">
          <input className={inputClass} type="date" value={started} onChange={(event) => setStarted(event.target.value)} />
        </Field>
      ) : null}
      <label className="flex items-start gap-3 text-sm">
        <input className="mt-1" type="checkbox" checked={steroid} onChange={(event) => setSteroid(event.target.checked)} />
        <span>This is a steroid</span>
      </label>
      <Field label="Note, optional">
        <textarea className={inputClass} rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} />
      </Field>
      <ErrorText>{error}</ErrorText>
      <Button className="w-full" type="submit" disabled={save.isPending}>
        {save.isPending ? "Saving…" : submitLabel}
      </Button>
      {initial && initial.status === "active" ? (
        <Button
          className="w-full"
          type="button"
          variant="danger"
          disabled={stop.isPending}
          onClick={() => {
            if (window.confirm("Stop this medicine? The visit summary will list the stop date.")) stop.mutate();
          }}
        >
          Stop medicine
        </Button>
      ) : null}
    </form>
  );
}
