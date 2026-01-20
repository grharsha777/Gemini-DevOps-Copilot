import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Trophy, Zap, Globe, Github, Server } from "lucide-react";

interface LeaderboardEntry {
    rank: number;
    user: string;
    points: number;
    deploys: number;
    successRate: number;
    avatar?: string;
}

export function DevOpsLeaderboard() {
    const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Simulate real-time data or fetch from API
        const fetchLeaders = async () => {
            try {
                // In a real app, this would be: await fetch('/api/devops/leaderboard')
                // Mocking for now
                const mockLeaders: LeaderboardEntry[] = [
                    { rank: 1, user: "Harsha", points: 2540, deploys: 42, successRate: 98 },
                    { rank: 2, user: "DevNexus", points: 2100, deploys: 36, successRate: 95 },
                    { rank: 3, user: "CloudRunner", points: 1850, deploys: 31, successRate: 92 },
                    { rank: 4, user: "CodeVortex_AI", points: 1200, deploys: 20, successRate: 100 },
                    { rank: 5, user: "ByteSlayer", points: 950, deploys: 15, successRate: 88 },
                ];
                setLeaders(mockLeaders);
            } catch (e) {
                console.error(e);
            } finally {
                setIsLoading(false);
            }
        };

        fetchLeaders();
    }, []);

    return (
        <Card className="bg-slate-900/40 border-slate-800 backdrop-blur-xl">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                    <Trophy className="text-yellow-500 w-6 h-6" />
                    DevOps Elite Leaderboard
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {leaders.map((entry) => (
                        <div
                            key={entry.user}
                            className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${entry.user === "Harsha"
                                    ? "bg-indigo-600/10 border-indigo-500/50"
                                    : "bg-slate-800/20 border-slate-800 hover:border-slate-700"
                                }`}
                        >
                            <div className="flex items-center justify-center w-8 h-8 font-bold text-lg text-slate-500">
                                #{entry.rank}
                            </div>
                            <Avatar className="w-10 h-10 border-2 border-slate-800">
                                <AvatarFallback>{entry.user[0]}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-200 truncate">{entry.user}</span>
                                    {entry.user === "Harsha" && (
                                        <Badge variant="secondary" className="bg-indigo-600 text-[10px] h-4">
                                            PRO
                                        </Badge>
                                    )}
                                </div>
                                <div className="flex items-center gap-4 mt-1">
                                    <span className="text-xs text-slate-500 flex items-center gap-1">
                                        <Zap className="w-3 h-3" /> {entry.points} pts
                                    </span>
                                    <span className="text-xs text-slate-500 flex items-center gap-1">
                                        <Server className="w-3 h-3" /> {entry.deploys} deploys
                                    </span>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-lg font-bold text-emerald-400">{entry.successRate}%</div>
                                <div className="text-[10px] uppercase tracking-tighter text-slate-600">
                                    Uptime/Success
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
