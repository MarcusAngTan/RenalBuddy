import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api";
import { MedicationForm } from "../components/MedicationForm";
import { Card, Empty, PageHeader } from "../components/ui";
import { formatDate } from "../lib/dates";
import { SCHEDULES, type Medication } from "../types";

export function MedsPage() {
  const meds = useQuery({
    queryKey: ["medications"],
    queryFn: () => api<Medication[]>("/api/medications"),
  });
  const active = (meds.data ?? []).filter((med) => med.status === "active");
  const stopped = (meds.data ?? []).filter((med) => med.status === "stopped");

  return (
    <div className="space-y-4">
      <PageHeader title="Medicines" lede="What you take besides the steroid taper. Dose changes are kept for the visit summary." />
      <Link className="inline-flex min-h-11 items-center rounded-2xl bg-teal px-4 text-sm font-semibold text-white" to="/meds/new">
        Add medicine
      </Link>
      {meds.isLoading ? <p className="text-sm">Loading…</p> : null}
      {active.length === 0 && !meds.isLoading ? (
        <Empty
          title="No active medicines"
          body="Add tablets your nephrologist prescribed, other than the steroid if it lives on the taper."
          to="/meds/new"
          action="Add a medicine"
        />
      ) : null}
      <div className="space-y-2">
        {active.map((med) => (
          <MedRow key={med.id} med={med} />
        ))}
      </div>
      {stopped.length > 0 ? (
        <div className="space-y-2">
          <h2 className="font-serif text-2xl">Stopped</h2>
          {stopped.map((med) => (
            <MedRow key={med.id} med={med} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function MedRow({ med }: { med: Medication }) {
  const schedule = SCHEDULES.find((item) => item.value === med.schedule)?.label ?? med.schedule;
  return (
    <Link to={`/meds/${med.id}`}>
      <Card>
        <p className="font-medium">{med.name}</p>
        <p className="text-sm text-ink/70">
          {med.dose_amount} {med.dose_unit} · {schedule}
        </p>
        <p className="text-sm text-ink/50">
          Started {formatDate(med.started_on)}
          {med.stopped_on ? ` · Stopped ${formatDate(med.stopped_on)}` : ""}
        </p>
      </Card>
    </Link>
  );
}

export function NewMedPage() {
  const navigate = useNavigate();
  return (
    <div className="space-y-4">
      <PageHeader title="Add medicine" />
      <MedicationForm submitLabel="Save medicine" onSaved={() => navigate("/meds")} />
    </div>
  );
}

export function EditMedPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const med = useQuery({
    queryKey: ["medication", id],
    queryFn: () => api<Medication>(`/api/medications/${id}`),
    enabled: Boolean(id),
  });
  return (
    <div className="space-y-4">
      <PageHeader title="Edit medicine" />
      {med.isLoading ? <p className="text-sm">Loading…</p> : null}
      {med.isError ? <p className="text-sm text-clay">Medicine not found.</p> : null}
      {med.data ? <MedicationForm initial={med.data} submitLabel="Save changes" onSaved={() => navigate("/meds")} /> : null}
    </div>
  );
}
