import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  BookOpen,
  Code2,
  Trophy,
  Flame,
  Timer,
  CheckCircle,
  ExternalLink,
  Play,
  Plus,
  Video,
  Loader2,
  GraduationCap,
  ChevronRight,
  Award,
  Youtube,
  BrainCircuit,
  Briefcase,
  MessageSquare,
  Users,
  Github,
} from "lucide-react";
import { useLocation } from "wouter";
import { db } from "@/lib/db";
import { AIService, AGENT_PROMPTS } from "@/lib/ai";
import { useToast } from "@/hooks/use-toast";
import { YouTubeService } from "@/lib/youtube";

interface Lesson {
  title: string;
  content: string;
  videoTimestamp?: string;
  completed: boolean;
  quiz?: {
    question: string;
    options: string[];
    correctAnswer: number;
  };
}

interface Module {
  title: string;
  lessons: Lesson[];
}

interface Course {
  id: string;
  title: string;
  description: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  modules: Module[];
  videoUrl?: string;
  videoInfo?: any; // YouTube video information
  progress: number;
  totalLessons: number;
  completedLessons: number;
  createdAt: Date;
}

interface SearchResult {
  id: string;
  title: string;
  description: string;
  url: string;
  thumbnail?: string;
  platform: "YouTube" | "GitHub" | "Dev.to";
  metadata?: any;
}

