import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Bot, Send, Download, Upload, Github, GitBranch, Code, FileText, 
  RefreshCw, AlertCircle, CheckCircle, Loader2, Zap, Crown, Copy, Check,
  Play, Square, FolderOpen
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { AIProvider, GitProvider } from "@shared/schema";

interface AgentTask {
  id: string;
  task: string;
  status: "pending" | "running" | "completed" | "error";
  result?: any;
  error?: string;
  timestamp: number;
}

interface ImportedRepo {
  id: string;
  provider: GitProvider;
  owner: string;
  repo: string;
  url: string;
  importedAt: number;
}

export default function Agent() {
  const [task, setTask] = useState("");
  const [agentTasks, setAgentTasks] = useState<AgentTask[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [importedRepos, setImportedRepos] = useState<ImportedRepo[]>([]);
  const [repoUrl, setRepoUrl] = useState("");
  const [repoProvider, setRepoProvider] = useState<GitProvider>("github");
  const [selectedRepo, setSelectedRepo] = useState<ImportedRepo | null>(null);
  const [agentAction, setAgentAction] = useState<"enhance" | "debug" | "explain" | "develop" | "custom">("enhance");
  const [customAction, setCustomAction] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Load imported repos from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("importedRepos");
    if (saved) {
      setImportedRepos(JSON.parse(saved));
    }
    const savedTasks = localStorage.getItem("agentTasks");
    if (savedTasks) {
      setAgentTasks(JSON.parse(savedTasks));
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [agentTasks]);

  // Get API config for agent
  const getApiConfig = (tier: "fast" | "pro") => {
    const provider = localStorage.getItem(`${tier}Provider`) as AIProvider | null;
    const apiKey = localStorage.getItem(`${tier}ApiKey`) || "";
    const model = localStorage.getItem(`${tier}Model`) || "";
    const baseUrl = localStorage.getItem(`${tier}BaseUrl`) || "";
    return provider && apiKey ? { provider, apiKey, model, baseUrl } : null;
  };

  // Import repository
  const importRepoMutation = useMutation({
    mutationFn: async (url: string) => {
      const response = await apiRequest("POST", "/api/agent/import-repo", {
        url,
        provider: repoProvider,
      });
      return response.json();
    },
    onSuccess: (data) => {
      const newRepo: ImportedRepo = {
        id: Date.now().toString(),
        provider: repoProvider,
        owner: data.owner,
        repo: data.repo,
        url: repoUrl,
        importedAt: Date.now(),
      };
      const updated = [...importedRepos, newRepo];
      setImportedRepos(updated);
      localStorage.setItem("importedRepos", JSON.stringify(updated));
      setRepoUrl("");
      toast({
        title: "Repository imported",
        description: `Successfully imported ${data.owner}/${data.repo}`,
      });
    },
    onError: (error) => {
      toast({
        title: "Import failed",
        description: error instanceof Error ? error.message : "Failed to import repository",
        variant: "destructive",
      });
    },
  });

  // Run agent task
  const runAgentMutation = useMutation({
    mutationFn: async (taskDescription: string) => {
      const fastConfig = getApiConfig("fast");
      const proConfig = getApiConfig("pro");
      
      const response = await apiRequest("POST", "/api/agent/run", {
        task: taskDescription,
        action: agentAction,
        customAction: customAction || undefined,
        repository: selectedRepo ? {
          provider: selectedRepo.provider,
          owner: selectedRepo.owner,
          repo: selectedRepo.repo,
        } : undefined,
        fastConfig,
        proConfig,
      });
      return response.json();
    },
    onSuccess: (data) => {
      const newTask: AgentTask = {
        id: Date.now().toString(),
        task: task,
        status: "completed",
        result: data,
        timestamp: Date.now(),
      };
      const updated = [...agentTasks, newTask];
      setAgentTasks(updated);
      localStorage.setItem("agentTasks", JSON.stringify(updated));
      setTask("");
      setIsRunning(false);
      
      // If result includes a ZIP file, show download option
      if (data.zipUrl) {
        toast({
          title: "Task completed!",
          description: "Your app has been generated. Click download to get the ZIP file.",
        });
      } else {
        toast({
          title: "Task completed",
          description: "Agent has finished processing your request.",
        });
      }
    },
    onError: (error) => {
      const errorTask: AgentTask = {
        id: Date.now().toString(),
        task: task,
        status: "error",
        error: error instanceof Error ? error.message : "Task failed",
        timestamp: Date.now(),
      };
      const updated = [...agentTasks, errorTask];
      setAgentTasks(updated);
      localStorage.setItem("agentTasks", JSON.stringify(updated));
      setIsRunning(false);
      toast({
        title: "Task failed",
        description: error instanceof Error ? error.message : "Failed to execute task",
        variant: "destructive",
      });
    },
  });

  const handleImportRepo = () => {
    if (!repoUrl.trim()) {
      toast({
        title: "URL required",
        description: "Please enter a repository URL",
        variant: "destructive",
      });
      return;
    }
    importRepoMutation.mutate(repoUrl);
  };

  const handleRunAgent = () => {
    if (!task.trim()) {
      toast({
        title: "Task required",
        description: "Please enter a task for the agent",
        variant: "destructive",
      });
      return;
    }

    if (!getApiConfig("fast") && !getApiConfig("pro")) {
      toast({
        title: "API keys required",
        description: "Please configure at least one AI provider in Settings",
        variant: "destructive",
      });
      return;
    }

    setIsRunning(true);
    const runningTask: AgentTask = {
      id: Date.now().toString(),
      task: task,
      status: "running",
      timestamp: Date.now(),
    };
    setAgentTasks([...agentTasks, runningTask]);
    runAgentMutation.mutate(task);
  };

  const handleDownloadZip = (taskId: string) => {
    const task = agentTasks.find((t) => t.id === taskId);
    if (task?.result?.zipUrl) {
      window.open(task.result.zipUrl, "_blank");
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Bot className="w-6 h-6 text-primary" />
              Agent Mode
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Autonomous AI agent that can develop apps, enhance repos, debug code, and more
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Repository Import Section */}
          <Card className="bg-card/80 backdrop-blur-sm border-card-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Import Repository
              </CardTitle>
              <CardDescription>
                Import repositories from GitHub, GitLab, Bitbucket, or Hugging Face for agent operations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Select value={repoProvider} onValueChange={(v) => setRepoProvider(v as GitProvider)}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="github">GitHub</SelectItem>
                    <SelectItem value="gitlab">GitLab</SelectItem>
                    <SelectItem value="bitbucket">Bitbucket</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  placeholder="https://github.com/owner/repo or owner/repo"
                  className="flex-1"
                />
                <Button 
                  onClick={handleImportRepo}
                  disabled={importRepoMutation.isPending}
                >
                  {importRepoMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
                  )}
                  Import
                </Button>
              </div>

              {importedRepos.length > 0 && (
                <div className="space-y-2">
                  <Label>Imported Repositories</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {importedRepos.map((repo) => (
                      <Card
                        key={repo.id}
                        className={`p-3 cursor-pointer transition-colors ${
                          selectedRepo?.id === repo.id
                            ? "bg-primary/10 border-primary"
                            : "hover:bg-muted/50"
                        }`}
                        onClick={() => setSelectedRepo(repo)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {repo.provider === "github" && <Github className="w-4 h-4" />}
                            {repo.provider === "gitlab" && <GitBranch className="w-4 h-4" />}
                            {repo.provider === "bitbucket" && <GitBranch className="w-4 h-4" />}
                            <span className="font-medium text-sm">
                              {repo.owner}/{repo.repo}
                            </span>
                          </div>
                          {selectedRepo?.id === repo.id && (
                            <CheckCircle className="w-4 h-4 text-primary" />
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Agent Task Section */}
          <Card className="bg-card/80 backdrop-blur-sm border-card-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="w-5 h-5" />
                Agent Task
              </CardTitle>
              <CardDescription>
                Give the agent a task. It will use multiple LLMs to plan, develop, and execute.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedRepo && (
                <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FolderOpen className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">
                        Working with: {selectedRepo.owner}/{selectedRepo.repo}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedRepo(null)}
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Action Type</Label>
                <Select value={agentAction} onValueChange={(v) => setAgentAction(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="enhance">Enhance Repository</SelectItem>
                    <SelectItem value="debug">Debug Issues</SelectItem>
                    <SelectItem value="explain">Explain Codebase</SelectItem>
                    <SelectItem value="develop">Develop New App</SelectItem>
                    <SelectItem value="custom">Custom Action</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {agentAction === "custom" && (
                <div className="space-y-2">
                  <Label>Custom Action Description</Label>
                  <Input
                    value={customAction}
                    onChange={(e) => setCustomAction(e.target.value)}
                    placeholder="Describe the custom action..."
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Task Description</Label>
                <Textarea
                  value={task}
                  onChange={(e) => setTask(e.target.value)}
                  placeholder={
                    agentAction === "develop"
                      ? "e.g., Create a todo app with React and TypeScript"
                      : agentAction === "enhance"
                      ? "e.g., Add error handling and improve performance"
                      : agentAction === "debug"
                      ? "e.g., Fix authentication issues and memory leaks"
                      : "Describe what you want the agent to do..."
                  }
                  className="min-h-[120px]"
                />
              </div>

              <Button
                onClick={handleRunAgent}
                disabled={isRunning || !task.trim()}
                className="w-full"
                size="lg"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Agent Working...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Run Agent
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Task History */}
          {agentTasks.length > 0 && (
            <Card className="bg-card/80 backdrop-blur-sm border-card-border">
              <CardHeader>
                <CardTitle>Task History</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {agentTasks.map((agentTask) => (
                  <Card key={agentTask.id} className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge
                            variant={
                              agentTask.status === "completed"
                                ? "default"
                                : agentTask.status === "error"
                                ? "destructive"
                                : agentTask.status === "running"
                                ? "secondary"
                                : "outline"
                            }
                          >
                            {agentTask.status === "running" && (
                              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            )}
                            {agentTask.status === "completed" && (
                              <CheckCircle className="w-3 h-3 mr-1" />
                            )}
                            {agentTask.status === "error" && (
                              <AlertCircle className="w-3 h-3 mr-1" />
                            )}
                            {agentTask.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(agentTask.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm font-medium">{agentTask.task}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => copyToClipboard(agentTask.task, agentTask.id)}
                      >
                        {copiedId === agentTask.id ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>

                    {agentTask.status === "running" && (
                      <div className="mt-3 space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-5/6" />
                      </div>
                    )}

                    {agentTask.status === "completed" && agentTask.result && (
                      <div className="mt-3 space-y-2">
                        {agentTask.result.summary && (
                          <p className="text-sm text-muted-foreground">
                            {agentTask.result.summary}
                          </p>
                        )}
                        {agentTask.result.zipUrl && (
                          <Button
                            onClick={() => handleDownloadZip(agentTask.id)}
                            size="sm"
                            className="mt-2"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Download ZIP
                          </Button>
                        )}
                        {agentTask.result.code && (
                          <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
                            {agentTask.result.code}
                          </pre>
                        )}
                      </div>
                    )}

                    {agentTask.status === "error" && agentTask.error && (
                      <Alert variant="destructive" className="mt-3">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{agentTask.error}</AlertDescription>
                      </Alert>
                    )}
                  </Card>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      <div ref={messagesEndRef} />
    </div>
  );
}

