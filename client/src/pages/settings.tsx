import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings as SettingsIcon, Github, Sparkles, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/theme-toggle";
import { useTheme } from "@/components/theme-provider";
import type { AIModel } from "@shared/schema";

export default function Settings() {
  const [githubPat, setGithubPat] = useState("");
  const [aiModel, setAiModel] = useState<AIModel>("gemini-2.0-flash");
  const [showPat, setShowPat] = useState(false);
  const { toast } = useToast();
  const { theme } = useTheme();

  useEffect(() => {
    const savedPat = localStorage.getItem("githubPat") || "";
    const savedModel = localStorage.getItem("aiModel") as AIModel || "gemini-2.0-flash";
    setGithubPat(savedPat);
    setAiModel(savedModel);
  }, []);

  const handleSave = () => {
    localStorage.setItem("githubPat", githubPat);
    localStorage.setItem("aiModel", aiModel);
    toast({
      title: "Settings saved",
      description: "Your preferences have been updated successfully.",
    });
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 border-b border-border bg-card/50 backdrop-blur-sm">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-primary" />
          Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure GitHub integration and AI preferences
        </p>
      </div>

      <div className="p-6 max-w-3xl space-y-6">
        <Card className="bg-card/80 backdrop-blur-sm border-card-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Github className="w-5 h-5" />
              GitHub Integration
            </CardTitle>
            <CardDescription>
              Connect your GitHub account to access repository analytics
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="github-pat">Personal Access Token (PAT)</Label>
              <div className="relative">
                <Input
                  id="github-pat"
                  type={showPat ? "text" : "password"}
                  value={githubPat}
                  onChange={(e) => setGithubPat(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  className="pr-10"
                  data-testid="input-github-pat"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full"
                  onClick={() => setShowPat(!showPat)}
                  data-testid="button-toggle-pat"
                >
                  {showPat ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Generate a token at{" "}
                <a
                  href="https://github.com/settings/tokens"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  github.com/settings/tokens
                </a>{" "}
                with 'repo' scope
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/80 backdrop-blur-sm border-card-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              AI Configuration
            </CardTitle>
            <CardDescription>
              Choose your preferred Gemini AI model
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ai-model">AI Model</Label>
              <Select value={aiModel} onValueChange={(v) => setAiModel(v as AIModel)}>
                <SelectTrigger id="ai-model" data-testid="select-ai-model">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gemini-2.0-flash">
                    Gemini 2.0 Flash (Faster, suitable for most tasks)
                  </SelectItem>
                  <SelectItem value="gemini-1.5-pro">
                    Gemini 1.5 Pro (Advanced reasoning, complex tasks)
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Flash model is optimized for speed, while Pro provides deeper analysis
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/80 backdrop-blur-sm border-card-border">
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>
              Customize the application theme
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <Label>Theme</Label>
                <p className="text-sm text-muted-foreground">
                  Current: {theme === "dark" ? "Dark" : "Light"}
                </p>
              </div>
              <ThemeToggle />
            </div>
          </CardContent>
        </Card>

        <Button onClick={handleSave} className="w-full" data-testid="button-save">
          Save Settings
        </Button>
      </div>
    </div>
  );
}
