import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Bot,
  Code,
  Database,
  TestTube,
  Shield,
  Palette,
  Server,
  Globe,
  MessageSquare,
  ArrowRight,
  CheckCircle,
  Clock,
  AlertCircle,
  Users,
  Zap
} from "lucide-react";
import { AIService, AGENT_PROMPTS } from "@/lib/ai";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom"; // Assuming react-router is used

interface Agent {
  id: string;
  name: string;
  role: string;
  icon: React.ReactNode;
  specialty: string;
  status: 'idle' | 'working' | 'completed' | 'error';
  progress: number;
  messages: AgentMessage[];
}

interface AgentMessage {
  id: string;
  from: string;
  to?: string;
  content: string;
  timestamp: Date;
  type: 'task' | 'response' | 'collaboration' | 'error';
}

interface MultiAgentSystemProps {
  onTaskComplete: (result: any) => void;
  currentProject?: {
    files: Array<{ path: string; content: string; language: string }>;
    requirements?: string;
    projectType?: 'web' | 'mobile';
  };
  projectType?: 'web' | 'mobile';
}

const AGENTS: Omit<Agent, 'status' | 'progress' | 'messages'>[] = [
  {
    id: 'architect-agent',
    name: 'Chief Architect',
    role: 'System Design',
    icon: <Bot className="w-4 h-4" />,
    specialty: 'Architecture, Stack Selection, High-Level Design'
  },
  {
    id: 'frontend-agent',
    name: 'Frontend Architect',
    role: 'UI/UX Developer',
    icon: <Palette className="w-4 h-4" />,
    specialty: 'React, Vue, React Native, Flutter, UI Design'
  },
  {
    id: 'backend-agent',
    name: 'Backend Engineer',
    role: 'API Developer',
    icon: <Server className="w-4 h-4" />,
    specialty: 'Node.js, Python, Go, REST APIs, GraphQL'
  },
  {
    id: 'database-agent',
    name: 'Data Architect',
    role: 'Database Designer',
    icon: <Database className="w-4 h-4" />,
    specialty: 'PostgreSQL, MongoDB, Redis, Schema Design'
  },
  {
    id: 'devops-agent',
    name: 'DevOps Engineer',
    role: 'Infrastructure',
    icon: <Globe className="w-4 h-4" />,
    specialty: 'Docker, Kubernetes, CI/CD, Cloud Deployment'
  },
  {
    id: 'code-agent',
    name: 'Code Generator',
    role: 'Implementation',
    icon: <Code className="w-4 h-4" />,
    specialty: 'Code Generation, Refactoring, Optimization'
  }
];

