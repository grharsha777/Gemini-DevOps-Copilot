# Code Vortex (Gemini-DevOps-Copilot)

**Code Vortex** is a high-performance, multi-model DevOps AI copilot built by G R Harsha. It provides advanced intelligence for modern engineering teams, integrating leading LLMs with a focus on robust DevOps automation, seamless code generation, and interactive learning.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fgrharsha777%2FGemini-DevOps-Copilot)
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/grharsha777/Gemini-DevOps-Copilot)

🌐 **Live Demo:** [https://gemini-devops-copilot.vercel.app/](https://gemini-devops-copilot.vercel.app/)

## 🏗️ AI Request Lifecycle & Fallback Chain

Code Vortex uses a mission-critical fallback system to ensure your requests never fail. If a primary model is overloaded or fails, the orchestrator automatically cascades to the next best provider.

```mermaid
graph TD
    User([User Prompt]) --> Orchestrator{Model Orchestrator}
    Orchestrator --> |1. Primary| Gemini[Google Gemini]
    Gemini --> |Success| Output([AI Output])
    Gemini --> |Failure/Rate Limit| Mistral[Mistral AI]
    Mistral --> |Success| Output
    Mistral --> |Failure| Claude[Anthropic Claude]
    Claude --> |Success| Output
    Claude --> |Failure| DeepSeek[DeepSeek V3]
    DeepSeek --> |Success| Output
    DeepSeek --> |All Failed| Error[Crystal Clear Error Message]
```

## 🚀 Key Modules

### 1. 🎓 Learning Portal
A unified search engine for developers. Aggregate resources from **YouTube, GitHub, and Dev.to** in real-time. Build custom learning paths and track your progress through DSA and System Design.

### 2. 🏆 DevOps Leaderboard
High-fidelity "8K" Glassmorphism UI tracking global contributor metrics. Monitor commits, PRs, and stars across the ecosystem with real-time ranking.

### 3. 💻 Web IDE (Playground)
Full-featured IDE with **Monaco Editor**, **Judge0** execution, and **Live Preview** iFrame. Browse the LeetCode-style problem set and jump straight into solving with pre-loaded context.

### 4. 📱 Mobile App Builder
Visual component management and property inspection for rapid mobile scaffold generation.

## 🛠️ Technology Stack

-   **Backend:** Node.js, Express, TypeScript, Drizzle ORM
-   **Frontend:** React, Framer Motion, Recharts, Tailwind CSS
-   **AI:** Gemini Pro, Mistral (Codestral), Claude 3.5, DeepSeek V3
-   **Infrastructure:** Vercel (Serverless), PostgreSQL (Neon)

## 📦 Installation & Setup

1.  **Clone & Install:**
    ```bash
    git clone https://github.com/grharsha777/Gemini-DevOps-Copilot.git
    npm install
    ```

2.  **Environment Variables:**
    Create a `.env` file with your AI API keys and `DATABASE_URL`.

3.  **Deployment (Vercel):**
    Simply push to GitHub and connect to Vercel. Ensure all environment variables are added in the Vercel Dashboard.

## 🤝 Contributing

Built with ❤️ by **G R Harsha**. Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is open-source under the MIT License.
