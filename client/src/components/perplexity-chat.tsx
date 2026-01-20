import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, X, Minimize2, Maximize2, Send, Sparkles, AlertCircle, Code, Copy, Check, ThumbsUp, ThumbsDown, Bot } from "lucide-react";
import { AIService } from "@/lib/ai";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  context?: {
    file?: string;
    selection?: string;
    error?: string;
  };
}

export function PerplexityChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [context, setContext] = useState<{ file?: string; selection?: string; error?: string }>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const [location] = useLocation();

  // Load history from DB on mount
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const history = await db.getAll<Message>('perplexity_history');
        if (history.length > 0) {
            setMessages(history.sort((a, b) => a.timestamp - b.timestamp));
        } else {
            // Initial welcome message
            const welcome: Message = {
                id: 'welcome',
                role: 'assistant',
                content: "Hi! I'm your AI pair programmer. I can help you debug errors, explain code, or answer complex technical questions. Context is automatically detected.",
                timestamp: Date.now()
            };
            setMessages([welcome]);
        }
      } catch (err) {
        console.error("Failed to load chat history:", err);
      }
    };
    loadHistory();
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  // Listen for custom events (context updates)
  useEffect(() => {
    const handleContext = (e: CustomEvent) => {
      setContext(prev => ({ ...prev, ...e.detail }));
      setIsOpen(true);
      setIsMinimized(false);
      
      if (e.detail.error) {
        setInput(`Explain this error: ${e.detail.error}`);
      } else if (e.detail.selection) {
        setInput("Explain this code selection");
      }
    };

    window.addEventListener('perplexity-context' as any, handleContext);
    return () => window.removeEventListener('perplexity-context' as any, handleContext);
  }, []);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now(),
      context: context
    };

    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    // Save user message
    try {
        await db.put('perplexity_history', userMsg);
    } catch (e) { console.error(e); }

    try {
      // Prepare prompt with context
      let prompt = input;
      if (context.file) prompt += `\n\nFile: ${context.file}`;
      if (context.selection) prompt += `\n\nCode Selection:\n${context.selection}`;
      if (context.error) prompt += `\n\nError:\n${context.error}`;
      prompt += `\n\nCurrent Page: ${location}`;

      // Call AI Service (simulate Perplexity behavior)
      const response = await AIService.generateContent(prompt, "You are a helpful AI coding assistant.");
      
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response || "I couldn't generate a response. Please check your API settings.",
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, aiMsg]);
      await db.put('perplexity_history', aiMsg);
      
      // Clear context after sending
      setContext({});
    } catch (error: any) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Error: ${error.message}`,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        className="fixed bottom-6 right-6 z-50"
      >
      <Button
          className="h-16 w-16 rounded-full shadow-2xl hover:shadow-indigo-500/50 transition-all bg-gradient-to-br from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 border-2 border-white/20"
        onClick={() => setIsOpen(true)}
      >
          <img
            src="/logo.jpg"
            alt="Ganapathi AI Assistant"
            className="w-full h-full rounded-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
              (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
            }}
          />
          <Bot className="w-6 h-6 text-white hidden" />
      </Button>
      </motion.div>
    );
  }

  return (
    <Card className={cn(
      "fixed right-6 z-50 transition-all duration-300 shadow-2xl border-indigo-500/20 bg-[#0f111a]/95 backdrop-blur-xl",
      isMinimized ? "bottom-6 w-72 h-14 overflow-hidden" : "bottom-6 w-[400px] h-[600px] flex flex-col"
    )}>
      <CardHeader className="p-3 border-b border-white/10 flex flex-row items-center justify-between bg-indigo-950/30 cursor-pointer"
        onClick={() => setIsMinimized(!isMinimized)}
      >
        <CardTitle className="text-sm font-medium flex items-center gap-2 text-indigo-300">
          <img
            src="/logo.jpg"
            alt="Ganapathi"
            className="w-6 h-6 rounded-full object-cover border border-indigo-500/30"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <span>Ganapathi AI Assistant</span>
          <Badge variant="outline" className="text-[10px] h-5 border-indigo-500/30 text-indigo-300">Built by G R Harsha</Badge>
          {context.file && <Badge variant="outline" className="text-[10px] h-5 border-indigo-500/30 text-indigo-300">Context Active</Badge>}
        </CardTitle>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-white/10" onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }}>
            {isMinimized ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-red-500/20 hover:text-red-400" onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}>
            <X className="w-3 h-3" />
          </Button>
        </div>
      </CardHeader>

      {!isMinimized && (
        <>
          <CardContent className="flex-1 p-0 overflow-hidden relative">
            <ScrollArea className="h-full p-4" ref={scrollRef as any}>
              <div className="space-y-4 pb-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex flex-col max-w-[85%] rounded-lg p-3 text-sm animate-in fade-in slide-in-from-bottom-2",
                      msg.role === 'user' 
                        ? "ml-auto bg-indigo-600 text-white" 
                        : "bg-slate-800/80 text-slate-200 border border-white/5"
                    )}
                  >
                    <div className="whitespace-pre-wrap font-sans">{msg.content}</div>
                    {msg.context?.file && (
                        <div className="mt-2 text-xs opacity-70 border-t border-white/20 pt-1 flex items-center gap-1">
                            <Code className="w-3 h-3" /> {msg.context.file}
                        </div>
                    )}
                  </div>
                ))}
                {isLoading && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground ml-2">
                    <Sparkles className="w-3 h-3 animate-pulse text-indigo-400" />
                    Thinking...
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>

          <CardFooter className="p-3 border-t border-white/10 bg-slate-900/50">
            <div className="flex gap-2 w-full items-end">
              <div className="flex-1 relative">
                {context.error && (
                    <div className="absolute -top-8 left-0 right-0 bg-red-900/20 text-red-400 text-xs p-1 px-2 rounded border border-red-500/20 truncate flex items-center justify-between">
                        <span className="flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Error detected</span>
                        <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => setContext(prev => ({...prev, error: undefined}))}><X className="w-3 h-3" /></Button>
                    </div>
                )}
                <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                    placeholder={context.selection ? "Ask about selection..." : "Ask anything..."}
                    className="bg-slate-950 border-slate-800 focus-visible:ring-indigo-500 pr-10"
                />
              </div>
              <Button size="icon" onClick={handleSend} disabled={isLoading || !input.trim()} className="bg-indigo-600 hover:bg-indigo-500">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </CardFooter>
        </>
      )}
    </Card>
  );
}
