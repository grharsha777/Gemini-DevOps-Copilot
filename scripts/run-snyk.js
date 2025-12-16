#!/usr/bin/env node
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const metricsDir = path.resolve(process.cwd(), 'metrics');
if (!fs.existsSync(metricsDir)) fs.mkdirSync(metricsDir, { recursive: true });

// Run snyk test (expects SNYK_TOKEN in env for auth) and write JSON output
exec('npx snyk test --json', { maxBuffer: 1024 * 1024 * 20, env: process.env }, (err, stdout, stderr) => {
  if (err && !stdout) {
    console.error('snyk test failed:', err);
    console.error(stderr);
    process.exit(1);
  }

  try {
    const parsed = JSON.parse(stdout || '{}');
    const outPath = path.join(metricsDir, 'snyk.json');
    fs.writeFileSync(outPath, JSON.stringify({ generatedAt: new Date().toISOString(), snyk: parsed }, null, 2));
    console.log('Wrote', outPath);
  } catch (e) {
    console.error('Failed to parse snyk output', e);
    console.error(stdout);
    process.exit(1);
  }
});