export default function LearningPage() {
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [activeCourse, setActiveCourse] = useState<Course | null>(null);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [generationTopic, setGenerationTopic] = useState("");
  const [generationVideoUrl, setGenerationVideoUrl] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeLesson, setActiveLesson] = useState<{
    moduleIdx: number;
    lessonIdx: number;
  } | null>(null);
  const [quizSelection, setQuizSelection] = useState<number | null>(null);

  const [problems, setProblems] = useState<any[]>([]);
  const [discoveredVideos, setDiscoveredVideos] = useState<any[]>([]);
  const [isSearchingVideos, setIsSearchingVideos] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [aggregatedResults, setAggregatedResults] = useState<SearchResult[]>([]);
  const [isSearchingAll, setIsSearchingAll] = useState(false);
  const [problemSearchQuery, setProblemSearchQuery] = useState("");
  const [isGeneratingProblems, setIsGeneratingProblems] = useState(false);

  useEffect(() => {
    loadCourses();
    loadProblems();
  }, []);

  const loadProblems = async () => {
    try {
      const res = await fetch("/api/questions/search?q=DS%20Algo");
      const data = await res.json();
      if (data.success) {
        setProblems(data.questions);
      }
    } catch (e) {
      console.error("Failed to load problems", e);
    }
  };

  const loadCourses = async () => {
    try {
      const loadedCourses = await db.getAll<Course>("courses");
      setCourses(loadedCourses);
    } catch (e) {
      console.error("Failed to load courses", e);
    }
  };

  const handleGenerateCourse = async () => {
    if (!generationTopic) {
      toast({
        title: "Error",
        description: "Please enter a topic",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      let videoInfo = null;
      let videoTranscript = null;

      // Fetch YouTube video information if URL is provided
      if (generationVideoUrl) {
        try {
          videoInfo = await YouTubeService.getVideoInfo(generationVideoUrl);
          videoTranscript =
            await YouTubeService.getVideoTranscript(generationVideoUrl);
        } catch (youtubeError) {
          console.warn(
            "YouTube fetch failed, continuing without video data:",
            youtubeError,
          );
          // Continue without video data - the course can still be generated
        }
      }

      // Enhanced prompt with video information
      let prompt = AGENT_PROMPTS.COURSE_GENERATOR(
        generationTopic,
        generationVideoUrl,
      );

      // Add video context if available
      if (videoInfo) {
        prompt += `\n\nVIDEO CONTEXT:\n`;
        prompt += `- Title: ${videoInfo.title}\n`;
        prompt += `- Description: ${videoInfo.description}\n`;
        prompt += `- Duration: ${videoInfo.duration}\n`;
        prompt += `- Channel: ${videoInfo.channelTitle}\n`;
      }

      // Add transcript if available
      if (videoTranscript) {
        prompt += `\nTRANSCRIPT SUMMARY:\n`;
        prompt += `${videoTranscript.text.substring(0, 1000)}...\n`; // Limit to first 1000 chars
      }

      const schema = `{
            "title": "string",
            "description": "string",
            "level": "string",
            "modules": [{
                "title": "string",
                "lessons": [{
                    "title": "string",
                    "content": "string",
                    "videoTimestamp": "string",
                    "quiz": {
                        "question": "string",
                        "options": ["string"],
                        "correctAnswer": 0
                    }
                }]
            }]
        }`;

      const data = await AIService.generateStructuredJSON(prompt, schema);

      // Calculate stats
      let totalLessons = 0;
      data.modules.forEach((m: any) => (totalLessons += m.lessons.length));

      const newCourse: Course = {
        id: Date.now().toString(),
        ...data,
        videoUrl: generationVideoUrl,
        videoInfo: videoInfo, // Store video info with course
        progress: 0,
        totalLessons,
        completedLessons: 0,
        createdAt: new Date(),
      };

      await db.put("courses", newCourse);
      setCourses((prev) => [newCourse, ...prev]);
      setShowGenerateDialog(false);
      setGenerationTopic("");
      setGenerationVideoUrl("");
      toast({
        title: "Success",
        description: "Course generated successfully!",
      });
    } catch (e) {
      console.error(e);
      toast({
        title: "Error",
        description: "Failed to generate course",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAggregatedSearch = async () => {
    if (!searchQuery) return;
    setIsSearchingAll(true);
    try {
      const res = await fetch(`/api/learning/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data.success) {
        setAggregatedResults(data.results);
      }
    } catch (e) {
      console.error("Failed to search all", e);
      toast({ title: "Error", description: "Failed to fetch learning resources", variant: "destructive" });
    } finally {
      setIsSearchingAll(false);
    }
  };

  const handleProblemSearch = async () => {
    if (!problemSearchQuery) return;
    setIsGeneratingProblems(true);
    try {
      const res = await fetch(`/api/questions/search?q=${encodeURIComponent(problemSearchQuery)}`);
      const data = await res.json();
      if (data.success) {
        setProblems(data.questions);
      }
    } catch (e) {
      console.error("Failed to search problems", e);
      toast({ title: "Error", description: "Failed to fetch problems", variant: "destructive" });
    } finally {
      setIsGeneratingProblems(false);
    }
  };

  const handleLessonComplete = async (
    courseId: string,
    moduleIdx: number,
    lessonIdx: number,
  ) => {
    const course = courses.find((c) => c.id === courseId);
    if (!course) return;

    // Deep copy to update
    const updatedCourse = JSON.parse(JSON.stringify(course));
    if (!updatedCourse.modules[moduleIdx].lessons[lessonIdx].completed) {
      updatedCourse.modules[moduleIdx].lessons[lessonIdx].completed = true;
      updatedCourse.completedLessons++;
      updatedCourse.progress = Math.round(
        (updatedCourse.completedLessons / updatedCourse.totalLessons) * 100,
      );

      await db.put("courses", updatedCourse);
      setCourses((prev) =>
        prev.map((c) => (c.id === courseId ? updatedCourse : c)),
      );

      if (activeCourse && activeCourse.id === courseId) {
        setActiveCourse(updatedCourse);
      }

      toast({ title: "Lesson Completed!", description: "+50 XP" });
    }
  };

  const renderActiveCourse = () => {
    if (!activeCourse) return null;

    const currentLesson = activeLesson
      ? activeCourse.modules[activeLesson.moduleIdx].lessons[
      activeLesson.lessonIdx
      ]
      : null;

    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          onClick={() => setActiveCourse(null)}
          className="mb-4"
        >
          &larr; Back to Courses
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <Card className="bg-slate-900/40 border-slate-800">
              <CardHeader>
                <CardTitle>{activeCourse.title}</CardTitle>
                <CardDescription>
                  <Progress
                    value={activeCourse.progress}
                    className="h-2 mt-2"
                  />
                  <div className="text-xs text-right mt-1">
                    {activeCourse.progress}% Complete
                  </div>
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[600px]">
                  {activeCourse.modules.map((module, mIdx) => (
                    <div
                      key={mIdx}
                      className="border-b border-slate-800 last:border-0"
                    >
                      <div className="p-3 bg-slate-900/50 font-medium text-sm text-slate-300 sticky top-0">
                        {module.title}
                      </div>
                      <div>
                        {module.lessons.map((lesson, lIdx) => (
                          <button
                            key={lIdx}
                            onClick={() => {
                              setActiveLesson({
                                moduleIdx: mIdx,
                                lessonIdx: lIdx,
                              });
                              setQuizSelection(null);
                            }}
                            className={`w-full text-left p-3 text-sm flex items-center gap-2 hover:bg-slate-800/50 transition-colors
                                                        ${activeLesson?.moduleIdx === mIdx && activeLesson?.lessonIdx === lIdx ? "bg-indigo-900/20 text-indigo-400 border-l-2 border-indigo-500" : "text-slate-400"}
                                                    `}
                          >
                            {lesson.completed ? (
                              <CheckCircle className="w-4 h-4 text-emerald-500" />
                            ) : (
                              <div className="w-4 h-4 rounded-full border border-slate-600" />
                            )}
                            <span className="truncate">{lesson.title}</span>
                            {lesson.videoTimestamp && (
                              <Video className="w-3 h-3 ml-auto opacity-50" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            {currentLesson ? (
              <Card className="bg-slate-900/40 border-slate-800 h-full">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {currentLesson.title}
                    {activeCourse.videoUrl && currentLesson.videoTimestamp && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          window.open(
                            `${activeCourse.videoUrl}&t=${currentLesson.videoTimestamp}`,
                            "_blank",
                          )
                        }
                      >
                        <Youtube className="w-4 h-4 mr-2 text-red-500" />
                        Watch Video
                      </Button>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="prose prose-invert max-w-none">
                    <p className="whitespace-pre-wrap">
                      {currentLesson.content}
                    </p>
                  </div>

                  {currentLesson.quiz && (
                    <div className="mt-8 p-6 bg-slate-900/50 rounded-lg border border-slate-800">
                      <h3 className="font-bold mb-4 flex items-center gap-2">
                        <Award className="w-5 h-5 text-yellow-500" />
                        Knowledge Check
                      </h3>
                      <p className="mb-4">{currentLesson.quiz.question}</p>
                      <div className="space-y-2">
                        {currentLesson.quiz.options.map((option, idx) => (
                          <button
                            key={idx}
                            onClick={() => setQuizSelection(idx)}
                            className={`w-full text-left p-3 rounded border transition-all
                                                        ${quizSelection === idx
                                ? idx ===
                                  currentLesson
                                    .quiz!
                                    .correctAnswer
                                  ? "bg-emerald-900/20 border-emerald-500"
                                  : "bg-red-900/20 border-red-500"
                                : "border-slate-700 hover:bg-slate-800"
                              }
                                                    `}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                      {quizSelection !== null && (
                        <div className="mt-4">
                          {quizSelection ===
                            currentLesson.quiz.correctAnswer ? (
                            <div className="text-emerald-400 flex items-center gap-2">
                              <CheckCircle className="w-4 h-4" /> Correct!
                              {!currentLesson.completed && (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="ml-4"
                                  onClick={() =>
                                    handleLessonComplete(
                                      activeCourse.id,
                                      activeLesson!.moduleIdx,
                                      activeLesson!.lessonIdx,
                                    )
                                  }
                                >
                                  Mark Complete
                                </Button>
                              )}
                            </div>
                          ) : (
                            <div className="text-red-400">Try again</div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {!currentLesson.quiz && !currentLesson.completed && (
                    <Button
                      className="w-full mt-8"
                      onClick={() =>
                        handleLessonComplete(
                          activeCourse.id,
                          activeLesson!.moduleIdx,
                          activeLesson!.lessonIdx,
                        )
                      }
                    >
                      Mark Lesson Complete
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 p-12">
                <BookOpen className="w-16 h-16 mb-4 opacity-20" />
                <p>Select a lesson to start learning</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (activeCourse) {
    return (
      <div className="min-h-screen bg-[#0b0e14] text-slate-300 p-8 font-sans">
        <div className="max-w-7xl mx-auto">{renderActiveCourse()}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0e14] text-slate-300 p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <BookOpen className="text-indigo-500" /> Learning Center
            </h1>
            <p className="text-slate-400 mt-2">
              Master algorithms, system design, and DevOps patterns.
            </p>
          </div>
          <div className="flex gap-4">
            <Card className="bg-slate-900/50 border-slate-800 p-3 flex items-center gap-3">
              <Flame className="text-orange-500" />
              <div>
                <div className="text-lg font-bold text-white">12</div>
                <div className="text-[10px] uppercase tracking-wider text-slate-500">
                  Day Streak
                </div>
              </div>
            </Card>
            <Card className="bg-slate-900/50 border-slate-800 p-3 flex items-center gap-3">
              <Trophy className="text-yellow-500" />
              <div>
                <div className="text-lg font-bold text-white">1,450</div>
                <div className="text-[10px] uppercase tracking-wider text-slate-500">
                  XP Points
                </div>
              </div>
            </Card>
          </div>
        </header>

        <Tabs defaultValue="courses" className="w-full">
          <TabsList className="bg-slate-900/50 border-slate-800">
            <TabsTrigger value="courses">Courses</TabsTrigger>
            <TabsTrigger value="resources">Resources</TabsTrigger>
            <TabsTrigger value="problems">Problem Set</TabsTrigger>
            <TabsTrigger value="interview">Interview Prep</TabsTrigger>
          </TabsList>

          <TabsContent value="courses" className="mt-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-white">Your Courses</h2>
              <Button
                onClick={() => setShowGenerateDialog(true)}
                className="bg-indigo-600 hover:bg-indigo-500"
              >
                <Plus className="w-4 h-4 mr-2" />
                Generate Course
              </Button>
            </div>

            {courses.length === 0 ? (
              <Card className="bg-slate-900/40 border-slate-800 p-12 text-center">
                <GraduationCap className="w-16 h-16 mx-auto text-slate-600 mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">
                  No courses yet
                </h3>
                <p className="text-slate-400 mb-6">
                  Generate a custom AI course from any topic or video.
                </p>
                <Button onClick={() => setShowGenerateDialog(true)}>
                  Get Started
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.map((course) => (
                  <Card
                    key={course.id}
                    className="bg-slate-900/40 border-slate-800 hover:border-indigo-500/50 transition-all cursor-pointer group"
                    onClick={() => {
                      setActiveCourse(course);
                      setActiveLesson(null);
                    }}
                  >
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <Badge
                          variant="outline"
                          className="border-indigo-500/30 text-indigo-400 mb-2"
                        >
                          {course.level}
                        </Badge>
                        {course.videoUrl && (
                          <Youtube className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                      <CardTitle className="text-white group-hover:text-indigo-400 transition-colors">
                        {course.title}
                      </CardTitle>
                      <CardDescription className="line-clamp-2">
                        {course.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs text-slate-400">
                          <span>
                            {course.completedLessons}/{course.totalLessons}{" "}
                            Lessons
                          </span>
                          <span>{course.progress}%</span>
                        </div>
                        <Progress value={course.progress} className="h-1.5" />
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button
                        variant="ghost"
                        className="w-full group-hover:bg-indigo-900/20"
                      >
                        Continue Learning{" "}
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="resources" className="mt-6 space-y-6">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Input
                  placeholder="Search across YouTube, GitHub, and Dev.to..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAggregatedSearch()}
                  className="bg-slate-900/50 border-slate-800 pl-10"
                />
                <BrainCircuit className="absolute left-3 top-2.5 w-5 h-5 text-slate-500" />
              </div>
              <Button onClick={handleAggregatedSearch} disabled={isSearchingAll}>
                {isSearchingAll ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
                Research
              </Button>
            </div>

            {aggregatedResults.length === 0 && !isSearchingAll ? (
              <div className="text-center py-20 bg-slate-900/20 rounded-3xl border border-dashed border-white/5">
                <Users className="w-16 h-16 mx-auto mb-4 opacity-10" />
                <p className="text-slate-500">Discover knowledge from around the web.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {aggregatedResults.map((res) => (
                  <Card key={res.id} className="bg-slate-900/40 border-slate-800 hover:border-indigo-500/30 transition-all flex flex-col">
                    <div className="aspect-video bg-slate-950 relative overflow-hidden rounded-t-xl group">
                      {res.thumbnail ? (
                        <img src={res.thumbnail} className="w-full h-full object-cover transition-transform group-hover:scale-105" alt={res.title} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center opacity-20">
                          {res.platform === "GitHub" ? <Github className="w-12 h-12" /> : <BookOpen className="w-12 h-12" />}
                        </div>
                      )}
                      <div className="absolute top-2 right-2">
                        <Badge className={`
                                        ${res.platform === "YouTube" ? "bg-red-600/20 text-red-400" :
                            res.platform === "GitHub" ? "bg-indigo-600/20 text-indigo-400" :
                              "bg-emerald-600/20 text-emerald-400"}
                                        border-none
                                    `}>
                          {res.platform}
                        </Badge>
                      </div>
                    </div>
                    <CardHeader className="p-4 pt-4">
                      <CardTitle className="text-sm line-clamp-2 leading-snug h-10">{res.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 flex-1">
                      <p className="text-xs text-slate-500 line-clamp-3 mb-4">{res.description}</p>
                      {res.metadata && (
                        <div className="flex gap-3 text-[10px] text-slate-400 uppercase tracking-tighter">
                          {res.platform === "YouTube" && <span>{res.metadata.channelTitle}</span>}
                          {res.platform === "GitHub" && (
                            <>
                              <span>★ {res.metadata.stars}</span>
                              <span className="text-indigo-400">{res.metadata.language}</span>
                            </>
                          )}
                        </div>
                      )}
                    </CardContent>
                    <CardFooter className="p-4">
                      <Button asChild variant="secondary" className="w-full text-xs h-8">
                        <a href={res.url} target="_blank" rel="noopener noreferrer">
                          View Resource <ExternalLink className="w-3 h-3 ml-2" />
                        </a>
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="problems" className="mt-6 space-y-6">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Input
                  placeholder="Search problems or generate new ones (e.g. Graph Algorithms, dynamic programming)..."
                  value={problemSearchQuery}
                  onChange={(e) => setProblemSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleProblemSearch()}
                  className="bg-slate-900/50 border-slate-800 h-12 pl-10"
                />
                <Code2 className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-500" />
              </div>
              <Button onClick={handleProblemSearch} disabled={isGeneratingProblems} className="h-12 px-8 bg-indigo-600 hover:bg-indigo-500">
                {isGeneratingProblems ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <BrainCircuit className="mr-2 h-4 w-4" />}
                Generate
              </Button>
            </div>

            <Card className="bg-slate-900/40 border-slate-800 overflow-hidden rounded-2xl">
              <div className="p-4 grid grid-cols-12 gap-4 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-800/50 bg-slate-950/30">
                <div className="col-span-1">Status</div>
                <div className="col-span-5">Title</div>
                <div className="col-span-2">Difficulty</div>
                <div className="col-span-3">Tags</div>
                <div className="col-span-1">Action</div>
              </div>
              <ScrollArea className="h-[400px]">
                {problems.map((p) => (
                  <div
                    key={p.id}
                    className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-white/5 transition-colors border-b border-slate-800/50 last:border-0"
                  >
                    <div className="col-span-1">
                      {p.solved ? (
                        <CheckCircle className="text-emerald-500 w-5 h-5" />
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-slate-700" />
                      )}
                    </div>
                    <div className="col-span-5 font-medium text-white">
                      {p.id}. {p.title}
                    </div>
                    <div className="col-span-2">
                      <Badge
                        variant="outline"
                        className={`
                                        ${p.difficulty === "Easy"
                            ? "border-emerald-500/20 text-emerald-400"
                            : p.difficulty === "Medium"
                              ? "border-yellow-500/20 text-yellow-400"
                              : "border-red-500/20 text-red-400"
                          }
                                    `}
                      >
                        {p.difficulty}
                      </Badge>
                    </div>
                    <div className="col-span-3 flex gap-2 flex-wrap">
                      {p.tags?.map((t: string) => (
                        <span
                          key={t}
                          className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                    <div className="col-span-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="hover:text-indigo-400"
                        onClick={() => {
                          localStorage.setItem("active_problem", JSON.stringify(p));
                          setLocation("/playground/problem");
                        }}
                      >
                        <Play size={16} />
                      </Button>
                    </div>
                  </div>
                ))}
              </ScrollArea>
            </Card>
          </TabsContent>

          <TabsContent value="interview" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-slate-900/40 border-slate-800 hover:border-indigo-500/50 transition-all cursor-pointer">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BrainCircuit className="w-5 h-5 text-indigo-500" />
                    AI Mock Interview
                  </CardTitle>
                  <CardDescription>
                    Practice with an AI interviewer that adapts to your
                    responses. Choose from behavioral, technical, or system
                    design tracks.
                  </CardDescription>
                </CardHeader>
                <CardFooter>
                  <Button className="w-full">Start Session</Button>
                </CardFooter>
              </Card>

              <Card className="bg-slate-900/40 border-slate-800 hover:border-indigo-500/50 transition-all cursor-pointer">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-emerald-500" />
                    Company Guides
                  </CardTitle>
                  <CardDescription>
                    Curated preparation paths for top tech companies. Includes
                    questions asked in recent interviews.
                  </CardDescription>
                </CardHeader>
                <CardFooter>
                  <Button variant="outline" className="w-full">
                    Browse Guides
                  </Button>
                </CardFooter>
              </Card>
            </div>

            <h3 className="text-lg font-semibold text-white mt-8 mb-4">
              Common Questions
            </h3>
            <div className="space-y-4">
              {[
                {
                  title: "Explain the difference between Process and Thread",
                  category: "OS",
                  difficulty: "Medium",
                },
                {
                  title: "Design a URL Shortener like Bit.ly",
                  category: "System Design",
                  difficulty: "Hard",
                },
                {
                  title: "Tell me about a time you failed",
                  category: "Behavioral",
                  difficulty: "Easy",
                },
                {
                  title: "Explain the CAP Theorem",
                  category: "System Design",
                  difficulty: "Medium",
                },
                {
                  title: "Invert a Binary Tree",
                  category: "Algorithms",
                  difficulty: "Easy",
                },
              ].map((q, i) => (
                <Card
                  key={i}
                  className="bg-slate-900/40 border-slate-800 p-4 flex items-center justify-between hover:bg-slate-800/50 transition-colors"
                >
                  <div>
                    <div className="font-medium text-white">{q.title}</div>
                    <div className="flex gap-2 mt-2">
                      <Badge
                        variant="secondary"
                        className="text-xs bg-slate-800 text-slate-400"
                      >
                        {q.category}
                      </Badge>
                      <span
                        className={`text-xs flex items-center ${q.difficulty === "Easy"
                          ? "text-emerald-500"
                          : q.difficulty === "Medium"
                            ? "text-yellow-500"
                            : "text-red-500"
                          }`}
                      >
                        {q.difficulty}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="hover:text-indigo-400"
                    onClick={() => {
                      localStorage.setItem("active_problem", JSON.stringify({
                        id: "interview-" + i,
                        title: q.title,
                        difficulty: q.difficulty,
                        platform: "CodeVortex",
                        tags: [q.category],
                        description: "Question: " + q.title + "\nCategory: " + q.category,
                        constraints: [],
                        examples: []
                      }));
                      setLocation("/playground/problem");
                    }}
                  >
                    Practice
                  </Button>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Generate Course Dialog */}
        <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Generate AI Course</DialogTitle>
              <CardDescription>
                Turn any topic or YouTube video into a complete interactive
                course.
              </CardDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Topic or Skill</Label>
                <Input
                  placeholder="e.g. Advanced React Patterns, Kubernetes for Beginners..."
                  value={generationTopic}
                  onChange={(e) => setGenerationTopic(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>YouTube Video URL (Optional)</Label>
                <Input
                  placeholder="https://youtube.com/watch?v=..."
                  value={generationVideoUrl}
                  onChange={(e) => setGenerationVideoUrl(e.target.value)}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full mt-2 text-indigo-400 hover:text-indigo-300"
                  onClick={async () => {
                    if (!generationTopic) return alert("Enter a topic first");
                    setIsSearchingVideos(true);
                    try {
                      const videos = await YouTubeService.searchVideos(generationTopic);
                      setDiscoveredVideos(videos);
                    } catch (e) {
                      console.error(e);
                    } finally {
                      setIsSearchingVideos(false);
                    }
                  }}
                  disabled={isSearchingVideos}
                >
                  {isSearchingVideos ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Youtube className="mr-2 h-4 w-4" />}
                  Find relevant videos for me
                </Button>

                {discoveredVideos.length > 0 && (
                  <div className="mt-4 grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
                    {discoveredVideos.map(v => (
                      <div
                        key={v.id}
                        className="p-2 border border-slate-800 rounded-lg hover:bg-slate-800 cursor-pointer flex gap-3 items-center"
                        onClick={() => setGenerationVideoUrl(`https://youtube.com/watch?v=${v.id}`)}
                      >
                        <img src={v.thumbnailUrl} className="w-16 h-10 rounded object-cover" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{v.title}</p>
                          <p className="text-[10px] text-slate-500">{v.channelTitle}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <p className="text-xs text-muted-foreground mt-2">
                  If provided, the course will be structured around this video's
                  content.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowGenerateDialog(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleGenerateCourse} disabled={isGenerating}>
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Code2 className="w-4 h-4 mr-2" />
                    Generate Course
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
