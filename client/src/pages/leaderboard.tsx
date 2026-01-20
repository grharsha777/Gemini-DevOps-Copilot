import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area,
} from "recharts";
import {
    Trophy,
    Users,
    Zap,
    TrendingUp,
    Github,
    Award,
    Star,
    GitPullRequest,
    CheckCircle,
    Clock,
    ChevronUp,
    Search,
    Filter,
} from "lucide-react";
import { Input } from "@/components/ui/input";

interface LeaderboardUser {
    rank: number;
    name: string;
    avatar: string;
    username: string;
    commits: number;
    prs: number;
    stars: number;
    score: number;
    trend: "up" | "down" | "stable";
}


const MOCK_CHART_DATA = [
    { name: "Mon", commits: 45, prs: 12 },
    { name: "Tue", commits: 52, prs: 8 },
    { name: "Wed", commits: 48, prs: 15 },
    { name: "Thu", commits: 70, prs: 20 },
    { name: "Fri", commits: 61, prs: 18 },
    { name: "Sat", commits: 35, prs: 5 },
    { name: "Sun", commits: 28, prs: 4 },
];

export default function LeaderboardPage() {
    const [activeFilter, setActiveFilter] = useState("all-time");
    const [searchQuery, setSearchQuery] = useState("");
    const [leaders, setLeaders] = useState<LeaderboardUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchLeaders = async () => {
            try {
                const res = await fetch("/api/devops/leaderboard");
                const data = await res.json();
                if (data.success) {
                    setLeaders(data.leaders);
                }
            } catch (err) {
                console.error("Failed to fetch leaders", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchLeaders();
    }, []);

    const filteredUsers = leaders.filter(user =>
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.username.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-[#020617] text-slate-100 font-outfit pb-20">
            <div className="max-w-7xl mx-auto px-6 pt-12 space-y-12">
                {/* Header Section */}
                <section className="relative">
                    <div className="absolute top-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[120px] -z-10" />
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div className="space-y-2">
                            <Badge variant="outline" className="border-indigo-500/30 text-indigo-400 bg-indigo-500/5 px-3 py-1">
                                <Trophy className="w-3 h-3 mr-2" />
                                Global Hall of Fame
                            </Badge>
                            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white flex items-center gap-4">
                                DevOps Leaderboard
                            </h1>
                            <p className="text-slate-400 max-w-lg text-lg leading-relaxed">
                                Celebrating the most impactful contributors in the Code Vortex ecosystem.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <Button variant="outline" className="bg-slate-900/50 border-slate-800">
                                <Github className="w-4 h-4 mr-2" /> Connect GitHub
                            </Button>
                            <Button className="bg-indigo-600 hover:bg-indigo-500 shadow-xl shadow-indigo-500/20">
                                Claim Reward
                            </Button>
                        </div>
                    </div>
                </section>

                {/* Top 3 Podium Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {leaders.slice(0, 3).map((user, i) => (
                        <motion.div
                            key={user.rank}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                        >
                            <Card className="bg-slate-900/40 border-slate-800 backdrop-blur-xl relative overflow-hidden group hover:border-indigo-500/50 transition-all duration-500">
                                <div className={`absolute top-0 right-0 w-32 h-32 blur-[80px] opacity-20 -z-10 ${i === 0 ? "bg-yellow-500" : i === 1 ? "bg-slate-400" : "bg-orange-500"
                                    }`} />
                                <CardHeader className="flex flex-row items-center gap-4 pb-2">
                                    <div className="relative">
                                        <img src={user.avatar} className="w-16 h-16 rounded-2xl border-2 border-slate-800 group-hover:border-indigo-500/50 transition-all" />
                                        <div className={`absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-xl ${i === 0 ? "bg-yellow-500 text-yellow-950" : i === 1 ? "bg-slate-400 text-slate-900" : "bg-orange-500 text-orange-950"
                                            }`}>
                                            #{user.rank}
                                        </div>
                                    </div>
                                    <div>
                                        <CardTitle className="text-xl group-hover:text-white transition-colors">{user.name}</CardTitle>
                                        <CardDescription className="text-slate-500">@{user.username}</CardDescription>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex justify-between items-center bg-white/5 rounded-xl p-3 border border-white/5">
                                        <div className="text-center flex-1">
                                            <div className="text-xs text-slate-500 uppercase font-bold tracking-widest mb-1">Commits</div>
                                            <div className="text-lg font-bold text-white">{user.commits}</div>
                                        </div>
                                        <div className="w-[1px] h-8 bg-white/10" />
                                        <div className="text-center flex-1">
                                            <div className="text-xs text-slate-500 uppercase font-bold tracking-widest mb-1">Score</div>
                                            <div className="text-lg font-bold text-indigo-400">{user.score}</div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Badge variant="secondary" className="bg-white/5 text-slate-400 border-none font-medium flex-1 justify-center py-1">
                                            <Star className="w-3 h-3 mr-2" /> {user.stars}
                                        </Badge>
                                        <Badge variant="secondary" className="bg-white/5 text-slate-400 border-none font-medium flex-1 justify-center py-1">
                                            <GitPullRequest className="w-3 h-3 mr-2" /> {user.prs}
                                        </Badge>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Main Leaderboard Table */}
                    <div className="lg:col-span-8 space-y-6">
                        <Card className="bg-slate-900/40 border-slate-800 backdrop-blur-xl">
                            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-800/50 pb-6">
                                <div>
                                    <CardTitle>Global Rankings</CardTitle>
                                    <CardDescription>Performance metrics across all active learners.</CardDescription>
                                </div>
                                <div className="flex gap-2">
                                    <div className="relative w-48 hidden md:block">
                                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                                        <Input
                                            placeholder="Filter users..."
                                            className="pl-9 bg-slate-950/50 border-slate-800 h-9"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                        />
                                    </div>
                                    <Button variant="outline" size="icon" className="h-9 w-9 bg-slate-950/50 border-slate-800">
                                        <Filter className="w-4 h-4" />
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="border-slate-800 hover:bg-transparent">
                                            <TableHead className="w-[80px] text-slate-500 font-bold uppercase text-[10px] tracking-widest">Rank</TableHead>
                                            <TableHead className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">User</TableHead>
                                            <TableHead className="text-slate-500 font-bold uppercase text-[10px] tracking-widest text-right">Commits</TableHead>
                                            <TableHead className="text-slate-500 font-bold uppercase text-[10px] tracking-widest text-right">PRs</TableHead>
                                            <TableHead className="text-slate-500 font-bold uppercase text-[10px] tracking-widest text-right">Stars</TableHead>
                                            <TableHead className="text-slate-500 font-bold uppercase text-[10px] tracking-widest text-right">Vortex Score</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredUsers.map((user) => (
                                            <TableRow key={user.rank} className="border-slate-800/50 hover:bg-white/5 transition-colors group">
                                                <TableCell className="font-bold text-slate-400 group-hover:text-white transition-colors">
                                                    #{user.rank}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <img src={user.avatar} className="w-8 h-8 rounded-lg" />
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-semibold text-white">{user.name}</span>
                                                            <span className="text-xs text-slate-500">@{user.username}</span>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right text-slate-400 font-medium">{user.commits}</TableCell>
                                                <TableCell className="text-right text-slate-400 font-medium">{user.prs}</TableCell>
                                                <TableCell className="text-right text-slate-400 font-medium">{user.stars}</TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <span className="font-bold text-white">{user.score}</span>
                                                        {user.trend === "up" && <ChevronUp className="w-3 h-3 text-emerald-500" />}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Activity Insights Sidebar */}
                    <div className="lg:col-span-4 space-y-6">
                        <Card className="bg-slate-900/40 border-slate-800 backdrop-blur-xl">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                                    Activity Trends
                                </CardTitle>
                                <CardDescription>Network-wide activity over the last 7 days.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[200px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={MOCK_CHART_DATA}>
                                            <defs>
                                                <linearGradient id="colorCommits" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                                            <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                                            <YAxis hide />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                                                itemStyle={{ fontSize: '12px' }}
                                            />
                                            <Area type="monotone" dataKey="commits" stroke="#6366f1" fillOpacity={1} fill="url(#colorCommits)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="grid grid-cols-2 gap-4 mt-6">
                                    <div className="space-y-1">
                                        <div className="text-xs text-slate-500 uppercase font-bold tracking-widest">Weekly Avg</div>
                                        <div className="text-xl font-bold text-white">48.2</div>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="text-xs text-slate-500 uppercase font-bold tracking-widest">Community Pulse</div>
                                        <div className="text-xl font-bold text-emerald-400">+12%</div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-indigo-600 border-none relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 group-hover:scale-110 transition-transform duration-700" />
                            <CardHeader>
                                <CardTitle className="text-white flex items-center gap-2 text-lg">
                                    <Zap className="w-5 h-5 fill-current" />
                                    Sprint Challenge
                                </CardTitle>
                                <CardDescription className="text-indigo-100/70">Solve 5 problems this week to earn a "Speed Demon" badge.</CardDescription>
                            </CardHeader>
                            <CardContent className="relative">
                                <div className="space-y-2 mb-4">
                                    <div className="flex justify-between text-xs text-white/80 font-medium">
                                        <span>Progress</span>
                                        <span>3/5 Complete</span>
                                    </div>
                                    <div className="h-1.5 bg-indigo-900/50 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: "60%" }}
                                            className="h-full bg-white shadow-[0_0_15px_rgba(255,255,255,0.5)]"
                                        />
                                    </div>
                                </div>
                                <Button size="sm" variant="secondary" className="w-full bg-white text-indigo-600 hover:bg-slate-100 font-bold">
                                    View Challenges
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
