import type { DoseStatus, TodayPayload } from "../types";

export type DoseDraft = {
  medication_id?: number;
  taper_step_id?: number;
  slot: "daily" | "morning" | "evening";
  label: string;
  detail: string;
  status: DoseStatus | null;
  taken_dose: string;
};

export type EffectDraft = {
  effect_code: string;
  severity: number;
  note: string;
};

export type DayForm = {
  taper: DoseDraft | null;
  meds: DoseDraft[];
  dipstick: string | null;
  weight: string;
  oedema: number | null;
  effects: EffectDraft[];
  mood: number | null;
  energy: number | null;
  sleep: number | null;
  wellbeingNote: string;
};

const SLOT_LABEL: Record<string, string> = {
  daily: "Today",
  morning: "Morning",
  evening: "Evening",
};

function doseDraft(
  partial: Omit<DoseDraft, "status" | "taken_dose"> & { status: DoseStatus | null; taken_dose: number | null },
): DoseDraft {
  return {
    ...partial,
    taken_dose: partial.status === "different_dose" && partial.taken_dose != null ? String(partial.taken_dose) : "",
  };
}

export function formFromToday(data: TodayPayload): DayForm {
  const taper = data.taper?.step
    ? doseDraft({
        taper_step_id: data.taper.step.id,
        slot: "daily",
        label: data.taper.medication_name,
        detail: "",
        status: data.taper.log_status,
        taken_dose: data.taper.taken_dose,
      })
    : null;
  const meds = data.medications.flatMap((med) =>
    med.slots.map((slot) =>
      doseDraft({
        medication_id: med.id,
        slot: slot.slot,
        label: med.slots.length > 1 ? `${med.name} · ${SLOT_LABEL[slot.slot] ?? slot.slot}` : med.name,
        detail:
          med.schedule === "as_needed"
            ? `${med.dose_amount} ${med.dose_unit} as needed`
            : `${med.dose_amount} ${med.dose_unit}`,
        status: slot.status,
        taken_dose: slot.taken_dose,
      }),
    ),
  );
  return {
    taper,
    meds,
    dipstick: data.dipstick_result,
    weight: data.weight_kg == null ? "" : String(data.weight_kg),
    oedema: data.oedema_score,
    effects: data.side_effects.map((effect) => ({
      effect_code: effect.effect_code,
      severity: effect.severity,
      note: effect.note ?? "",
    })),
    mood: data.mood,
    energy: data.energy,
    sleep: data.sleep_quality,
    wellbeingNote: data.wellbeing_note ?? "",
  };
}

export function dailyPayload(day: string, form: DayForm) {
  const drafts = [...(form.taper ? [form.taper] : []), ...form.meds];
  return {
    on: day,
    doses: drafts.map((draft) => ({
      medication_id: draft.medication_id ?? null,
      taper_step_id: draft.taper_step_id ?? null,
      slot: draft.slot,
      status: draft.status,
      taken_dose: draft.status === "different_dose" && draft.taken_dose ? Number(draft.taken_dose) : null,
    })),
    dipstick_result: form.dipstick,
    weight_kg: form.weight.trim() ? Number(form.weight) : null,
    oedema_score: form.oedema,
    side_effects: form.effects.map((effect) => ({
      effect_code: effect.effect_code,
      severity: effect.severity,
      note: effect.note.trim() || null,
    })),
    mood: form.mood,
    energy: form.energy,
    sleep_quality: form.sleep,
    wellbeing_note: form.wellbeingNote.trim() || null,
  };
}

export function validateDay(form: DayForm) {
  for (const draft of [...(form.taper ? [form.taper] : []), ...form.meds]) {
    if (draft.status === "different_dose" && (!draft.taken_dose.trim() || Number(draft.taken_dose) <= 0)) {
      return `Enter the amount taken for ${draft.label}.`;
    }
  }
  if (form.weight.trim() && Number.isNaN(Number(form.weight))) return "Weight needs to be a number in kilograms.";
  const scores = [form.mood, form.energy, form.sleep];
  const anyScore = scores.some((score) => score != null);
  const allScores = scores.every((score) => score != null);
  if ((anyScore && !allScores) || (form.wellbeingNote.trim() && !allScores)) {
    return "Mood, energy, and sleep are saved together.";
  }
  return null;
}
