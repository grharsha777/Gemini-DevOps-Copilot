import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function Playground() {
  const [code, setCode] = useState(`// Start coding here\n`);
  const [output, setOutput] = useState("");

  async function runSnippet() {
    try {
      // For now, we send to /api/ai/explain as a quick placeholder
      const resp = await fetch('/api/ai/explain', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) });
      const data = await resp.json();
      setOutput(JSON.stringify(data.explanations || data, null, 2));
    } catch (err) {
      console.error(err);
      setOutput('Failed to run snippet');
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Playground</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <textarea className="w-full h-64 p-3 border rounded font-mono" value={code} onChange={e => setCode(e.target.value)} />

        <div>
          <div className="mb-2">
            <Button onClick={runSnippet}>Run / Explain</Button>
          </div>
          <pre className="p-3 bg-surface rounded h-64 overflow-auto text-sm">{output}</pre>
        </div>
      </div>
    </div>
  );
}
