<div align="center">

<!-- Futuristic Animated Header -->
<img src="https://capsule-render.vercel.app/render?type=waving&color=gradient&height=280&section=header&text=Gemini-DevOps-Copilot&fontSize=70&animation=fadeIn&fontAlignY=35" width="100%" />

<br />

<!-- AI Status Typing Animation -->
<a href="https://git.io/typing-svg">
  <img src="https://readme-typing-svg.herokuapp.com?font=Fira+Code&size=25&pause=1000&color=4285F4&center=true&vCenter=true&width=500&lines=🚀+Powered+by+CodeVortexAI;🤖+Multi-Model+Intelligence;🛠️+DevOps+Workflow+Optimized;💻+Next-Gen+Coding+Assistant" alt="Typing SVG" />
</a>

<p align="center">
  <b>Gemini-DevOps-Copilot</b> is a high-performance AI assistant engineered to bridge the gap between complex DevOps workflows and rapid code generation.
</p>

<!-- Action Buttons -->
<p align="center">
  <a href="https://gemini-devops-copilot.onrender.com/">
    <img src="https://img.shields.io/badge/LIVE%20DEMO-🚀-blue?style=for-the-badge&logo=google-chrome&logoColor=white" alt="Live Demo" />
  </a>
  <a href="https://render.com/deploy?repo=https://github.com/grharsha777/Gemini-DevOps-Copilot">
    <img src="https://render.com/images/deploy-to-render-button.svg" alt="Deploy to Render" height="28" />
  </a>
</p>

<!-- Tech Badges -->
<p align="center">
  <img src="https://img.shields.io/badge/AI%20Engine-Gemini%20Pro-red?style=flat-square&logo=google-gemini&logoColor=white" />
  <img src="https://img.shields.io/badge/Architecture-CodeVortexAI-blueviolet?style=flat-square&logo=openai&logoColor=white" />
  <img src="https://img.shields.io/badge/Deployment-Render-000000?style=flat-square&logo=render&logoColor=white" />
  <img src="https://img.shields.io/badge/Status-Active-success?style=flat-square" />
</p>

</div>

---

### 🧠 Intelligence & Capabilities
**Gemini-DevOps-Copilot** isn't just a chatbot—it's a specialized engine designed for the modern developer:

*   **Multi-Model Integration:** Leverages the best of Gemini and other leading LLMs for high-context code logic.
*   **DevOps First:** Specialized in generating CI/CD pipelines, Docker configurations, and Kubernetes manifests.
*   **Deep Debugging:** Analyze stack traces and receive AI-driven refactoring suggestions instantly.
*   **Smart Docs:** Automatically generate comprehensive documentation for legacy codebases.

---
## 🚀 Key Features

-   **Multi-Model Intelligence:** Seamlessly integrates with **Google Gemini**, **Anthropic Claude**, **Mistral AI**, and **DeepSeek**.
-   **Smart Fallback System:** Automatically switches between AI providers if one fails or runs out of credits, ensuring high availability.
-   **Core Capabilities:**
    -   **Generate:** Create production-ready code from natural language prompts.
    -   **Explain:** Get detailed, line-by-line explanations of complex code snippets.
    -   **Refactor:** Optimize code for performance and readability.
    -   **Test:** Generate comprehensive unit test suites.
    -   **Document:** Auto-generate clear, developer-centric documentation.
-   **Hotspot Analysis:** Identify frequently changed files that might be risks in your codebase.

## 🛠️ Technology Stack

-   **Frontend:** React, Tailwind CSS, Radix UI, Lucide Icons
-   **Backend:** Node.js, Express
-   **Build Tool:** Vite
-   **Language:** TypeScript
-   **AI SDKs:** `@google/generative-ai`, `@anthropic-ai/sdk`, `@mistralai/mistralai`, `openai` (for DeepSeek)

## 📦 Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/grharsha777/Gemini-DevOps-Copilot.git
    cd Gemini-DevOps-Copilot
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Configure Environment Variables:**
    Create a `.env` file in the root directory. Add at least one valid API key. The system will prioritize them in the following order: **Gemini -> Mistral -> Claude -> DeepSeek**.

    ```env
    # Google Gemini (Default)
    GEMINI_API_KEY=your_gemini_key_here

    # Mistral AI (Strong Fallback)
    MISTRAL_API_KEY=your_mistral_key_here

    # Anthropic Claude (Pro Capabilities)
    ANTHROPIC_API_KEY=your_claude_key_here

    # DeepSeek (OpenAI-compatible Fallback)
    DEEPSEEK_API_KEY=your_deepseek_key_here
    ```

4.  **Start the Development Server:**
    ```bash
    npm run dev
    ```
    The application will run on `http://localhost:5000` (or similar, check terminal output).

## 📖 Usage Guide

1.  **AI Copilot Page:** Navigate to the Copilot section. Select your desired mode (Generate, Explain, Refactor, etc.), chose a model (optional, as auto-fallback handles verification), and enter your prompt.
2.  **Settings:** Configure default preferences.
3.  **Explain Code:** Paste code into the input area and select "Explain" mode to get a breakdown.

## 🤝 Contributing
