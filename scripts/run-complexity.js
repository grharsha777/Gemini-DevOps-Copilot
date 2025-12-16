#!/usr/bin/env node
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const metricsDir = path.resolve(process.cwd(), 'metrics');
if (!fs.existsSync(metricsDir)) fs.mkdirSync(metricsDir, { recursive: true });

const outDir = path.join(metricsDir, 'plato');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

// Targets to analyze - include client and server
const targets = [
  'client/src',
  'server'
].filter((p) => fs.existsSync(path.resolve(process.cwd(), p)));

if (targets.length === 0) {
  console.error('No analysis targets found (client/src or server)');
  process.exit(1);
}

const cmd = `npx plato -r -d ${outDir.replace(/\\/g, '/')} ${targets.join(' ')}`;
console.log('Running:', cmd);

exec(cmd, { maxBuffer: 1024 * 1024 * 10 }, (err, stdout, stderr) => {
  if (err) {
    console.error('Plato analysis failed:', err);
    console.error(stderr);
    // still attempt to collect any generated JSON
  } else {
    console.log(stdout);
  }

  // Collect any JSON files produced under metrics/plato
  const collected = {};

  function walk(dir) {
    const items = fs.readdirSync(dir);
    for (const it of items) {
      const full = path.join(dir, it);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) walk(full);
      else if (it.endsWith('.json')) {
        try {
          const content = JSON.parse(fs.readFileSync(full, 'utf8'));
          // store under relative path key
          const rel = path.relative(outDir, full).replace(/\\/g, '/');
          collected[rel] = content;
        } catch (e) {
          // ignore parse errors
        }
      }
    }
  }

  if (fs.existsSync(outDir)) walk(outDir);

  const outPath = path.join(metricsDir, 'complexity.json');
  fs.writeFileSync(outPath, JSON.stringify({ generatedAt: new Date().toISOString(), collected }, null, 2));
  console.log('Wrote', outPath);
});
