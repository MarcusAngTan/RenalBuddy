import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api, ApiError } from "../api";
import { useAuth } from "../auth";
import { MedicationForm } from "../components/MedicationForm";
import { TaperForm } from "../components/TaperForm";
import { Button, Chip, ErrorText, Field, PageHeader, inputClass } from "../components/ui";
import { INTERESTS, type TaperPlan, type User } from "../types";

export function SetupPage() {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const [step, setStep] = useState(0);
  const [lastVisit, setLastVisit] = useState(user?.last_appointment_on ?? "");
  const [nextVisit, setNextVisit] = useState(user?.next_appointment_on ?? "");
  const [interests, setInterests] = useState<string[]>(user?.coping_interests ?? []);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const plans = useQuery({
    queryKey: ["tapers"],
    queryFn: () => api<TaperPlan[]>("/api/taper-plans"),
  });
  const replacing = (plans.data ?? []).some((plan) => plan.status === "active");

  async function saveDates() {
    setPending(true);
    setError(null);
    try {
      const me = await api<User>("/api/profile", {
        method: "PATCH",
        body: JSON.stringify({
          last_appointment_on: lastVisit || null,
          next_appointment_on: nextVisit || null,
        }),
      });
      setUser(me);
      setStep(1);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save the dates.");
    } finally {
      setPending(false);
    }
  }

  async function finish() {
    setPending(true);
    setError(null);
    try {
      const me = await api<User>("/api/profile", {
        method: "PATCH",
        body: JSON.stringify({ coping_interests: interests }),
      });
      setUser(me);
      navigate("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save interests.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Set up your log" lede={`Step ${step + 1} of 4. You can skip a step and finish it later.`} />
      {step === 0 ? (
        <div className="space-y-4">
          <Field label="Last appointment">
            <input className={inputClass} type="date" value={lastVisit} onChange={(event) => setLastVisit(event.target.value)} />
          </Field>
          <Field label="Next appointment">
            <input className={inputClass} type="date" value={nextVisit} onChange={(event) => setNextVisit(event.target.value)} />
          </Field>
          <p className="text-sm text-ink/70">The visit summary starts the day after the last appointment.</p>
          <ErrorText>{error}</ErrorText>
          <Button className="w-full" type="button" disabled={pending} onClick={saveDates}>
            Continue
          </Button>
        </div>
      ) : null}
      {step === 1 ? (
        <div className="space-y-4">
          <MedicationForm initial={undefined} submitLabel="Save medicine" onSaved={() => setStep(2)} />
          <Button className="w-full" type="button" variant="quiet" onClick={() => setStep(2)}>
            Skip for now
          </Button>
        </div>
      ) : null}
      {step === 2 ? (
        <TaperForm replacing={replacing} onSaved={() => setStep(3)} onSkip={() => setStep(3)} />
      ) : null}
      {step === 3 ? (
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-ink/70">
            Pick what sometimes helps. Feel will suggest a few matching ideas. These are not treatment advice.
          </p>
          <div className="flex flex-wrap gap-2">
            {INTERESTS.map((interest) => (
              <Chip
                key={interest.value}
                selected={interests.includes(interest.value)}
                onClick={() =>
                  setInterests((current) =>
                    current.includes(interest.value)
                      ? current.filter((item) => item !== interest.value)
                      : [...current, interest.value],
                  )
                }
              >
                {interest.label}
              </Chip>
            ))}
          </div>
          <ErrorText>{error}</ErrorText>
          <Button className="w-full" type="button" disabled={pending} onClick={finish}>
            {pending ? "Saving…" : "Go to today"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
