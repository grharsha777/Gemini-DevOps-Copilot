# Gemini-DevOps-Copilot

**Gemini-DevOps-Copilot** (also known as CodeVortexAI) is an advanced, AI-powered coding assistant designed to streamline your development workflow. It integrates multiple leading AI models to provide robust code generation, debugging, explanation, and documentation capabilities.

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

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is open-source.
