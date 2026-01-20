import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import Home from "@/pages/home";
import Copilot from "@/pages/copilot";
import Agent from "@/pages/agent";
import Explain from "@/pages/explain";
import Dashboard from "@/pages/dashboard";
import AppBuilder from "@/pages/app-builder";
import MobileAppBuilder from "@/pages/mobile-app-builder";
import Playground from "@/pages/playground";
import Settings from "@/pages/settings";
import Community from "@/pages/community";
import Learning from "@/pages/learning";
import Leaderboard from "@/pages/leaderboard";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/copilot" component={Copilot} />
      <Route path="/agent" component={Agent} />
      <Route path="/ganapathi-builder" component={AppBuilder} />
      <Route path="/mobile-builder" component={MobileAppBuilder} />
      <Route path="/playground" component={Playground} />
      <Route path="/playground/:id" component={Playground} />
      <Route path="/community" component={Community} />
      <Route path="/learning" component={Learning} />
      <Route path="/leaderboard" component={Leaderboard} />
      <Route path="/explain" component={Explain} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

import { PerplexityChat } from "@/components/perplexity-chat";

function AppLayout() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1">
          <header className="flex items-center justify-between p-4 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-hidden">
            <Router />
          </main>
        </div>
      </div>
      <PerplexityChat />
    </SidebarProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <AppLayout />
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
