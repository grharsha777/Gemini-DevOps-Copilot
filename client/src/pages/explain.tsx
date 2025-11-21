import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, AlertTriangle, Zap, Shield, Sparkles } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { CodeExplanationLine } from "@shared/schema";

export default function Explain() {
  const [code, setCode] = useState("");
  const [explanations, setExplanations] = useState<CodeExplanationLine[]>([]);
  const { toast } = useToast();

  const explainMutation = useMutation({
    mutationFn: async (codeText: string) => {
      const response = await apiRequest("POST", "/api/ai/explain", {
        code: codeText,
      });
      const data = await response.json();
      return data as { explanations: CodeExplanationLine[] };
    },
    onSuccess: (data) => {
      setExplanations(data.explanations);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to explain code",
        variant: "destructive",
      });
    },
  });

  const handleAnalyze = () => {
    if (!code.trim()) {
      toast({
        title: "Error",
        description: "Please enter code to analyze",
        variant: "destructive",
      });
      return;
    }
    explainMutation.mutate(code);
  };

  const getRiskBadge = (level?: "low" | "medium" | "high") => {
    if (!level) return null;
    const colors = {
      low: "bg-green-500/10 text-green-500 border-green-500/20",
      medium: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
      high: "bg-red-500/10 text-red-500 border-red-500/20",
    };
    return (
      <Badge className={colors[level]} variant="outline">
        {level} risk
      </Badge>
    );
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 border-b border-border bg-card/50 backdrop-blur-sm">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="w-6 h-6 text-primary" />
          Explainable AI
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Get line-by-line explanations, risk assessments, and optimization suggestions
        </p>
      </div>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Card className="p-4 bg-card/80 backdrop-blur-sm">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Enter Your Code
            </h3>
            <Textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Paste your code here for analysis..."
              className="min-h-[400px] font-mono text-sm resize-none"
              data-testid="input-code"
            />
            <Button
              onClick={handleAnalyze}
              className="w-full mt-4"
              disabled={explainMutation.isPending}
              data-testid="button-analyze"
            >
              {explainMutation.isPending ? (
                <>Analyzing...</>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Analyze Code
                </>
              )}
            </Button>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-4 bg-card/80 backdrop-blur-sm">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Line-by-Line Analysis
            </h3>

            {explainMutation.isPending && (
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ))}
              </div>
            )}

            {!explainMutation.isPending && explanations.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No analysis yet. Enter code and click Analyze.</p>
              </div>
            )}

            {explanations.length > 0 && (
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {explanations.map((item) => (
                  <div
                    key={item.lineNumber}
                    className="p-4 bg-background/50 rounded-lg border border-border space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary">Line {item.lineNumber}</Badge>
                      {getRiskBadge(item.riskLevel)}
                    </div>

                    <pre className="text-xs font-mono bg-muted/50 p-2 rounded overflow-x-auto">
                      {item.code}
                    </pre>

                    <p className="text-sm">{item.explanation}</p>

                    {item.performanceNote && (
                      <div className="flex items-start gap-2 text-sm p-2 bg-yellow-500/10 border border-yellow-500/20 rounded">
                        <Zap className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                        <span className="text-yellow-500">{item.performanceNote}</span>
                      </div>
                    )}

                    {item.securityIssue && (
                      <div className="flex items-start gap-2 text-sm p-2 bg-red-500/10 border border-red-500/20 rounded">
                        <Shield className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                        <span className="text-red-500">{item.securityIssue}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