export function MultiAgentSystem({ onTaskComplete, currentProject }: MultiAgentSystemProps) {
  const { toast } = useToast();
  const [agents, setAgents] = useState<Agent[]>(() =>
    AGENTS.map(agent => ({
      ...agent,
      status: 'idle' as const,
      progress: 0,
      messages: []
    }))
  );
  const [isRunning, setIsRunning] = useState(false);
  const [currentTask, setCurrentTask] = useState<string>(currentProject?.requirements || "");
  const [conversation, setConversation] = useState<AgentMessage[]>([]);
  const conversationRef = useRef<HTMLDivElement>(null);

  // Auto-start if requirements are provided and not running
  useEffect(() => {
    if (currentProject?.requirements && !isRunning && conversation.length === 0) {
        startMultiAgentTask(currentProject.requirements);
    }
  }, [currentProject]);

  useEffect(() => {
    if (conversationRef.current) {
      conversationRef.current.scrollTop = conversationRef.current.scrollHeight;
    }
  }, [conversation]);

  const sendMessage = (message: Omit<AgentMessage, 'id' | 'timestamp'>) => {
    const newMessage: AgentMessage = {
      ...message,
      id: Date.now().toString() + Math.random(),
      timestamp: new Date()
    };
    setConversation(prev => [...prev, newMessage]);
  };

  const updateAgentStatus = (agentId: string, status: Agent['status'], progress: number = 0) => {
    setAgents(prev => prev.map(agent =>
      agent.id === agentId
        ? { ...agent, status, progress }
        : agent
    ));
  };

  const startMultiAgentTask = async (task: string) => {
    if (isRunning) return;
    if (!task.trim()) {
        toast({ title: "Error", description: "Please enter a project description.", variant: "destructive" });
        return;
    }

    setIsRunning(true);
    setCurrentTask(task);
    setConversation([]); // Clear previous conversation

    // Project State to accumulate results
    let projectState = {
        requirements: task,
        architecture: null as any,
        frontend: null as any,
        backend: null as any,
        files: [] as any[]
    };

    try {
      // Initialize
      sendMessage({
        from: 'System',
        content: `🚀 Starting multi-agent workflow for: "${task}"`,
        type: 'task'
      });

      // --- PHASE 1: ARCHITECTURE ---
      updateAgentStatus('architect-agent', 'working', 20);
      sendMessage({ from: 'System', to: 'Chief Architect', content: 'Analyze requirements and define architecture.', type: 'task' });
      
      const archPrompt = AGENT_PROMPTS.ARCHITECT(task);
      const architecture = await AIService.generateStructuredJSON(archPrompt, "{ stack: { frontend, backend, database }, structure: [], summary: string }");
      
      projectState.architecture = architecture;
      sendMessage({ 
          from: 'Chief Architect', 
          content: `Architecture defined: ${architecture.summary}. Stack: ${architecture.stack.frontend} + ${architecture.stack.backend}.`, 
          type: 'response' 
      });
      updateAgentStatus('architect-agent', 'completed', 100);

      // --- PHASE 2: PARALLEL DESIGN (Frontend & Backend) ---
      updateAgentStatus('frontend-agent', 'working', 10);
      updateAgentStatus('backend-agent', 'working', 10);
      
      const [frontendDesign, backendDesign] = await Promise.all([
          (async () => {
             sendMessage({ from: 'Chief Architect', to: 'Frontend Architect', content: 'Design UI components and routes.', type: 'task' });
             const prompt = AGENT_PROMPTS.FRONTEND(task, architecture.stack);
             const res = await AIService.generateStructuredJSON(prompt, "{ components: [], routes: [], theme: string }");
             sendMessage({ from: 'Frontend Architect', content: `Designed ${res.components.length} components.`, type: 'response' });
             updateAgentStatus('frontend-agent', 'completed', 100);
             return res;
          })(),
          (async () => {
             sendMessage({ from: 'Chief Architect', to: 'Backend Engineer', content: 'Design API endpoints and DB schema.', type: 'task' });
             const prompt = AGENT_PROMPTS.BACKEND(task, architecture.stack);
             const res = await AIService.generateStructuredJSON(prompt, "{ endpoints: [], models: [] }");
             sendMessage({ from: 'Backend Engineer', content: `Designed ${res.endpoints.length} endpoints and ${res.models.length} models.`, type: 'response' });
             updateAgentStatus('backend-agent', 'completed', 100);
             return res;
          })()
      ]);

      projectState.frontend = frontendDesign;
      projectState.backend = backendDesign;

      // --- PHASE 3: DB & DEVOPS ---
      updateAgentStatus('database-agent', 'working', 50);
      sendMessage({ from: 'Backend Engineer', to: 'Data Architect', content: 'Finalize schema details.', type: 'task' });
      
      const dbPrompt = AGENT_PROMPTS.DATABASE(task, architecture.stack, backendDesign.models);
      const dbDesign = await AIService.generateStructuredJSON(dbPrompt, "{ schema: string, migrations: string[] }");
      
      sendMessage({ from: 'Data Architect', content: `Schema optimized. Planned ${dbDesign.migrations.length} migrations.`, type: 'response' });
      updateAgentStatus('database-agent', 'completed', 100);

      // --- PHASE 4: CODE GENERATION ---
      updateAgentStatus('code-agent', 'working', 0);
      sendMessage({ from: 'System', to: 'Code Generator', content: 'Begin generating source code files.', type: 'task' });
      
      // We will generate a few key files to demonstrate
      // In a real full run, we'd iterate over all components
      const filesToGenerate = [
          ...frontendDesign.components.slice(0, 3).map((c: any) => ({ name: c.name + '.tsx', desc: c.description, type: 'frontend' })),
          ...backendDesign.models.slice(0, 2).map((m: any) => ({ name: m.name + '.ts', desc: `Model with fields: ${JSON.stringify(m.fields)}`, type: 'backend' }))
      ];

      const generatedFiles = [];
      let progressStep = 100 / (filesToGenerate.length + 1); // +1 for DevOps
      let currentProgress = 0;

      for (const file of filesToGenerate) {
          sendMessage({ from: 'Code Generator', content: `Generating ${file.name}...`, type: 'task' });
          // Adjust stack for Mobile if needed
          const stackToUse = currentProject?.projectType === 'mobile' ? { ...architecture.stack, frontend: 'React Native' } : architecture.stack;
          
          const code = await AIService.generateContent(
              AGENT_PROMPTS.CODE_GENERATOR(file.name, file.desc, stackToUse)
          );
          
          if (code.error) {
            throw new Error(code.error);
          }
          
          // Strip code blocks if present
          const cleanCode = code.content.replace(/```(typescript|javascript|tsx|ts)?\n?|```/g, '');
          
          generatedFiles.push({
              path: file.name,
              content: cleanCode,
              language: 'typescript'
          });

          currentProgress += progressStep;
          updateAgentStatus('code-agent', 'working', Math.min(99, currentProgress));
      }
      
      updateAgentStatus('code-agent', 'completed', 100);
      updateAgentStatus('devops-agent', 'working', 80);
      sendMessage({ from: 'DevOps Engineer', content: 'Preparing deployment configuration...', type: 'task' });
      
      const devopsPrompt = AGENT_PROMPTS.DEVOPS(task, architecture.stack);
      const devopsConfig = await AIService.generateStructuredJSON(devopsPrompt, "{ configFiles: [], instructions: string }");

      for (const file of devopsConfig.configFiles) {
          generatedFiles.push({
              path: file.name,
              content: file.content,
              language: 'yaml' // or generic
          });
      }

      sendMessage({ from: 'DevOps Engineer', content: `Configuration ready. ${devopsConfig.instructions.substring(0, 100)}...`, type: 'response' });
      updateAgentStatus('devops-agent', 'completed', 100);


      // Complete
      sendMessage({
        from: 'System',
        content: '✅ All tasks completed successfully. Project is ready for review.',
        type: 'response'
      });

      const result = {
          ...projectState,
          generatedFiles
      };

      onTaskComplete(result);
      setIsRunning(false);
      setCurrentTask("");

    } catch (error: any) {
      console.error('Multi-agent task failed:', error);
      sendMessage({
        from: 'System',
        content: `❌ Task failed: ${error.message}`,
        type: 'error'
      });
      
      if (error.message.includes("API Key")) {
          toast({
              title: "Missing API Key",
              description: "Please configure Gemini API key in Settings.",
              variant: "destructive",
              action: <Link to="/settings"><Button variant="outline" size="sm">Open Settings</Button></Link>
          });
      }
      
      setIsRunning(false);
      updateAgentStatus('architect-agent', 'error');
    }
  };

  const getStatusIcon = (status: Agent['status']) => {
    switch (status) {
      case 'working': return <Clock className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error': return <AlertCircle className="w-4 h-4 text-red-500" />;
      default: return <Bot className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: Agent['status']) => {
    switch (status) {
      case 'working': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* Task Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Multi-Agent Task Coordinator
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Describe the full-stack application you want to build..."
                className="flex-1 px-3 py-2 border rounded-md"
                value={currentTask}
                onChange={(e) => setCurrentTask(e.target.value)}
                disabled={isRunning}
              />
              <Button
                onClick={() => startMultiAgentTask(currentTask)}
                disabled={isRunning || !currentTask.trim()}
                className="flex items-center gap-2"
              >
                <Zap className="w-4 h-4" />
                {isRunning ? "Running..." : "Start Agents"}
              </Button>
            </div>
            {isRunning && (
              <div className="text-sm text-muted-foreground">
                🤖 Agents are collaborating on your task...
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agent Status Panel */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">AI Agents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {agents.map((agent) => (
                <div key={agent.id} className="flex items-center gap-3 p-3 border rounded-lg">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="text-xs">
                      {agent.icon}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{agent.name}</span>
                      {getStatusIcon(agent.status)}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {agent.specialty}
                    </div>
                    {agent.status === 'working' && (
                      <Progress value={agent.progress} className="h-1 mt-2" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Conversation Panel */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Agent Communication
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea ref={conversationRef} className="h-96">
              <div className="space-y-3">
                {conversation.map((message) => (
                  <div key={message.id} className="flex gap-3">
                    <Avatar className="w-6 h-6 mt-1">
                      <AvatarFallback className="text-xs">
                        {message.from === 'System' ? 'S' :
                         agents.find(a => a.name === message.from)?.icon || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{message.from}</span>
                        {message.to && (
                          <>
                            <ArrowRight className="w-3 h-3 text-muted-foreground" />
                            <span className="font-medium text-sm text-muted-foreground">{message.to}</span>
                          </>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {message.type}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {message.content}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {message.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
                {conversation.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Agent conversation will appear here</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}