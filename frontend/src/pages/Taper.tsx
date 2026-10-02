import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import { TaperForm } from "../components/TaperForm";
import { Button, Card, Disclaimer, Empty, PageHeader } from "../components/ui";
import { formatDate } from "../lib/dates";
import { buildTimelinePlans } from "../lib/taperTimeline";
import type { Medication, TaperPlan } from "../types";

export function TaperPage() {
  const plans = useQuery({
    queryKey: ["tapers"],
    queryFn: () => api<TaperPlan[]>("/api/taper-plans"),
  });
  const medications = useQuery({
    queryKey: ["medications"],
    queryFn: () => api<Medication[]>("/api/medications"),
  });
  const timelinePlans = useMemo(
    () => buildTimelinePlans(plans.data, medications.data),
    [plans.data, medications.data],
  );
  const [planIndex, setPlanIndex] = useState(0);

  useEffect(() => {
    setPlanIndex(0);
  }, [timelinePlans.map((plan) => plan.id).join(",")]);

  const selected = timelinePlans[planIndex] ?? timelinePlans[0];
  const swapTarget =
    timelinePlans.length > 1 ? timelinePlans[(planIndex + 1) % timelinePlans.length] : undefined;
  const hasSteroidPlan = (plans.data ?? []).some((plan) => plan.status === "active");
  const previous = (plans.data ?? []).filter((plan) => plan.status !== "active");
  const loading = plans.isLoading || medications.isLoading;

  return (
    <div className="space-y-4">
      <PageHeader title="Taper" lede="Prescribed dose plans from clinic. Each medicine has its own dates." />
      <Disclaimer />
      <Link
        className="inline-flex min-h-12 items-center justify-center rounded-full bg-lime px-5 text-sm font-extrabold text-white shadow-pop"
        to="/taper/new"
      >
        {hasSteroidPlan ? "Replace plan" : "Add plan"}
      </Link>
      {loading ? <p className="text-sm">Loading…</p> : null}
      {!loading && timelinePlans.length === 0 ? (
        <Empty
          title="No taper yet"
          body="Enter the steps your nephrologist prescribed. Today will show the dose for the current date."
          to="/taper/new"
          action="Add the plan"
        />
      ) : null}
      {selected ? (
        <Timeline
          plan={selected}
          swapLabel={swapTarget ? swapTarget.medication_name : undefined}
          onSwap={swapTarget ? () => setPlanIndex((index) => (index + 1) % timelinePlans.length) : undefined}
        />
      ) : null}
      {previous.length > 0 ? (
        <div className="space-y-2">
          <h2 className="text-2xl font-extrabold">Earlier plans</h2>
          {previous.map((plan) => (
            <Card key={plan.id}>
              <p className="font-extrabold">{plan.title}</p>
              <p className="text-sm text-ink/60">Replaced. Steps stay in the visit log.</p>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Timeline({
  plan,
  swapLabel,
  onSwap,
}: {
  plan: TaperPlan;
  swapLabel?: string;
  onSwap?: () => void;
}) {
  return (
    <Card className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-2xl font-extrabold">{plan.medication_name}</h2>
          <p className="text-sm text-ink/60">{plan.title}</p>
          {plan.prescribed_note ? <p className="mt-1 text-sm">{plan.prescribed_note}</p> : null}
        </div>
        {swapLabel && onSwap ? (
          <Button className="shrink-0 px-3" type="button" variant="quiet" onClick={onSwap}>
            {swapLabel}
          </Button>
        ) : null}
      </div>
      <ol className="space-y-3 border-l-2 border-teal/25 pl-4">
        {plan.steps.map((step) => (
          <li
            key={step.id}
            className={
              step.state === "current" ? "-ml-1 rounded-2xl bg-tide px-3 py-2" : step.state === "done" ? "opacity-70" : ""
            }
          >
            <p className="text-xs font-extrabold uppercase tracking-wide text-teal">
              {step.state === "done" ? "Done" : step.state === "current" ? "Current" : "Upcoming"}
            </p>
            <p className="text-2xl font-extrabold">
              {step.dose_amount} {plan.dose_unit}
            </p>
            <p className="text-sm">
              {formatDate(step.start_on)} – {formatDate(step.end_on)}
            </p>
            {step.instruction ? <p className="text-sm text-ink/70">{step.instruction}</p> : null}
          </li>
        ))}
      </ol>
    </Card>
  );
}

export function NewTaperPage() {
  const navigate = useNavigate();
  const plans = useQuery({
    queryKey: ["tapers"],
    queryFn: () => api<TaperPlan[]>("/api/taper-plans"),
  });
  const replacing = (plans.data ?? []).some((plan) => plan.status === "active");
  return (
    <div className="space-y-4">
      <PageHeader title="Prescribed taper" />
      <TaperForm replacing={replacing} onSaved={() => navigate("/taper")} />
    </div>
  );
}
