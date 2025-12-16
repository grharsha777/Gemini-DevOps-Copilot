import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MultimodalInput } from "@/components/multimodal-input";
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
  MessageSquare
} from "lucide-react";

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
}

export default function Playground() {
  const [activeTab, setActiveTab] = useState<string>("");
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [files, setFiles] = useState<FileNode[]>([]);
  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [terminalHistory, setTerminalHistory] = useState<string[]>([]);
  const [currentCommand, setCurrentCommand] = useState("");
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const terminalInputRef = useRef<HTMLInputElement>(null);
  const [panelSizes, setPanelSizes] = useState([20, 50, 30]); // sidebar, editor, preview

  // Initialize with a sample project structure
  useEffect(() => {
    const sampleFiles: FileNode[] = [
      {
        name: "src",
        type: "folder",
        path: "src",
        children: [
          {
            name: "index.js",
            type: "file",
            path: "src/index.js",
            content: `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`
          },
          {
            name: "App.js",
            type: "file",
            path: "src/App.js",
            content: `import React, { useState } from 'react';

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="App">
      <header className="App-header">
        <h1>Hello CodeVortexAI!</h1>
        <p>Count: {count}</p>
        <button onClick={() => setCount(count + 1)}>
          Increment
        </button>
      </header>
    </div>
  );
}

export default App;`
          },
          {
            name: "index.css",
            type: "file",
            path: "src/index.css",
            content: `body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.App {
  text-align: center;
}

.App-header {
  background-color: #282c34;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: calc(10px + 2vmin);
  color: white;
}

button {
  font-size: calc(10px + 2vmin);
  padding: 10px 20px;
  margin: 20px;
  border: none;
  border-radius: 5px;
  background-color: #61dafb;
  color: #282c34;
  cursor: pointer;
}

button:hover {
  background-color: #21b4d4;
}`
          }
        ]
      },
      {
        name: "package.json",
        type: "file",
        path: "package.json",
        content: `{
  "name": "codevortex-app",
  "version": "0.1.0",
  "private": true,
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-scripts": "5.0.1"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  }
}`
      },
      {
        name: "README.md",
        type: "file",
        path: "README.md",
        content: `# CodeVortexAI App

A React application built with CodeVortexAI's Ganapathi App Builder.

## Getting Started

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Start the development server:
   \`\`\`bash
   npm start
   \`\`\`

3. Open [http://localhost:3000](http://localhost:3000) to view it in the browser.
`
      }
    ];

    setFiles(sampleFiles);

    // Open the main App.js file by default
    const appFile = sampleFiles[0].children?.find(f => f.name === "App.js");
    if (appFile) {
      openFile(appFile);
    }
  }, []);

  const openFile = (file: FileNode) => {
    const existingTab = tabs.find(tab => tab.path === file.path);
    if (existingTab) {
      setActiveTab(existingTab.id);
      return;
    }

    const newTab: Tab = {
      id: Date.now().toString(),
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
      case 'py': return 'python';
      case 'java': return 'java';
      case 'cpp': case 'cc': case 'cxx': return 'cpp';
      case 'c': return 'c';
      case 'go': return 'go';
      case 'rs': return 'rust';
      case 'php': return 'php';
      case 'rb': return 'ruby';
      case 'html': return 'html';
      case 'css': return 'css';
      case 'scss': case 'sass': return 'scss';
      case 'json': return 'json';
      case 'md': return 'markdown';
      case 'sql': return 'sql';
      case 'sh': case 'bash': return 'bash';
      case 'yml': case 'yaml': return 'yaml';
      default: return 'text';
    }
  };

  const closeTab = (tabId: string) => {
    setTabs(prev => {
      const newTabs = prev.filter(tab => tab.id !== tabId);
      if (activeTab === tabId && newTabs.length > 0) {
        setActiveTab(newTabs[0].id);
      }
      return newTabs;
    });
  };

  const updateTabContent = (tabId: string, content: string) => {
    setTabs(prev => prev.map(tab =>
      tab.id === tabId
        ? { ...tab, content, isDirty: true }
        : tab
    ));
  };

  const runCode = async () => {
    const currentTab = tabs.find(tab => tab.id === activeTab);
    if (!currentTab) return;

    setIsRunning(true);
    setTerminalHistory(prev => [...prev, `$ Running ${currentTab.name}...`]);

    try {
      // Enhanced AI execution with multimodal support
      const resp = await fetch('/api/ai/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: currentTab.content,
          language: currentTab.language,
          files: tabs.map(tab => ({ path: tab.path, content: tab.content }))
        })
      });

      const data = await resp.json();

      if (data.success) {
        setOutput(data.output || "Code executed successfully!");
        setTerminalHistory(prev => [...prev, `✓ Execution completed`]);
      } else {
        setOutput(data.error || "Execution failed");
        setTerminalHistory(prev => [...prev, `✗ Execution failed: ${data.error}`]);
      }
    } catch (err) {
      console.error(err);
      setOutput('Failed to execute code');
      setTerminalHistory(prev => [...prev, `✗ Network error during execution`]);
    } finally {
      setIsRunning(false);
    }
  };

  const executeTerminalCommand = async () => {
    if (!currentCommand.trim()) return;

    setTerminalHistory(prev => [...prev, `$ ${currentCommand}`]);

    try {
      // Send command to AI-powered terminal
      const resp = await fetch('/api/terminal/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: currentCommand })
      });

      const data = await resp.json();
      setTerminalHistory(prev => [...prev, data.output || "Command executed"]);
    } catch (err) {
      setTerminalHistory(prev => [...prev, "Command failed"]);
    }

    setCurrentCommand("");
  };

  const deployToGithub = async () => {
    try {
      const resp = await fetch('/api/deploy/github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: tabs.map(tab => ({ path: tab.path, content: tab.content })),
          projectName: "codevortex-app"
        })
      });

      const data = await resp.json();
      if (data.url) {
        setTerminalHistory(prev => [...prev, `🚀 Deployed to: ${data.url}`]);
      }
    } catch (err) {
      setTerminalHistory(prev => [...prev, "Deployment failed"]);
    }
  };

  const handleMultimodalInput = async (data: {
    text?: string;
    images?: File[];
    audio?: File[];
    video?: File[];
    files?: File[];
    urls?: string[];
  }) => {
    setIsAiProcessing(true);
    setTerminalHistory(prev => [...prev, `🤖 Processing multimodal input...`]);

    try {
      // Create FormData for file uploads
      const formData = new FormData();

      if (data.text) formData.append('text', data.text);
      if (data.urls) formData.append('urls', JSON.stringify(data.urls));

      // Add all media files
      data.images?.forEach(file => formData.append('images', file));
      data.audio?.forEach(file => formData.append('audio', file));
      data.video?.forEach(file => formData.append('video', file));
      data.files?.forEach(file => formData.append('files', file));

      // Add current project context
      formData.append('projectFiles', JSON.stringify(
        tabs.map(tab => ({ path: tab.path, content: tab.content, language: tab.language }))
      ));

      const resp = await fetch('/api/ai/multimodal', {
        method: 'POST',
        body: formData
      });

      const result = await resp.json();

      if (result.success) {
        setTerminalHistory(prev => [...prev, `✅ AI generated ${result.files?.length || 0} files`]);

        // Add generated files to tabs
        if (result.files) {
          result.files.forEach((file: { path: string; content: string }) => {
            const existingTab = tabs.find(tab => tab.path === file.path);
            if (existingTab) {
              updateTabContent(existingTab.id, file.content);
            } else {
              const newTab: Tab = {
                id: Date.now() + Math.random().toString(36).substr(2, 9),
                name: file.path.split('/').pop() || file.path,
                path: file.path,
                content: file.content,
                language: getLanguageFromPath(file.path),
                isDirty: true
              };
              setTabs(prev => [...prev, newTab]);
            }
          });
        }

        if (result.output) {
          setOutput(result.output);
        }
      } else {
        setTerminalHistory(prev => [...prev, `❌ AI processing failed: ${result.error}`]);
      }
    } catch (err) {
      console.error(err);
      setTerminalHistory(prev => [...prev, "❌ Multimodal processing failed"]);
    } finally {
      setIsAiProcessing(false);
    }
  };

  const renderFileTree = (nodes: FileNode[], level = 0) => {
    return nodes.map(node => (
      <div key={node.path} style={{ paddingLeft: `${level * 12}px` }}>
        <div
          className="flex items-center gap-2 p-1 hover:bg-accent rounded cursor-pointer text-sm"
          onClick={() => node.type === 'file' && openFile(node)}
        >
          {node.type === 'folder' ? <FolderOpen className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
          <span>{node.name}</span>
        </div>
        {node.children && renderFileTree(node.children, level + 1)}
      </div>
    ));
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* VS Code-style Toolbar */}
      <div className="flex items-center justify-between p-2 border-b bg-card">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            <Zap className="w-3 h-3 mr-1" />
            Ganapathi Playground
          </Badge>
          <Button size="sm" variant="ghost" onClick={runCode} disabled={isRunning}>
            <Play className="w-4 h-4 mr-1" />
            {isRunning ? "Running..." : "Run"}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setIsRunning(false)}>
            <Square className="w-4 h-4 mr-1" />
            Stop
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <Button size="sm" variant="ghost" onClick={deployToGithub}>
            <Github className="w-4 h-4 mr-1" />
            Deploy
          </Button>
          <Button size="sm" variant="ghost">
            <Share className="w-4 h-4 mr-1" />
            Share
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" variant="ghost" disabled={isAiProcessing}>
                <Sparkles className="w-4 h-4 mr-1" />
                {isAiProcessing ? "Processing..." : "AI Assistant"}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  Ganapathi Multimodal AI Assistant
                </DialogTitle>
              </DialogHeader>
              <MultimodalInput
                onSubmit={handleMultimodalInput}
                isLoading={isAiProcessing}
                placeholder="Describe your app, upload designs, voice notes, or share URLs to generate code..."
              />
            </DialogContent>
          </Dialog>
          <Button size="sm" variant="ghost">
            <Users className="w-4 h-4 mr-1" />
            Collaborate
          </Button>
          <Button size="sm" variant="ghost">
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex border-b bg-card overflow-x-auto">
        {tabs.map(tab => (
          <div
            key={tab.id}
            className={`flex items-center gap-2 px-3 py-2 border-r cursor-pointer hover:bg-accent min-w-0 ${
              activeTab === tab.id ? 'bg-accent border-b-2 border-primary' : ''
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            <FileText className="w-4 h-4 flex-shrink-0" />
            <span className="truncate text-sm">{tab.name}</span>
            {tab.isDirty && <div className="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0" />}
            <button
              className="ml-2 hover:bg-destructive hover:text-destructive-foreground rounded px-1"
              onClick={(e) => {
                e.stopPropagation();
                closeTab(tab.id);
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          {/* Sidebar */}
          <ResizablePanel defaultSize={panelSizes[0]} minSize={15}>
            <div className="h-full border-r bg-card">
              <div className="p-2 border-b">
                <h3 className="text-sm font-medium">Explorer</h3>
              </div>
              <ScrollArea className="h-full">
                <div className="p-2">
                  {renderFileTree(files)}
                </div>
              </ScrollArea>
            </div>
          </ResizablePanel>

          <ResizableHandle />

          {/* Editor */}
          <ResizablePanel defaultSize={panelSizes[1]} minSize={30}>
            <div className="h-full flex flex-col">
              {tabs.map(tab => (
                <div
                  key={tab.id}
                  className={`flex-1 ${activeTab === tab.id ? 'block' : 'hidden'}`}
                >
                  <textarea
                    className="w-full h-full p-4 font-mono text-sm resize-none border-0 outline-none bg-background"
                    value={tab.content}
                    onChange={(e) => updateTabContent(tab.id, e.target.value)}
                    placeholder={`// ${tab.language} code here...`}
                  />
                </div>
              ))}
              {tabs.length === 0 && (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Select a file to start coding</p>
                  </div>
                </div>
              )}
            </div>
          </ResizablePanel>

          <ResizableHandle />

          {/* Preview/Terminal */}
          <ResizablePanel defaultSize={panelSizes[2]} minSize={20}>
            <Tabs defaultValue="preview" className="h-full flex flex-col">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="preview" className="flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  Preview
                </TabsTrigger>
                <TabsTrigger value="terminal" className="flex items-center gap-2">
                  <Terminal className="w-4 h-4" />
                  Terminal
                </TabsTrigger>
              </TabsList>

              <TabsContent value="preview" className="flex-1 m-0">
                <ScrollArea className="h-full">
                  <div className="p-4">
                    <pre className="text-sm font-mono whitespace-pre-wrap">{output}</pre>
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="terminal" className="flex-1 m-0 flex flex-col">
                <ScrollArea className="flex-1 p-2">
                  <div className="space-y-1">
                    {terminalHistory.map((line, i) => (
                      <div key={i} className="text-sm font-mono">
                        {line}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <div className="p-2 border-t flex gap-2">
                  <span className="text-sm font-mono text-muted-foreground">$</span>
                  <input
                    ref={terminalInputRef}
                    className="flex-1 bg-transparent outline-none text-sm font-mono"
                    value={currentCommand}
                    onChange={(e) => setCurrentCommand(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        executeTerminalCommand();
                      }
                    }}
                    placeholder="Type a command..."
                  />
                </div>
              </TabsContent>
            </Tabs>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
