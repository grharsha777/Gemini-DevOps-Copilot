import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Github,
  ExternalLink,
  Copy,
  CheckCircle,
  Clock,
  AlertCircle,
  Globe,
  Zap,
  Share,
  Download,
  Upload
} from "lucide-react";
import { DevOpsLeaderboard } from "./devops-leaderboard";

interface DeploymentManagerProps {
  projectFiles: Array<{ path: string; content: string }>;
  projectName: string;
  onDeploymentComplete?: (url: string, platform: string) => void;
}

interface DeploymentStatus {
  platform: string;
  status: 'idle' | 'deploying' | 'success' | 'error';
  url?: string;
  repoUrl?: string;
  error?: string;
  id?: string;
  timestamp?: number;
  logs?: string[];
}

const DEPLOYMENT_PLATFORMS = [
  {
    id: 'github-pages',
    name: 'GitHub Pages',
    icon: <Github className="w-5 h-5" />,
    description: 'Free hosting for static sites',
    color: 'bg-gray-900',
    features: ['Free', 'Custom domain', 'HTTPS', 'CDN']
  },
  {
    id: 'vercel',
    name: 'Vercel',
    icon: <Zap className="w-5 h-5" />,
    description: 'Next.js optimized deployment',
    color: 'bg-black',
    features: ['Global CDN', 'Auto-scaling', 'Preview deploys', 'Analytics']
  },
  {
    id: 'netlify',
    name: 'Netlify',
    icon: <Globe className="w-5 h-5" />,
    description: 'Modern web hosting platform',
    color: 'bg-teal-600',
    features: ['Form handling', 'Functions', 'Large media', 'A/B testing']
  },
  {
    id: 'render',
    name: 'Render',
    icon: <ExternalLink className="w-5 h-5" />,
    description: 'Cloud hosting for full-stack apps',
    color: 'bg-blue-600',
    features: ['Databases', 'Cron jobs', 'Private services', 'Auto-deploys']
  }
];

