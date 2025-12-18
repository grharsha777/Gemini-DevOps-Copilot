🚀 Gemini-DevOps-Copilot (CodeVortexAI)

Gemini-DevOps-Copilot, also known as CodeVortexAI, is a vendor-neutral, multi-model DevOps AI copilot designed to accelerate modern software development.
It integrates multiple leading AI models to provide code generation, debugging, explanation, refactoring, testing, and documentation—all in one place.

🌐 Live Demo: https://gemini-devops-copilot.onrender.com/

✨ Key Features
🧠 Multi-Model Intelligence

Seamlessly integrates with:

Google Gemini

Anthropic Claude

Mistral AI

DeepSeek

Switch models anytime or let the system choose automatically.

🔄 Smart Fallback System

Automatically switches between AI providers if one fails or runs out of credits, ensuring high availability and uninterrupted workflows.

🛠 Core Capabilities

Generate – Create production-ready code from natural language prompts

Explain – Line-by-line explanations of complex code

Refactor – Improve performance, readability, and maintainability

Test – Generate comprehensive unit test suites

Document – Auto-generate clear, developer-friendly documentation

Hotspot Analysis – Identify frequently changed files that may indicate risk in your codebase

🧰 Technology Stack

Frontend

React

Tailwind CSS

Radix UI

Lucide Icons

Backend

Node.js

Express

Build & Language

Vite

TypeScript

AI SDKs

@google/generative-ai

@anthropic-ai/sdk

@mistralai/mistralai

openai (for DeepSeek compatibility)

📦 Installation & Setup
1️⃣ Clone the Repository
git clone https://github.com/grharsha777/Gemini-DevOps-Copilot.git
cd Gemini-DevOps-Copilot

2️⃣ Install Dependencies
npm install

3️⃣ Configure Environment Variables

Create a .env file in the root directory and add at least one API key.
The system prioritizes models in this order:

Gemini → Mistral → Claude → DeepSeek

# Google Gemini (Default)
GEMINI_API_KEY=your_gemini_key_here

# Mistral AI (Strong fallback)
MISTRAL_API_KEY=your_mistral_key_here

# Anthropic Claude (Pro capabilities)
ANTHROPIC_API_KEY=your_claude_key_here

# DeepSeek (OpenAI-compatible fallback)
DEEPSEEK_API_KEY=your_deepseek_key_here

4️⃣ Start the Development Server
npm run dev


The app will run on http://localhost:5000 (check terminal output).

📖 Usage Guide

AI Copilot Page
Select a mode (Generate, Explain, Refactor, Test, etc.), choose an AI model (optional), and enter your prompt.

Explain Code
Paste any code snippet and select Explain for a detailed breakdown.

Settings
Configure default preferences and model behavior.

🤝 Contributing

Contributions are welcome!
Feel free to open issues or submit pull requests to improve the project.

📄 License

This project is open-source and available under the MIT License.
