import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';

export default function LearningPage(){
  const [data, setData] = useState<any>(null);
  useEffect(()=>{ fetch('/api/metrics/learning').then(r=>r.json()).then(setData).catch(()=>setData(null)); },[]);
  if(!data) return <div className="p-6">No learning data</div>;
  return (
    <div className="p-6">
      <h2 className="text-lg font-bold">Learning & Optimization</h2>
      <Card className="p-4 mt-4"><pre className="font-mono text-sm">{JSON.stringify(data, null, 2)}</pre></Card>
    </div>
  );
}
