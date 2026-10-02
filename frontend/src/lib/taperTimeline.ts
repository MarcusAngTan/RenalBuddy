import { addDays, todayISO } from "./dates";
import type { Medication, TaperPlan, TaperStep } from "../types";

const STEROID_FIRST = "prednisolone";

function stepState(step: Pick<TaperStep, "start_on" | "end_on">, day: string): TaperStep["state"] {
  if (day > step.end_on) return "done";
  if (day < step.start_on) return "upcoming";
  return "current";
}

function scheduleLine(schedule: Medication["schedule"]) {
  if (schedule === "twice_daily") return "Morning and evening";
  if (schedule === "as_needed") return "As needed";
  return "Once each day";
}

function syntheticPlanFromMed(med: Medication): TaperPlan {
  const today = todayISO();
  const step: TaperStep = {
    id: -med.id,
    step_number: 1,
    dose_amount: med.dose_amount,
    start_on: med.started_on,
    end_on: addDays(med.started_on, 365),
    instruction: scheduleLine(med.schedule),
    state: stepState({ start_on: med.started_on, end_on: addDays(med.started_on, 365) }, today),
  };
  return {
    id: -med.id,
    title: `${med.name} plan`,
    medication_name: med.name,
    dose_unit: med.dose_unit,
    prescribed_note: med.notes,
    status: "active",
    created_at: med.started_on,
    steps: [step],
  };
}

function planSortKey(plan: TaperPlan) {
  if (plan.medication_name.toLowerCase() === STEROID_FIRST) return 0;
  return 1;
}

export function buildTimelinePlans(plans: TaperPlan[] | undefined, meds: Medication[] | undefined): TaperPlan[] {
  const activePlans = (plans ?? []).filter((plan) => plan.status === "active");
  const covered = new Set(activePlans.map((plan) => plan.medication_name.toLowerCase()));
  const fromMeds = (meds ?? [])
    .filter((med) => med.status === "active" && !covered.has(med.name.toLowerCase()))
    .map(syntheticPlanFromMed);
  return [...activePlans, ...fromMeds].sort((left, right) => {
    const byPriority = planSortKey(left) - planSortKey(right);
    if (byPriority !== 0) return byPriority;
    return left.medication_name.localeCompare(right.medication_name);
  });
}
