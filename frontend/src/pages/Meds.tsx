import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api";
import { MedicationForm } from "../components/MedicationForm";
import { Card, Empty, PageHeader, PillIcon } from "../components/ui";
import { formatDate } from "../lib/dates";
import { SCHEDULES, type Medication, type MedicineExplain } from "../types";

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
      {meds.isLoading ? <p className="text-sm font-semibold">Loading…</p> : null}
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
          <h2 className="text-2xl font-extrabold">Stopped</h2>
          {stopped.map((med) => (
            <MedRow key={med.id} med={med} />
          ))}
        </div>
      ) : null}
      <Link
        className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-lime px-4 text-sm font-extrabold text-white shadow-pop"
        to="/meds/new"
      >
        + Add a medicine
      </Link>
    </div>
  );
}

function MedRow({ med }: { med: Medication }) {
  const schedule = SCHEDULES.find((item) => item.value === med.schedule)?.label ?? med.schedule;
  const explain = useQuery({
    queryKey: ["explain", med.name],
    queryFn: () => api<MedicineExplain>(`/api/medicines/explain?name=${encodeURIComponent(med.name)}`),
  });
  return (
    <Link to={`/meds/${med.id}`}>
      <Card>
        <div className="flex items-start gap-3">
          <PillIcon />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <p className="font-extrabold">{med.name}</p>
              <span className="text-sm font-extrabold text-teal">Edit</span>
            </div>
            <p className="text-sm font-bold text-teal">
              {med.dose_amount} {med.dose_unit} · {schedule}
            </p>
            {explain.data ? (
              <p className="mt-1 text-sm leading-relaxed text-ink/70">
                {explain.data.known && explain.data.class_name ? `${explain.data.class_name}. ` : ""}
                {explain.data.purpose} {explain.data.dose_note}
              </p>
            ) : null}
            <p className="text-sm text-ink/50">
              Started {formatDate(med.started_on)}
              {med.stopped_on ? ` · Stopped ${formatDate(med.stopped_on)}` : ""}
            </p>
          </div>
        </div>
      </Card>
    </Link>
  );
}

export function NewMedPage() {
  const navigate = useNavigate();
  return (
    <div className="space-y-4">
      <PageHeader title="Add medicine" lede="You’ll get this on Today for the days you take it." />
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
      {med.isLoading ? <p className="text-sm font-semibold">Loading…</p> : null}
      {med.isError ? <p className="text-sm font-semibold text-clay">Medicine not found.</p> : null}
      {med.data ? <MedicationForm initial={med.data} submitLabel="Save changes" onSaved={() => navigate("/meds")} /> : null}
    </div>
  );
}
