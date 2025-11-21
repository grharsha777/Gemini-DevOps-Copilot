import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Send, Sparkles, Code, TestTube, FileText, RefreshCw, Copy, Check } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ChatMessage, AIMode, AIModel } from "@shared/schema";

export default function Copilot() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<AIMode>("generate");
  const [model, setModel] = useState<AIModel>("gemini-2.0-flash");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const generateMutation = useMutation({
    mutationFn: async (prompt: string) => {
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        role: "user",
        content: prompt,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMessage]);

      const response = await apiRequest("POST", "/api/ai/generate", {
        prompt,
        mode,
        model,
      });
      const data = await response.json();
      return data as { text: string };
    },
    onSuccess: (data) => {
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.text,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setInput("");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate response",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    generateMutation.mutate(input);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getModeIcon = (m: AIMode) => {
    switch (m) {
      case "generate": return <Code className="w-4 h-4" />;
      case "test": return <TestTube className="w-4 h-4" />;
      case "document": return <FileText className="w-4 h-4" />;
      case "refactor": return <RefreshCw className="w-4 h-4" />;
      default: return <Sparkles className="w-4 h-4" />;
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-primary" />
              AI Coding Copilot
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Generate code, tests, documentation, and more with Gemini AI
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Model:</span>
              <Select value={model} onValueChange={(v) => setModel(v as AIModel)}>
                <SelectTrigger className="w-40" data-testid="select-model">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gemini-2.0-flash">Flash (Fast)</SelectItem>
                  <SelectItem value="gemini-1.5-pro">Pro (Advanced)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Tabs value={mode} onValueChange={(v) => setMode(v as AIMode)} className="mt-4">
          <TabsList className="grid grid-cols-5 lg:w-auto">
            <TabsTrigger value="generate" className="gap-1" data-testid="tab-generate">
              {getModeIcon("generate")}
              <span className="hidden sm:inline">Generate</span>
            </TabsTrigger>
            <TabsTrigger value="test" className="gap-1" data-testid="tab-test">
              {getModeIcon("test")}
              <span className="hidden sm:inline">Test</span>
            </TabsTrigger>
            <TabsTrigger value="document" className="gap-1" data-testid="tab-document">
              {getModeIcon("document")}
              <span className="hidden sm:inline">Document</span>
            </TabsTrigger>
            <TabsTrigger value="refactor" className="gap-1" data-testid="tab-refactor">
              {getModeIcon("refactor")}
              <span className="hidden sm:inline">Refactor</span>
            </TabsTrigger>
            <TabsTrigger value="boilerplate" className="gap-1" data-testid="tab-boilerplate">
              {getModeIcon("boilerplate")}
              <span className="hidden sm:inline">Snippet</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
            <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-purple-500/20 rounded-2xl flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Start a conversation</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Ask me to generate code, write tests, create documentation, or refactor existing code. I'm here to help!
              </p>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <Card
              className={`max-w-3xl p-4 ${
                message.role === "user"
                  ? "bg-primary/10 border-primary/20"
                  : "bg-card/80 backdrop-blur-sm"
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <Badge variant={message.role === "user" ? "default" : "secondary"}>
                  {message.role === "user" ? "You" : "AI"}
                </Badge>
                {message.role === "assistant" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => copyToClipboard(message.content, message.id)}
                    data-testid={`button-copy-${message.id}`}
                  >
                    {copiedId === message.id ? (
                      <Check className="w-3 h-3 text-green-500" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </Button>
                )}
              </div>
              <pre className="whitespace-pre-wrap font-mono text-sm break-words">
                {message.content}
              </pre>
            </Card>
          </div>
        ))}

        {generateMutation.isPending && (
          <div className="flex justify-start">
            <Card className="max-w-3xl p-4 bg-card/80 backdrop-blur-sm">
              <Badge variant="secondary" className="mb-2">AI</Badge>
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/6" />
              </div>
              <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse-glow" />
                Generating response...
              </div>
            </Card>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-6 border-t border-border bg-card/50 backdrop-blur-sm">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Ask AI to ${mode === "generate" ? "write code" : mode === "test" ? "create tests" : mode === "document" ? "write documentation" : mode === "refactor" ? "refactor code" : "create a boilerplate"}...`}
            className="min-h-[60px] resize-none"
            data-testid="input-prompt"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <Button
            type="submit"
            size="icon"
            className="h-[60px] w-[60px]"
            disabled={!input.trim() || generateMutation.isPending}
            data-testid="button-send"
          >
            <Send className="w-5 h-5" />
          </Button>
        </form>
      </div>
    </div>
  );
}
