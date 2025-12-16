import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Star,
  GitFork,
  Eye,
  TrendingUp,
  Trophy,
  Users,
  Search,
  Filter,
  ExternalLink,
  Heart,
  MessageSquare,
  Play,
  Code,
  Globe,
  Zap
} from "lucide-react";

interface Project {
  id: string;
  title: string;
  description: string;
  author: {
    name: string;
    avatar?: string;
    username: string;
  };
  tags: string[];
  stars: number;
  forks: number;
  views: number;
  liveUrl?: string;
  githubUrl?: string;
  thumbnail?: string;
  createdAt: Date;
  updatedAt: Date;
  isLive: boolean;
  category: string;
  techStack: string[];
}

interface LeaderboardEntry {
  rank: number;
  user: {
    name: string;
    avatar?: string;
    username: string;
  };
  score: number;
  badges: string[];
  projectsCount: number;
  totalStars: number;
}

// Mock data for demonstration
const MOCK_PROJECTS: Project[] = [
  {
    id: "1",
    title: "AI-Powered Task Manager",
    description: "A smart task management app with AI prioritization and natural language processing.",
    author: {
      name: "Sarah Chen",
      username: "sarahdev",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=sarah"
    },
    tags: ["React", "AI", "Productivity"],
    stars: 247,
    forks: 89,
    views: 1543,
    liveUrl: "https://ai-task-manager.demo",
    githubUrl: "https://github.com/sarahdev/ai-task-manager",
    isLive: true,
    category: "Productivity",
    techStack: ["React", "Node.js", "OpenAI", "MongoDB"],
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2024-01-20")
  },
  {
    id: "2",
    title: "Real-time Chat Platform",
    description: "Scalable chat application with real-time messaging, file sharing, and AI moderation.",
    author: {
      name: "Marcus Rodriguez",
      username: "marcuscode",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=marcus"
    },
    tags: ["WebSocket", "Real-time", "Chat"],
    stars: 189,
    forks: 67,
    views: 982,
    liveUrl: "https://chat-platform.demo",
    isLive: true,
    category: "Communication",
    techStack: ["React", "Socket.io", "Express", "Redis"],
    createdAt: new Date("2024-01-10"),
    updatedAt: new Date("2024-01-18")
  },
  {
    id: "3",
    title: "Data Visualization Dashboard",
    description: "Interactive dashboard for data analysis with AI-powered insights and recommendations.",
    author: {
      name: "Emma Thompson",
      username: "emmathompson",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=emma"
    },
    tags: ["Data", "Visualization", "Analytics"],
    stars: 156,
    forks: 43,
    views: 734,
    liveUrl: "https://data-dashboard.demo",
    isLive: true,
    category: "Analytics",
    techStack: ["D3.js", "Python", "FastAPI", "PostgreSQL"],
    createdAt: new Date("2024-01-08"),
    updatedAt: new Date("2024-01-16")
  }
];

