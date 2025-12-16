import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MultiAgentSystem } from "@/components/multi-agent-system";
import { DeploymentManager } from "@/components/deployment-manager";

export default function AppBuilder() {
  const [projects, setProjects] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [files, setFiles] = useState<any[]>([]);
  const [openPath, setOpenPath] = useState<string | null>(null);
  const [editorContent, setEditorContent] = useState<string>("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [agentResults, setAgentResults] = useState<any>(null);

  useEffect(() => {
    fetch('/api/projects')
      .then(r => r.json())
      .then(d => setProjects(d.projects || []))
      .catch(() => {});
  }, []);

  async function createProject(e: any) {
    e.preventDefault();
    try {
      const resp = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, public: true })
      });
      const data = await resp.json();
      if (data.project) {
        setProjects(prev => [data.project, ...prev]);
        setName(''); setDescription('');
      } else {
        alert(data.error || 'Failed');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to create project');
    }
  }

  async function selectProject(p: any) {
    setSelected(p);
    setOpenPath(null);
    setEditorContent('');
    try {
      const res = await fetch(`/api/projects/${p.id}/files`);
      const data = await res.json();
      setFiles(data.files || []);
    } catch (err) {
      console.error(err);
      setFiles([]);
    }
  }

  async function openFile(path: string) {
    if (!selected) return;
    try {
      const res = await fetch(`/api/projects/${selected.id}/files/${encodeURIComponent(path)}`);
      const data = await res.json();
      setOpenPath(path);
      setEditorContent(data.file?.content || '');
    } catch (err) {
      console.error(err);
      alert('Failed to open file');
    }
  }

  async function saveFile() {
    if (!selected || !openPath) return alert('Open a file first');
    try {
      const res = await fetch(`/api/projects/${selected.id}/files`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ path: openPath, content: editorContent }) });
      const data = await res.json();
      if (data.file) {
        setFiles(prev => {
          const exists = prev.find(f => f.path === data.file.path);
          if (exists) return prev.map(f => f.path === data.file.path ? data.file : f);
          return [...prev, data.file];
        });
        alert('Saved');
      } else alert('Save failed');
    } catch (err) { console.error(err); alert('Save failed'); }
  }

  async function createNewFile() {
    const path = prompt('File path (e.g. src/index.js)');
    if (!path || !selected) return;
    try {
      const res = await fetch(`/api/projects/${selected.id}/files`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ path, content: '' }) });
      const data = await res.json();
      if (data.file) {
        setFiles(prev => [data.file, ...prev]);
        openFile(data.file.path);
      }
    } catch (err) { console.error(err); alert('Create failed'); }
  }

  async function deleteFile(path: string) {
    if (!selected) return;
    if (!confirm(`Delete ${path}?`)) return;
    try {
      const res = await fetch(`/api/projects/${selected.id}/files`, { method: 'DELETE', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ path }) });
      const data = await res.json();
      setFiles(prev => prev.filter(f => f.path !== path));
      if (openPath === path) { setOpenPath(null); setEditorContent(''); }
    } catch (err) { console.error(err); alert('Delete failed'); }
  }

  const handleAgentTaskComplete = (result: any) => {
    setAgentResults(result);
    alert('Multi-agent task completed! Generated components are ready.');
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Ganapathi App Builder</h1>
        <p className="text-muted-foreground">
          AI-powered full-stack application development with multi-agent collaboration
        </p>
      </div>

      <Tabs defaultValue="agents" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="agents">Multi-Agent Builder</TabsTrigger>
          <TabsTrigger value="projects">Project Manager</TabsTrigger>
          <TabsTrigger value="results">Generated Code</TabsTrigger>
          <TabsTrigger value="deploy">Deploy & Share</TabsTrigger>
        </TabsList>

        <TabsContent value="agents" className="mt-6">
          <MultiAgentSystem
            onTaskComplete={handleAgentTaskComplete}
            currentProject={selected ? {
              files: files.map(f => ({ path: f.path, content: f.content || '', language: 'javascript' })),
              requirements: selected.description
            } : undefined}
          />
        </TabsContent>

        <TabsContent value="projects" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Create Project</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={createProject} className="space-y-4">
                    <div>
                      <input
                        className="w-full p-2 border rounded"
                        placeholder="Project name"
                        value={name}
                        onChange={e => setName(e.target.value)}
                      />
                    </div>
                    <div>
                      <textarea
                        className="w-full p-2 border rounded"
                        placeholder="Project description and requirements"
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        rows={3}
                      />
                    </div>
                    <Button type="submit" className="w-full">Create Project</Button>
                  </form>
                </CardContent>
              </Card>

              <Card className="mt-4">
                <CardHeader>
                  <CardTitle>Your Projects</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {projects.map((p) => (
                      <div
                        key={p.id}
                        className={`p-3 border rounded cursor-pointer hover:bg-accent ${selected?.id === p.id ? 'bg-accent border-primary' : ''}`}
                        onClick={() => selectProject(p)}
                      >
                        <div className="font-medium">{p.name}</div>
                        <div className="text-sm text-muted-foreground">{p.description}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="md:col-span-2">
              {selected ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      Project: {selected.name}
                      <div className="flex gap-2">
                        <Button onClick={createNewFile} size="sm">New File</Button>
                        <Button onClick={saveFile} disabled={!openPath} size="sm">Save</Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="col-span-1 border rounded p-3 h-96 overflow-auto">
                        <div className="font-medium mb-2">Files</div>
                        {files.length === 0 && <div className="text-sm text-muted-foreground">No files</div>}
                        <ul className="space-y-1">
                          {files.map((f) => (
                            <li key={f.path} className="flex justify-between items-center">
                              <button
                                className="text-left text-sm text-primary hover:underline truncate"
                                onClick={() => openFile(f.path)}
                              >
                                {f.path}
                              </button>
                              <button
                                className="text-xs text-red-500 hover:bg-red-50 px-1 rounded ml-2"
                                onClick={() => deleteFile(f.path)}
                              >
                                ×
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="col-span-2 border rounded p-3 h-96">
                        <div className="mb-2 font-medium">
                          Editor {openPath ? `— ${openPath}` : ''}
                        </div>
                        <textarea
                          className="w-full h-80 font-mono p-2 border rounded resize-none"
                          value={editorContent}
                          onChange={e => setEditorContent(e.target.value)}
                          placeholder="Select a file to edit..."
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="flex items-center justify-center h-96">
                    <div className="text-center text-muted-foreground">
                      <div className="text-4xl mb-4">📁</div>
                      <p>Select a project to start building</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="results" className="mt-6">
          {agentResults ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Frontend Components</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {agentResults.frontend?.components?.map((comp: string) => (
                      <div key={comp} className="flex items-center gap-2 p-2 bg-accent rounded">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        {comp}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Backend APIs</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {agentResults.backend?.routes?.map((route: string) => (
                      <div key={route} className="flex items-center gap-2 p-2 bg-accent rounded">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        {route}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Database Schema</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {agentResults.database?.tables?.map((table: string) => (
                      <div key={table} className="flex items-center gap-2 p-2 bg-accent rounded">
                        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                        {table}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Test Suites</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {agentResults.tests?.unit?.map((test: string) => (
                      <div key={test} className="flex items-center gap-2 p-2 bg-accent rounded">
                        <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                        {test}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <div className="text-center text-muted-foreground">
                  <div className="text-4xl mb-4">🤖</div>
                  <p>Run a multi-agent task to see generated components here</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="deploy" className="mt-6">
          <DeploymentManager
            projectFiles={files.map(f => ({ path: f.path, content: f.content || '' }))}
            projectName={selected?.name || 'ganapathi-app'}
            onDeploymentComplete={(url, platform) => {
              console.log(`Deployed to ${platform}: ${url}`);
              // Could add notification here
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
