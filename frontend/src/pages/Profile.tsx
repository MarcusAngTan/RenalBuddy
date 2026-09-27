import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api, ApiError } from "../api";
import { useAuth } from "../auth";
import { Button, Chip, Disclaimer, ErrorText, Field, PageHeader, inputClass } from "../components/ui";
import { INTERESTS, type User } from "../types";

export function ProfilePage() {
  const { user, setUser, signOut, refreshUser } = useAuth();
  const queryClient = useQueryClient();
  const [name, setName] = useState(user?.display_name ?? "");
  const [lastVisit, setLastVisit] = useState(user?.last_appointment_on ?? "");
  const [nextVisit, setNextVisit] = useState(user?.next_appointment_on ?? "");
  const [interests, setInterests] = useState<string[]>(user?.coping_interests ?? []);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () =>
      api<User>("/api/profile", {
        method: "PATCH",
        body: JSON.stringify({
          display_name: name,
          last_appointment_on: lastVisit || null,
          next_appointment_on: nextVisit || null,
          coping_interests: interests,
        }),
      }),
    onSuccess: async (me) => {
      setUser(me);
      setError(null);
      setMessage("Profile saved.");
      await queryClient.invalidateQueries({ queryKey: ["coping"] });
      await queryClient.invalidateQueries({ queryKey: ["today"] });
      await queryClient.invalidateQueries({ queryKey: ["summary-preview"] });
    },
    onError: (err) => {
      setMessage(null);
      setError(err instanceof ApiError ? err.message : "Could not save the profile.");
    },
  });

  const sample = useMutation({
    mutationFn: () => api("/api/demo/sample-week", { method: "POST" }),
    onSuccess: async () => {
      await refreshUser();
      await queryClient.invalidateQueries();
      setMessage("Sample week added.");
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Could not load the sample."),
  });

  return (
    <div className="space-y-4">
      <PageHeader title="Profile" lede={user?.email} />
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          save.mutate();
        }}
      >
        <Field label="Name">
          <input className={inputClass} value={name} onChange={(event) => setName(event.target.value)} required />
        </Field>
        <Field label="Last appointment">
          <input className={inputClass} type="date" value={lastVisit} onChange={(event) => setLastVisit(event.target.value)} />
        </Field>
        <Field label="Next appointment">
          <input className={inputClass} type="date" value={nextVisit} onChange={(event) => setNextVisit(event.target.value)} />
        </Field>
        <div>
          <p className="mb-2 text-sm font-medium text-ink/80">Interests</p>
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
        </div>
        <ErrorText>{error}</ErrorText>
        {message ? <p className="text-sm text-teal">{message}</p> : null}
        <Button className="w-full" type="submit" disabled={save.isPending}>
          Save profile
        </Button>
      </form>
      {!user?.has_clinical_data ? (
        <Button className="w-full" type="button" variant="quiet" disabled={sample.isPending} onClick={() => sample.mutate()}>
          Load sample week
        </Button>
      ) : null}
      <Link className="inline-block text-sm font-semibold text-teal" to="/setup">
        Open setup again
      </Link>
      <Disclaimer />
      <Button className="w-full" type="button" variant="quiet" onClick={signOut}>
        Sign out
      </Button>
    </div>
  );
}
