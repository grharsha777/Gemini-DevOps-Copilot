import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import Editor from "@monaco-editor/react";
import {
  Rocket,
  Smartphone,
  MessageSquare,
  Layers,
  Settings,
  Plus,
  Play,
  Cpu,
  Palette,
  Database,
  Code,
  Download,
  FileText,
  Save,
  ChevronRight,
  QrCode,
  Loader2,
} from "lucide-react";
import { MultiAgentSystem } from "@/components/multi-agent-system";

interface File {
  path: string;
  content: string;
  language: string;
}

export default function MobileAppBuilder() {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  const [prompt, setPrompt] = useState("");
  const [isBuilding, setIsBuilding] = useState(false);
  const [activeTab, setActiveTab] = useState("chat");
  const [mobileTheme, setMobileTheme] = useState<"light" | "dark">("dark");
  const [selectedFramework, setSelectedFramework] = useState("react-native");
  const [agentResults, setAgentResults] = useState<any>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [activeFile, setActiveFile] = useState<File | null>(null);
  const [layers, setLayers] = useState<any[]>([
    { id: '1', name: 'ScreenContainer', type: 'container', properties: { padding: 20, backgroundColor: '#050505' } },
    { id: '2', name: 'HeaderBar', type: 'component', properties: { height: 60, title: 'My App' } },
    { id: '3', name: 'CategorySlider', type: 'component', properties: { items: 5 } },
    { id: '4', name: 'FeaturedList', type: 'component', properties: { rows: 10 } },
    { id: '5', name: 'BottomNav', type: 'component', properties: { activeIndex: 0 } },
  ]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [showExpoDialog, setShowExpoDialog] = useState(false);
  const [isBuildLaunching, setIsBuildLaunching] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetch("/api/mobile/projects")
      .then((res) => res.json())
      .then((data) => setProjects(data.projects || []));
  }, []);

  const handleCreateProject = async () => {
    if (!prompt) return;
    setIsBuilding(true);
    try {
      const res = await fetch("/api/mobile/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: prompt.split(" ").slice(0, 3).join(" "),
          prompt,
        }),
      });
      const data = await res.json();
      if (data.project) {
        setProjects([data.project, ...projects]);
        setSelectedProject(data.project);
        setPrompt("");
        setActiveTab("editor");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsBuilding(false);
    }
  };

  const handleAgentTaskComplete = (result: any) => {
    setAgentResults(result);
    if (result.generatedFiles) {
      setFiles(result.generatedFiles);
      if (result.generatedFiles.length > 0) {
        setActiveFile(result.generatedFiles[0]);
      }
    }
    toast({
      title: "Task Completed",
      description: "Mobile components generated successfully.",
    });
    setActiveTab("code");
  };
  const handleLaunchBuild = async () => {
    if (!selectedProject) {
      toast({ title: "Select a project first", variant: "destructive" });
      return;
    }
    setIsBuildLaunching(true);
    toast({ title: "Build Pipeline Started", description: "Preparing Android/iOS assets..." });

    try {
      const res = await fetch(`/api/mobile/projects/${selectedProject.id}/build`, {
        method: 'POST'
      });
      if (res.ok) {
        toast({ title: "Build Queued", description: "You will receive a notification when the APK/IPA is ready." });
      }
    } catch (err) {
      toast({ title: "Build Error", description: "Failed to connect to build server.", variant: "destructive" });
    } finally {
      setTimeout(() => setIsBuildLaunching(false), 2000);
    }
  };

  const updateLayerProperty = (layerId: string, key: string, value: any) => {
    setLayers(prev => prev.map(l =>
      l.id === layerId ? { ...l, properties: { ...l.properties, [key]: value } } : l
    ));
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white p-6 font-['Outfit'] overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/20 blur-[120px] rounded-full" />

      <header className="flex items-center justify-between mb-8 relative z-10">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
            Mobile App Builder
          </h1>
          <p className="text-slate-400 text-sm mt-1 flex items-center gap-2">
            <Cpu size={14} className="text-indigo-400" /> Powered by CodeVortex
            Agentic Intelligence
            <span className="text-xs text-slate-500 ml-2">Built by G R Harsha</span>
          </p>
        </div>
        <div className="flex gap-4">
          <Button
            variant="outline"
            className="border-slate-800 bg-slate-900/50 hover:bg-slate-800 backdrop-blur-md"
          >
            Documentation
          </Button>
          <Button
            className="bg-indigo-600 hover:bg-indigo-500 shadow-[0_0_20px_rgba(79,70,229,0.4)]"
            onClick={handleLaunchBuild}
            disabled={isBuildLaunching}
          >
            {isBuildLaunching ? <Loader2 className="mr-2 animate-spin" size={18} /> : <Rocket className="mr-2" size={18} />}
            {isBuildLaunching ? "Building..." : "Launch Build"}
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-8 relative z-10 h-[calc(100vh-160px)]">
        {/* Left Sidebar: Control Panel */}
        <div className="col-span-3 flex flex-col gap-6 h-full">
          <Card className="bg-slate-900/40 border-slate-800/50 backdrop-blur-xl flex-1 flex flex-col">
            <CardContent className="p-4 flex flex-col h-full">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                  Your Projects
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 text-slate-400"
                >
                  <Plus size={14} />
                </Button>
              </div>
              <ScrollArea className="flex-1 -mx-2 px-2">
                <div className="space-y-2">
                  {projects.map((p) => (
                    <motion.div
                      key={p.id}
                      whileHover={{ x: 4 }}
                      onClick={() => setSelectedProject(p)}
                      className={`p-3 rounded-xl cursor-pointer transition-all border ${selectedProject?.id === p.id
                        ? "bg-indigo-600/10 border-indigo-500/50 text-indigo-400"
                        : "border-transparent text-slate-400 hover:bg-slate-800/50"
                        }`}
                    >
                      <div className="font-medium flex items-center gap-3">
                        <Smartphone size={16} /> {p.name}
                      </div>
                    </motion.div>
                  ))}
                  {projects.length === 0 && (
                    <div className="text-center py-8 text-slate-500 text-sm">
                      No projects yet
                    </div>
                  )}
                </div>
              </ScrollArea>

              <div className="mt-4 pt-4 border-t border-slate-800">
                <div className="bg-slate-950/50 p-3 rounded-2xl border border-slate-800/50">
                  <p className="text-xs text-slate-500 mb-2">PRO TIER STATUS</p>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 w-3/4" />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2">
                    75/100 AI Credits used
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Center: Main Editor / Chat Area */}
        <div className="col-span-6 flex flex-col gap-6 h-full">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex-1 flex flex-col"
          >
            <TabsList className="bg-slate-900/40 border-slate-800/50 backdrop-blur-xl p-1 rounded-2xl w-fit mx-auto mb-6">
              <TabsTrigger
                value="chat"
                className="rounded-xl px-6 data-[state=active]:bg-indigo-600"
              >
                <MessageSquare className="mr-2" size={16} /> AI Chat
              </TabsTrigger>
              <TabsTrigger
                value="agents"
                className="rounded-xl px-6 data-[state=active]:bg-indigo-600"
                disabled={!selectedProject}
              >
                <Cpu className="mr-2" size={16} /> Agent Swarm
              </TabsTrigger>
              <TabsTrigger
                value="editor"
                className="rounded-xl px-6 data-[state=active]:bg-indigo-600"
              >
                <Layers className="mr-2" size={16} /> Visual Editor
              </TabsTrigger>
              <TabsTrigger
                value="code"
                className="rounded-xl px-6 data-[state=active]:bg-indigo-600"
              >
                <Code className="mr-2" size={16} /> Code
              </TabsTrigger>
              <TabsTrigger
                value="config"
                className="rounded-xl px-6 data-[state=active]:bg-indigo-600"
              >
                <Settings className="mr-2" size={16} /> Config
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 relative">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="h-full"
                >
                  {activeTab === "chat" && (
                    <div className="flex flex-col h-full bg-slate-900/40 border-slate-800/50 backdrop-blur-xl rounded-3xl overflow-hidden p-6">
                      <ScrollArea className="flex-1 mb-4 pr-4">
                        <div className="space-y-6">
                          <div className="flex gap-4">
                            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-[0_0_15px_rgba(79,70,229,0.3)]">
                              <Cpu size={20} />
                            </div>
                            <div className="bg-slate-800/50 p-4 rounded-2xl rounded-tl-none max-w-[80%] border border-slate-700/50">
                              <p className="text-slate-200">
                                Hello! I'm your Mobile App Architect. Tell me
                                about the app you want to build. You can even
                                upload a screenshot of a design!
                              </p>
                            </div>
                          </div>

                          {selectedProject && (
                            <div className="flex gap-4 flex-row-reverse">
                              <div className="w-10 h-10 rounded-2xl bg-slate-700 flex items-center justify-center">
                                <span className="font-bold">H</span>
                              </div>
                              <div className="bg-indigo-600 p-4 rounded-2xl rounded-tr-none max-w-[80%] shadow-[0_5px_15px_rgba(79,70,229,0.2)]">
                                <p className="text-white">
                                  Build a coffee delivery app with a minimalist
                                  design and Apple Pay integration.
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </ScrollArea>

                      <div className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl blur opacity-25 group-focus-within:opacity-50 transition duration-1000"></div>
                        <div className="relative flex items-center bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden">
                          <Input
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="Describe your app or features..."
                            className="border-0 bg-transparent py-6 text-lg focus-visible:ring-0 focus-visible:ring-offset-0"
                            onKeyDown={(e) =>
                              e.key === "Enter" && handleCreateProject()
                            }
                          />
                          <Button
                            onClick={handleCreateProject}
                            disabled={isBuilding || !prompt}
                            className="mr-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl px-4 h-12"
                          >
                            {isBuilding ? (
                              <span className="animate-spin mr-2">⏳</span>
                            ) : (
                              <Play size={18} className="mr-2" />
                            )}
                            {isBuilding ? "Designing..." : "Generate"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === "config" && (
                    <Card className="bg-slate-900/40 border-slate-800/50 backdrop-blur-xl rounded-3xl h-full">
                      <CardContent className="p-6">
                        <div className="text-lg font-bold mb-6">
                          App Configuration
                        </div>
                        <div className="space-y-6 max-w-xl">
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-400">
                              App Name
                            </label>
                            <Input
                              defaultValue={selectedProject?.name}
                              className="bg-slate-950 border-slate-800"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-400">
                              Bundle Identifier
                            </label>
                            <Input
                              defaultValue={`com.codevortex.${selectedProject?.name?.toLowerCase().replace(/\s+/g, "-") || "app"}`}
                              className="bg-slate-950 border-slate-800"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-400">
                              Version
                            </label>
                            <Input
                              defaultValue="1.0.0"
                              className="bg-slate-950 border-slate-800"
                            />
                          </div>
                          <div className="pt-4">
                            <Button className="w-full bg-indigo-600 hover:bg-indigo-500">
                              <Save className="mr-2" size={16} /> Save
                              Configuration
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {activeTab === "agents" && selectedProject && (
                    <div className="h-full overflow-y-auto">
                      <MultiAgentSystem
                        projectType="mobile"
                        onTaskComplete={handleAgentTaskComplete}
                        currentProject={{
                          files: files,
                          requirements: `Mobile App (${selectedFramework}): ${selectedProject.prompt || selectedProject.description || prompt || "Mobile app development task"}`,
                          projectType: "mobile"
                        }}
                      />
                    </div>
                  )}

                  {activeTab === "editor" && (
                    <div className="grid grid-cols-2 gap-6 h-full">
                      <Card className="bg-slate-900/40 border-slate-800/50 backdrop-blur-xl rounded-3xl">
                        <CardContent className="p-4 h-full flex flex-col">
                          <div className="text-xs font-semibold text-slate-500 mb-4 uppercase">
                            Layer Hierarchy
                          </div>
                          <ScrollArea className="flex-1 -mx-2 px-2">
                            <div className="space-y-1">
                              {layers.map((l) => (
                                <div
                                  key={l.id}
                                  onClick={() => setSelectedLayerId(l.id)}
                                  className={`p-2 rounded-lg text-sm flex items-center justify-between border transition-all cursor-pointer ${selectedLayerId === l.id
                                    ? "bg-indigo-600/20 border-indigo-500/30 text-indigo-400"
                                    : "bg-slate-800/20 border-transparent hover:border-slate-700 text-slate-400"
                                    }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <Layers size={14} className={selectedLayerId === l.id ? "text-indigo-400" : "text-slate-500"} />
                                    <span>{l.name}</span>
                                  </div>
                                  <ChevronRight size={12} className={selectedLayerId === l.id ? "text-indigo-400" : "text-slate-600"} />
                                </div>
                              ))}
                            </div>
                          </ScrollArea>

                          <div className="mt-8">
                            <div className="text-xs font-semibold text-slate-500 mb-4 uppercase">
                              Design Styles
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              {[
                                "Dark Mode",
                                "Glass",
                                "Neumorphic",
                                "Minimal",
                              ].map((s) => (
                                <button
                                  key={s}
                                  className="p-3 bg-slate-950/80 rounded-xl text-xs border border-slate-800 hover:border-indigo-500 transition-colors"
                                >
                                  {s}
                                </button>
                              ))}
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-slate-900/40 border-slate-800/50 backdrop-blur-xl rounded-3xl">
                        <CardContent className="p-4 h-full flex flex-col">
                          <div className="text-xs font-semibold text-slate-500 mb-4 uppercase">
                            Property Inspector
                          </div>
                          {selectedLayerId ? (
                            <div className="space-y-4">
                              <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/50">
                                <p className="text-[10px] text-slate-500 mb-1 uppercase tracking-wider">Layer Name</p>
                                <Input
                                  value={layers.find(l => l.id === selectedLayerId)?.name}
                                  className="h-8 bg-transparent border-slate-800 text-sm"
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setLayers(prev => prev.map(l => l.id === selectedLayerId ? { ...l, name: val } : l));
                                  }}
                                />
                              </div>

                              <div className="space-y-3 px-1">
                                {Object.entries(layers.find(l => l.id === selectedLayerId)?.properties || {}).map(([key, val]) => (
                                  <div key={key} className="space-y-1">
                                    <label className="text-[10px] text-slate-500 uppercase tracking-widest">{key}</label>
                                    <Input
                                      value={val as string}
                                      className="h-8 bg-slate-950/50 border-slate-800 text-xs"
                                      onChange={(e) => updateLayerProperty(selectedLayerId, key, e.target.value)}
                                    />
                                  </div>
                                ))}
                              </div>

                              <Button className="w-full mt-4 bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-600/30 h-9 text-xs">
                                <Palette size={14} className="mr-2" /> Apply Styles
                              </Button>
                            </div>
                          ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-600 text-center gap-3">
                              <Settings size={24} className="opacity-20" />
                              <p className="text-xs">Select a layer to inspect properties</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {activeTab === "code" && (
                    <div className="h-full bg-slate-900/40 border-slate-800/50 backdrop-blur-xl rounded-3xl overflow-hidden flex flex-col">
                      <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
                        <div className="flex gap-2 bg-slate-950 p-1 rounded-lg border border-slate-800">
                          <button
                            onClick={() => setSelectedFramework("react-native")}
                            className={`px-4 py-2 rounded-md text-xs font-medium transition-colors ${selectedFramework === "react-native" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"}`}
                          >
                            React Native
                          </button>
                          <button
                            onClick={() => setSelectedFramework("flutter")}
                            className={`px-4 py-2 rounded-md text-xs font-medium transition-colors ${selectedFramework === "flutter" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"}`}
                          >
                            Flutter
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          {activeFile && (
                            <span className="text-xs text-slate-500 mr-2">
                              {activeFile.path}
                            </span>
                          )}
                          <Button
                            size="sm"
                            className="bg-indigo-600 hover:bg-indigo-500 h-8"
                          >
                            <Download size={14} className="mr-2" /> Export APK
                          </Button>
                        </div>
                      </div>

                      <div className="flex-1 grid grid-cols-12 min-h-0">
                        {/* File Explorer */}
                        <div className="col-span-3 border-r border-slate-800 p-2 overflow-y-auto bg-slate-950/30">
                          <div className="text-xs font-semibold text-slate-500 mb-2 px-2 py-2 uppercase tracking-wider">
                            Project Files
                          </div>
                          {files.length === 0 ? (
                            <div className="text-center py-8 text-slate-600 text-xs px-4">
                              No code generated yet. Use the Agent Swarm to
                              build your app.
                            </div>
                          ) : (
                            files.map((f) => (
                              <div
                                key={f.path}
                                onClick={() => setActiveFile(f)}
                                className={`p-2 rounded-lg text-sm flex items-center gap-2 cursor-pointer transition-colors ${activeFile?.path === f.path
                                  ? "bg-indigo-600/20 text-indigo-400"
                                  : "hover:bg-slate-800/50 text-slate-400"
                                  }`}
                              >
                                <FileText size={14} />
                                <span className="truncate">{f.path}</span>
                              </div>
                            ))
                          )}
                        </div>

                        {/* Editor */}
                        <div className="col-span-9 bg-[#1e1e1e]">
                          {activeFile ? (
                            <Editor
                              height="100%"
                              defaultLanguage="typescript"
                              language={activeFile.language}
                              value={activeFile.content}
                              theme="vs-dark"
                              options={{
                                minimap: { enabled: false },
                                fontSize: 14,
                                scrollBeyondLastLine: false,
                                padding: { top: 16 },
                              }}
                            />
                          ) : (
                            <div className="h-full flex items-center justify-center text-slate-600 flex-col gap-4">
                              <Code size={48} className="opacity-20" />
                              <p>Select a file to view code</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </Tabs>
        </div>

        {/* Right Sidebar: Mobile Preview */}
        <div className="col-span-3 h-full flex items-center justify-center">
          <div className="relative w-[320px] h-[640px] bg-slate-950 rounded-[50px] border-[8px] border-slate-900 shadow-[0_0_80px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden">
            {/* Notch */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-900 rounded-b-2xl z-20" />

            {/* Screen Content */}
            {/* Screen Content */}
            <div
              className={`flex-1 flex flex-col pt-10 transition-colors duration-500 ${mobileTheme === "dark" ? "bg-slate-950 text-white" : "bg-white text-slate-900"}`}
            >
              {selectedProject ? (
                <div className="flex-1 flex flex-col">
                  <div className="px-6 py-4 flex justify-between items-center">
                    <span
                      className={`font-bold text-xl ${mobileTheme === "dark" ? "text-white" : "text-slate-900"}`}
                    >
                      {selectedProject.name}
                    </span>
                    <div
                      className={`w-8 h-8 rounded-full ${mobileTheme === "dark" ? "bg-slate-800" : "bg-slate-100"}`}
                    />
                  </div>

                  <div className="px-6 mt-4">
                    <div
                      className={`h-40 rounded-3xl flex items-center justify-center p-6 mb-8 ${mobileTheme === "dark" ? "bg-indigo-500/10" : "bg-indigo-50"}`}
                    >
                      <div className="text-center">
                        <p className="text-indigo-600 font-bold text-lg mb-2">
                          20% Discount
                        </p>
                        <p
                          className={`${mobileTheme === "dark" ? "text-indigo-400" : "text-indigo-400"} text-xs uppercase tracking-widest`}
                        >
                          On your first order
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4 mb-6">
                      <span className="text-sm font-bold border-b-2 border-indigo-600 pb-1">
                        Hot Brew
                      </span>
                      <span
                        className={`text-sm ${mobileTheme === "dark" ? "text-slate-500" : "text-slate-400"}`}
                      >
                        Cold Brew
                      </span>
                      <span
                        className={`text-sm ${mobileTheme === "dark" ? "text-slate-500" : "text-slate-400"}`}
                      >
                        Bakery
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div
                        className={`rounded-3xl p-4 ${mobileTheme === "dark" ? "bg-slate-900" : "bg-slate-50"}`}
                      >
                        <div
                          className={`h-24 rounded-2xl mb-3 shadow-sm flex items-center justify-center text-2xl ${mobileTheme === "dark" ? "bg-slate-800" : "bg-white"}`}
                        >
                          ☕
                        </div>
                        <p
                          className={`font-bold text-sm ${mobileTheme === "dark" ? "text-white" : "text-slate-900"}`}
                        >
                          Latte Art
                        </p>
                        <p className="text-indigo-600 font-bold text-xs">
                          $4.50
                        </p>
                      </div>
                      <div
                        className={`rounded-3xl p-4 ${mobileTheme === "dark" ? "bg-slate-900" : "bg-slate-50"}`}
                      >
                        <div
                          className={`h-24 rounded-2xl mb-3 shadow-sm flex items-center justify-center text-2xl ${mobileTheme === "dark" ? "bg-slate-800" : "bg-white"}`}
                        >
                          🥐
                        </div>
                        <p
                          className={`font-bold text-sm ${mobileTheme === "dark" ? "text-white" : "text-slate-900"}`}
                        >
                          Croissant
                        </p>
                        <p className="text-indigo-600 font-bold text-xs">
                          $3.20
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Navigation */}
                  <div
                    className={`mt-auto h-20 border-t flex justify-around items-center px-4 ${mobileTheme === "dark" ? "border-slate-800" : "border-slate-100"}`}
                  >
                    <div className="text-indigo-600">
                      <Smartphone size={20} />
                    </div>
                    <div className="text-slate-500">
                      <Layers size={20} />
                    </div>
                    <div className="text-slate-500">
                      <MessageSquare size={20} />
                    </div>
                    <div className="text-slate-500">
                      <Settings size={20} />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center italic">
                  <Cpu size={48} className="mb-4 opacity-20 text-indigo-500" />
                  Describe an app to see it come to life here
                </div>
              )}
            </div>

            {/* Status Bar */}
            <div className="absolute top-2 left-8 right-8 flex justify-between text-[10px] text-slate-500 font-medium z-30">
              <span>9:41</span>
              <div className="flex gap-1 items-center">
                <div className="w-3 h-2 bg-slate-600 rounded-sm" />
                <div className="w-4 h-2 bg-slate-400 rounded-sm" />
              </div>
            </div>
          </div>

          {/* Controls below mobile */}
          <div className="absolute bottom-6 flex gap-4">
            <Button
              size="sm"
              variant="outline"
              className={`rounded-full border-slate-800 ${mobileTheme === "dark" ? "bg-slate-900/50" : "bg-slate-100 text-slate-900 font-semibold"}`}
              onClick={() =>
                setMobileTheme((prev) => (prev === "dark" ? "light" : "dark"))
              }
            >
              <Palette size={14} className="mr-2" />{" "}
              {mobileTheme === "dark" ? "Dark" : "Light"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="rounded-full bg-slate-900/50 border-slate-800"
              onClick={() => setShowExpoDialog(true)}
            >
              <Smartphone size={14} className="mr-2" /> Expo Go
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={showExpoDialog} onOpenChange={setShowExpoDialog}>
        <DialogContent className="bg-[#151a24] border-white/10 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-indigo-400" />
              Preview on Device
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Scan this QR code with the Expo Go app on your iOS or Android
              device to preview your app in real-time.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-6 space-y-4">
            <div className="bg-white p-4 rounded-xl shadow-lg shadow-indigo-500/10">
              {/* Placeholder QR Code - In production this would be generated */}
              <div className="w-48 h-48 bg-slate-900 relative flex items-center justify-center">
                <QrCode className="w-24 h-24 text-slate-700" />
                <div className="absolute inset-0 border-4 border-slate-900 rounded-lg"></div>
                <div className="absolute inset-0 border-4 border-white rounded-lg mix-blend-difference"></div>
              </div>
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-medium text-white">
                Waiting for connection...
              </p>
              <p className="text-xs text-slate-500">
                Make sure your device is on the same network
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setShowExpoDialog(false)}
              className="text-slate-400 hover:text-white"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
