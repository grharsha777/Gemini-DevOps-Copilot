import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings as SettingsIcon, Github, Sparkles, Eye, EyeOff, Zap, Crown, ExternalLink, CheckCircle, XCircle, Loader2, GitBranch } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/theme-toggle";
import { useTheme } from "@/components/theme-provider";
import type { AIProvider, GitProvider } from "@shared/schema";
import { providerInfoMap, gitProviderInfoMap } from "@shared/schema";

interface ModelConfig {
  provider: AIProvider | "";
  apiKey: string;
  model: string;
  baseUrl: string;
}

export default function Settings() {
  // Git Provider Settings
  const [gitProvider, setGitProvider] = useState<GitProvider>("github");
  const [githubPat, setGithubPat] = useState("");
  const [gitlabToken, setGitlabToken] = useState("");
  const [gitlabInstanceUrl, setGitlabInstanceUrl] = useState("https://gitlab.com");
  const [bitbucketUsername, setBitbucketUsername] = useState("");
  const [bitbucketAppPassword, setBitbucketAppPassword] = useState("");
  
  const [showPat, setShowPat] = useState(false);
  const [showGitlabToken, setShowGitlabToken] = useState(false);
  const [showBitbucketPassword, setShowBitbucketPassword] = useState(false);
  const [showFastKey, setShowFastKey] = useState(false);
  const [showProKey, setShowProKey] = useState(false);
  const { toast } = useToast();
  const { theme } = useTheme();

  // Fast model configuration
  const [fastConfig, setFastConfig] = useState<ModelConfig>({
    provider: "",
    apiKey: "",
    model: "",
    baseUrl: "",
  });

  // Pro model configuration
  const [proConfig, setProConfig] = useState<ModelConfig>({
    provider: "",
    apiKey: "",
    model: "",
    baseUrl: "",
  });

  // Testing states
  const [testingFast, setTestingFast] = useState(false);
  const [testingPro, setTestingPro] = useState(false);
  const [fastTestResult, setFastTestResult] = useState<"success" | "error" | null>(null);
  const [proTestResult, setProTestResult] = useState<"success" | "error" | null>(null);

  useEffect(() => {
    // Load saved settings
    const savedGitProvider = localStorage.getItem("gitProvider") as GitProvider || "github";
    setGitProvider(savedGitProvider);
    
    const savedPat = localStorage.getItem("githubPat") || "";
    setGithubPat(savedPat);
    
    const savedGitlabToken = localStorage.getItem("gitlabToken") || "";
    setGitlabToken(savedGitlabToken);
    
    const savedGitlabUrl = localStorage.getItem("gitlabInstanceUrl") || "https://gitlab.com";
    setGitlabInstanceUrl(savedGitlabUrl);
    
    const savedBitbucketUser = localStorage.getItem("bitbucketUsername") || "";
    setBitbucketUsername(savedBitbucketUser);
    
    const savedBitbucketPass = localStorage.getItem("bitbucketAppPassword") || "";
    setBitbucketAppPassword(savedBitbucketPass);

    // Load fast model config
    const savedFastProvider = localStorage.getItem("fastProvider") as AIProvider || "";
    const savedFastKey = localStorage.getItem("fastApiKey") || "";
    const savedFastModel = localStorage.getItem("fastModel") || "";
    const savedFastBaseUrl = localStorage.getItem("fastBaseUrl") || "";
    setFastConfig({
      provider: savedFastProvider,
      apiKey: savedFastKey,
      model: savedFastModel,
      baseUrl: savedFastBaseUrl,
    });

    // Load pro model config
    const savedProProvider = localStorage.getItem("proProvider") as AIProvider || "";
    const savedProKey = localStorage.getItem("proApiKey") || "";
    const savedProModel = localStorage.getItem("proModel") || "";
    const savedProBaseUrl = localStorage.getItem("proBaseUrl") || "";
    setProConfig({
      provider: savedProProvider,
      apiKey: savedProKey,
      model: savedProModel,
      baseUrl: savedProBaseUrl,
    });
  }, []);

  const handleSave = () => {
    // Save Git provider settings
    localStorage.setItem("gitProvider", gitProvider);
    localStorage.setItem("githubPat", githubPat);
    localStorage.setItem("gitlabToken", gitlabToken);
    localStorage.setItem("gitlabInstanceUrl", gitlabInstanceUrl);
    localStorage.setItem("bitbucketUsername", bitbucketUsername);
    localStorage.setItem("bitbucketAppPassword", bitbucketAppPassword);

    // Save fast config
    localStorage.setItem("fastProvider", fastConfig.provider);
    localStorage.setItem("fastApiKey", fastConfig.apiKey);
    localStorage.setItem("fastModel", fastConfig.model);
    localStorage.setItem("fastBaseUrl", fastConfig.baseUrl);

    // Save pro config
    localStorage.setItem("proProvider", proConfig.provider);
    localStorage.setItem("proApiKey", proConfig.apiKey);
    localStorage.setItem("proModel", proConfig.model);
    localStorage.setItem("proBaseUrl", proConfig.baseUrl);

    toast({
      title: "Settings saved",
      description: "Your API keys and preferences have been saved.",
    });
  };

  const testApiKey = async (config: ModelConfig, type: "fast" | "pro") => {
    // Validate input
    if (!config.provider || !config.apiKey) {
      toast({
        title: "Missing configuration",
        description: "Please select a provider and enter an API key first.",
        variant: "destructive",
      });
      return;
    }

    // Trim whitespace from API key
    const trimmedApiKey = config.apiKey.trim();
    if (!trimmedApiKey) {
      toast({
        title: "Invalid API Key",
        description: "API key cannot be empty. Please enter a valid API key.",
        variant: "destructive",
      });
      return;
    }

    const setTesting = type === "fast" ? setTestingFast : setTestingPro;
    const setResult = type === "fast" ? setFastTestResult : setProTestResult;

    setTesting(true);
    setResult(null);

    try {
      const response = await fetch("/api/ai/test-key", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          provider: config.provider,
          apiKey: trimmedApiKey,
          model: config.model || undefined,
          baseUrl: config.baseUrl || undefined,
        }),
      });

      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        // If response is not JSON, read as text
        const text = await response.text();
        throw new Error(text || "Invalid response from server");
      }

      if (response.ok && data.success) {
        setResult("success");
        toast({
          title: "API Key Valid!",
          description: `${providerInfoMap[config.provider as AIProvider]?.name || config.provider} is working correctly.`,
        });
      } else {
        setResult("error");
        const errorMsg = data?.error || data?.message || "The API key could not be verified.";
        toast({
          title: "API Key Test Failed",
          description: errorMsg,
          variant: "destructive",
        });
      }
    } catch (error) {
      setResult("error");
      const errorMessage = error instanceof Error 
        ? error.message 
        : "Could not connect to the server. Please check your connection and try again.";
      toast({
        title: "Test Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  const renderProviderConfig = (
    config: ModelConfig,
    setConfig: React.Dispatch<React.SetStateAction<ModelConfig>>,
    showKey: boolean,
    setShowKey: React.Dispatch<React.SetStateAction<boolean>>,
    type: "fast" | "pro",
    testing: boolean,
    testResult: "success" | "error" | null
  ) => {
    const providerInfo = config.provider ? providerInfoMap[config.provider as AIProvider] : null;

    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>AI Provider</Label>
          <Select
            value={config.provider}
            onValueChange={(v) => {
              const newProvider = v as AIProvider;
              const info = providerInfoMap[newProvider];
              setConfig({
                ...config,
                provider: newProvider,
                model: info?.models[0] || "",
                baseUrl: newProvider === "custom" ? config.baseUrl : "",
              });
            }}
          >
            <SelectTrigger data-testid={`select-${type}-provider`}>
              <SelectValue placeholder="Select a provider..." />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(providerInfoMap).map(([key, info]) => (
                <SelectItem key={key} value={key}>
                  {info.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {config.provider && (
          <>
            {/* Provider Info Card */}
            {providerInfo && (
              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{providerInfo.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">{providerInfo.note}</p>
                  </div>
                  {providerInfo.url && (
                    <a
                      href={providerInfo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline flex items-center gap-1 whitespace-nowrap"
                    >
                      Get API Key <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>API Key</Label>
              <div className="relative">
                <Input
                  type={showKey ? "text" : "password"}
                  value={config.apiKey}
                  onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                  placeholder="Enter your API key..."
                  className="pr-10"
                  data-testid={`input-${type}-apikey`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full"
                  onClick={() => setShowKey(!showKey)}
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            {config.provider === "custom" && (
              <div className="space-y-2">
                <Label>Base URL (OpenAI-compatible endpoint)</Label>
                <Input
                  type="text"
                  value={config.baseUrl}
                  onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })}
                  placeholder="https://api.example.com/v1"
                  data-testid={`input-${type}-baseurl`}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Model</Label>
              {providerInfo && providerInfo.models.length > 0 ? (
                <Select
                  value={config.model}
                  onValueChange={(v) => setConfig({ ...config, model: v })}
                >
                  <SelectTrigger data-testid={`select-${type}-model`}>
                    <SelectValue placeholder="Select a model..." />
                  </SelectTrigger>
                  <SelectContent>
                    {providerInfo.models.map((model) => (
                      <SelectItem key={model} value={model}>
                        {model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  type="text"
                  value={config.model}
                  onChange={(e) => setConfig({ ...config, model: e.target.value })}
                  placeholder="Enter model name..."
                  data-testid={`input-${type}-model`}
                />
              )}
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() => testApiKey(config, type)}
              disabled={testing || !config.apiKey}
              className="w-full"
              data-testid={`button-test-${type}`}
            >
              {testing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : testResult === "success" ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                  API Key Valid
                </>
              ) : testResult === "error" ? (
                <>
                  <XCircle className="w-4 h-4 mr-2 text-red-500" />
                  Test Failed - Try Again
                </>
              ) : (
                "Test API Key"
              )}
            </Button>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 border-b border-border bg-card/50 backdrop-blur-sm">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-primary" />
          Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure your AI API keys and preferences
        </p>
      </div>

      <div className="p-6 max-w-3xl space-y-6">
        {/* AI API Keys Section */}
        <Card className="bg-card/80 backdrop-blur-sm border-card-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              AI API Keys
            </CardTitle>
            <CardDescription>
              Configure your AI providers. You need at least one API key to use AI features.
              Choose any provider you prefer - all major LLMs are supported! Each provider has
              different strengths: use Fast for quick responses, Pro for complex reasoning tasks.
              <br />
              <span className="text-xs text-muted-foreground mt-2 block">
                💡 Tip: Make sure to copy the entire API key without any extra spaces. If testing fails, 
                check the error message for specific guidance.
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Fast Model */}
            <div className="p-4 rounded-lg bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-5 h-5 text-yellow-500" />
                <h3 className="font-semibold">Fast Model</h3>
                <span className="text-xs text-muted-foreground">(Quick responses, everyday tasks)</span>
              </div>
              {renderProviderConfig(
                fastConfig,
                setFastConfig,
                showFastKey,
                setShowFastKey,
                "fast",
                testingFast,
                fastTestResult
              )}
            </div>

            {/* Pro Model */}
            <div className="p-4 rounded-lg bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20">
              <div className="flex items-center gap-2 mb-4">
                <Crown className="w-5 h-5 text-purple-500" />
                <h3 className="font-semibold">Pro Model</h3>
                <span className="text-xs text-muted-foreground">(Advanced reasoning, complex tasks)</span>
              </div>
              {renderProviderConfig(
                proConfig,
                setProConfig,
                showProKey,
                setShowProKey,
                "pro",
                testingPro,
                proTestResult
              )}
            </div>
          </CardContent>
        </Card>

        {/* Git Provider Integration */}
        <Card className="bg-card/80 backdrop-blur-sm border-card-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="w-5 h-5" />
              Git Provider Integration
            </CardTitle>
            <CardDescription>
              Connect your Git provider to access repository analytics. Choose your preferred provider below.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Provider Selection */}
            <div className="space-y-2">
              <Label>Select Git Provider</Label>
              <Select value={gitProvider} onValueChange={(v) => setGitProvider(v as GitProvider)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(gitProviderInfoMap).map(([key, info]) => (
                    <SelectItem key={key} value={key}>
                      {info.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* GitHub Configuration */}
            {gitProvider === "github" && (
              <div className="p-4 rounded-lg bg-muted/50 border border-border space-y-4">
                <div className="flex items-center gap-2">
                  <Github className="w-5 h-5" />
                  <h3 className="font-semibold">GitHub</h3>
                </div>
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
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full"
                      onClick={() => setShowPat(!showPat)}
                    >
                      {showPat ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {gitProviderInfoMap.github.note}. Get token at{" "}
                    <a
                      href={gitProviderInfoMap.github.tokenUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-1"
                    >
                      {gitProviderInfoMap.github.tokenUrl} <ExternalLink className="w-3 h-3" />
                    </a>
                  </p>
                </div>
              </div>
            )}

            {/* GitLab Configuration */}
            {gitProvider === "gitlab" && (
              <div className="p-4 rounded-lg bg-muted/50 border border-border space-y-4">
                <div className="flex items-center gap-2">
                  <GitBranch className="w-5 h-5" />
                  <h3 className="font-semibold">GitLab</h3>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gitlab-instance">GitLab Instance URL (optional)</Label>
                  <Input
                    id="gitlab-instance"
                    type="text"
                    value={gitlabInstanceUrl}
                    onChange={(e) => setGitlabInstanceUrl(e.target.value)}
                    placeholder="https://gitlab.com"
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave as default for GitLab.com, or enter your self-hosted instance URL
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gitlab-token">Personal Access Token</Label>
                  <div className="relative">
                    <Input
                      id="gitlab-token"
                      type={showGitlabToken ? "text" : "password"}
                      value={gitlabToken}
                      onChange={(e) => setGitlabToken(e.target.value)}
                      placeholder="glpat-xxxxxxxxxxxxxxxxxxxx"
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full"
                      onClick={() => setShowGitlabToken(!showGitlabToken)}
                    >
                      {showGitlabToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {gitProviderInfoMap.gitlab.note}. Get token at{" "}
                    <a
                      href={gitProviderInfoMap.gitlab.tokenUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-1"
                    >
                      {gitProviderInfoMap.gitlab.tokenUrl} <ExternalLink className="w-3 h-3" />
                    </a>
                  </p>
                </div>
              </div>
            )}

            {/* Bitbucket Configuration */}
            {gitProvider === "bitbucket" && (
              <div className="p-4 rounded-lg bg-muted/50 border border-border space-y-4">
                <div className="flex items-center gap-2">
                  <GitBranch className="w-5 h-5" />
                  <h3 className="font-semibold">Bitbucket</h3>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bitbucket-username">Username</Label>
                  <Input
                    id="bitbucket-username"
                    type="text"
                    value={bitbucketUsername}
                    onChange={(e) => setBitbucketUsername(e.target.value)}
                    placeholder="your-username"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bitbucket-password">App Password</Label>
                  <div className="relative">
                    <Input
                      id="bitbucket-password"
                      type={showBitbucketPassword ? "text" : "password"}
                      value={bitbucketAppPassword}
                      onChange={(e) => setBitbucketAppPassword(e.target.value)}
                      placeholder="App password (not your account password)"
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full"
                      onClick={() => setShowBitbucketPassword(!showBitbucketPassword)}
                    >
                      {showBitbucketPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {gitProviderInfoMap.bitbucket.note}. Create app password at{" "}
                    <a
                      href={gitProviderInfoMap.bitbucket.tokenUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-1"
                    >
                      {gitProviderInfoMap.bitbucket.tokenUrl} <ExternalLink className="w-3 h-3" />
                    </a>
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Appearance */}
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
