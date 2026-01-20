import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { db } from "@/lib/db";
import { useToast } from "@/hooks/use-toast";
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
  Zap,
  Plus
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

interface Comment {
  id: string;
  projectId: string;
  author: {
    name: string;
    avatar?: string;
    username: string;
  };
  content: string;
  createdAt: Date;
  likes: number;
}

interface LeaderboardEntry {
  id: string;
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

// Mock data for seeding
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
    id: "1",
    rank: 1,
    user: { name: "Sarah Chen", username: "sarahdev", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=sarah" },
    score: 2450,
    badges: ["Top Contributor", "AI Expert", "Mentor"],
    projectsCount: 12,
    totalStars: 1847
  },
  {
    id: "2",
    rank: 2,
    user: { name: "Marcus Rodriguez", username: "marcuscode", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=marcus" },
    score: 2130,
    badges: ["Real-time Specialist", "Community Favorite"],
    projectsCount: 8,
    totalStars: 1456
  },
  {
    id: "3",
    rank: 3,
    user: { name: "Emma Thompson", username: "emmathompson", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=emma" },
    score: 1980,
    badges: ["Data Science Pro", "Visualizer"],
    projectsCount: 6,
    totalStars: 1234
  }
];

export function CommunityHub() {
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("stars");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [newProject, setNewProject] = useState<Partial<Project>>({
    title: "",
    description: "",
    category: "Web App",
    tags: [],
    techStack: []
  });
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [localProjects, setLocalProjects] = useState<any[]>([]);
  const [selectedLocalProject, setSelectedLocalProject] = useState<string>("");

  useEffect(() => {
    loadData();
    loadLocalProjects();
  }, []);

  const loadLocalProjects = async () => {
      try {
          const projects = await db.getAll('projects');
          setLocalProjects(projects);
      } catch (e) {
          console.error("Failed to load local projects", e);
      }
  };

  const loadData = async () => {
    try {
      let loadedProjects = await db.getAll<Project>('community_projects');
      let loadedUsers = await db.getAll<LeaderboardEntry>('community_users');
      let loadedComments = await db.getAll<Comment>('community_comments');

      if (loadedProjects.length === 0) {
        // Seed data
        for (const p of MOCK_PROJECTS) {
            await db.put('community_projects', p);
        }
        loadedProjects = MOCK_PROJECTS;
      }
      
      if (loadedUsers.length === 0) {
         for (const u of MOCK_LEADERBOARD) {
            await db.put('community_users', u);
         }
         loadedUsers = MOCK_LEADERBOARD;
      }

      setProjects(loadedProjects);
      setLeaderboard(loadedUsers);
      setComments(loadedComments);
    } catch (error) {
      console.error("Failed to load community data:", error);
      toast({
        title: "Error",
        description: "Failed to load community data. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handlePostComment = async () => {
      if (!selectedProject || !newComment.trim()) return;

      const comment: Comment = {
          id: Date.now().toString(),
          projectId: selectedProject.id,
          author: {
              name: "You",
              username: "current-user",
              avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=current"
          },
          content: newComment,
          createdAt: new Date(),
          likes: 0
      };

      try {
          await db.put('community_comments', comment);
          setComments(prev => [...prev, comment]);
          setNewComment("");
          toast({ title: "Comment posted", description: "Your comment has been added." });
      } catch (e) {
          console.error(e);
          toast({ title: "Error", description: "Failed to post comment", variant: "destructive" });
      }
  };

  const calculateTrendingScore = (p: Project) => {
    // Trending algorithm: (views×0.3 + stars×0.5 + forks×0.2) with time decay
    const baseScore = (p.views * 0.3) + (p.stars * 0.5) + (p.forks * 0.2);
    const daysSinceCreation = (Date.now() - new Date(p.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    // Simple decay: score / (days + 1)
    return baseScore / (daysSinceCreation + 1);
  };

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
        case "recent": return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        case "trending": return calculateTrendingScore(b) - calculateTrendingScore(a);
        default: return 0;
      }
    });

  const categories = ["all", ...Array.from(new Set(projects.map(p => p.category)))];

  const handleStar = async (projectId: string) => {
    try {
      const project = projects.find(p => p.id === projectId);
      if (!project) return;
      
      const updatedProject = { ...project, stars: project.stars + 1 };
      await db.put('community_projects', updatedProject);
      
      setProjects(prev => prev.map(p =>
        p.id === projectId ? updatedProject : p
      ));
      
      toast({ title: "Starred!", description: "Project added to your favorites." });
    } catch (e) {
      console.error(e);
    }
  };

  const handleFork = async (project: Project) => {
    try {
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

        await db.put('community_projects', forkedProject);
        
        // Update original project fork count
        const originalUpdated = { ...project, forks: project.forks + 1 };
        await db.put('community_projects', originalUpdated);

        setProjects(prev => [forkedProject, ...prev.map(p => p.id === project.id ? originalUpdated : p)]);
        
        toast({ title: "Forked!", description: "Project forked successfully to your workspace." });
    } catch (e) {
        console.error(e);
    }
  };

  const handlePublish = async () => {
    if (!newProject.title || !newProject.description) {
        toast({ title: "Error", description: "Title and description are required", variant: "destructive" });
        return;
    }

    // If a local project is selected, use its files/structure (in a real app)
    // For now, we just link the ID or metadata
    
    const project: Project = {
        id: Date.now().toString(),
        title: newProject.title,
        description: newProject.description,
        author: {
            name: "You",
            username: "current-user",
            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=current"
        },
        tags: newProject.tags || [],
        stars: 0,
        forks: 0,
        views: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        isLive: false,
        category: newProject.category || "Web App",
        techStack: newProject.techStack || []
    };

    try {
        await db.put('community_projects', project);
        setProjects(prev => [project, ...prev]);
        setShowPublishDialog(false);
        setNewProject({ title: "", description: "", category: "Web App", tags: [], techStack: [] });
        setSelectedLocalProject("");
        toast({ title: "Published!", description: "Your project is now live in the community." });
    } catch (e) {
        console.error(e);
        toast({ title: "Error", description: "Failed to publish project", variant: "destructive" });
    }
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
          <Button onClick={() => setShowPublishDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Publish Project
          </Button>
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

      {/* Publish Project Dialog */}
      <Dialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publish New Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {localProjects.length > 0 && (
                <div className="space-y-2">
                    <Label>Import from Workspace (Optional)</Label>
                    <Select
                        value={selectedLocalProject}
                        onValueChange={(val) => {
                            setSelectedLocalProject(val);
                            const p = localProjects.find(lp => lp.id === val);
                            if (p) {
                                setNewProject({
                                    ...newProject,
                                    title: p.name,
                                    description: p.description || "",
                                    category: p.type === 'mobile' ? 'Mobile App' : 'Web App'
                                });
                            }
                        }}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select a project..." />
                        </SelectTrigger>
                        <SelectContent>
                            {localProjects.map(p => (
                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}
            <div className="space-y-2">
              <Label>Project Title</Label>
              <Input
                placeholder="My Awesome Project"
                value={newProject.title}
                onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Describe your project..."
                value={newProject.description}
                onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={newProject.category}
                onValueChange={(value) => setNewProject({ ...newProject, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Web App">Web App</SelectItem>
                  <SelectItem value="Mobile App">Mobile App</SelectItem>
                  <SelectItem value="Library">Library</SelectItem>
                  <SelectItem value="Tool">Tool</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPublishDialog(false)}>Cancel</Button>
            <Button onClick={handlePublish}>Publish</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    Comments
                  </h3>
                  
                  <ScrollArea className="h-[200px] mb-4 pr-4">
                    <div className="space-y-4">
                      {comments.filter(c => c.projectId === selectedProject.id).map(comment => (
                        <div key={comment.id} className="flex gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={comment.author.avatar} />
                            <AvatarFallback>{comment.author.name[0]}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-sm">{comment.author.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(comment.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">{comment.content}</p>
                          </div>
                        </div>
                      ))}
                      {comments.filter(c => c.projectId === selectedProject.id).length === 0 && (
                        <div className="text-center text-muted-foreground py-8">
                          No comments yet. Be the first to share your thoughts!
                        </div>
                      )}
                    </div>
                  </ScrollArea>

                  <div className="flex gap-2">
                    <Input 
                      placeholder="Add a comment..." 
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handlePostComment()}
                    />
                    <Button onClick={handlePostComment} size="icon">
                      <MessageSquare className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}