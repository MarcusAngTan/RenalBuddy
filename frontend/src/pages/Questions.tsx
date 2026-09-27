import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "../api";
import { Button, Card, ErrorText, PageHeader } from "../components/ui";
import type { DoctorQuestion } from "../types";

export function QuestionsPage() {
  const queryClient = useQueryClient();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const questions = useQuery({
    queryKey: ["questions"],
    queryFn: () => api<DoctorQuestion[]>("/api/questions"),
  });
  const create = useMutation({
    mutationFn: () => api<DoctorQuestion>("/api/questions", { method: "POST", body: JSON.stringify({ body }) }),
    onSuccess: async () => {
      setBody("");
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ["questions"] });
      await queryClient.invalidateQueries({ queryKey: ["today"] });
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Could not save the question."),
  });
  const mark = useMutation({
    mutationFn: (question: DoctorQuestion) =>
      api<DoctorQuestion>(`/api/questions/${question.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: question.status === "open" ? "discussed" : "open" }),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["questions"] });
      await queryClient.invalidateQueries({ queryKey: ["today"] });
    },
  });
  const open = (questions.data ?? []).filter((question) => question.status === "open");
  const discussed = (questions.data ?? []).filter((question) => question.status === "discussed");

  return (
    <div className="space-y-4">
      <PageHeader title="Ask my doctor" lede="Open questions are copied onto the visit summary." />
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          create.mutate();
        }}
      >
        <textarea
          className="w-full rounded-2xl border border-line bg-white px-3 py-3 text-base"
          rows={3}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="What do you want to ask?"
          required
        />
        <ErrorText>{error}</ErrorText>
        <Button type="submit" disabled={create.isPending}>
          Save question
        </Button>
      </form>
      {open.length === 0 ? <p className="text-sm text-ink/60">No open questions.</p> : null}
      <div className="space-y-2">
        {open.map((question) => (
          <QuestionCard key={question.id} question={question} onToggle={() => mark.mutate(question)} />
        ))}
      </div>
      {discussed.length > 0 ? (
        <div className="space-y-2">
          <h2 className="font-serif text-2xl">Discussed</h2>
          {discussed.map((question) => (
            <QuestionCard key={question.id} question={question} onToggle={() => mark.mutate(question)} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function QuestionCard({ question, onToggle }: { question: DoctorQuestion; onToggle: () => void }) {
  return (
    <Card>
      <p className="text-sm leading-relaxed">{question.body}</p>
      <button className="mt-2 text-sm font-semibold text-teal" type="button" onClick={onToggle}>
        {question.status === "open" ? "Mark discussed" : "Mark open again"}
      </button>
    </Card>
  );
}
