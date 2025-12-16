import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export default function AppBuilder() {
  const [projects, setProjects] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [files, setFiles] = useState<any[]>([]);
  const [openPath, setOpenPath] = useState<string | null>(null);
  const [editorContent, setEditorContent] = useState<string>("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

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

  return (
    <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
      <div>
        <h2 className="text-lg font-semibold mb-2">Create Project</h2>
        <form onSubmit={createProject} className="space-y-2 max-w-xl">
          <input className="w-full p-2 border rounded" placeholder="Project name" value={name} onChange={e => setName(e.target.value)} />
          <textarea className="w-full p-2 border rounded" placeholder="Short description" value={description} onChange={e => setDescription(e.target.value)} />
          <div>
            <Button type="submit">Create Project</Button>
          </div>
        </form>

        <h2 className="text-lg font-semibold mt-6">Projects</h2>
        <div className="space-y-2 mt-2">
          {projects.map((p) => (
            <div key={p.id} className={`p-3 border rounded cursor-pointer ${selected?.id === p.id ? 'bg-surface' : ''}`} onClick={() => selectProject(p)}>
              <div className="font-medium">{p.name}</div>
              <div className="text-sm text-muted-foreground">{p.description}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="md:col-span-2">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">{selected ? `Project: ${selected.name}` : 'Select a project'}</h2>
          <div className="flex gap-2">
            <Button onClick={createNewFile} disabled={!selected}>New File</Button>
            <Button onClick={saveFile} disabled={!selected || !openPath}>Save</Button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-1 border rounded p-2 h-96 overflow-auto">
            <div className="font-medium mb-2">Files</div>
            {files.length === 0 && <div className="text-sm text-muted-foreground">No files</div>}
            <ul className="space-y-1">
              {files.map((f) => (
                <li key={f.path} className="flex justify-between items-center">
                  <button className="text-left text-sm text-primary" onClick={() => openFile(f.path)}>{f.path}</button>
                  <button className="text-xs text-red-500" onClick={() => deleteFile(f.path)}>Delete</button>
                </li>
              ))}
            </ul>
          </div>

          <div className="col-span-2 border rounded p-2 h-96">
            <div className="mb-2 font-medium">Editor {openPath ? `— ${openPath}` : ''}</div>
            <textarea className="w-full h-80 font-mono p-2 border rounded" value={editorContent} onChange={e => setEditorContent(e.target.value)} />
          </div>
        </div>
      </div>
    </div>
  );
}
