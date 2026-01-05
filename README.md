# Gemini-DevOps-Copilot

**Gemini-DevOps-Copilot** (also known as CodeVortexAI) is an advanced, AI-powered coding assistant designed to streamline your development workflow. It integrates multiple leading AI models to provide robust code generation, debugging, explanation, and documentation capabilities.

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/grharsha777/Gemini-DevOps-Copilot)

🌐 **Live Demo:** [https://gemini-devops-copilot.onrender.com/](https://gemini-devops-copilot.onrender.com/)

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


We welcome contributions from developers of all experience levels. Whether you're fixing bugs, adding features, or improving documentation, your contributions are valuable to the Gemini-DevOps-Copilot project.

To contribute:
1. Fork the repository
2. Create a feature branch (git checkout -b feature/amazing-feature)
3. Commit your changes (git commit -m 'Add amazing feature')
4. Push to the branch (git push origin feature/amazing-feature)
5. Open a Pull Request

## ECWoC 2026 Participation

This project is actively participating in ECWoC (Elite Coders Winter of Code) 2026. We're looking for contributors to help improve this multimodal DevOps AI copilot.

### ECWoC Contribution Areas:
- Enhance AI model integration and fallback mechanisms
- Improve error handling and logging
- Expand documentation and code examples
- Fix identified bugs and optimization issues
- Add new AI provider integrations
- Performance optimization improvements

For ECWoC participants: Please ensure your pull requests include the ECWoC26 label to be eligible for scoring.
