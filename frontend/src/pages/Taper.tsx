import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import { TaperForm } from "../components/TaperForm";
import { Card, Disclaimer, Empty, PageHeader } from "../components/ui";
import { formatDate } from "../lib/dates";
import type { TaperPlan } from "../types";

export function TaperPage() {
  const plans = useQuery({
    queryKey: ["tapers"],
    queryFn: () => api<TaperPlan[]>("/api/taper-plans"),
  });
  const active = (plans.data ?? []).find((plan) => plan.status === "active");
  const previous = (plans.data ?? []).filter((plan) => plan.status !== "active");

  return (
    <div className="space-y-4">
      <PageHeader title="Taper" lede="The steroid plan that was typed in from clinic. Each step has its own dates." />
      <Disclaimer />
      <Link className="inline-flex min-h-11 items-center rounded-2xl bg-teal px-4 text-sm font-semibold text-white" to="/taper/new">
        {active ? "Replace plan" : "Add plan"}
      </Link>
      {plans.isLoading ? <p className="text-sm">Loading…</p> : null}
      {!active && !plans.isLoading ? (
        <Empty
          title="No taper yet"
          body="Enter the steps your nephrologist prescribed. Today will show the dose for the current date."
          to="/taper/new"
          action="Add the plan"
        />
      ) : null}
      {active ? <Timeline plan={active} /> : null}
      {previous.length > 0 ? (
        <div className="space-y-2">
          <h2 className="font-serif text-2xl">Earlier plans</h2>
          {previous.map((plan) => (
            <Card key={plan.id}>
              <p className="font-medium">{plan.title}</p>
              <p className="text-sm text-ink/60">Replaced. Steps stay in the visit log.</p>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Timeline({ plan }: { plan: TaperPlan }) {
  return (
    <Card className="space-y-4">
      <div>
        <h2 className="font-serif text-2xl">{plan.medication_name}</h2>
        <p className="text-sm text-ink/60">{plan.title}</p>
        {plan.prescribed_note ? <p className="mt-1 text-sm">{plan.prescribed_note}</p> : null}
      </div>
      <ol className="space-y-3 border-l-2 border-tide pl-4">
        {plan.steps.map((step) => (
          <li key={step.id}>
            <p className="text-xs font-semibold uppercase tracking-wide text-teal">
              {step.state === "done" ? "Done" : step.state === "current" ? "Current" : "Upcoming"}
            </p>
            <p className="font-serif text-2xl">
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
