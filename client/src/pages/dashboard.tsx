import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BarChart3, GitCommit, GitPullRequest, AlertCircle, FileCode, TrendingUp, Users } from "lucide-react";
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { DashboardSummary, CommitActivity, PRStatus, ContributorActivity, HotspotFile, GitHubRepo } from "@shared/schema";

export default function Dashboard() {
  const [selectedRepo, setSelectedRepo] = useState<string>("");
  const [selectedHotspot, setSelectedHotspot] = useState<HotspotFile | null>(null);
  const [animatedCounts, setAnimatedCounts] = useState({ commits: 0, prs: 0, issues: 0, hotspots: 0 });

  const githubPat = localStorage.getItem("githubPat") || "";

  const { data: repos, isLoading: reposLoading } = useQuery<GitHubRepo[]>({
    queryKey: ["/api/github/repos"],
    enabled: !!githubPat,
  });

  const [owner, repo] = selectedRepo.split("/");

  const { data: summary, isLoading: summaryLoading } = useQuery<DashboardSummary>({
    queryKey: ["/api/github/summary", owner, repo],
    enabled: !!selectedRepo && !!githubPat && !!owner && !!repo,
  });

  const { data: commitActivity, isLoading: commitLoading } = useQuery<CommitActivity[]>({
    queryKey: ["/api/github/commits", owner, repo],
    enabled: !!selectedRepo && !!githubPat && !!owner && !!repo,
  });

  const { data: contributors, isLoading: contributorsLoading } = useQuery<ContributorActivity[]>({
    queryKey: ["/api/github/contributors", owner, repo],
    enabled: !!selectedRepo && !!githubPat && !!owner && !!repo,
  });

  const { data: hotspots, isLoading: hotspotsLoading } = useQuery<HotspotFile[]>({
    queryKey: ["/api/github/hotspots", owner, repo],
    enabled: !!selectedRepo && !!githubPat && !!owner && !!repo,
  });

  useEffect(() => {
    if (repos && repos.length > 0 && !selectedRepo) {
      setSelectedRepo(repos[0].full_name);
    }
  }, [repos, selectedRepo]);

  useEffect(() => {
    if (summary) {
      const duration = 1000;
      const steps = 50;
      const interval = duration / steps;

      let step = 0;
      const timer = setInterval(() => {
        step++;
        const progress = step / steps;
        setAnimatedCounts({
          commits: Math.floor(summary.totalCommits * progress),
          prs: Math.floor((summary.prStatus.open + summary.prStatus.merged + summary.prStatus.closed) * progress),
          issues: Math.floor(summary.openIssues * progress),
          hotspots: Math.floor(summary.hotspotCount * progress),
        });

        if (step >= steps) {
          clearInterval(timer);
          setAnimatedCounts({
            commits: summary.totalCommits,
            prs: summary.prStatus.open + summary.prStatus.merged + summary.prStatus.closed,
            issues: summary.openIssues,
            hotspots: summary.hotspotCount,
          });
        }
      }, interval);

      return () => clearInterval(timer);
    }
  }, [summary]);

  if (!githubPat) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6">
        <Card className="max-w-md p-6 bg-card/80 backdrop-blur-sm text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
          <h3 className="text-lg font-semibold mb-2">GitHub PAT Required</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Please configure your GitHub Personal Access Token in Settings to view analytics.
          </p>
          <Button asChild>
            <a href="/settings" data-testid="link-settings">
              Go to Settings
            </a>
          </Button>
        </Card>
      </div>
    );
  }

  const prData = summary
    ? [
        { name: "Open", value: summary.prStatus.open, color: "#06B6D4" },
        { name: "Merged", value: summary.prStatus.merged, color: "#10B981" },
        { name: "Closed", value: summary.prStatus.closed, color: "#6366F1" },
      ]
    : [];

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-primary" />
              GitHub Analytics Dashboard
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Real-time insights and repository analytics
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Repository:</span>
            <Select value={selectedRepo} onValueChange={setSelectedRepo} disabled={reposLoading}>
              <SelectTrigger className="w-64" data-testid="select-repo">
                <SelectValue placeholder="Select repository" />
              </SelectTrigger>
              <SelectContent>
                {repos?.map((repo) => (
                  <SelectItem key={repo.id} value={repo.full_name}>
                    {repo.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-card/80 backdrop-blur-sm border-card-border hover-elevate">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Commits (7 days)</CardTitle>
              <div className="w-8 h-8 bg-gradient-to-br from-primary/20 to-purple-500/20 rounded-lg flex items-center justify-center">
                <GitCommit className="w-4 h-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              {summaryLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <div className="text-2xl font-bold" data-testid="text-commits">
                    {animatedCounts.commits}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse-glow" />
                    Live
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card/80 backdrop-blur-sm border-card-border hover-elevate">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pull Requests</CardTitle>
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500/20 to-cyan-500/20 rounded-lg flex items-center justify-center">
                <GitPullRequest className="w-4 h-4 text-purple-500" />
              </div>
            </CardHeader>
            <CardContent>
              {summaryLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <div className="text-2xl font-bold" data-testid="text-prs">
                    {animatedCounts.prs}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {summary?.prStatus.open} open, {summary?.prStatus.merged} merged
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card/80 backdrop-blur-sm border-card-border hover-elevate">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Open Issues</CardTitle>
              <div className="w-8 h-8 bg-gradient-to-br from-cyan-500/20 to-primary/20 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-4 h-4 text-cyan-500" />
              </div>
            </CardHeader>
            <CardContent>
              {summaryLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <div className="text-2xl font-bold" data-testid="text-issues">
                    {animatedCounts.issues}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Needs attention</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card/80 backdrop-blur-sm border-card-border hover-elevate">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Hotspot Files</CardTitle>
              <div className="w-8 h-8 bg-gradient-to-br from-yellow-500/20 to-red-500/20 rounded-lg flex items-center justify-center">
                <FileCode className="w-4 h-4 text-yellow-500" />
              </div>
            </CardHeader>
            <CardContent>
              {summaryLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <div className="text-2xl font-bold" data-testid="text-hotspots">
                    {animatedCounts.hotspots}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">High-risk files</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-card/80 backdrop-blur-sm border-card-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Commit Activity (7 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {commitLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={commitActivity}>
                    <defs>
                      <linearGradient id="colorCommits" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366F1" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="date" stroke="#888" />
                    <YAxis stroke="#888" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(30, 41, 59, 0.9)",
                        border: "1px solid #475569",
                        borderRadius: "8px",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="#6366F1"
                      fillOpacity={1}
                      fill="url(#colorCommits)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card/80 backdrop-blur-sm border-card-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitPullRequest className="w-5 h-5" />
                PR Status Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              {summaryLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={prData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label
                    >
                      {prData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(30, 41, 59, 0.9)",
                        border: "1px solid #475569",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card/80 backdrop-blur-sm border-card-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Top Contributors
              </CardTitle>
            </CardHeader>
            <CardContent>
              {contributorsLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={contributors}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="author" stroke="#888" />
                    <YAxis stroke="#888" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(30, 41, 59, 0.9)",
                        border: "1px solid #475569",
                        borderRadius: "8px",
                      }}
                    />
                    <Bar dataKey="commits" fill="#8B5CF6" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card/80 backdrop-blur-sm border-card-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCode className="w-5 h-5" />
                Repository Hotspots
              </CardTitle>
            </CardHeader>
            <CardContent>
              {hotspotsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>File</TableHead>
                        <TableHead>Commits</TableHead>
                        <TableHead>Risk</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {hotspots?.map((file, idx) => (
                        <TableRow
                          key={idx}
                          className="cursor-pointer hover-elevate"
                          onClick={() => setSelectedHotspot(file)}
                          data-testid={`row-hotspot-${idx}`}
                        >
                          <TableCell className="font-mono text-xs truncate max-w-[200px]">
                            {file.path}
                          </TableCell>
                          <TableCell>{file.commitCount}</TableCell>
                          <TableCell>
                            <Badge
                              className={
                                file.riskScore > 7
                                  ? "bg-red-500/10 text-red-500 border-red-500/20"
                                  : file.riskScore > 4
                                  ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                                  : "bg-green-500/10 text-green-500 border-green-500/20"
                              }
                              variant="outline"
                            >
                              {file.riskScore}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={!!selectedHotspot} onOpenChange={() => setSelectedHotspot(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-mono text-sm">{selectedHotspot?.path}</DialogTitle>
            <DialogDescription>AI Analysis & Risk Assessment</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Commit Count</p>
                <p className="text-2xl font-bold">{selectedHotspot?.commitCount}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Risk Score</p>
                <p className="text-2xl font-bold">{selectedHotspot?.riskScore}/10</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">Last Modified</p>
              <p className="text-sm">
                {selectedHotspot?.lastModified
                  ? new Date(selectedHotspot.lastModified).toLocaleString()
                  : "Unknown"}
              </p>
            </div>
            {selectedHotspot?.analysis && (
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm font-medium mb-2">AI Analysis</p>
                <p className="text-sm text-muted-foreground">{selectedHotspot.analysis}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
