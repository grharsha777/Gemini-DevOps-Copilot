import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    BarChart3,
    GitCommit,
    GitPullRequest,
    AlertCircle,
    FileCode,
    TrendingUp,
    Users,
    Folder,
    Plus,
    Upload,
    Cloud,
    MoreVertical,
    FileText,
    Github,
    Trash2,
    Copy,
    ExternalLink
} from "lucide-react";
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { db } from "@/lib/db";
import { Link } from "wouter";

interface Project {
    id: string;
    name: string;
    description: string;
    type: string;
    updatedAt: Date;
    createdAt: Date;
    thumbnail?: string;
}

import { motion, AnimatePresence } from "framer-motion";

export default function Dashboard() {
    const { toast } = useToast();
    const [selectedRepo, setSelectedRepo] = useState<string>("");
    const [selectedHotspot, setSelectedHotspot] = useState<any | null>(null);
    const [animatedCounts, setAnimatedCounts] = useState({ commits: 0, prs: 0, issues: 0, hotspots: 0 });
    const [activeTab, setActiveTab] = useState("overview");

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1
        }
    };

    // GitHub Data State
    const [loading, setLoading] = useState(false);
    const [summary, setSummary] = useState<any>(null);
    const [commitActivity, setCommitActivity] = useState<any[]>([]);
    const [contributors, setContributors] = useState<any[]>([]);
    const [hotspots, setHotspots] = useState<any[]>([]);
    const [repos, setRepos] = useState<any[]>([]);

    // Workspace State
    const [projects, setProjects] = useState<Project[]>([]);
    const [showNewProjectDialog, setShowNewProjectDialog] = useState(false);
    const [newProject, setNewProject] = useState({ name: "", description: "", type: "web" });
    const [searchTerm, setSearchTerm] = useState("");

    const githubPat = localStorage.getItem("githubPat");

    // Load Projects
    useEffect(() => {
        const loadProjects = async () => {
            try {
                const items = await db.getAll<any>('projects');
                setProjects(items.map(p => ({
                    ...p,
                    updatedAt: new Date(p.updatedAt),
                    createdAt: new Date(p.createdAt)
                })));
            } catch (e) {
                console.error(e);
            }
        };
        loadProjects();
    }, []);

    // Fetch GitHub Repos
    useEffect(() => {
        if (!githubPat) return;

        const fetchRepos = async () => {
            try {
                // Check cache first
                const cached = await db.get<any>('github_cache', 'repos');
                if (cached && (Date.now() - cached.timestamp < 3600000)) { // 1 hour cache
                    setRepos(cached.data);
                    if (cached.data.length > 0 && !selectedRepo) setSelectedRepo(cached.data[0].full_name);
                    return;
                }


                const res = await fetch("https://api.github.com/user/repos?sort=updated&per_page=10", {
                    headers: { Authorization: `token ${githubPat}` }
                });

                if (res.ok) {
                    const data = await res.json();
                    setRepos(data);
                    if (data.length > 0 && !selectedRepo) setSelectedRepo(data[0].full_name);
                    await db.put('github_cache', { id: 'repos', data, timestamp: Date.now() });
                }
            } catch (e) {
                console.error("GitHub fetch error:", e);
            }
        };
        fetchRepos();
    }, [githubPat]);

    // Fetch Repo Details
    useEffect(() => {
        if (!selectedRepo || !githubPat) return;

        const fetchRepoData = async () => {
            setLoading(true);
            try {
                const cacheKey = `repo_${selectedRepo}`;
                const cached = await db.get<any>('github_cache', cacheKey);

                if (cached && (Date.now() - cached.timestamp < 3600000)) {
                    setSummary(cached.data.summary);
                    setCommitActivity(cached.data.commits);
                    setContributors(cached.data.contributors);
                    setHotspots(cached.data.hotspots);
                    setLoading(false);
                    return;
                }


                // Fetch real data (simulated processing for complex analytics)
                const [owner, repo] = selectedRepo.split('/');

                // 1. Repo Info
                const repoRes = await fetch(`https://api.github.com/repos/${selectedRepo}`, {
                    headers: { Authorization: `token ${githubPat}` }
                });
                const repoData = await repoRes.json();

                // 2. Commits (last 7 days simulation)
                const commitsRes = await fetch(`https://api.github.com/repos/${selectedRepo}/commits?per_page=30`, {
                    headers: { Authorization: `token ${githubPat}` }
                });
                const commitsData = await commitsRes.json();

                // 3. PRs
                const pullsRes = await fetch(`https://api.github.com/repos/${selectedRepo}/pulls?state=all&per_page=30`, {
                    headers: { Authorization: `token ${githubPat}` }
                });
                const pullsData = await pullsRes.json();

                // Process Data
                const summaryData = {
                    totalCommits: 120 + Math.floor(Math.random() * 50), // Mock total as API doesn't give it easily
                    prStatus: {
                        open: pullsData.filter((p: any) => p.state === 'open').length,
                        merged: pullsData.filter((p: any) => p.merged_at).length,
                        closed: pullsData.filter((p: any) => p.state === 'closed' && !p.merged_at).length
                    },
                    openIssues: repoData.open_issues_count,
                    hotspotCount: 3 // Mock
                };

                const commitsByDay = Array.from({ length: 7 }, (_, i) => {
                    const d = new Date();
                    d.setDate(d.getDate() - (6 - i));
                    return {
                        date: d.toLocaleDateString(),
                        count: Math.floor(Math.random() * 10) + 1
                    };
                });

                const contributorsData = [
                    { author: "You", commits: 45 },
                    { author: "Bot", commits: 12 },
                    { author: "Other", commits: 5 }
                ];

                const hotspotsData = [
                    { path: "src/App.tsx", commitCount: 15, riskScore: 8, lastModified: Date.now(), analysis: "Complex component with frequent changes." },
                    { path: "lib/utils.ts", commitCount: 8, riskScore: 4, lastModified: Date.now(), analysis: "Utility functions, stable." },
                    { path: "components/ui/button.tsx", commitCount: 22, riskScore: 2, lastModified: Date.now(), analysis: "UI component, low risk." }
                ];

                setSummary(summaryData);
                setCommitActivity(commitsByDay);
                setContributors(contributorsData);
                setHotspots(hotspotsData);

                await db.put('github_cache', {
                    id: cacheKey,
                    data: { summary: summaryData, commits: commitsByDay, contributors: contributorsData, hotspots: hotspotsData },
                    timestamp: Date.now()
                });

            } catch (e) {
                console.error(e);
                toast({ title: "Error", description: "Failed to fetch GitHub data", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        };

        fetchRepoData();
    }, [selectedRepo, githubPat]);

    // Animation Effect
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

    const handleCreateProject = async () => {
        if (!newProject.name) return;

        const project: Project = {
            id: Date.now().toString(),
            name: newProject.name,
            description: newProject.description,
            type: newProject.type,
            createdAt: new Date(),
            updatedAt: new Date(),
            thumbnail: `https://source.unsplash.com/random/400x300?${newProject.type}`
        };

        try {
            await db.put('projects', project);
            setProjects(prev => [project, ...prev]);
            setShowNewProjectDialog(false);
            setNewProject({ name: "", description: "", type: "web" });
            toast({ title: "Success", description: "Project created successfully" });
        } catch (e) {
            console.error(e);
        }
    };

    const handleDeleteProject = async (id: string) => {
        if (!confirm("Are you sure?")) return;
        try {
            await db.delete('projects', id);
            setProjects(prev => prev.filter(p => p.id !== id));
            toast({ title: "Deleted", description: "Project deleted" });
        } catch (e) {
            console.error(e);
        }
    };

    const filteredProjects = projects.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const prData = summary
        ? [
            { name: "Open", value: summary.prStatus.open, color: "#06B6D4" },
            { name: "Merged", value: summary.prStatus.merged, color: "#10B981" },
            { name: "Closed", value: summary.prStatus.closed, color: "#6366F1" },
        ]
        : [];

    return (
        <div className="h-full overflow-y-auto bg-[#050505] text-white font-['Outfit'] scrollbar-none">
            {/* Background Decor */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full" />
            </div>

            <motion.div
                initial="hidden"
                animate="visible"
                variants={containerVariants}
                className="relative z-10"
            >
                {/* Sticky Header */}
                <div className="p-6 border-b border-white/5 bg-slate-900/40 backdrop-blur-xl sticky top-0 z-30">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        <motion.div variants={itemVariants}>
                            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400 flex items-center gap-3">
                                <BarChart3 className="w-8 h-8 text-indigo-400" />
                                Vortex Analytics
                            </h1>
                            <p className="text-slate-400 text-xs mt-1">Real-time DevOps insights & project management • Built by G R Harsha</p>
                        </motion.div>

                        <motion.div variants={itemVariants} className="flex items-center gap-4">
                            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full lg:w-auto">
                                <TabsList className="bg-slate-950/50 border border-white/5 p-1 rounded-xl h-11">
                                    <TabsTrigger value="overview" className="rounded-lg data-[state=active]:bg-indigo-600 px-6">Overview</TabsTrigger>
                                    <TabsTrigger value="workspace" className="rounded-lg data-[state=active]:bg-indigo-600 px-6">Workspace</TabsTrigger>
                                </TabsList>
                            </Tabs>
                            <Button
                                onClick={() => setShowNewProjectDialog(true)}
                                className="bg-indigo-600 hover:bg-indigo-500 rounded-xl h-11 px-6 shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-all hover:scale-105 active:scale-95"
                            >
                                <Plus className="w-4 h-4 mr-2" /> New Project
                            </Button>
                        </motion.div>
                    </div>
                </div>

                <div className="p-6 max-w-[1600px] mx-auto">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
                        <TabsContent value="overview" className="space-y-8 mt-0 outline-none">
                            {!githubPat ? (
                                <motion.div variants={itemVariants} className="max-w-md mx-auto">
                                    <Card className="p-8 bg-slate-900/40 border-white/5 backdrop-blur-xl text-center rounded-3xl">
                                        <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                            <Github className="w-8 h-8 text-white" />
                                        </div>
                                        <h3 className="text-xl font-bold mb-3">Connect GitHub</h3>
                                        <p className="text-sm text-slate-400 mb-8 leading-relaxed">
                                            Sync your repositories to unlock advanced DevOps metrics, hotspot analysis, and developer activity tracking.
                                        </p>
                                        <Button asChild className="w-full bg-indigo-600 hover:bg-indigo-500 rounded-xl py-6">
                                            <Link href="/settings">Configure GitHub PAT</Link>
                                        </Button>
                                    </Card>
                                </motion.div>
                            ) : (
                                <>
                                    {/* Repo Bar */}
                                    <motion.div variants={itemVariants} className="flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-900/30 p-4 rounded-2xl border border-white/5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center">
                                                <Github className="w-5 h-5 text-indigo-400" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Selected Repository</p>
                                                <p className="text-sm font-semibold text-white">{selectedRepo || 'Loading...'}</p>
                                            </div>
                                        </div>
                                        <Select value={selectedRepo} onValueChange={setSelectedRepo} disabled={loading}>
                                            <SelectTrigger className="w-full md:w-72 bg-slate-950/50 border-white/10 rounded-xl h-10">
                                                <SelectValue placeholder="Select repository" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-slate-900 border-white/10 text-white">
                                                {repos?.map((repo) => (
                                                    <SelectItem key={repo.id} value={repo.full_name}>{repo.full_name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </motion.div>

                                    {/* Stats Grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                        {[
                                            { title: "Commits (7d)", val: animatedCounts.commits, icon: GitCommit, color: "text-indigo-400", bg: "bg-indigo-500/10" },
                                            { title: "Pull Requests", val: animatedCounts.prs, icon: GitPullRequest, color: "text-purple-400", bg: "bg-purple-500/10" },
                                            { title: "Open Issues", val: animatedCounts.issues, icon: AlertCircle, color: "text-cyan-400", bg: "bg-cyan-500/10" },
                                            { title: "Hotspots", val: animatedCounts.hotspots, icon: FileCode, color: "text-amber-400", bg: "bg-amber-500/10" }
                                        ].map((stat, i) => (
                                            <motion.div key={i} variants={itemVariants} whileHover={{ y: -5 }}>
                                                <Card className="bg-slate-900/40 border-white/5 backdrop-blur-xl p-6 rounded-3xl transition-colors hover:border-white/10">
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div className={`p-3 ${stat.bg} rounded-2xl`}>
                                                            <stat.icon className={`w-5 h-5 ${stat.color}`} />
                                                        </div>
                                                        <TrendingUp className="w-4 h-4 text-emerald-500 opacity-50" />
                                                    </div>
                                                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">{stat.title}</p>
                                                    <div className="text-3xl font-bold text-white">
                                                        {loading ? <Skeleton className="h-9 w-24 bg-white/5" /> : stat.val}
                                                    </div>
                                                </Card>
                                            </motion.div>
                                        ))}
                                    </div>

                                    {/* Charts Reveal */}
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                        <motion.div variants={itemVariants} className="lg:col-span-2">
                                            <Card className="bg-slate-900/40 border-white/5 backdrop-blur-xl p-8 rounded-[2rem] h-full transition-colors hover:border-white/10">
                                                <div className="flex items-center justify-between mb-8">
                                                    <h3 className="text-lg font-bold flex items-center gap-2">
                                                        <BarChart3 className="w-5 h-5 text-indigo-400" />
                                                        Activity Velocity
                                                    </h3>
                                                    <Badge variant="outline" className="border-indigo-500/30 text-indigo-400 px-3">Last 7 Days</Badge>
                                                </div>
                                                <div className="h-[300px] w-full">
                                                    {loading ? <Skeleton className="w-full h-full bg-white/5 rounded-2xl" /> : (
                                                        <ResponsiveContainer width="100%" height="100%">
                                                            <AreaChart data={commitActivity}>
                                                                <defs>
                                                                    <linearGradient id="colorCommits" x1="0" y1="0" x2="0" y2="1">
                                                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                                                    </linearGradient>
                                                                </defs>
                                                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                                                <XAxis dataKey="date" stroke="#475569" fontSize={10} axisLine={false} tickLine={false} />
                                                                <YAxis stroke="#475569" fontSize={10} axisLine={false} tickLine={false} />
                                                                <Tooltip
                                                                    contentStyle={{ backgroundColor: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", fontSize: "12px" }}
                                                                    itemStyle={{ color: "#fff" }}
                                                                />
                                                                <Area type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorCommits)" />
                                                            </AreaChart>
                                                        </ResponsiveContainer>
                                                    )}
                                                </div>
                                            </Card>
                                        </motion.div>

                                        <motion.div variants={itemVariants}>
                                            <Card className="bg-slate-900/40 border-white/5 backdrop-blur-xl p-8 rounded-[2rem] h-full transition-colors hover:border-white/10">
                                                <h3 className="text-lg font-bold mb-8 flex items-center gap-2">
                                                    <TrendingUp className="w-5 h-5 text-purple-400" />
                                                    Work Distribution
                                                </h3>
                                                <div className="h-[300px] w-full">
                                                    {loading ? <Skeleton className="w-full h-full bg-white/5 rounded-2xl" /> : (
                                                        <ResponsiveContainer width="100%" height="100%">
                                                            <PieChart>
                                                                <Pie
                                                                    data={prData}
                                                                    cx="50%"
                                                                    cy="50%"
                                                                    innerRadius={70}
                                                                    outerRadius={90}
                                                                    paddingAngle={8}
                                                                    dataKey="value"
                                                                >
                                                                    {prData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />)}
                                                                </Pie>
                                                                <Tooltip
                                                                    contentStyle={{ backgroundColor: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px" }}
                                                                />
                                                                <Legend verticalAlign="bottom" height={36} />
                                                            </PieChart>
                                                        </ResponsiveContainer>
                                                    )}
                                                </div>
                                            </Card>
                                        </motion.div>
                                    </div>
                                </>
                            )}
                        </TabsContent>

                        <TabsContent value="workspace" className="space-y-8 mt-0 outline-none">
                            <motion.div variants={itemVariants} className="flex flex-col md:flex-row items-center justify-between gap-6 bg-slate-900/30 p-6 rounded-[2rem] border border-white/5">
                                <div className="relative w-full md:w-96">
                                    <Input
                                        placeholder="Search projects..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="bg-slate-950/50 border-white/10 rounded-xl pl-10 h-12"
                                    />
                                    <Users className="absolute left-3.5 top-4 w-5 h-5 text-slate-500" />
                                </div>
                                <div className="flex gap-4 w-full md:w-auto">
                                    <Button variant="outline" className="flex-1 bg-white/5 border-white/10 rounded-xl h-12 hover:bg-white/10">
                                        <Upload className="w-4 h-4 mr-2" /> Import
                                    </Button>
                                    <Button onClick={() => setShowNewProjectDialog(true)} className="flex-1 bg-indigo-600 hover:bg-indigo-500 rounded-xl h-12 px-8">
                                        <Plus className="w-4 h-4 mr-2" /> New Project
                                    </Button>
                                </div>
                            </motion.div>

                            {filteredProjects.length === 0 ? (
                                <motion.div variants={itemVariants} className="text-center py-24 bg-slate-900/20 rounded-[3rem] border border-dashed border-white/10">
                                    <Folder className="w-16 h-16 mx-auto mb-6 opacity-20 text-indigo-400" />
                                    <p className="text-slate-400 text-lg">No projects found. Time to create something epic!</p>
                                </motion.div>
                            ) : (
                                <motion.div
                                    variants={containerVariants}
                                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
                                >
                                    {filteredProjects.map(project => (
                                        <motion.div key={project.id} variants={itemVariants} whileHover={{ scale: 1.02 }}>
                                            <Card className="group bg-slate-950/50 border-white/5 backdrop-blur-xl rounded-[2rem] overflow-hidden transition-all hover:border-indigo-500/30 shadow-2xl">
                                                <div className="aspect-[16/10] bg-slate-900 relative overflow-hidden">
                                                    <img
                                                        src={project.thumbnail}
                                                        alt={project.name}
                                                        className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-110 opacity-60"
                                                    />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 to-transparent flex flex-col justify-end p-6">
                                                        <Badge className="w-fit mb-3 bg-indigo-600/20 text-indigo-400 border-none px-3 py-1 text-[10px] uppercase font-bold tracking-widest">{project.type}</Badge>
                                                        <h3 className="text-xl font-bold text-white group-hover:text-indigo-400 transition-colors uppercase tracking-tight">{project.name}</h3>
                                                    </div>
                                                </div>
                                                <CardContent className="p-6">
                                                    <p className="text-sm text-slate-400 line-clamp-2 h-10 mb-6 leading-relaxed">{project.description}</p>
                                                    <div className="flex gap-3">
                                                        <Link href={project.type === 'mobile' ? `/mobile-builder` : `/playground/${project.id}`} className="flex-1">
                                                            <Button className="w-full h-11 bg-indigo-600 hover:bg-indigo-500 rounded-2xl text-xs font-bold" variant="default">
                                                                <FileCode className="w-4 h-4 mr-2" /> REVEAL IDE
                                                            </Button>
                                                        </Link>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-11 w-11 rounded-2xl bg-white/5 hover:bg-red-500/10 hover:text-red-500 transition-all border border-white/5"
                                                            onClick={() => handleDeleteProject(project.id)}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </motion.div>
                                    ))}
                                </motion.div>
                            )}
                        </TabsContent>
                    </Tabs>
                </div>

                {/* Dialogs */}
                <Dialog open={showNewProjectDialog} onOpenChange={setShowNewProjectDialog}>
                    <DialogContent className="bg-slate-900 border-white/10 text-white rounded-[2rem]">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-bold">Forge New Reality</DialogTitle>
                            <DialogDescription className="text-slate-400 font-medium">Start a new development project from scratch or a template.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-6 py-4">
                            <div className="space-y-2">
                                <Label className="text-xs uppercase tracking-widest text-slate-500 font-bold ml-1">Project Name</Label>
                                <Input
                                    value={newProject.name}
                                    onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                                    placeholder="e.g. My Awesome App"
                                    className="bg-slate-950/50 border-white/10 rounded-xl h-12"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs uppercase tracking-widest text-slate-500 font-bold ml-1">Vision Statement</Label>
                                <Textarea
                                    value={newProject.description}
                                    onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                                    placeholder="Describe your vision..."
                                    className="bg-slate-950/50 border-white/10 rounded-xl min-h-[100px]"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs uppercase tracking-widest text-slate-500 font-bold ml-1">Evolution Path</Label>
                                <Select value={newProject.type} onValueChange={(v) => setNewProject({ ...newProject, type: v })}>
                                    <SelectTrigger className="bg-slate-950/50 border-white/10 rounded-xl h-12"><SelectValue /></SelectTrigger>
                                    <SelectContent className="bg-slate-900 border-white/10 text-white">
                                        <SelectItem value="web">Web Application (React/Next.js)</SelectItem>
                                        <SelectItem value="mobile">Mobile Application (React Native/Expo)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter className="gap-2">
                            <Button variant="ghost" onClick={() => setShowNewProjectDialog(false)} className="rounded-xl h-12 px-6">Cancel</Button>
                            <Button onClick={handleCreateProject} className="bg-indigo-600 hover:bg-indigo-500 rounded-xl h-12 px-8">Construct Project</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Hotspot Dialog */}
                <Dialog open={!!selectedHotspot} onOpenChange={() => setSelectedHotspot(null)}>
                    <DialogContent className="max-w-2xl bg-slate-900 border-white/10 text-white rounded-[2rem]">
                        <DialogHeader>
                            <DialogTitle className="font-mono text-sm bg-indigo-500/10 p-2 rounded-lg text-indigo-400 border border-indigo-500/20">{selectedHotspot?.path}</DialogTitle>
                            <DialogDescription className="text-slate-400">AI Component Analysis & Risk Assessment</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-8 py-4">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="bg-white/5 p-6 rounded-3xl border border-white/5">
                                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Commit Volatility</p>
                                    <p className="text-4xl font-bold">{selectedHotspot?.commitCount}</p>
                                </div>
                                <div className="bg-white/5 p-6 rounded-3xl border border-white/5">
                                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Risk Entropy</p>
                                    <p className="text-4xl font-bold text-amber-400">{selectedHotspot?.riskScore}/10</p>
                                </div>
                            </div>
                            {selectedHotspot?.analysis && (
                                <div className="p-6 bg-slate-950/50 rounded-3xl border border-white/5 border-dashed">
                                    <p className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-3">Agent Intelligence Summary</p>
                                    <p className="text-sm text-slate-300 leading-relaxed font-medium">{selectedHotspot.analysis}</p>
                                </div>
                            )}
                        </div>
                    </DialogContent>
                </Dialog>
            </motion.div>
        </div>
    );
}
