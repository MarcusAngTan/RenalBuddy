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
  const [logsFor, setLogsFor] = useState<"self" | "child">(user?.logs_for ?? "self");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  const save = useMutation({
    mutationFn: () =>
      api<User>("/api/profile", {
        method: "PATCH",
        body: JSON.stringify({
          display_name: name,
          last_appointment_on: lastVisit || null,
          next_appointment_on: nextVisit || null,
          coping_interests: interests,
          logs_for: logsFor,
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
      setMessage("Demo data added.");
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Could not load the sample."),
  });

  async function downloadLog() {
    try {
      const payload = await api<unknown>("/api/account/export");
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "renalbuddy-log.json";
      link.click();
      URL.revokeObjectURL(url);
      setMessage("Log downloaded.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not download the log.");
    }
  }

  const remove = useMutation({
    mutationFn: () => api("/api/account", { method: "DELETE" }),
    onSuccess: () => signOut(),
    onError: (err) => setError(err instanceof ApiError ? err.message : "Could not delete the account."),
  });

  return (
    <div className="space-y-4">
      <PageHeader title="Profile" lede={user?.email} />
      {user ? (
        <p className="text-sm text-ink/70">
          Logged {user.days_logged_this_interval} of {user.days_in_interval} days this interval
          {user.visit_opened_at ? " · Visit was opened" : " · Visit not opened yet"}
        </p>
      ) : null}
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
        <div>
          <p className="mb-2 text-sm font-medium text-ink/80">Who is this log for?</p>
          <div className="flex flex-wrap gap-2">
            <Chip selected={logsFor === "self"} onClick={() => setLogsFor("self")}>
              I log for myself
            </Chip>
            <Chip selected={logsFor === "child"} onClick={() => setLogsFor("child")}>
              I log for my child
            </Chip>
          </div>
          <p className="mt-2 text-xs text-ink/55">No public profile. There is no in-app forum.</p>
        </div>
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
        {message ? <p className="text-sm font-bold text-teal">{message}</p> : null}
        <Button className="w-full" type="submit" disabled={save.isPending}>
          Save profile
        </Button>
      </form>
      {!user?.has_clinical_data ? (
        <Button className="w-full" type="button" variant="quiet" disabled={sample.isPending} onClick={() => sample.mutate()}>
          Demo data
        </Button>
      ) : null}
      <Button className="w-full" type="button" variant="quiet" onClick={downloadLog}>
        Download my log
      </Button>
      <Link className="inline-block text-sm font-extrabold text-teal" to="/setup">
        Open setup again
      </Link>
      <Disclaimer />
      <Button className="w-full" type="button" variant="quiet" onClick={signOut}>
        Sign out
      </Button>
      <div className="space-y-2 rounded-[1.75rem] border border-clay/20 p-4">
        <p className="font-extrabold text-clay">Delete my account</p>
        <p className="text-sm text-ink/70">Type DELETE to remove this log from the server.</p>
        <input className={inputClass} value={deleteConfirm} onChange={(event) => setDeleteConfirm(event.target.value)} />
        <Button
          className="w-full"
          type="button"
          variant="danger"
          disabled={deleteConfirm !== "DELETE" || remove.isPending}
          onClick={() => remove.mutate()}
        >
          Delete account
        </Button>
      </div>
    </div>
  );
}
