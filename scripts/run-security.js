#!/usr/bin/env node
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const metricsDir = path.resolve(process.cwd(), 'metrics');
if (!fs.existsSync(metricsDir)) fs.mkdirSync(metricsDir, { recursive: true });

exec('npm audit --json', { maxBuffer: 1024 * 1024 * 10 }, (err, stdout, stderr) => {
  if (err && !stdout) {
    console.error('npm audit failed:', err);
    process.exit(1);
  }

  try {
    const parsed = JSON.parse(stdout || '{}');
    const outPath = path.join(metricsDir, 'security.json');
    fs.writeFileSync(outPath, JSON.stringify({ generatedAt: new Date().toISOString(), audit: parsed }, null, 2));
    console.log('Wrote', outPath);
  } catch (e) {
    console.error('Failed to parse npm audit output', e);
    console.error(stdout);
    process.exit(1);
  }
});
