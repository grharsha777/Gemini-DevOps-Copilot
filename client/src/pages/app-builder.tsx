import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export default function AppBuilder() {
  const [projects, setProjects] = useState<any[]>([]);
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

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">App Builder</h1>

      <form onSubmit={createProject} className="space-y-2 max-w-xl">
        <input className="w-full p-2 border rounded" placeholder="Project name" value={name} onChange={e => setName(e.target.value)} />
        <textarea className="w-full p-2 border rounded" placeholder="Short description" value={description} onChange={e => setDescription(e.target.value)} />
        <div>
          <Button type="submit">Create Project</Button>
        </div>
      </form>

      <div className="mt-8 space-y-4">
        {projects.length === 0 && <div className="text-sm text-muted-foreground">No projects yet.</div>}
        {projects.map((p) => (
          <div key={p.id} className="p-4 border rounded">
            <div className="flex justify-between">
              <div>
                <div className="font-medium">{p.name}</div>
                <div className="text-sm text-muted-foreground">{p.description}</div>
              </div>
              <div className="text-sm text-muted-foreground">{new Date(p.created_at).toLocaleString()}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
