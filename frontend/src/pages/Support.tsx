import { useQuery } from "@tanstack/react-query";
import { api } from "../api";
import { Card, PageHeader } from "../components/ui";
import type { Resource } from "../types";

export function SupportPage() {
  const resources = useQuery({
    queryKey: ["resources"],
    queryFn: () => api<Resource[]>("/api/resources"),
  });
  return (
    <div className="space-y-4">
      <PageHeader
        title="Support"
        lede="Organisations for people with nephrotic syndrome and kidney disease. These are outside RenalBuddy."
      />
      {resources.isLoading ? <p className="text-sm">Loading…</p> : null}
      <div className="space-y-2">
        {(resources.data ?? []).map((resource) => (
          <a key={resource.id} href={resource.url} target="_blank" rel="noreferrer">
            <Card>
              <p className="font-medium text-teal">{resource.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-ink/80">{resource.description}</p>
            </Card>
          </a>
        ))}
      </div>
    </div>
  );
}
