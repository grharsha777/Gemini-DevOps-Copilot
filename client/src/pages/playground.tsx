import { useState, useEffect, useRef } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { AIService } from "@/lib/ai";
import { Judge0Service } from "@/lib/judge0";
import { db, initDB } from "@/lib/db";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MultimodalInput } from "@/components/multimodal-input";
import Editor from "@monaco-editor/react";
import {
  Play,
  Square,
  Terminal,
  Eye,
  FileText,
  FolderOpen,
  Settings,
  Zap,
  Github,
  Share,
  Users,
  Download,
  Upload,
  Sparkles,
  MessageSquare,
  Search,
  Blocks,
  History,
  Code2,
  ChevronRight,
  ChevronDown,
  MoreVertical,
  X,
  Plus,
  Loader2,
  MessageCircleQuestion
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface FileNode {
  name: string;
  type: 'file' | 'folder';
  path: string;
  children?: FileNode[];
  content?: string;
}

interface Tab {
  id: string;
  name: string;
  path: string;
  content: string;
  language: string;
  isDirty: boolean;
  type?: 'file' | 'preview';
}

type ActivityType = 'explorer' | 'search' | 'extensions' | 'ai' | 'history' | 'git';

function Kbd({ keyCombo, label }: { keyCombo: string, label?: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="bg-white/10 px-2 py-1 rounded text-[10px] font-mono text-slate-400 border border-white/10 min-w-[20px] text-center">
        {keyCombo}
      </div>
      {label && <span className="text-[10px] text-slate-600">{label}</span>}
    </div>
  )
}

function ActivityIcon({ icon: Icon, active, onClick }: { icon: any, active: boolean, onClick: () => void }) {
  return (
    <div
      className={`w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-all duration-200 ${active ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
        }`}
      onClick={onClick}
    >
      <Icon className="w-5 h-5" />
    </div>
  );
}

export default function Playground() {
  const [match, params] = useRoute("/playground/:id?");
  const projectId = match ? params?.id : undefined;
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<string>("");
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [files, setFiles] = useState<FileNode[]>([]);
  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [terminalHistory, setTerminalHistory] = useState<string[]>([]);
  const [currentCommand, setCurrentCommand] = useState("");
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const terminalInputRef = useRef<HTMLInputElement>(null);
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const [activeActivity, setActiveActivity] = useState<ActivityType>('explorer');
  const [showSidebar, setShowSidebar] = useState(true);
  const [aiChat, setAiChat] = useState<{ role: 'user' | 'assistant', content: string }[]>([]);
  const [aiMessage, setAiMessage] = useState("");
  const [executionHistory, setExecutionHistory] = useState<any[]>([]);

  useEffect(() => {
    if (activeActivity === 'history') {
      const loadHistory = async () => {
        await initDB();
        const hist = await db.getAll('execution_history');
        const filtered = projectId
          ? hist.filter((h: any) => h.projectId === projectId)
          : hist;
        setExecutionHistory(filtered.sort((a: any, b: any) => b.timestamp - a.timestamp));
      };
      loadHistory();
    }
  }, [activeActivity, projectId, isRunning]);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDesc, setNewProjectDesc] = useState("");
  const [openCommandPalette, setOpenCommandPalette] = useState(false);
  const [showProjectDialog, setShowProjectDialog] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showDeployDialog, setShowDeployDialog] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "p" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpenCommandPalette((open) => !open)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  // Fetch Projects List
  const { data: projectsData, isLoading: isLoadingProjects } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const res = await fetch('/api/projects');
      if (!res.ok) throw new Error('Failed to fetch projects');
      return res.json();
    }
  });

  // Fetch Current Project
  const { data: projectData, isLoading: isLoadingProject } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const res = await fetch(`/api/projects/${projectId}`);
      if (!res.ok) throw new Error('Failed to fetch project');
      return res.json();
    },
    enabled: !!projectId && projectId !== 'daily-challenge'
  });

  // Fetch Project Files
  const { data: filesData, isLoading: isLoadingFiles } = useQuery({
    queryKey: ['project-files', projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const res = await fetch(`/api/projects/${projectId}/files`);
      if (!res.ok) throw new Error('Failed to fetch files');
      return res.json();
    },
    enabled: !!projectId && projectId !== 'daily-challenge'
  });

  // Create Project Mutation
  const createProjectMutation = useMutation({
    mutationFn: async (data: { name: string, description: string }) => {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed to create project');
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setShowProjectDialog(false);
      setLocation(`/playground/${data.project.id}`);
    }
  });

  // Transform filesData to FileNode tree
  useEffect(() => {
    if (projectId === 'problem') {
      const storedProblem = localStorage.getItem("active_problem");
      if (storedProblem) {
        try {
          const p = JSON.parse(storedProblem);
          const starterCode = `/**
 * Problem: ${p.title}
 * Difficulty: ${p.difficulty}
 * Platform: ${p.platform}
 */

function solution() {
  // Your code here
}

// Example: console.log(solution());`;

          setFiles([
            {
              name: "solution.ts",
              type: "file",
              path: "solution.ts",
              content: starterCode
            },
            {
              name: "problem.md",
              type: "file",
              path: "problem.md",
              content: `# ${p.title}\n\n**Difficulty:** ${p.difficulty}\n**Platform:** ${p.platform}\n\n## Description\n${p.description}\n\n## Constraints\n${p.constraints?.map((c: string) => `- ${c}`).join('\n') || 'None'}\n\n## Examples\n${p.examples?.map((ex: any) => `**Input:** ${ex.input}\n**Output:** ${ex.output}${ex.explanation ? `\n\nExplanation: ${ex.explanation}` : ''}`).join('\n\n') || 'None'}`
            }
          ]);

          // Automatically open the solution file
          const solutionTab: Tab = {
            id: 'solution.ts',
            name: 'solution.ts',
            path: 'solution.ts',
            content: starterCode,
            language: 'typescript',
            isDirty: false,
            type: 'file'
          };

          if (tabs.length === 0) {
            setTabs([solutionTab]);
            setActiveTab('solution.ts');
          }
        } catch (e) {
          console.error("Failed to parse stored problem", e);
        }
      }
      return;
    }

    if (projectId === 'daily-challenge') {
      const starterCode = `/**
 * Definition for singly-linked list.
 * class ListNode {
 *     val: number
 *     next: ListNode | null
 *     constructor(val?: number, next?: ListNode | null) {
 *         this.val = (val===undefined ? 0 : val)
 *         this.next = (next===undefined ? null : next)
 *     }
 * }
 */

function mergeKLists(lists: Array<ListNode | null>): ListNode | null {
    // Your code here
    return null;
};`;

      setFiles([
        {
          name: "solution.ts",
          type: "file",
          path: "solution.ts",
          content: starterCode
        },
        {
          name: "readme.md",
          type: "file",
          path: "readme.md",
          content: "# Merge k Sorted Lists\n\nYou are given an array of k linked-lists lists, each linked-list is sorted in ascending order.\n\nMerge all the linked-lists into one sorted linked-list and return it."
        }
      ]);
      return;
    }

    if (filesData?.files) {
      const buildFileTree = (files: any[]): FileNode[] => {
        const root: FileNode[] = [];
        const map = new Map<string, FileNode>();

        // Sort files by path length to process folders first implicitly or just handle missing parents
        // Actually, sorting by path ensures we process top-level first if we just split by /

        // Simpler approach: Create all nodes first
        files.forEach(f => {
          map.set(f.path, {
            name: f.path.split('/').pop() || '',
            type: 'file',
            path: f.path,
            content: f.content
          });
        });

        // Identify folders (implicit from paths)
        const folders = new Set<string>();
        files.forEach(f => {
          const parts = f.path.split('/');
          let current = '';
          for (let i = 0; i < parts.length - 1; i++) {
            current = current ? `${current}/${parts[i]}` : parts[i];
            folders.add(current);
          }
        });

        folders.forEach(folderPath => {
          if (!map.has(folderPath)) {
            map.set(folderPath, {
              name: folderPath.split('/').pop() || '',
              type: 'folder',
              path: folderPath,
              children: []
            });
          }
        });

        // Build tree
        map.forEach((node) => {
          const parts = node.path.split('/');
          if (parts.length === 1) {
            root.push(node);
          } else {
            const parentPath = parts.slice(0, -1).join('/');
            const parent = map.get(parentPath);
            if (parent) {
              if (!parent.children) parent.children = [];
              parent.children.push(node);
            } else {
              // Fallback if parent missing logic fails
              root.push(node);
            }
          }
        });

        return root;
      };

      setFiles(buildFileTree(filesData.files));
    } else if (!projectId) {
      // Sample files for demo if no project selected
      // Or show nothing/welcome screen
      setFiles([]);
    }
  }, [filesData, projectId]);

  // Open default file if files loaded and no tab open
  useEffect(() => {
    if (files.length > 0 && tabs.length === 0) {
      // Try to find a readme or index file
      const findFile = (nodes: FileNode[]): FileNode | undefined => {
        for (const node of nodes) {
          if (node.type === 'file') return node;
          if (node.children) {
            const found = findFile(node.children);
            if (found) return found;
          }
        }
      };
      const f = findFile(files);
      if (f) openFile(f);
    }
  }, [files]);


  const openFile = (file: FileNode) => {
    const existingTab = tabs.find(tab => tab.path === file.path);
    if (existingTab) {
      setActiveTab(existingTab.id);
      return;
    }

    const newTab: Tab = {
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      path: file.path,
      content: file.content || "",
      language: getLanguageFromPath(file.path),
      isDirty: false
    };

    setTabs(prev => [...prev, newTab]);
    setActiveTab(newTab.id);
  };

  const getLanguageFromPath = (path: string): string => {
    const ext = path.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'js': case 'jsx': return 'javascript';
      case 'ts': case 'tsx': return 'typescript';
      case 'json': return 'json';
      case 'css': return 'css';
      case 'html': return 'html';
      case 'py': return 'python';
      case 'go': return 'go';
      case 'java': return 'java';
      default: return 'javascript';
    }
  };

  const closeTab = (tabId: string) => {
    setTabs(prev => {
      const newTabs = prev.filter(tab => tab.id !== tabId);
      if (activeTab === tabId && newTabs.length > 0) {
        setActiveTab(newTabs[0].id);
      } else if (newTabs.length === 0) {
        setActiveTab("");
      }
      if (tabId === 'preview-tab') setShowPreview(false);
      return newTabs;
    });
  };

  const togglePreview = () => {
    if (showPreview) {
      setShowPreview(false);
      closeTab('preview-tab');
    } else {
      setShowPreview(true);
      const newTab: Tab = {
        id: 'preview-tab',
        name: 'Live Preview',
        path: 'preview',
        content: '',
        language: 'html',
        isDirty: false,
        type: 'preview'
      };
      setTabs(prev => [...prev.filter(t => t.id !== 'preview-tab'), newTab]);
      setActiveTab('preview-tab');
    }
  };

  useEffect(() => {
    if (showPreview && iframeRef.current) {
      const active = tabs.find(t => t.id === activeTab);
      const isPreviewTab = active?.id === 'preview-tab';

      // If we are on the preview tab, we look for content to show
      // If we are on another tab but preview is open, we update it too
      const sourceTab = isPreviewTab ? tabs.find(t => t.id !== 'preview-tab' && (t.language === 'html' || t.language === 'javascript')) : active;

      if (sourceTab) {
        const doc = iframeRef.current.contentDocument;
        if (doc) {
          doc.open();
          if (sourceTab.language === 'html') {
            doc.write(sourceTab.content);
          } else if (sourceTab.language === 'javascript' || sourceTab.language === 'typescript') {
            doc.write(`
              <html>
                <body style="background: #fff; font-family: sans-serif; padding: 2rem;">
                  <h3 style="color: #6366f1;">Code Output</h3>
                  <hr style="border: 0; border-top: 1px solid #eee; margin: 1rem 0;" />
                  <pre id="out" style="background: #f8fafc; padding: 1rem; border-radius: 0.5rem;"></pre>
                  <script>
                    const out = document.getElementById('out');
                    console.log = (...args) => {
                      out.innerText += args.join(' ') + '\\n';
                    };
                    try {
                      ${sourceTab.content}
                    } catch (e) {
                      out.style.color = 'red';
                      out.innerText = 'Error: ' + e.message;
                    }
                  </script>
                </body>
              </html>
            `);
          } else {
            doc.write(`<html><body style="padding:20px; font-family:sans-serif;">No preview for ${sourceTab.language}</body></html>`);
          }
          doc.close();
        }
      }
    }
  }, [showPreview, activeTab, tabs]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!projectId) {
      toast({ title: "Select a project first", variant: "destructive" });
      return;
    }
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append("files", files[i]);
    }

    try {
      const res = await fetch(`/api/projects/${projectId}/upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      const data = await res.json();
      toast({ title: `Successfully uploaded ${data.count} files` });
      queryClient.invalidateQueries({ queryKey: ["project-files", projectId] });
    } catch (err) {
      toast({ title: "Upload failed", description: "Could not upload files to server", variant: "destructive" });
    }
  };

  const runCode = async () => {
    const currentTab = tabs.find(tab => tab.id === activeTab);
    if (!currentTab) return;

    setIsRunning(true);
    setTerminalHistory(prev => [...prev, `$ Running ${currentTab.name}...`]);
    setOutput("Executing...");

    try {
      let result;
      // Try Judge0 first for supported languages
      if (['javascript', 'typescript', 'python', 'java', 'cpp', 'go'].includes(currentTab.language)) {
        try {
          result = await Judge0Service.executeCode(currentTab.content, currentTab.language);
        } catch (jErr) {
          console.warn("Judge0 failed, falling back to AI execution:", jErr);
        }
      }

      // Fallback to AI execution if Judge0 failed or language not supported
      if (!result) {
        const res = await fetch('/api/ai/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: currentTab.content, language: currentTab.language })
        });
        if (!res.ok) throw new Error("Execution failed");
        const aiResult = await res.json();
        result = {
          stdout: aiResult.output,
          status: { id: 3, description: "AI Handled" },
          time: "0.1",
          memory: "0"
        };
      }

      let outputText = "";
      if (result.stdout) outputText += result.stdout;
      if (result.stderr) outputText += `\nError:\n${result.stderr}`;
      if (result.compile_output) outputText += `\nCompiler:\n${result.compile_output}`;
      if (!outputText && result.message) outputText = result.message;

      setOutput(outputText || "Execution completed (No output)");

      setTerminalHistory(prev => [...prev,
      `> Status: ${result.status.description}`,
      `> Time: ${result.time}s | Memory: ${result.memory}KB`
      ]);

      try {
        await initDB();
        await db.put('execution_history', {
          id: Date.now().toString(),
          projectId: projectId || 'playground',
          code: currentTab.content,
          language: currentTab.language,
          output: outputText,
          status: result.status.description,
          timestamp: Date.now(),
          metrics: {
            time: result.time,
            memory: result.memory
          }
        });
      } catch (dbErr) {
        console.error("Failed to save execution history:", dbErr);
      }

    } catch (err: any) {
      console.error(err);
      setOutput(`Failed to execute code: ${err.message}`);
      setTerminalHistory(prev => [...prev, `✗ Execution failed: ${err.message}`]);
    } finally {
      setIsRunning(false);
    }
  };

  const handleAiChat = async () => {
    if (!aiMessage.trim()) return;
    const msg = aiMessage;
    setAiMessage("");
    setAiChat(prev => [...prev, { role: 'user', content: msg }]);
    setIsAiProcessing(true);

    try {
      const currentTab = tabs.find(t => t.id === activeTab);
      const resp = await fetch('/api/ai/multimodal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: msg,
          context: {
            currentFile: currentTab?.path,
            content: currentTab?.content,
            allFiles: tabs.map(t => t.path)
          }
        })
      });
      const data = await resp.json();
      if (data.success) {
        setAiChat(prev => [...prev, { role: 'assistant', content: data.output || "I've processed your request." }]);
      }
    } catch (err) {
      setAiChat(prev => [...prev, { role: 'assistant', content: "Sorry, I encountered an error." }]);
    } finally {
      setIsAiProcessing(false);
    }
  };

  const renderFileTree = (nodes: FileNode[], level = 0) => {
    return nodes.map(node => (
      <div key={node.path} className="select-none">
        <div
          className={`flex items-center gap-2 py-[2px] px-2 hover:bg-white/5 cursor-pointer text-sm transition-colors ${tabs.find(t => t.path === node.path && t.id === activeTab) ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-400'
            }`}
          onClick={() => node.type === 'file' ? openFile(node) : null}
          style={{ paddingLeft: `${level * 12 + 8}px` }}
        >
          {node.type === 'folder' ? (
            <ChevronDown className="w-3 h-3 text-slate-500" />
          ) : (
            <FileText className="w-3.5 h-3.5" />
          )}
          <span className="truncate">{node.name}</span>
        </div>
        {node.children && renderFileTree(node.children, level + 1)}
      </div>
    ));
  };

  const handleExplainCode = async () => {
    const currentTab = tabs.find(t => t.id === activeTab);
    if (!currentTab) return;

    setActiveActivity('ai');
    setShowSidebar(true);
    // Add user message to chat immediately
    setAiChat(prev => [...prev, { role: 'user', content: `Can you explain the code in ${currentTab.name}?` }]);
    setIsAiProcessing(true);

    try {
      const resp = await fetch('/api/ai/multimodal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: "Explain this code in detail, focusing on logic and potential improvements.",
          context: {
            currentFile: currentTab.path,
            content: currentTab.content,
            allFiles: tabs.map(t => t.path) // Provide context of other open files
          }
        })
      });
      const data = await resp.json();
      if (data.success) {
        setAiChat(prev => [...prev, { role: 'assistant', content: data.output || "I've analyzed the code." }]);
      } else {
        setAiChat(prev => [...prev, { role: 'assistant', content: "I couldn't generate an explanation at this time." }]);
      }
    } catch (err) {
      console.error(err);
      setAiChat(prev => [...prev, { role: 'assistant', content: "Sorry, I encountered an error while analyzing the code." }]);
    } finally {
      setIsAiProcessing(false);
    }
  };

  const handleCreateProject = () => {
    if (!newProjectName.trim()) return;
    createProjectMutation.mutate({ name: newProjectName, description: newProjectDesc });
  };

  const handleDeploy = async () => {
    if (!projectId) return;
    setIsDeploying(true);
    setTerminalHistory(prev => [...prev, `$ Initiating deployment for ${projectData?.project?.name}...`]);

    try {
      // Simulate deployment API call
      const resp = await fetch(`/api/projects/${projectId}/deploy`, {
        method: 'POST'
      });
      const data = await resp.json();

      if (resp.ok) {
        setTerminalHistory(prev => [...prev, `✓ Deployment successful!`, `➜ Live at: ${data.url || 'https://vortex-app.deploy'}`]);
        toast({ title: "Deployment successful", description: "Your app is now live!" });
      } else {
        throw new Error(data.error || "Deployment failed");
      }
    } catch (err: any) {
      setTerminalHistory(prev => [...prev, `✗ Deployment failed: ${err.message}`]);
      toast({ title: "Deployment failed", description: err.message, variant: "destructive" });
    } finally {
      setIsDeploying(false);
      setShowDeployDialog(false);
    }
  };

  if (!projectId) {
    return (
      <div className="h-screen w-full flex flex-col bg-[#0b0e14] text-slate-300 items-center justify-center p-8">
        <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-white">Code Vortex</h1>
              <p className="text-slate-400">Select a project to start coding or create a new one.</p>
            </div>

            <div className="grid gap-4">
              <Button onClick={() => setShowProjectDialog(true)} className="w-full justify-start gap-3 h-12 text-lg bg-indigo-600 hover:bg-indigo-500">
                <Plus className="w-5 h-5" /> Create New Project
              </Button>
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider">Recent Projects</h3>
                <ScrollArea className="h-[300px] w-full border border-white/5 rounded-lg bg-white/5">
                  {isLoadingProjects ? (
                    <div className="flex items-center justify-center h-20">
                      <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                    </div>
                  ) : projectsData?.projects?.length === 0 ? (
                    <div className="flex items-center justify-center h-20 text-slate-500">No projects found</div>
                  ) : (
                    <div className="p-2 space-y-1">
                      {projectsData?.projects?.map((p: any) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between p-3 rounded-md hover:bg-white/5 cursor-pointer group transition-colors"
                          onClick={() => setLocation(`/playground/${p.id}`)}
                        >
                          <div className="flex items-center gap-3">
                            <FolderOpen className="w-4 h-4 text-indigo-400" />
                            <div>
                              <div className="text-sm font-medium text-white">{p.name}</div>
                              <div className="text-xs text-slate-500">{p.description || 'No description'}</div>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-white transition-colors" />
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </div>
          </div>

          <div className="bg-white/5 rounded-2xl p-8 border border-white/5 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-500/20">
              <Code2 className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-white">DevOps-First AI Platform</h2>
            <p className="text-sm text-slate-400 max-w-xs">
              Experience the future of development with AI-powered coding, automated DevOps pipelines, and seamless deployments.
            </p>
          </div>
        </div>

        <Dialog open={showProjectDialog} onOpenChange={setShowProjectDialog}>
          <DialogContent className="bg-[#151a24] border-white/10 text-white">
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
              <DialogDescription>Start a new coding project with AI superpowers.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Project Name</Label>
                <Input
                  placeholder="my-awesome-app"
                  className="bg-white/5 border-white/10"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  placeholder="What are you building?"
                  className="bg-white/5 border-white/10"
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setShowProjectDialog(false)}>Cancel</Button>
              <Button
                className="bg-indigo-600 hover:bg-indigo-500"
                onClick={handleCreateProject}
                disabled={createProjectMutation.isPending}
              >
                {createProjectMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create Project
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showDeployDialog} onOpenChange={setShowDeployDialog}>
          <DialogContent className="bg-[#151a24] border-white/10 text-white">
            <DialogHeader>
              <DialogTitle>Deploy & Publish Project</DialogTitle>
              <DialogDescription>Deploy your application to production-ready infrastructure.</DialogDescription>
            </DialogHeader>
            <div className="py-6 space-y-6">
              <div className="flex flex-col items-center justify-center p-8 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl gap-4">
                <div className="w-16 h-16 bg-indigo-500/10 rounded-full flex items-center justify-center">
                  <Zap className="w-8 h-8 text-indigo-400" />
                </div>
                <div className="text-center">
                  <h3 className="font-bold text-white">Vortex Edge Deployment</h3>
                  <p className="text-xs text-slate-500">Global edge network with automated SSL and CI/CD.</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Environment</span>
                  <Badge variant="secondary" className="bg-indigo-500/20 text-indigo-400 border-none">Production</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Framework</span>
                  <span className="text-white">Static / Node.js</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Deployment Region</span>
                  <span className="text-white">US-East (Global)</span>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setShowDeployDialog(false)}>Cancel</Button>
              <Button
                className="bg-indigo-600 hover:bg-indigo-500"
                onClick={handleDeploy}
                disabled={isDeploying}
              >
                {isDeploying && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {isDeploying ? 'Deploying...' : 'Start Deployment'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col bg-[#0b0e14] text-slate-300 font-sans overflow-hidden">
      {/* Top Header / Context Bar */}
      <header className="h-10 flex items-center justify-between px-4 bg-[#0b0e14] border-b border-white/5 z-50">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setLocation('/playground')}>
            <div className="w-6 h-6 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-md flex items-center justify-center">
              <Code2 className="w-4 h-4 text-white" />
            </div>
            <span className="text-xs font-bold tracking-tight text-white uppercase">CodeVortex IDE</span>
          </div>
          <div className="h-4 w-[1px] bg-white/10" />
          <div className="flex items-center gap-1 text-[11px] text-slate-500">
            <span>Projects</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-slate-300">{projectData?.project?.name || 'Loading...'}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Button size="icon" variant="ghost" className="h-7 w-7 text-green-400 hover:text-green-300" onClick={runCode} title="Run Code (Judge0/AI)">
              <Play className="w-4 h-4 fill-current" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7 text-blue-400 hover:text-blue-300" onClick={togglePreview} title="Toggle Preview">
              <Eye className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7 text-indigo-400 hover:text-indigo-300" onClick={handleExplainCode} title="Explain Code (AI)">
              <MessageCircleQuestion className="w-4 h-4" />
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              multiple
              onChange={handleFileUpload}
            />
            <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-white" onClick={() => fileInputRef.current?.click()} title="Upload Files">
              <Upload className="w-4 h-4" />
            </Button>
          </div>
          <Separator orientation="vertical" className="h-6 bg-white/5" />
          <Button size="sm" variant="ghost" className="h-7 text-slate-400 hover:text-white gap-2 px-3" onClick={() => {
            navigator.clipboard.writeText(window.location.href);
            toast({ title: "Link copied", description: "Project link copied to clipboard" });
          }} title="Share Project">
            <Share className="w-3.5 h-3.5" />
          </Button>
          <Button size="sm" className="h-7 bg-indigo-600 hover:bg-indigo-500 text-white gap-2 px-3" onClick={() => setShowDeployDialog(true)}>
            <Zap className="w-3.5 h-3.5" />
            Deploy & Publish
          </Button>
        </div>
      </header>

      <div className="flex-1 flex min-h-0">
        {/* Activity Bar */}
        <aside className="w-12 bg-[#0b0e14] border-r border-white/5 flex flex-col items-center py-4 gap-4 z-50">
          <ActivityIcon
            icon={FileText}
            active={activeActivity === 'explorer'}
            onClick={() => { setActiveActivity('explorer'); setShowSidebar(true); }}
          />
          <ActivityIcon
            icon={Search}
            active={activeActivity === 'search'}
            onClick={() => { setActiveActivity('search'); setShowSidebar(true); }}
          />
          <ActivityIcon
            icon={Blocks}
            active={activeActivity === 'extensions'}
            onClick={() => { setActiveActivity('extensions'); setShowSidebar(true); }}
          />
          <ActivityIcon
            icon={Sparkles}
            active={activeActivity === 'ai'}
            onClick={() => { setActiveActivity('ai'); setShowSidebar(true); }}
          />
          <div className="mt-auto flex flex-col gap-4 pb-2">
            <ActivityIcon icon={Settings} active={false} onClick={() => { }} />
          </div>
        </aside>

        {/* Sidebar */}
        <AnimatePresence>
          {showSidebar && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: sidebarWidth, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="bg-[#0b0e14] border-r border-white/5 flex flex-col relative overflow-hidden"
            >
              <div className="h-9 flex items-center justify-between px-4 border-b border-white/5 shrink-0">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  {activeActivity}
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 text-slate-500 hover:text-white"
                  onClick={() => setShowSidebar(false)}
                >
                  <ChevronRight className="w-4 h-4 rotate-180" />
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto">
                {activeActivity === 'explorer' && (
                  <div className="py-2">
                    <div className="px-4 py-1 flex items-center justify-between group">
                      <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1 uppercase">
                        <ChevronDown className="w-3 h-3" />
                        {projectData?.project?.name || 'Project'}
                      </span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Plus className="w-3.5 h-3.5 text-slate-500 cursor-pointer" />
                        <FolderOpen className="w-3.5 h-3.5 text-slate-500 cursor-pointer" />
                      </div>
                    </div>
                    {isLoadingFiles ? (
                      <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-slate-500" /></div>
                    ) : (
                      renderFileTree(files)
                    )}
                  </div>
                )}

                {activeActivity === 'ai' && (
                  <div className="h-full flex flex-col p-4 gap-4">
                    <div className="flex-1 flex flex-col gap-3">
                      {aiChat.length === 0 && (
                        <div className="flex-1 flex flex-col items-center justify-center opacity-30 text-center gap-4">
                          <Sparkles className="w-12 h-12" />
                          <p className="text-sm">I'm your AI coding agent. Ask me anything about this project.</p>
                        </div>
                      )}
                      {aiChat.map((chat, i) => (
                        <div key={i} className={`flex flex-col gap-2 ${chat.role === 'user' ? 'items-end' : 'items-start'}`}>
                          <div className={`text-[12px] p-2.5 rounded-lg max-w-[90%] ${chat.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-white/5 text-slate-300 border border-white/5'
                            }`}>
                            {chat.content}
                          </div>
                        </div>
                      ))}
                      {isAiProcessing && (
                        <div className="flex gap-1 items-center text-xs text-indigo-400">
                          <motion.div animate={{ opacity: [1, 0.5, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1 h-1 bg-current rounded-full" />
                          <motion.div animate={{ opacity: [1, 0.5, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1 h-1 bg-current rounded-full" />
                          <motion.div animate={{ opacity: [1, 0.5, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1 h-1 bg-current rounded-full" />
                          <span>Agent is thinking...</span>
                        </div>
                      )}
                    </div>
                    <div className="relative">
                      <Input
                        placeholder="Ask the Agent..."
                        className="bg-white/5 border-white/10 text-sm focus-visible:ring-indigo-500"
                        value={aiMessage}
                        onChange={(e) => setAiMessage(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAiChat()}
                      />
                      <Sparkles className="absolute right-3 top-2.5 w-4 h-4 text-indigo-500 opacity-50" />
                    </div>
                  </div>
                )}

                {activeActivity === 'history' && (
                  <div className="p-4 space-y-4">
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Execution History</h3>
                    <div className="space-y-2">
                      {executionHistory.length === 0 ? (
                        <div className="text-xs text-slate-500 italic">No execution history</div>
                      ) : (
                        executionHistory.map((h: any) => (
                          <div key={h.id} className="bg-white/5 p-3 rounded-lg space-y-1 hover:bg-white/10 transition-colors cursor-pointer" onClick={() => setOutput(h.output)}>
                            <div className="flex items-center justify-between">
                              <span className={`text-xs font-bold ${h.status === 'Accepted' ? 'text-green-400' : 'text-red-400'}`}>{h.status}</span>
                              <span className="text-[10px] text-slate-500">{new Date(h.timestamp).toLocaleTimeString()}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono truncate">{h.language}</div>
                            <div className="text-[10px] text-slate-500 flex gap-2">
                              <span>{h.metrics?.time}s</span>
                              <span>{h.metrics?.memory}KB</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {activeActivity === 'extensions' && (
                  <div className="p-4 space-y-4">
                    <div className="bg-white/5 border border-white/5 p-3 rounded-lg flex gap-3 group cursor-pointer hover:border-indigo-500/50 transition-colors">
                      <div className="w-10 h-10 bg-indigo-500/20 rounded-md flex items-center justify-center shrink-0">
                        <Sparkles className="w-6 h-6 text-indigo-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-[12px] font-bold text-white truncate">AI Autocomplete</h4>
                        <p className="text-[10px] text-slate-500 line-clamp-2">Premium real-time code suggestions using DeepSeek-V3.</p>
                      </div>
                    </div>
                    <div className="bg-white/5 border border-white/5 p-3 rounded-lg flex gap-3 group cursor-pointer hover:border-indigo-500/50 transition-colors opacity-50">
                      <div className="w-10 h-10 bg-purple-500/20 rounded-md flex items-center justify-center shrink-0">
                        <Terminal className="w-6 h-6 text-purple-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-[12px] font-bold text-white truncate">SSH Explorer</h4>
                        <p className="text-[10px] text-slate-500 line-clamp-2">Connect to remote servers directly from CodeVortex.</p>
                      </div>
                    </div>
                  </div>
                )}

                {activeActivity === 'git' && (
                  <div className="p-4 space-y-4">
                    <div className="space-y-2">
                      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Source Control</h3>
                      <div className="bg-white/5 p-3 rounded-lg text-center space-y-2">
                        <p className="text-xs text-slate-400">No changes detected</p>
                        <Button size="sm" variant="outline" className="w-full text-xs h-7 border-white/10 hover:bg-white/5 bg-transparent text-slate-300">
                          <Github className="w-3 h-3 mr-2" /> Initialize Repo
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Commits</h3>
                      <div className="text-xs text-slate-500 italic px-2">No commit history</div>
                    </div>
                  </div>
                )}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Editor Main Content */}
        <main className="flex-1 flex flex-col min-w-0 bg-[#0b0e14]">
          {/* Tabs */}
          <div className="h-9 flex bg-[#0b0e14] border-b border-white/5 overflow-x-auto scrollbar-none shrink-0">
            {tabs.map(tab => (
              <div
                key={tab.id}
                className={`flex items-center gap-2 px-3 py-1 cursor-pointer min-w-max border-r border-white/5 transition-all relative ${activeTab === tab.id ? 'bg-[#151a24] text-white shadow-inner' : 'hover:bg-white/5 text-slate-500'
                  }`}
                onClick={() => setActiveTab(tab.id)}
              >
                <FileText className="w-3.5 h-3.5" />
                <span className="text-[11px] font-medium">{tab.name}</span>
                <X
                  className="w-3 h-3 text-slate-600 hover:text-white hover:bg-white/10 rounded transition-colors"
                  onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
                />
                {activeTab === tab.id && <motion.div layoutId="tabLine" className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-indigo-500" />}
              </div>
            ))}
          </div>

          <div className="flex-1 flex flex-col min-h-0">
            <ResizablePanelGroup direction="vertical">
              {/* Editor Pane */}
              <ResizablePanel defaultSize={70} minSize={20}>
                <div className="h-full w-full">
                  {tabs.find(t => t.id === activeTab)?.type === 'preview' ? (
                    <div className="h-full w-full bg-white relative">
                      <div className="absolute top-0 left-0 right-0 h-8 bg-slate-100 border-b flex items-center px-4 gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-400" />
                        <div className="w-2 h-2 rounded-full bg-yellow-400" />
                        <div className="w-2 h-2 rounded-full bg-green-400" />
                        <div className="flex-1 text-center text-xs text-slate-500 font-mono">localhost:3000</div>
                      </div>
                      <iframe ref={iframeRef} className="w-full h-[calc(100%-32px)] border-none bg-white" title="Preview" />
                    </div>
                  ) : tabs.find(t => t.id === activeTab) ? (
                    <Editor
                      height="100%"
                      defaultLanguage={tabs.find(t => t.id === activeTab)?.language}
                      theme="vs-dark"
                      value={tabs.find(t => t.id === activeTab)?.content}
                      options={{
                        fontSize: 13,
                        minimap: { enabled: true },
                        scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 },
                        padding: { top: 12 },
                        lineNumbersMinChars: 3,
                        glyphMargin: false,
                        folding: true,
                        cursorBlinking: 'smooth',
                        smoothScrolling: true,
                        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                        bracketPairColorization: { enabled: true },
                        guides: { bracketPairs: true, indentation: true }
                      }}
                      onChange={(val) => {
                        const active = tabs.find(t => t.id === activeTab);
                        if (active) {
                          setTabs(prev => prev.map(t => t.id === active.id ? { ...t, content: val || "" } : t));
                        }
                      }}
                      loading={<div className="h-full flex items-center justify-center bg-[#0b0e14]"><Sparkles className="w-8 h-8 text-indigo-500 animate-pulse" /></div>}
                      beforeMount={(monaco) => {
                        monaco.editor.defineTheme('cv-dark', {
                          base: 'vs-dark',
                          inherit: true,
                          rules: [],
                          colors: {
                            'editor.background': '#0b0e14',
                            'editor.lineHighlightBackground': '#151a24',
                            'editorLineNumber.foreground': '#475569',
                            'editorCursor.foreground': '#6366f1'
                          }
                        });
                      }}
                    />
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center bg-[#0b0e14]/50 backdrop-blur-3xl gap-6">
                      <div className="w-16 h-16 bg-gradient-to-br from-indigo-500/20 to-purple-600/20 rounded-2xl flex items-center justify-center border border-white/5">
                        <Code2 className="w-8 h-8 text-indigo-400 opacity-50" />
                      </div>
                      <div className="text-center space-y-2">
                        <h2 className="text-lg font-bold text-white tracking-tight">Welcome to CodeVortex IDE</h2>
                        <p className="text-xs text-slate-500">Pick a file from the explorer or ask the AI to generate some code.</p>
                      </div>
                      <div className="flex gap-4 mt-4">
                        <Kbd keyCombo="Ctrl + P" label="Quick Open" />
                        <Kbd keyCombo="Ctrl + Shift + P" label="Command Palette" />
                      </div>
                    </div>
                  )}
                </div>
              </ResizablePanel>

              <ResizableHandle className="bg-white/5 hover:bg-indigo-500/50 h-[1.5px]" />

              {/* Terminal / Output Pane */}
              <ResizablePanel defaultSize={30} minSize={10}>
                <Tabs defaultValue="terminal" className="h-full flex flex-col">
                  <div className="flex items-center px-4 shrink-0 bg-[#0b0e14] border-b border-white/5">
                    <TabsList className="bg-transparent h-9 gap-4">
                      <TabsTrigger value="terminal" className="text-[10px] uppercase font-bold tracking-widest text-slate-500 data-[state=active]:text-white p-0">Terminal</TabsTrigger>
                      <TabsTrigger value="output" className="text-[10px] uppercase font-bold tracking-widest text-slate-500 data-[state=active]:text-white p-0">Output</TabsTrigger>
                      <TabsTrigger value="debug" className="text-[10px] uppercase font-bold tracking-widest text-slate-500 data-[state=active]:text-white p-0">Debug</TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="terminal" className="flex-1 m-0 flex flex-col bg-[#0b0e14] overflow-hidden">
                    <ScrollArea className="flex-1 p-3 font-mono">
                      <div className="space-y-1">
                        {terminalHistory.map((line, i) => (
                          <div key={i} className="text-[12px] text-slate-300 leading-relaxed font-mono">
                            <span className="text-emerald-500 mr-2">»</span>
                            {line}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                    <div className="h-9 px-3 flex items-center gap-2 border-t border-white/5 group">
                      <span className="text-xs font-bold text-indigo-500">➜</span>
                      <span className="text-xs text-slate-500">{projectData?.project?.name || 'project'}</span>
                      <input
                        ref={terminalInputRef}
                        type="text"
                        className="flex-1 bg-transparent border-none outline-none text-xs text-slate-300 font-mono"
                        placeholder="Type a command..."
                        value={currentCommand}
                        onChange={(e) => setCurrentCommand(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            setTerminalHistory(prev => [...prev, currentCommand]);
                            setCurrentCommand("");
                          }
                        }}
                      />
                    </div>
                  </TabsContent>
                </Tabs>
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
        </main>
      </div>
    </div>
  );
}