const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  {
    rank: 1,
    user: { name: "Sarah Chen", username: "sarahdev", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=sarah" },
    score: 2450,
    badges: ["Top Contributor", "AI Expert", "Mentor"],
    projectsCount: 12,
    totalStars: 1847
  },
  {
    rank: 2,
    user: { name: "Marcus Rodriguez", username: "marcuscode", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=marcus" },
    score: 2130,
    badges: ["Real-time Specialist", "Community Favorite"],
    projectsCount: 8,
    totalStars: 1456
  },
  {
    rank: 3,
    user: { name: "Emma Thompson", username: "emmathompson", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=emma" },
    score: 1980,
    badges: ["Data Science Pro", "Visualizer"],
    projectsCount: 6,
    totalStars: 1234
  }
];

export function CommunityHub() {
  const [projects, setProjects] = useState<Project[]>(MOCK_PROJECTS);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(MOCK_LEADERBOARD);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("stars");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const filteredProjects = projects
    .filter(project =>
      project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .filter(project => selectedCategory === "all" || project.category === selectedCategory)
    .sort((a, b) => {
      switch (sortBy) {
        case "stars": return b.stars - a.stars;
        case "views": return b.views - a.views;
        case "recent": return b.updatedAt.getTime() - a.updatedAt.getTime();
        default: return 0;
      }
    });

  const categories = ["all", ...Array.from(new Set(projects.map(p => p.category)))];

  const handleStar = (projectId: string) => {
    setProjects(prev => prev.map(p =>
      p.id === projectId ? { ...p, stars: p.stars + 1 } : p
    ));
  };

  const handleFork = async (project: Project) => {
    // Simulate forking
    const forkedProject: Project = {
      ...project,
      id: Date.now().toString(),
      title: `${project.title} (Fork)`,
      author: {
        name: "You",
        username: "current-user",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=current"
      },
      stars: 0,
      forks: 0,
      views: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    setProjects(prev => [forkedProject, ...prev]);
    alert("Project forked successfully!");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Community Hub</h1>
          <p className="text-muted-foreground">Discover, fork, and contribute to amazing projects</p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="secondary" className="text-sm">
            <Users className="w-4 h-4 mr-1" />
            {projects.length} Projects
          </Badge>
          <Badge variant="secondary" className="text-sm">
            <Trophy className="w-4 h-4 mr-1" />
            {leaderboard.length} Contributors
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="projects" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="projects" className="flex items-center gap-2">
            <Code className="w-4 h-4" />
            Projects
          </TabsTrigger>
          <TabsTrigger value="trending" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Trending
          </TabsTrigger>
          <TabsTrigger value="leaderboard" className="flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            Leaderboard
          </TabsTrigger>
          <TabsTrigger value="live" className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Live Demos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="projects" className="mt-6">
          {/* Search and Filters */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search projects, tags, or authors..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(category => (
                      <SelectItem key={category} value={category}>
                        {category === "all" ? "All Categories" : category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stars">Stars</SelectItem>
                    <SelectItem value="views">Views</SelectItem>
                    <SelectItem value="recent">Recent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Projects Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <Card key={project.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg line-clamp-1">{project.title}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Avatar className="w-6 h-6">
                          <AvatarImage src={project.author.avatar} />
                          <AvatarFallback>{project.author.name[0]}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm text-muted-foreground">{project.author.username}</span>
                      </div>
                    </div>
                    {project.isLive && (
                      <Badge variant="secondary" className="text-xs">
                        <Zap className="w-3 h-3 mr-1" />
                        Live
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {project.description}
                  </p>

                  <div className="flex flex-wrap gap-1 mb-4">
                    {project.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4" />
                        {project.stars}
                      </div>
                      <div className="flex items-center gap-1">
                        <GitFork className="w-4 h-4" />
                        {project.forks}
                      </div>
                      <div className="flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        {project.views}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleStar(project.id)}>
                      <Star className="w-4 h-4 mr-1" />
                      Star
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleFork(project)}>
                      <GitFork className="w-4 h-4 mr-1" />
                      Fork
                    </Button>
                    {project.liveUrl && (
                      <Button size="sm" asChild>
                        <a href={project.liveUrl} target="_blank" rel="noopener noreferrer">
                          <Play className="w-4 h-4 mr-1" />
                          Demo
                        </a>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="leaderboard" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                Top Contributors
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {leaderboard.map((entry) => (
                  <div key={entry.rank} className="flex items-center gap-4 p-4 border rounded-lg">
                    <div className="flex items-center justify-center w-8 h-8 bg-primary text-primary-foreground rounded-full font-bold text-sm">
                      {entry.rank}
                    </div>

                    <Avatar className="w-12 h-12">
                      <AvatarImage src={entry.user.avatar} />
                      <AvatarFallback>{entry.user.name[0]}</AvatarFallback>
                    </Avatar>

                    <div className="flex-1">
                      <div className="font-medium">{entry.user.name}</div>
                      <div className="text-sm text-muted-foreground">@{entry.user.username}</div>
                      <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
                        <span>{entry.projectsCount} projects</span>
                        <span>{entry.totalStars} stars</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary">{entry.score.toLocaleString()}</div>
                      <div className="text-sm text-muted-foreground">points</div>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {entry.badges.map((badge) => (
                        <Badge key={badge} variant="secondary" className="text-xs">
                          {badge}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="live" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.filter(p => p.isLive).map((project) => (
              <Card key={project.id} className="overflow-hidden">
                <div className="aspect-video bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center">
                  <div className="text-center">
                    <Globe className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                    <div className="text-sm font-medium">{project.title}</div>
                  </div>
                </div>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="secondary">
                      <Zap className="w-3 h-3 mr-1" />
                      Live Demo
                    </Badge>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Eye className="w-4 h-4" />
                      {project.views}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {project.description}
                  </p>
                  <Button className="w-full" asChild>
                    <a href={project.liveUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Open Live Demo
                    </a>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="trending" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>🔥 Hot This Week</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {projects
                    .sort((a, b) => b.stars - a.stars)
                    .slice(0, 5)
                    .map((project, index) => (
                      <div key={project.id} className="flex items-center gap-3">
                        <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium line-clamp-1">{project.title}</div>
                          <div className="text-sm text-muted-foreground">
                            {project.stars} stars • by {project.author.username}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>🚀 Rising Stars</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {projects
                    .sort((a, b) => b.views - a.views)
                    .slice(0, 5)
                    .map((project, index) => (
                      <div key={project.id} className="flex items-center gap-3">
                        <TrendingUp className="w-5 h-5 text-green-500" />
                        <div className="flex-1">
                          <div className="font-medium line-clamp-1">{project.title}</div>
                          <div className="text-sm text-muted-foreground">
                            {project.views} views • by {project.author.username}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Project Detail Dialog */}
      <Dialog open={!!selectedProject} onOpenChange={() => setSelectedProject(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          {selectedProject && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Code className="w-5 h-5" />
                  {selectedProject.title}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={selectedProject.author.avatar} />
                    <AvatarFallback>{selectedProject.author.name[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{selectedProject.author.name}</div>
                    <div className="text-sm text-muted-foreground">@{selectedProject.author.username}</div>
                  </div>
                </div>

                <p className="text-muted-foreground">{selectedProject.description}</p>

                <div className="flex flex-wrap gap-2">
                  {selectedProject.techStack.map((tech) => (
                    <Badge key={tech} variant="secondary">{tech}</Badge>
                  ))}
                </div>

                <div className="flex gap-4">
                  <Button onClick={() => handleStar(selectedProject.id)}>
                    <Star className="w-4 h-4 mr-2" />
                    Star ({selectedProject.stars})
                  </Button>
                  <Button variant="outline" onClick={() => handleFork(selectedProject)}>
                    <GitFork className="w-4 h-4 mr-2" />
                    Fork ({selectedProject.forks})
                  </Button>
                  {selectedProject.liveUrl && (
                    <Button asChild>
                      <a href={selectedProject.liveUrl} target="_blank" rel="noopener noreferrer">
                        <Play className="w-4 h-4 mr-2" />
                        Live Demo
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}