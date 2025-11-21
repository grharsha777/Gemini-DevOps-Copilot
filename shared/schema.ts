import { z } from "zod";

// Chat Messages
export const chatMessageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  timestamp: z.number(),
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;

// AI Generation Modes
export const aiModeSchema = z.enum([
  "generate",
  "test",
  "document",
  "refactor",
  "explain",
  "boilerplate",
]);

export type AIMode = z.infer<typeof aiModeSchema>;

// AI Models
export const aiModelSchema = z.enum(["gemini-2.0-flash", "gemini-1.5-pro"]);

export type AIModel = z.infer<typeof aiModelSchema>;

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

// User Settings (for localStorage)
export const userSettingsSchema = z.object({
  githubPat: z.string().optional(),
  selectedRepo: z.string().optional(),
  aiModel: aiModelSchema,
  theme: z.enum(["light", "dark"]),
});

export type UserSettings = z.infer<typeof userSettingsSchema>;
