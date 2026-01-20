import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MultiAgentSystem } from "@/components/multi-agent-system";
import { DeploymentManager } from "@/components/deployment-manager";
import { DevOpsLeaderboard } from "@/components/devops-leaderboard";
import Editor from "@monaco-editor/react";
import { FileTree } from "@/components/file-tree";
import {
    Rocket,
    Layout,
    MessageSquare,
    Layers,
    Settings,
    Plus,
    Play,
    Cpu,
    Palette,
    Database,
    Globe,
    Code,
    Server,
    Zap,
    FileText,
    Folder,
    ChevronRight,
    ChevronDown,
    Save,
    Download,
    HelpCircle,
    Eye
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface File {
    path: string;
    content: string;
    language: string;
}

export default function AppBuilder() {
    const { toast } = useToast();
    const [projects, setProjects] = useState<any[]>([]);
    const [selectedProject, setSelectedProject] = useState<any | null>(null);
    const [prompt, setPrompt] = useState("");
    const [isBuilding, setIsBuilding] = useState(false);
    const [activeTab, setActiveTab] = useState("chat");
    const [agentResults, setAgentResults] = useState<any>(null);
    const [files, setFiles] = useState<File[]>([]);
    const [activeFile, setActiveFile] = useState<File | null>(null);
    const [explanation, setExplanation] = useState<string | null>(null);
    const [isExplaining, setIsExplaining] = useState(false);
    const [showTour, setShowTour] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string>("");

    const activeFileRef = useRef(activeFile);
    const selectedProjectRef = useRef(selectedProject);

    useEffect(() => { activeFileRef.current = activeFile; }, [activeFile]);
    useEffect(() => { selectedProjectRef.current = selectedProject; }, [selectedProject]);

    useEffect(() => {
        fetch("/api/projects")
            .then(res => res.json())
            .then(data => setProjects(data.projects || []));
    }, []);

    const handleCreateProject = async () => {
        if (!prompt) return;
        setIsBuilding(true);
        try {
            const res = await fetch("/api/projects", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: prompt.split(" ").slice(0, 3).join(" "), description: prompt, public: true })
            });
            const data = await res.json();
            if (data.project) {
                setProjects([data.project, ...projects]);
                setSelectedProject(data.project);
                // setPrompt(""); // Keep prompt for the agents
                setActiveTab("agents");
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsBuilding(false);
        }
    };

    const handleSelectProject = async (project: any) => {
        setSelectedProject(project);
        try {
            const res = await fetch(`/api/projects/${project.id}/files`);
            const data = await res.json();
            const projectFiles = data.files || [];
            setFiles(projectFiles.map((f: any) => ({
                path: f.path,
                content: f.content,
                language: f.path.endsWith('json') ? 'json' : f.path.endsWith('css') ? 'css' : 'typescript'
            })));
            if (projectFiles.length > 0) setActiveFile(projectFiles[0]);
        } catch (err) {
            setFiles([]);
        }
    };

    const handleAgentTaskComplete = (result: any) => {
        setAgentResults(result);

        // Merge generated files
        if (result.generatedFiles) {
            setFiles(result.generatedFiles);
            if (result.generatedFiles.length > 0) {
                setActiveFile(result.generatedFiles[0]);
            }
        }

        toast({
            title: "Build Complete",
            description: "Agents have generated the application structure and code.",
        });

        setActiveTab("editor");
    };

    const handleFileSelect = (file: File) => {
        setActiveFile(file);
    };

    const handleContentChange = (value: string | undefined) => {
        if (!activeFile || value === undefined) return;

        const updatedFiles = files.map(f =>
            f.path === activeFile.path ? { ...f, content: value } : f
        );
        setFiles(updatedFiles);
        setActiveFile({ ...activeFile, content: value });
    };

    const saveFile = async () => {
        const file = activeFileRef.current;
        const project = selectedProjectRef.current;

        if (!file || !project) return;

        try {
            const res = await fetch(`/api/projects/${project.id}/files`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    path: file.path,
                    content: file.content
                })
            });

            if (res.ok) {
                toast({ title: "Saved", description: "File saved successfully" });
            } else {
                throw new Error("Failed to save");
            }
        } catch (err) {
            console.error(err);
            toast({ title: "Error", description: "Failed to save file", variant: "destructive" });
        }
    };

    const handleEditorMount = (editor: any, monaco: any) => {
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
            saveFile();
        });
    };

    const handleExplainCode = async () => {
        if (!activeFile?.content) return;
        setIsExplaining(true);
        try {
            const res = await fetch("/api/ai/explain", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code: activeFile.content })
            });
            const data = await res.json();
            if (data.explanations) {
                setExplanation(data.explanations);
            }
        } catch (err) {
            toast({ title: "Error", description: "Failed to explain code", variant: "destructive" });
        } finally {
            setIsExplaining(false);
        }
    };

    const downloadAsZip = async () => {
        if (!files.length) {
            toast({ title: "No Files", description: "No files to download", variant: "destructive" });
            return;
        }

        try {
            const res = await fetch("/api/projects/download-zip", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    files: files.map(f => ({ path: f.path, content: f.content })),
                    projectName: selectedProject?.name || "project"
                })
            });

            if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `${selectedProject?.name || "project"}-${Date.now()}.zip`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
                toast({ title: "Success", description: "Project downloaded as ZIP" });
            } else {
                throw new Error("Failed to create ZIP");
            }
        } catch (err) {
            console.error(err);
            toast({ title: "Error", description: "Failed to download ZIP", variant: "destructive" });
        }
    };

    const startAITour = async () => {
        setShowTour(true);
        try {
            const res = await fetch("/api/ai/tour", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    context: "app-builder",
                    features: ["project creation", "multi-agent system", "code editor", "deployment"]
                })
            });
            const data = await res.json();
            if (data.tour) {
                // Show tour in a dialog
                setExplanation(data.tour);
            }
        } catch (err) {
            toast({ title: "Error", description: "Failed to start tour", variant: "destructive" });
        }
    };

    const handlePreview = async () => {
        if (!selectedProject || !files.length) {
            toast({ title: "No Project", description: "Please create a project and generate files first", variant: "destructive" });
            return;
        }

        try {
            // Create a preview HTML file with all project files
            const htmlContent = files.find(f => f.path.endsWith('.html') || f.path.endsWith('.html'))?.content;
            if (htmlContent) {
                const blob = new Blob([htmlContent], { type: 'text/html' });
                const url = URL.createObjectURL(blob);
                setPreviewUrl(url);
                setShowPreview(true);
            } else {
                // Generate a preview page from React/Next.js files
                const previewHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${selectedProject.name} - Preview</title>
    <style>
        body { margin: 0; padding: 20px; font-family: system-ui; background: #0a0a0a; color: #fff; }
        .preview-container { max-width: 1200px; margin: 0 auto; }
        .file-viewer { background: #1a1a1a; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .file-name { color: #4F46E5; font-weight: bold; margin-bottom: 10px; }
        pre { background: #0a0a0a; padding: 15px; border-radius: 4px; overflow-x: auto; }
    </style>
</head>
<body>
    <div class="preview-container">
        <h1>${selectedProject.name} - Project Preview</h1>
        <p>Built by G R Harsha using Ganapathi Web Builder</p>
        ${files.map(f => `
            <div class="file-viewer">
                <div class="file-name">${f.path}</div>
                <pre><code>${f.content.substring(0, 500)}${f.content.length > 500 ? '...' : ''}</code></pre>
            </div>
        `).join('')}
    </div>
</body>
</html>`;
                const blob = new Blob([previewHtml], { type: 'text/html' });
                const url = URL.createObjectURL(blob);
                setPreviewUrl(url);
                setShowPreview(true);
            }
        } catch (err) {
            toast({ title: "Error", description: "Failed to generate preview", variant: "destructive" });
        }
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white p-6 font-sans overflow-hidden">
            {/* Background Decor */}
            <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full" />

            <header className="flex items-center justify-between mb-8 relative z-10">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
                        Ganapathi Web Builder
                    </h1>
                    <p className="text-slate-400 text-sm mt-1 flex items-center gap-2">
                        <Cpu size={14} className="text-indigo-400" /> Multi-Agent AI System for Full-Stack Apps
                        <span className="text-xs text-slate-500 ml-2">Built by G R Harsha</span>
                    </p>
                </div>
                <div className="flex gap-4">
                    <Button
                        variant="outline"
                        className="border-slate-800 bg-slate-900/50 hover:bg-slate-800 backdrop-blur-md"
                        onClick={startAITour}
                    >
                        <HelpCircle className="mr-2" size={16} /> AI Tour
                    </Button>
                    <Button
                        variant="outline"
                        className="border-slate-800 bg-slate-900/50 hover:bg-slate-800 backdrop-blur-md"
                        onClick={handlePreview}
                        disabled={!selectedProject || !files.length}
                    >
                        <Eye className="mr-2" size={16} /> Preview
                    </Button>
                    <Button
                        variant="outline"
                        className="border-slate-800 bg-slate-900/50 hover:bg-slate-800 backdrop-blur-md"
                        onClick={downloadAsZip}
                        disabled={!files.length}
                    >
                        <Download className="mr-2" size={16} /> Download ZIP
                    </Button>
                    <Button
                        onClick={() => setActiveTab("deploy")}
                        disabled={!selectedProject}
                        className="bg-indigo-600 hover:bg-indigo-500 shadow-[0_0_20px_rgba(79,70,229,0.4)]"
                    >
                        <Rocket className="mr-2" size={18} /> Deploy App
                    </Button>
                </div>
            </header>

            <div className="grid grid-cols-12 gap-8 relative z-10 h-[calc(100vh-160px)]">
                {/* Left Sidebar: Projects */}
                <div className="col-span-3 flex flex-col gap-6 h-full">
                    <Card className="bg-slate-900/40 border-slate-800/50 backdrop-blur-xl flex-1 flex flex-col">
                        <CardContent className="p-4 flex flex-col h-full">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Your Projects</span>
                                <Button size="icon" variant="ghost" className="h-6 w-6 text-slate-400"><Plus size={14} /></Button>
                            </div>
                            <ScrollArea className="flex-1 -mx-2 px-2">
                                <div className="space-y-2">
                                    {projects.map(p => (
                                        <motion.div
                                            key={p.id}
                                            whileHover={{ x: 4 }}
                                            onClick={() => handleSelectProject(p)}
                                            className={`p-3 rounded-xl cursor-pointer transition-all border ${selectedProject?.id === p.id
                                                ? "bg-indigo-600/10 border-indigo-500/50 text-indigo-400"
                                                : "border-transparent text-slate-400 hover:bg-slate-800/50"
                                                }`}
                                        >
                                            <div className="font-medium flex items-center gap-3">
                                                <Globe size={16} /> {p.name}
                                            </div>
                                            <div className="text-xs text-slate-500 mt-1 truncate">{p.description}</div>
                                        </motion.div>
                                    ))}
                                    {projects.length === 0 && (
                                        <div className="text-center py-8 text-slate-500 text-sm">No projects yet</div>
                                    )}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </div>

                {/* Center: Main Area */}
                <div className="col-span-9 flex flex-col gap-6 h-full">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                        <TabsList className="bg-slate-900/40 border-slate-800/50 backdrop-blur-xl p-1 rounded-2xl w-fit mx-auto mb-6">
                            <TabsTrigger value="chat" className="rounded-xl px-6 data-[state=active]:bg-indigo-600">
                                <MessageSquare className="mr-2" size={16} /> New Project
                            </TabsTrigger>
                            <TabsTrigger value="agents" className="rounded-xl px-6 data-[state=active]:bg-indigo-600" disabled={!selectedProject}>
                                <Cpu className="mr-2" size={16} /> Agent Swarm
                            </TabsTrigger>
                            <TabsTrigger value="editor" className="rounded-xl px-6 data-[state=active]:bg-indigo-600" disabled={!selectedProject}>
                                <Layout className="mr-2" size={16} /> Visual Editor
                            </TabsTrigger>
                            <TabsTrigger value="deploy" className="rounded-xl px-6 data-[state=active]:bg-indigo-600" disabled={!selectedProject}>
                                <Rocket className="mr-2" size={16} /> Deploy
                            </TabsTrigger>
                        </TabsList>

                        <div className="flex-1 relative bg-slate-900/40 border border-slate-800/50 backdrop-blur-xl rounded-3xl overflow-hidden">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={activeTab}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="h-full p-6"
                                >
                                    {activeTab === "chat" && (
                                        <div className="h-full flex flex-col items-center justify-center max-w-2xl mx-auto text-center space-y-8">
                                            <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-indigo-500/30">
                                                <Zap className="w-10 h-10 text-white" />
                                            </div>
                                            <div className="space-y-2">
                                                <h2 className="text-3xl font-bold text-white">What do you want to build?</h2>
                                                <p className="text-slate-400">Describe your full-stack application, and our Multi-Agent System will architect, build, and deploy it.</p>
                                            </div>

                                            <div className="w-full relative group">
                                                <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl blur opacity-25 group-focus-within:opacity-50 transition duration-1000"></div>
                                                <div className="relative flex items-center bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden">
                                                    <Input
                                                        value={prompt}
                                                        onChange={(e) => setPrompt(e.target.value)}
                                                        placeholder="e.g. A CRM dashboard for a real estate agency with lead tracking..."
                                                        className="border-0 bg-transparent py-8 text-lg focus-visible:ring-0 focus-visible:ring-offset-0"
                                                        onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
                                                    />
                                                    <Button
                                                        onClick={handleCreateProject}
                                                        disabled={isBuilding || !prompt}
                                                        className="mr-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl px-6 h-12"
                                                    >
                                                        {isBuilding ? <span className="animate-spin mr-2">⏳</span> : <Play size={18} className="mr-2" />}
                                                        Generate
                                                    </Button>
                                                </div>
                                            </div>

                                            <div className="flex gap-4 text-xs text-slate-500">
                                                <span className="flex items-center gap-1"><Palette size={12} /> React/Next.js</span>
                                                <span className="flex items-center gap-1"><Server size={12} /> Node/Express</span>
                                                <span className="flex items-center gap-1"><Database size={12} /> Postgres</span>
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === "agents" && selectedProject && (
                                        <div className="h-full overflow-y-auto">
                                            <MultiAgentSystem
                                                projectType="web"
                                                onTaskComplete={handleAgentTaskComplete}
                                                currentProject={{
                                                    files: files,
                                                    requirements: selectedProject ? (selectedProject.description || prompt) : prompt,
                                                    projectType: "web"
                                                }}
                                            />
                                        </div>
                                    )}

                                    {activeTab === "editor" && (
                                        <div className="grid grid-cols-12 gap-6 h-full">
                                            {/* File Explorer */}
                                            <Card className="col-span-3 bg-slate-950/50 border-slate-800/50 h-full flex flex-col">
                                                <CardContent className="p-4 flex-1 flex flex-col">
                                                    <div className="flex items-center justify-between mb-4">
                                                        <span className="text-xs font-semibold text-slate-500 uppercase">Project Files</span>
                                                        <div className="flex gap-1">
                                                            <Button size="icon" variant="ghost" className="h-6 w-6 text-slate-400 hover:text-white" title="New File">
                                                                <FileText size={12} />
                                                            </Button>
                                                            <Button size="icon" variant="ghost" className="h-6 w-6 text-slate-400 hover:text-white" title="New Folder">
                                                                <Folder size={12} />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                    <div className="flex-1 -mx-2">
                                                        {files.length > 0 ? (
                                                            <FileTree
                                                                files={files}
                                                                onSelect={(path) => {
                                                                    const file = files.find(f => f.path === path);
                                                                    if (file) handleFileSelect(file);
                                                                }}
                                                                selectedPath={activeFile?.path}
                                                            />
                                                        ) : (
                                                            <div className="text-center py-8 text-slate-600 text-xs">
                                                                No files generated yet.
                                                            </div>
                                                        )}
                                                    </div>
                                                </CardContent>
                                            </Card>

                                            {/* Code Editor */}
                                            <Card className="col-span-9 bg-slate-950/50 border-slate-800/50 h-full flex flex-col overflow-hidden">
                                                <div className="border-b border-slate-800 p-2 flex items-center justify-between bg-slate-900/50">
                                                    <div className="flex items-center gap-2 px-2">
                                                        <FileText size={14} className="text-indigo-400" />
                                                        <span className="text-sm font-medium text-slate-300">{activeFile?.path || 'No file selected'}</span>
                                                    </div>
                                                    {activeFile && (
                                                        <div className="flex gap-2">
                                                            <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={handleExplainCode} disabled={isExplaining}>
                                                                <Zap size={12} className={isExplaining ? "text-yellow-400" : ""} /> {isExplaining ? "Analyzing..." : "Explain"}
                                                            </Button>
                                                            <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={saveFile}>
                                                                <Save size={12} /> Save
                                                            </Button>
                                                            <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={downloadAsZip} title="Download all files as ZIP">
                                                                <Download size={12} />
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 bg-[#1e1e1e]">
                                                    {activeFile ? (
                                                        <Editor
                                                            height="100%"
                                                            defaultLanguage="typescript"
                                                            language={activeFile.language}
                                                            value={activeFile.content}
                                                            theme="vs-dark"
                                                            onChange={handleContentChange}
                                                            onMount={handleEditorMount}
                                                            options={{
                                                                minimap: { enabled: false },
                                                                fontSize: 14,
                                                                scrollBeyondLastLine: false,
                                                                padding: { top: 16 }
                                                            }}
                                                        />
                                                    ) : (
                                                        <div className="h-full flex items-center justify-center text-slate-600">
                                                            <div className="text-center">
                                                                <Code size={48} className="mx-auto mb-4 opacity-20" />
                                                                <p>Select a file to view code</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </Card>
                                        </div>
                                    )}

                                    {activeTab === "deploy" && selectedProject && (
                                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                            <div className="lg:col-span-2">
                                                <DeploymentManager
                                                    projectFiles={files}
                                                    projectName={selectedProject.name}
                                                    onDeploymentComplete={(url, platform) => {
                                                        toast({
                                                            title: "Deployment Successful",
                                                            description: `Deployed to ${platform}: ${url}`,
                                                        });
                                                    }}
                                                />
                                            </div>
                                            <div className="lg:col-span-1">
                                                <DevOpsLeaderboard />
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    </Tabs>
                </div>
            </div>

            <Dialog open={!!explanation} onOpenChange={(open) => !open && setExplanation(null)}>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto bg-slate-900 border-slate-800 text-slate-100">
                    <DialogHeader>
                        <DialogTitle>Code Explanation</DialogTitle>
                        <DialogDescription>
                            AI analysis of {activeFile?.path}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="prose prose-invert max-w-none whitespace-pre-wrap">
                        {explanation}
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={showPreview} onOpenChange={setShowPreview}>
                <DialogContent className="max-w-6xl max-h-[90vh] bg-slate-900 border-slate-800">
                    <DialogHeader>
                        <DialogTitle>Project Preview - {selectedProject?.name}</DialogTitle>
                        <DialogDescription>
                            Live preview of your application
                        </DialogDescription>
                    </DialogHeader>
                    <div className="w-full h-[80vh] border border-slate-800 rounded-lg overflow-hidden">
                        {previewUrl && (
                            <iframe
                                src={previewUrl}
                                className="w-full h-full border-0"
                                title="Project Preview"
                            />
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

