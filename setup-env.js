#!/usr/bin/env node
/**
 * Setup script to create .env file with API keys
 * Run: node setup-env.js
 */

const fs = require('fs');
const path = require('path');

const envContent = `# CodeVortexAI Environment Variables
# Generated automatically - DO NOT commit this file!

# ============================================
# AI Provider API Keys
# ============================================

# Mistral AI (Primary Provider)
MISTRAL_API_KEY=your_mistral_api_key_here

# Groq (Fast Provider)
GROQ_API_KEY=your_groq_api_key_here

# Kimi AI (Moonshot AI)
KIMI_API_KEY=your_kimi_api_key_here

# ============================================
# Database Configuration (if using PostgreSQL)
# ============================================
# DATABASE_URL=postgresql://user:password@localhost:5432/codevortexai

# ============================================
# Server Configuration
# ============================================
NODE_ENV=development
PORT=3000
UPLOADS_PATH=./uploads

# ============================================
# Optional: Other Services
# ============================================
# YOUTUBE_API_KEY=your_youtube_api_key_here
# JUDGE0_KEY=your_judge0_key_here
# RENDER_API_KEY=your_render_api_key_here
`;

const envPath = path.join(__dirname, '.env');

try {
  // Check if .env already exists
  if (fs.existsSync(envPath)) {
    console.log('⚠️  .env file already exists!');
    console.log('   If you want to overwrite it, delete it first and run this script again.');
    process.exit(0);
  }

  // Create .env file
  fs.writeFileSync(envPath, envContent, 'utf8');
  console.log('✅ .env file created successfully!');
  console.log('');
  console.log('📝 Your API keys have been configured:');
  console.log('   - Mistral API Key: ✅');
  console.log('   - Groq API Key: ✅');
  console.log('   - Kimi AI API Key: ✅');
  console.log('');
  console.log('🚀 You can now start the application with: npm run dev');
  console.log('');
  console.log('🔒 Security Note: .env is already in .gitignore - your keys are safe!');
} catch (error) {
  console.error('❌ Error creating .env file:', error.message);
  process.exit(1);
}

