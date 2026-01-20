import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Play, 
  GitCommit, 
  Terminal, 
  AlertCircle,
  RefreshCw,
  Box
} from 'lucide-react';

interface PipelineRun {
  id: string;
  name: string;
  status: 'success' | 'failed' | 'running' | 'pending';
  branch: string;
  commit: string;
  author: string;
  duration: string;
  timestamp: string;
  steps: {
    name: string;
    status: 'success' | 'failed' | 'running' | 'pending';
    duration?: string;
  }[];
}

const MOCK_RUNS: PipelineRun[] = [
  {
    id: 'run-1234',
    name: 'Production Deploy',
    status: 'success',
    branch: 'main',
    commit: 'a1b2c3d',
    author: 'Sarah Chen',
    duration: '4m 12s',
    timestamp: '10 mins ago',
    steps: [
      { name: 'Build', status: 'success', duration: '1m 20s' },
      { name: 'Test', status: 'success', duration: '2m 10s' },
      { name: 'Lint', status: 'success', duration: '30s' },
      { name: 'Deploy', status: 'success', duration: '12s' },
    ]
  },
  {
    id: 'run-1235',
    name: 'Feature Branch Build',
    status: 'failed',
    branch: 'feat/new-auth',
    commit: 'e5f6g7h',
    author: 'Marcus Rodriguez',
    duration: '2m 45s',
    timestamp: '1 hour ago',
    steps: [
      { name: 'Build', status: 'success', duration: '1m 15s' },
      { name: 'Test', status: 'failed', duration: '1m 30s' },
      { name: 'Lint', status: 'pending' },
    ]
  },
  {
    id: 'run-1236',
    name: 'Daily Security Scan',
    status: 'running',
    branch: 'main',
    commit: 'a1b2c3d',
    author: 'System',
    duration: '1m 10s',
    timestamp: 'Running now',
    steps: [
      { name: 'Setup', status: 'success', duration: '10s' },
      { name: 'Scan Dependencies', status: 'running', duration: '1m' },
      { name: 'Report', status: 'pending' },
    ]
  }
];

