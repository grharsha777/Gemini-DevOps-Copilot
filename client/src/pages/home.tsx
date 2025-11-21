import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Sparkles, Github, BarChart3, ArrowRight } from "lucide-react";
import { ParticleBackground } from "@/components/particle-background";
import { FloatingShapes } from "@/components/floating-shapes";

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <ParticleBackground />
      <FloatingShapes />

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 text-center">
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full text-sm backdrop-blur-sm">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-primary font-medium">Powered by Gemini AI</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-primary via-purple-500 to-cyan-500 bg-clip-text text-transparent leading-tight">
            Code Vortex
          </h1>

          <h2 className="text-3xl md:text-4xl font-semibold text-foreground">
            Gemini DevOps Copilot
          </h2>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            AI-powered developer assistant with real-time GitHub analytics, intelligent code generation, and repository insights. Accelerate your development workflow with cutting-edge AI.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link href="/copilot">
              <Button
                size="lg"
                className="group gap-2 bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90"
                data-testid="button-get-started"
              >
                <Sparkles className="w-5 h-5" />
                Start with AI Copilot
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button
                size="lg"
                variant="outline"
                className="gap-2 backdrop-blur-sm"
                data-testid="button-view-dashboard"
              >
                <BarChart3 className="w-5 h-5" />
                View Analytics
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12">
            <div className="p-6 bg-card/50 backdrop-blur-xl border border-card-border rounded-xl hover-elevate">
              <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-purple-500/20 rounded-lg flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">AI Code Assistant</h3>
              <p className="text-sm text-muted-foreground">
                Generate, test, document, and refactor code with streaming AI responses
              </p>
            </div>

            <div className="p-6 bg-card/50 backdrop-blur-xl border border-card-border rounded-xl hover-elevate">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500/20 to-cyan-500/20 rounded-lg flex items-center justify-center mb-4">
                <Github className="w-6 h-6 text-purple-500" />
              </div>
              <h3 className="text-lg font-semibold mb-2">GitHub Analytics</h3>
              <p className="text-sm text-muted-foreground">
                Real-time insights on commits, PRs, issues, and repository hotspots
              </p>
            </div>

            <div className="p-6 bg-card/50 backdrop-blur-xl border border-card-border rounded-xl hover-elevate">
              <div className="w-12 h-12 bg-gradient-to-br from-cyan-500/20 to-primary/20 rounded-lg flex items-center justify-center mb-4">
                <BarChart3 className="w-6 h-6 text-cyan-500" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Code Insights</h3>
              <p className="text-sm text-muted-foreground">
                Line-by-line explanations with risk assessment and performance notes
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
