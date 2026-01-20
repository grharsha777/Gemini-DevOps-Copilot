import { z } from "zod";
import { pgTable, text, timestamp, jsonb, uuid, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

// Chat Messages
export const chatMessageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  timestamp: z.number(),
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;

// Chat History Session
export const chatSessionSchema = z.object({
  id: z.string(),
  title: z.string(),
  messages: z.array(chatMessageSchema),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export type ChatSession = z.infer<typeof chatSessionSchema>;

// AI Generation Modes
export const aiModeSchema = z.enum([
  "generate",
  "test",
  "document",
  "refactor",
  "explain",
  "boilerplate",
  "research",
]);

export type AIMode = z.infer<typeof aiModeSchema>;

// AI Providers - Supports any OpenAI-compatible API + specific providers
export const aiProviderSchema = z.enum([
  "gemini",      // Google Gemini
  "openai",      // OpenAI GPT models
  "mistral",     // Mistral AI
  "groq",        // Groq (Llama, Mixtral)
  "anthropic",   // Claude
  "deepseek",    // DeepSeek
  "openrouter",  // OpenRouter (access to many models)
  "huggingface", // Hugging Face Inference API
  "kimi",        // Kimi AI (Moonshot AI)
  "custom",      // Custom OpenAI-compatible endpoint
]);

export type AIProvider = z.infer<typeof aiProviderSchema>;

// Provider configuration with API endpoint info
export const providerConfigSchema = z.object({
  provider: aiProviderSchema,
  apiKey: z.string(),
  model: z.string().optional(),
  baseUrl: z.string().optional(), // For custom endpoints
});

export type ProviderConfig = z.infer<typeof providerConfigSchema>;

// AI Models (for backward compatibility)
export const aiModelSchema = z.enum(["fast", "pro"]);

export type AIModel = z.infer<typeof aiModelSchema>;

// Provider info for UI display with helpful notes
export const providerInfoMap: Record<AIProvider, {
  name: string;
  url: string;
  models: string[];
  note: string; // Short note about the provider
}> = {
  gemini: {
    name: "Google Gemini",
    url: "https://aistudio.google.com/app/apikey",
    models: ["gemini-2.0-flash-exp", "gemini-1.5-pro", "gemini-1.5-flash"],
    note: "Free tier available. Great for general coding tasks. Fast and reliable.",
  },
  openai: {
    name: "OpenAI",
    url: "https://platform.openai.com/api-keys",
    models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
    note: "Industry standard. GPT-4o is powerful for complex tasks. Pay-as-you-go pricing.",
  },
  mistral: {
    name: "Mistral AI",
    url: "https://console.mistral.ai/api-keys",
    models: ["codestral-latest", "mistral-large-latest", "mistral-small-latest"],
    note: "Excellent for code generation. Codestral is specialized for coding. Competitive pricing.",
  },
  groq: {
    name: "Groq",
    url: "https://console.groq.com/keys",
    models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768"],
    note: "Ultra-fast inference speed. Free tier available. Great for fast responses.",
  },
  anthropic: {
    name: "Anthropic Claude",
    url: "https://console.anthropic.com/settings/keys",
    models: ["claude-3-5-sonnet-20241022", "claude-3-haiku-20240307"],
    note: "Excellent reasoning capabilities. Claude 3.5 Sonnet is great for complex problems.",
  },
  deepseek: {
    name: "DeepSeek",
    url: "https://platform.deepseek.com/api_keys",
    models: ["deepseek-chat", "deepseek-coder"],
    note: "Cost-effective option. DeepSeek Coder is optimized for programming tasks.",
  },
  openrouter: {
    name: "OpenRouter",
    url: "https://openrouter.ai/keys",
    models: ["openai/gpt-4o", "anthropic/claude-3.5-sonnet", "meta-llama/llama-3.1-70b-instruct"],
    note: "Access to multiple models through one API. Unified interface for many LLMs.",
  },
  huggingface: {
    name: "Hugging Face",
    url: "https://huggingface.co/settings/tokens",
    models: ["meta-llama/Llama-3.1-8B-Instruct", "mistralai/Mistral-7B-Instruct-v0.2", "google/gemma-2-9b-it", "Qwen/Qwen2.5-7B-Instruct"],
    note: "Open-source models via Inference API. Free tier available. Great for experimentation with open models.",
  },
  kimi: {
    name: "Kimi AI (Moonshot)",
    url: "https://platform.moonshot.cn/console/api-keys",
    models: ["moonshot-v1-8k", "moonshot-v1-32k", "moonshot-v1-128k"],
    note: "Chinese AI service with long context support. OpenAI-compatible API. Good for Chinese language tasks.",
  },
  custom: {
    name: "Custom API",
    url: "",
    models: [],
    note: "Use any OpenAI-compatible API endpoint. Enter your custom base URL.",
  },
};

// GitHub Repository
export const githubRepoSchema = z.object({
  id: z.number(),
  name: z.string(),
  full_name: z.string(),
  owner: z.string(),
  description: z.string().nullable(),
  default_branch: z.string(),
  updated_at: z.string(),
});

export type GitHubRepo = z.infer<typeof githubRepoSchema>;

// Commit Activity
export const commitActivitySchema = z.object({
  date: z.string(),
  count: z.number(),
});

export type CommitActivity = z.infer<typeof commitActivitySchema>;

// PR Status
export const prStatusSchema = z.object({
  open: z.number(),
  merged: z.number(),
  closed: z.number(),
});

export type PRStatus = z.infer<typeof prStatusSchema>;

// Contributor Activity
export const contributorActivitySchema = z.object({
  author: z.string(),
  commits: z.number(),
});

export type ContributorActivity = z.infer<typeof contributorActivitySchema>;

// Hotspot File
export const hotspotFileSchema = z.object({
  path: z.string(),
  commitCount: z.number(),
  lastModified: z.string(),
  riskScore: z.number(),
  analysis: z.string().optional(),
});

export type HotspotFile = z.infer<typeof hotspotFileSchema>;

// Dashboard Summary
export const dashboardSummarySchema = z.object({
  totalCommits: z.number(),
  prStatus: prStatusSchema,
  openIssues: z.number(),
  hotspotCount: z.number(),
});

export type DashboardSummary = z.infer<typeof dashboardSummarySchema>;

// Code Explanation Line
export const codeExplanationLineSchema = z.object({
  lineNumber: z.number(),
  code: z.string(),
  explanation: z.string(),
  riskLevel: z.enum(["low", "medium", "high"]).optional(),
  performanceNote: z.string().optional(),
  securityIssue: z.string().optional(),
});

export type CodeExplanationLine = z.infer<typeof codeExplanationLineSchema>;

// Git Providers
export const gitProviderSchema = z.enum([
  "github",
  "gitlab",
  "bitbucket",
]);

export type GitProvider = z.infer<typeof gitProviderSchema>;

// Git Provider Info
export const gitProviderInfoMap: Record<GitProvider, {
  name: string;
  url: string;
  tokenUrl: string;
  note: string;
}> = {
  github: {
    name: "GitHub",
    url: "https://github.com",
    tokenUrl: "https://github.com/settings/tokens",
    note: "Personal Access Token (PAT) with 'repo' scope",
  },
  gitlab: {
    name: "GitLab",
    url: "https://gitlab.com",
    tokenUrl: "https://gitlab.com/-/user_settings/personal_access_tokens",
    note: "Personal Access Token with 'api' scope. Supports self-hosted instances.",
  },
  bitbucket: {
    name: "Bitbucket",
    url: "https://bitbucket.org",
    tokenUrl: "https://bitbucket.org/account/settings/app-passwords/",
    note: "App Password (username + app password). Create in account settings.",
  },
};

// User Settings (for localStorage)
export const userSettingsSchema = z.object({
  // Git Provider Settings
  gitProvider: gitProviderSchema.optional(),
  githubPat: z.string().optional(),
  gitlabToken: z.string().optional(),
  gitlabInstanceUrl: z.string().optional(), // For self-hosted GitLab
  bitbucketUsername: z.string().optional(),
  bitbucketAppPassword: z.string().optional(),
  selectedRepo: z.string().optional(),
  theme: z.enum(["light", "dark"]),
  // Fast model configuration (for quick responses)
  fastProvider: aiProviderSchema.optional(),
  fastApiKey: z.string().optional(),
  fastModel: z.string().optional(),
  fastBaseUrl: z.string().optional(),
  // Pro model configuration (for advanced/complex tasks)
  proProvider: aiProviderSchema.optional(),
  proApiKey: z.string().optional(),
  proModel: z.string().optional(),
  proBaseUrl: z.string().optional(),
});

export type UserSettings = z.infer<typeof userSettingsSchema>;

// Mobile Projects Table
export const mobileProjects = pgTable("mobile_projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  userId: text("user_id").notNull(), // Matching the string id pattern in storage.ts
  status: text("status").default("draft"), // draft, building, deployed
  config: jsonb("config").$type<{
    primaryColor: string;
    borderRadius: number;
    fontFamily: string;
  }>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// App Screens Table
export const appScreens = pgTable("app_screens", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => mobileProjects.id),
  name: text("name").notNull(),
  layout: jsonb("layout").notNull(),
  isInitial: boolean("is_initial").default(false),
});

// Build History Table
export const buildHistory = pgTable("build_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => mobileProjects.id),
  platform: text("platform").notNull(), // ios, android
  status: text("status").notNull(),
  buildUrl: text("build_url"),
  logs: text("logs"),
  version: text("version").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Zod schemas for the new tables
export const insertMobileProjectSchema = createInsertSchema(mobileProjects).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAppScreenSchema = createInsertSchema(appScreens).omit({ id: true });
export const insertBuildHistorySchema = createInsertSchema(buildHistory).omit({ id: true, createdAt: true });

export type MobileProject = typeof mobileProjects.$inferSelect;
export type InsertMobileProject = z.infer<typeof insertMobileProjectSchema>;
export type AppScreen = typeof appScreens.$inferSelect;
export type BuildHistory = typeof buildHistory.$inferSelect;