export default function CICDPage() {
  const [runs, setRuns] = useState<PipelineRun[]>(MOCK_RUNS);
  const [selectedRun, setSelectedRun] = useState<PipelineRun>(MOCK_RUNS[0]);
  const [isLoading, setIsLoading] = useState(false);

  // In a real app, we would fetch from /api/metrics/ci-cd
  // but for now we'll use the enhanced mock data to demonstrate the UI
  
  const getStatusIcon = (status: PipelineRun['status']) => {
    switch (status) {
      case 'success': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'running': return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      default: return <Clock className="h-4 w-4 text-slate-500" />;
    }
  };

  const getStatusColor = (status: PipelineRun['status']) => {
    switch (status) {
      case 'success': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'failed': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'running': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      default: return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] p-6 flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">CI/CD Pipelines</h1>
          <p className="text-muted-foreground">Monitor builds, tests, and deployments.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
          <Button>
            <Play className="mr-2 h-4 w-4" /> Run Pipeline
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Stats Cards */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Runs (24h)</CardTitle>
            <Play className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">142</div>
            <p className="text-xs text-muted-foreground">+20.1% from yesterday</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">94.5%</div>
            <p className="text-xs text-muted-foreground">+2.1% from last week</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3m 12s</div>
            <p className="text-xs text-muted-foreground">-14s from last week</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        {/* Pipeline Runs List */}
        <Card className="col-span-1 flex flex-col">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest pipeline executions</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-0">
            <ScrollArea className="h-[400px] lg:h-full">
              <div className="flex flex-col">
                {runs.map((run) => (
                  <button
                    key={run.id}
                    onClick={() => setSelectedRun(run)}
                    className={`flex flex-col gap-2 p-4 border-b text-left transition-colors hover:bg-muted/50 ${
                      selectedRun.id === run.id ? 'bg-muted' : ''
                    }`}
                  >
                    <div className="flex justify-between items-start w-full">
                      <span className="font-semibold truncate">{run.name}</span>
                      <Badge variant="outline" className={getStatusColor(run.status)}>
                        {run.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <GitCommit className="h-3 w-3" />
                      <span className="font-mono">{run.commit}</span>
                      <span>•</span>
                      <span>{run.branch}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-muted-foreground mt-1">
                      <span>{run.author}</span>
                      <span>{run.timestamp}</span>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Pipeline Details */}
        <Card className="col-span-1 lg:col-span-2 flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {selectedRun.name}
                <Badge variant="outline" className={getStatusColor(selectedRun.status)}>
                  {selectedRun.status}
                </Badge>
              </CardTitle>
              <CardDescription className="flex items-center gap-2 mt-2">
                <GitCommit className="h-4 w-4" /> {selectedRun.commit} on {selectedRun.branch} • {selectedRun.duration}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm">
              <ExternalLink className="mr-2 h-4 w-4" /> View Artifacts
            </Button>
          </CardHeader>
          <CardContent className="flex-1 min-h-0">
            <Tabs defaultValue="steps" className="h-full flex flex-col">
              <TabsList>
                <TabsTrigger value="steps">Pipeline Steps</TabsTrigger>
                <TabsTrigger value="logs">Console Logs</TabsTrigger>
                <TabsTrigger value="config">Configuration</TabsTrigger>
              </TabsList>
              
              <TabsContent value="steps" className="flex-1 mt-4">
                <div className="space-y-4">
                  {selectedRun.steps.map((step, idx) => (
                    <div key={idx} className="flex items-center gap-4 p-3 rounded-lg border bg-card">
                      <div className="flex-none">
                        {getStatusIcon(step.status)}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{step.name}</div>
                        {step.duration && (
                          <div className="text-xs text-muted-foreground">Duration: {step.duration}</div>
                        )}
                      </div>
                      <div className="flex-none">
                         <Badge variant="secondary">{step.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
              
              <TabsContent value="logs" className="flex-1 mt-4 overflow-hidden">
                <ScrollArea className="h-[400px] w-full rounded-md border bg-slate-950 p-4">
                  <div className="font-mono text-xs text-slate-300 space-y-1">
                    <p className="text-slate-500"># Starting pipeline execution for {selectedRun.id}</p>
                    <p><span className="text-blue-400">info</span> Checking out code from repository...</p>
                    <p><span className="text-blue-400">info</span> Found configuration file .github/workflows/main.yml</p>
                    <p><span className="text-green-400">success</span> Repository checked out</p>
                    <p><span className="text-blue-400">info</span> Setting up Node.js environment...</p>
                    <p><span className="text-blue-400">info</span> Installing dependencies...</p>
                    <p className="text-slate-500">$ npm install</p>
                    <p>added 1420 packages in 15s</p>
                    <p><span className="text-blue-400">info</span> Running build...</p>
                    <p className="text-slate-500">$ npm run build</p>
                    {selectedRun.status === 'failed' && (
                      <>
                        <p className="text-red-400">error: Build failed with exit code 1</p>
                        <p className="text-red-400">Error: Component 'Button' is not defined</p>
                        <p className="text-red-400">    at src/pages/home.tsx:42:10</p>
                      </>
                    )}
                    {selectedRun.status === 'success' && (
                      <>
                        <p className="text-green-400">success: Build completed successfully</p>
                        <p><span className="text-blue-400">info</span> Running tests...</p>
                        <p className="text-green-400">success: All tests passed</p>
                        <p><span className="text-blue-400">info</span> Deploying to production...</p>
                        <p className="text-green-400">success: Deployment complete</p>
                      </>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="config">
                <div className="p-4 border rounded-md bg-muted/30">
                  <pre className="text-xs font-mono">
{`name: ${selectedRun.name}
on:
  push:
    branches: [ "${selectedRun.branch}" ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: Use Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18.x'
    - run: npm ci
    - run: npm run build
    - run: npm test`}
                  </pre>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ExternalLink(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}