export function DeploymentManager({ projectFiles, projectName, onDeploymentComplete }: DeploymentManagerProps) {
  const [deployments, setDeployments] = useState<DeploymentStatus[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState<string>("");
  const [githubUsername, setGithubUsername] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const [isDeploying, setIsDeploying] = useState(false);
  const [showLogs, setShowLogs] = useState<string | null>(null);

  const deployToPlatform = async (platform: string) => {
    if (!projectFiles.length) {
      alert("No files to deploy!");
      return;
    }

    // Check if GitHub credentials are needed
    if ((platform === "github-pages" || platform.includes("github")) && (!githubUsername || !githubToken)) {
      alert("Please provide GitHub username and token in the GitHub Setup tab before deploying.");
      return;
    }

    setIsDeploying(true);
    const deploymentId = Date.now().toString();

    // Add deployment status
    setDeployments(prev => [...prev, {
      platform,
      status: 'deploying',
      id: deploymentId,
      timestamp: Date.now()
    }]);

    try {
      const response = await fetch('/api/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform,
          projectName,
          files: projectFiles,
          githubUsername,
          githubToken
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}: ${response.statusText}` }));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {
        setDeployments(prev => prev.map(d =>
          d.platform === platform
            ? { ...d, status: 'success', url: result.url, repoUrl: result.repoUrl }
            : d
        ));

        onDeploymentComplete?.(result.url, platform);

        // Copy URL to clipboard
        try {
          await navigator.clipboard.writeText(result.url);
          alert(`Deployment successful! URL copied to clipboard: ${result.url}\n\nRepository: ${result.repoUrl || 'N/A'}`);
        } catch (clipboardError) {
          alert(`Deployment successful! URL: ${result.url}\n\nRepository: ${result.repoUrl || 'N/A'}`);
        }
      } else {
        throw new Error(result.error || 'Deployment failed');
      }
    } catch (error) {
      console.error('Deployment error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setDeployments(prev => prev.map(d =>
        d.platform === platform
          ? { ...d, status: 'error', error: errorMessage }
          : d
      ));
      alert(`Deployment failed: ${errorMessage}`);
    } finally {
      setIsDeploying(false);
    }
  };

  const getStatusIcon = (status: DeploymentStatus['status']) => {
    switch (status) {
      case 'deploying': return <Clock className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error': return <AlertCircle className="w-4 h-4 text-red-500" />;
      default: return <Globe className="w-4 h-4 text-gray-400" />;
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Could add a toast notification here
  };

  const downloadProject = () => {
    const zipContent = projectFiles.reduce((acc, file) => {
      return acc + `${file.path}:\n${file.content}\n\n`;
    }, "");

    const blob = new Blob([zipContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName}-source.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Deployment Status */}
      {deployments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Deployment History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {deployments.map((deployment, index) => (
                <div key={index} className="flex flex-col gap-2 p-3 border rounded bg-slate-900/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(deployment.status)}
                      <div>
                        <div className="font-medium capitalize">{deployment.platform.replace('-', ' ')}</div>
                        <div className="text-xs text-slate-500">
                          {deployment.timestamp ? new Date(deployment.timestamp).toLocaleString() : 'Just now'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {deployment.logs && (
                        <Button size="sm" variant="outline" onClick={() => setShowLogs(showLogs === deployment.id ? null : deployment.id!)}>
                          {showLogs === deployment.id ? 'Hide Logs' : 'Logs'}
                        </Button>
                      )}
                      {deployment.status === 'success' && deployment.url && (
                        <>
                          <Button size="sm" onClick={() => window.open(deployment.url, '_blank')}>
                            Visit <ExternalLink className="w-3 h-3 ml-2" />
                          </Button>
                          {deployment.repoUrl && (
                            <Button size="sm" variant="outline" onClick={() => window.open(deployment.repoUrl, '_blank')}>
                              <Github className="w-3 h-3 mr-2" /> Repo
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Logs Viewer */}
                  {showLogs === deployment.id && deployment.logs && (
                    <div className="mt-2 bg-black p-3 rounded text-xs font-mono text-green-400 h-32 overflow-y-auto">
                      {deployment.logs.map((log, i) => (
                        <div key={i}>{log}</div>
                      ))}
                    </div>
                  )}

                  {deployment.status === 'error' && (
                    <div className="text-sm text-red-500 bg-red-900/20 p-2 rounded">{deployment.error}</div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="platforms" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="platforms">Deploy Platforms</TabsTrigger>
          <TabsTrigger value="github">GitHub Setup</TabsTrigger>
          <TabsTrigger value="share">Share & Export</TabsTrigger>
        </TabsList>

        <TabsContent value="platforms" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {DEPLOYMENT_PLATFORMS.map((platform) => {
              const deployment = deployments.find(d => d.platform === platform.id);
              const isDeployed = deployment?.status === 'success';

              return (
                <Card key={platform.id} className="relative">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                      <div className={`p-2 rounded ${platform.color} text-white`}>
                        {platform.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          {platform.name}
                          {isDeployed && <Badge variant="secondary">Deployed</Badge>}
                        </div>
                        <div className="text-sm text-muted-foreground">{platform.description}</div>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-1">
                        {platform.features.map((feature) => (
                          <Badge key={feature} variant="outline" className="text-xs">
                            {feature}
                          </Badge>
                        ))}
                      </div>

                      {deployment && (
                        <Alert>
                          <AlertDescription className="flex items-center gap-2">
                            {getStatusIcon(deployment.status)}
                            {deployment.status === 'deploying' && 'Deploying...'}
                            {deployment.status === 'success' && 'Successfully deployed!'}
                            {deployment.status === 'error' && `Error: ${deployment.error}`}
                          </AlertDescription>
                        </Alert>
                      )}

                      <Button
                        className="w-full"
                        onClick={() => deployToPlatform(platform.id)}
                        disabled={isDeploying || isDeployed}
                      >
                        {isDeployed ? 'Already Deployed' : `Deploy to ${platform.name}`}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="github" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>GitHub Integration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertDescription>
                  Connect your GitHub account to enable automatic repository creation and deployment.
                  Your token will be stored securely and used only for deployment purposes.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="github-username">GitHub Username</Label>
                  <Input
                    id="github-username"
                    value={githubUsername}
                    onChange={(e) => setGithubUsername(e.target.value)}
                    placeholder="your-username"
                  />
                </div>
                <div>
                  <Label htmlFor="github-token">Personal Access Token</Label>
                  <Input
                    id="github-token"
                    type="password"
                    value={githubToken}
                    onChange={(e) => setGithubToken(e.target.value)}
                    placeholder="ghp_..."
                  />
                </div>
              </div>

              <div className="text-sm text-muted-foreground">
                <p className="mb-2">To create a Personal Access Token:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Go to GitHub Settings → Developer settings → Personal access tokens</li>
                  <li>Generate new token with 'repo' and 'public_repo' permissions</li>
                  <li>Copy the token and paste it above</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="share" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Share className="w-5 h-5" />
                  Share Project
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Share your project with the community. Others can fork, star, and contribute.
                </p>

                <div className="space-y-2">
                  <Button variant="outline" className="w-full">
                    <Github className="w-4 h-4 mr-2" />
                    Create Public Repository
                  </Button>
                  <Button variant="outline" className="w-full">
                    <Share className="w-4 h-4 mr-2" />
                    Generate Share Link
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="w-5 h-5" />
                  Export Project
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Download your project files for local development or backup.
                </p>

                <div className="space-y-2">
                  <Button onClick={downloadProject} variant="outline" className="w-full">
                    <Download className="w-4 h-4 mr-2" />
                    Download Source Code
                  </Button>
                  <Button variant="outline" className="w-full">
                    <Upload className="w-4 h-4 mr-2" />
                    Export as ZIP
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="md:col-span-2">
              <DevOpsLeaderboard />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}