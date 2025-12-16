#!/usr/bin/env node

/**
 * Manual deployment script for Render
 * Usage: node scripts/deploy.js
 */

import { execSync } from 'child_process';
import fs from 'fs';

const RENDER_SERVICE_ID = process.env.RENDER_SERVICE_ID;
const RENDER_DEPLOY_HOOK = process.env.RENDER_DEPLOY_HOOK;

console.log('🚀 Starting manual deployment to Render...\n');

// Check if environment variables are set
if (!RENDER_DEPLOY_HOOK && !RENDER_SERVICE_ID) {
  console.error('❌ Missing Render configuration!');
  console.log('Please set one of these environment variables:');
  console.log('  - RENDER_DEPLOY_HOOK (deploy hook URL from Render dashboard)');
  console.log('  - RENDER_SERVICE_ID (service ID for API deployment)');
  process.exit(1);
}

try {
  if (RENDER_DEPLOY_HOOK) {
    // Use deploy hook (recommended)
    console.log('📡 Using Render deploy hook...');

    const response = execSync(`curl -X POST "${RENDER_DEPLOY_HOOK}"`, {
      encoding: 'utf8',
      stdio: 'pipe'
    });

    console.log('✅ Deploy hook triggered successfully!');
    console.log('🎉 Deployment initiated. Check your Render dashboard for status.');

  } else if (RENDER_SERVICE_ID) {
    // Use Render API
    console.log('🔧 Using Render API...');

    const apiKey = process.env.RENDER_API_KEY;
    if (!apiKey) {
      console.error('❌ RENDER_API_KEY environment variable is required for API deployment');
      process.exit(1);
    }

    const response = execSync(`curl -X POST \
      -H "Authorization: Bearer ${apiKey}" \
      -H "Content-Type: application/json" \
      https://api.render.com/v1/services/${RENDER_SERVICE_ID}/deploys`, {
      encoding: 'utf8',
      stdio: 'pipe'
    });

    console.log('✅ API deployment triggered successfully!');
    console.log('🎉 Deployment initiated. Check your Render dashboard for status.');
  }

  console.log('\n🌐 Your app should be available at: https://gemini-devops-copilot.onrender.com/');
  console.log('⏱️  Deployment may take 2-5 minutes to complete.');

} catch (error) {
  console.error('❌ Deployment failed:', error.message);
  console.log('\n🔧 Troubleshooting:');
  console.log('1. Check your Render dashboard for error logs');
  console.log('2. Verify environment variables are set correctly');
  console.log('3. Ensure your render.yaml is properly configured');
  console.log('4. Check that your GitHub repository is connected to Render');
  process.exit(1);
}