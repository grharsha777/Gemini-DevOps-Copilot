import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function MetricsPage() {
  const [coverage, setCoverage] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/metrics/coverage')
      .then((r) => r.json())
      .then((data) => {
        setCoverage(data);
      })
      .catch(() => setCoverage(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-6">Loading metrics...</div>;

  if (!coverage || !coverage.available) {
    return <div className="p-6">No coverage data available. Run CI or generate coverage locally.</div>;
  }

  const summary = coverage.summary || {};

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Code Quality & Metrics</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(summary).map(([key, val]) => (
          <Card key={key} className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">{key}</div>
                <pre className="font-mono text-sm">{JSON.stringify(val, null, 2)}</pre>
              </div>
              <Badge variant="secondary">Summary</Badge>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
