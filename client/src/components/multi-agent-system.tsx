import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  };
}

const AGENTS: Omit<Agent, 'status' | 'progress' | 'messages'>[] = [
  {
    id: 'frontend-agent',
    name: 'Frontend Architect',
    role: 'UI/UX Developer',
    icon: <Palette className="w-4 h-4" />,
    specialty: 'React, Vue, Angular, CSS, Responsive Design'
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
    id: 'testing-agent',
    name: 'Quality Assurance',
    role: 'Test Engineer',
    icon: <TestTube className="w-4 h-4" />,
    specialty: 'Unit Tests, Integration Tests, E2E Testing'
  },
  {
    id: 'security-agent',
    name: 'Security Specialist',
    role: 'Security Engineer',
    icon: <Shield className="w-4 h-4" />,
    specialty: 'Authentication, Authorization, Security Audits'
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
  const [agents, setAgents] = useState<Agent[]>(() =>
    AGENTS.map(agent => ({
      ...agent,
      status: 'idle' as const,
      progress: 0,
      messages: []
    }))
  );
  const [isRunning, setIsRunning] = useState(false);
  const [currentTask, setCurrentTask] = useState<string>("");
  const [conversation, setConversation] = useState<AgentMessage[]>([]);
  const conversationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (conversationRef.current) {
      conversationRef.current.scrollTop = conversationRef.current.scrollHeight;
    }
  }, [conversation]);

  const sendMessage = (message: Omit<AgentMessage, 'id' | 'timestamp'>) => {
    const newMessage: AgentMessage = {
      ...message,
      id: Date.now().toString(),
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

    setIsRunning(true);
    setCurrentTask(task);
    setConversation([]);

    try {
      // Initialize agents
      sendMessage({
        from: 'System',
        content: `🚀 Starting multi-agent task: "${task}"`,
        type: 'task'
      });

      // Phase 1: Planning and Requirements Analysis
      updateAgentStatus('frontend-agent', 'working', 10);
      sendMessage({
        from: 'Frontend Architect',
        content: 'Analyzing UI/UX requirements and planning component architecture...',
        type: 'task'
      });

      // Simulate agent communication
      setTimeout(() => {
        sendMessage({
          from: 'Frontend Architect',
          to: 'Backend Engineer',
          content: 'What API endpoints will you need for this feature?',
          type: 'collaboration'
        });
        updateAgentStatus('frontend-agent', 'completed', 100);
        updateAgentStatus('backend-agent', 'working', 20);
      }, 1000);

      setTimeout(() => {
        sendMessage({
          from: 'Backend Engineer',
          to: 'Data Architect',
          content: 'Planning database schema for user management and content storage',
          type: 'collaboration'
        });
        updateAgentStatus('backend-agent', 'completed', 100);
        updateAgentStatus('database-agent', 'working', 30);
      }, 2000);

      setTimeout(() => {
        sendMessage({
          from: 'Data Architect',
          content: 'Database schema designed. Creating migrations and models.',
          type: 'response'
        });
        updateAgentStatus('database-agent', 'completed', 100);
        updateAgentStatus('code-agent', 'working', 50);
      }, 3000);

      setTimeout(() => {
        sendMessage({
          from: 'Code Generator',
          content: 'Generating boilerplate code and initial implementation...',
          type: 'task'
        });
        updateAgentStatus('code-agent', 'completed', 100);
        updateAgentStatus('testing-agent', 'working', 70);
      }, 4000);

      setTimeout(() => {
        sendMessage({
          from: 'Quality Assurance',
          content: 'Writing comprehensive test suites and integration tests...',
          type: 'task'
        });
        updateAgentStatus('testing-agent', 'completed', 100);
        updateAgentStatus('security-agent', 'working', 85);
      }, 5000);

      setTimeout(() => {
        sendMessage({
          from: 'Security Specialist',
          content: 'Implementing authentication, input validation, and security measures...',
          type: 'task'
        });
        updateAgentStatus('security-agent', 'completed', 100);
        updateAgentStatus('devops-agent', 'working', 95);
      }, 6000);

      setTimeout(() => {
        sendMessage({
          from: 'DevOps Engineer',
          content: 'Setting up deployment pipeline and infrastructure configuration...',
          type: 'task'
        });
        updateAgentStatus('devops-agent', 'completed', 100);
      }, 7000);

      // Complete the task
      setTimeout(() => {
        sendMessage({
          from: 'System',
          content: '✅ Multi-agent task completed successfully! All components generated.',
          type: 'response'
        });

        // Generate sample result
        const result = {
          frontend: {
            components: ['App.js', 'Header.js', 'Dashboard.js'],
            styles: ['main.css', 'components.css']
          },
          backend: {
            routes: ['/api/users', '/api/auth', '/api/data'],
            models: ['User.js', 'Session.js']
          },
          database: {
            tables: ['users', 'sessions', 'content'],
            migrations: ['001_initial.sql', '002_add_indexes.sql']
          },
          tests: {
            unit: ['user.test.js', 'auth.test.js'],
            integration: ['api.test.js']
          }
        };

        onTaskComplete(result);
        setIsRunning(false);
        setCurrentTask("");
      }, 8000);

    } catch (error) {
      console.error('Multi-agent task failed:', error);
      sendMessage({
        from: 'System',
        content: '❌ Task failed. Agents encountered an error.',
        type: 'error'
      });
      setIsRunning(false);
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