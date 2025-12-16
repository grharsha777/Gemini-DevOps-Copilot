#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const metricsDir = path.resolve(process.cwd(), 'metrics');
if (!fs.existsSync(metricsDir)) fs.mkdirSync(metricsDir, { recursive: true });

const featureNames = [
  'complexity',
  'security',
  'coverage-summary',
  'ci-cd',
  'deployments',
  'build-analysis',
  'team-activity',
  'code-review',
  'ai-tools',
  'multi-repo',
  'monitoring',
  'dx',
  'learning',
  'notifications',
  'settings',
  'docs',
  'export',
  'performance'
];

function sampleFor(name) {
  switch(name) {
    case 'complexity':
      return { summary: { files: 10, average_cyclomatic: 3.2, hotspots: [{file:'src/foo.ts', score:9}] } };
    case 'security':
      return { summary: { vulnerabilities: 2, high: 0, medium: 1, low: 1, details: [] } };
    case 'coverage-summary':
      return { total: { lines: { total: 1200, covered: 960, pct: 80 }, functions: { total: 200, covered: 160, pct: 80 } } };
    case 'ci-cd':
      return { workflows: [{name:'ci', status:'passing', lastRun:'2025-12-16T12:00:00Z'}] };
    case 'deployments':
      return { recent: [{env:'staging', status:'success', commit:'abc123', at:'2025-12-16T12:00:00Z'}] };
    case 'build-analysis':
      return { recentFailures: [] };
    case 'team-activity':
      return { heatmap: { '2025-12-16': 5 } };
    case 'code-review':
      return { avgReviewTimeHours: 12, commentsPerPR: 4 };
    case 'ai-tools':
      return { enabled: ['commit-gen','pr-fill','review-suggest'] };
    case 'multi-repo':
      return { repos: [{name:'repo-a', health: 92}, {name:'repo-b', health:75}] };
    case 'monitoring':
      return { errorsLast24h: 0, p95: '200ms' };
    case 'dx':
      return { extensions: [{name:'vscode', users:10}], shortcuts: ['ctrl+k ctrl+p'] };
    case 'learning':
      return { suggestions: ['reduce complexity in src/foo.ts'] };
    case 'notifications':
      return { rules: [{id:1, name:'High error rate', enabled:true}] };
    case 'settings':
      return { sso: false, rbac: false };
    case 'docs':
      return { readmes: [{path:'README.md', generated:false}] };
    case 'export':
      return { exports: [] };
    case 'performance':
      return { cpuMedian: '15ms', memoryPeakMB: 120 };
    default:
      return { message: `Placeholder for ${name}` };
  }
}

const arg = process.argv[2] || '';
if (arg === 'all' || arg === '') {
  featureNames.forEach(name => {
    const p = path.join(metricsDir, `${name}.json`);
    fs.writeFileSync(p, JSON.stringify(sampleFor(name), null, 2));
    console.log('Wrote', p);
  });
  process.exit(0);
}

if (!featureNames.includes(arg)) {
  console.error('Unknown metric:', arg);
  process.exit(2);
}

const out = path.join(metricsDir, `${arg}.json`);
fs.writeFileSync(out, JSON.stringify(sampleFor(arg), null, 2));
console.log('Wrote', out);
process.exit(0);
