import { YouTubeService } from "./youtube";
import { GitHubService } from "./github";
import { ModelOrchestrator } from "./orchestrator";

export interface SearchResult {
    id: string;
    title: string;
    description: string;
    url: string;
    thumbnail?: string;
    platform: "YouTube" | "GitHub" | "Dev.to";
    metadata?: any;
}

export class SearchAggregator {
    private youtubeService?: YouTubeService;
    private githubService?: GitHubService;

    constructor(youtubeApiKey?: string, githubToken?: string) {
        if (youtubeApiKey) {
            this.youtubeService = new YouTubeService(youtubeApiKey);
        }
        if (githubToken) {
            this.githubService = new GitHubService(githubToken);
        }
    }

    async searchAll(query: string): Promise<SearchResult[]> {
        const results: SearchResult[] = [];

        // 1. YouTube Search
        if (this.youtubeService) {
            try {
                const ytVideos = await this.youtubeService.searchVideos(query, 3);
                ytVideos.forEach(v => {
                    results.push({
                        id: `yt-${v.id}`,
                        title: v.title,
                        description: v.description,
                        url: `https://www.youtube.com/watch?v=${v.id}`,
                        thumbnail: v.thumbnailUrl,
                        platform: "YouTube",
                        metadata: { channelTitle: v.channelTitle }
                    });
                });
            } catch (e) {
                console.error("YouTube search failed in aggregator", e);
            }
        }

        // 2. GitHub Search (Search for repositories matching the query)
        if (this.githubService) {
            try {
                // Simplified repo search simulation or real call if we have token
                // For now, let's assume we search for relevant repos
                const repos = await this.githubService.getRepositories();
                const filtered = repos.filter(r =>
                    r.full_name.toLowerCase().includes(query.toLowerCase()) ||
                    (r.description && r.description.toLowerCase().includes(query.toLowerCase()))
                ).slice(0, 3);

                filtered.forEach(r => {
                    results.push({
                        id: `gh-${r.id}`,
                        title: r.full_name,
                        description: r.description || "No description provided",
                        url: `https://github.com/${r.full_name}`,
                        platform: "GitHub",
                        metadata: { stars: r.stargazers_count || 0, language: r.language || "N/A" }
                    });
                });
            } catch (e) {
                console.error("GitHub search failed in aggregator", e);
            }
        }

        // 3. Dev.to / AI Research (Simulated via AI if no API)
        try {
            const aiPrompt = `Find 3 high-quality technical articles or blog posts on Dev.to or similar platforms about "${query}". Return a JSON array of results.
            
            Structure:
            [{
                id: string,
                title: string,
                description: string,
                url: string,
                platform: "Dev.to"
            }]`;

            const aiResult = await ModelOrchestrator.generate({
                prompt: aiPrompt,
                mode: "generate"
            });

            try {
                const aiArticles = JSON.parse(aiResult.text.replace(/```json\n?|```/g, '').trim());
                aiArticles.forEach((a: any) => {
                    results.push({
                        ...a,
                        id: `ai-${a.id}`,
                        platform: a.platform || "Dev.to"
                    });
                });
            } catch (e) {
                console.error("AI Article parsing failed", e);
            }
        } catch (e) {
            console.error("AI Research failed in aggregator", e);
        }

        return results;
    }
}
