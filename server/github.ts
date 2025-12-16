export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  owner: string;
  description: string | null;
  default_branch: string;
  updated_at: string;
}

export interface CommitActivity {
  date: string;
  count: number;
}

export interface PRStatus {
  open: number;
  merged: number;
  closed: number;
}

export interface ContributorActivity {
  author: string;
  commits: number;
}

export interface HotspotFile {
  path: string;
  commitCount: number;
  lastModified: string;
  riskScore: number;
}

export class GitHubService {
  private baseUrl = "https://api.github.com";

  constructor(private token: string) {}

  private async request<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.statusText}`);
    }

    return response.json();
  }

  async getRepositories(): Promise<GitHubRepo[]> {
    const repos = await this.request<any[]>("/user/repos?sort=updated&per_page=50");
    return repos.map((repo) => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      owner: repo.owner.login,
      description: repo.description,
      default_branch: repo.default_branch,
      updated_at: repo.updated_at,
    }));
  }

  async getCommitActivity(owner: string, repo: string, days: number = 7): Promise<CommitActivity[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const commits = await this.request<any[]>(
      `/repos/${owner}/${repo}/commits?since=${since.toISOString()}&per_page=100`
    );

    const activityMap = new Map<string, number>();
    commits.forEach((commit) => {
      const date = new Date(commit.commit.author.date).toISOString().split("T")[0];
      activityMap.set(date, (activityMap.get(date) || 0) + 1);
    });

    const result: CommitActivity[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      result.push({
        date: dateStr,
        count: activityMap.get(dateStr) || 0,
      });
    }

    return result;
  }

  async getPRStatus(owner: string, repo: string): Promise<PRStatus> {
    const [openPRs, closedPRs] = await Promise.all([
      this.request<any[]>(`/repos/${owner}/${repo}/pulls?state=open&per_page=100`),
      this.request<any[]>(`/repos/${owner}/${repo}/pulls?state=closed&per_page=100`),
    ]);

    const merged = closedPRs.filter((pr) => pr.merged_at).length;
    const closed = closedPRs.length - merged;

    return {
      open: openPRs.length,
      merged,
      closed,
    };
  }

  async getOpenIssues(owner: string, repo: string): Promise<number> {
    const issues = await this.request<any[]>(
      `/repos/${owner}/${repo}/issues?state=open&per_page=100`
    );
    return issues.filter((issue) => !issue.pull_request).length;
  }

  async getContributors(owner: string, repo: string): Promise<ContributorActivity[]> {
    const contributors = await this.request<any[]>(
      `/repos/${owner}/${repo}/contributors?per_page=10`
    );
    return contributors.map((c) => ({
      author: c.login,
      commits: c.contributions,
    }));
  }

  async getHotspotFiles(owner: string, repo: string): Promise<HotspotFile[]> {
    const since = new Date();
    since.setDate(since.getDate() - 30);

    const commits = await this.request<any[]>(
      `/repos/${owner}/${repo}/commits?since=${since.toISOString()}&per_page=100`
    );

    const fileCommits = new Map<string, { count: number; lastModified: string }>();

    for (const commit of commits) {
      try {
        const commitDetail = await this.request<any>(`/repos/${owner}/${repo}/commits/${commit.sha}`);
        commitDetail.files?.forEach((file: any) => {
          const existing = fileCommits.get(file.filename);
          if (existing) {
            existing.count++;
            if (new Date(commit.commit.author.date) > new Date(existing.lastModified)) {
              existing.lastModified = commit.commit.author.date;
            }
          } else {
            fileCommits.set(file.filename, {
              count: 1,
              lastModified: commit.commit.author.date,
            });
          }
        });
      } catch (error) {
        // Skip commits that fail to fetch details
        continue;
      }
    }

    const hotspots: HotspotFile[] = Array.from(fileCommits.entries())
      .map(([path, data]) => ({
        path,
        commitCount: data.count,
        lastModified: data.lastModified,
        riskScore: Math.min(10, Math.floor(data.count / 2) + 1),
      }))
      .sort((a, b) => b.commitCount - a.commitCount)
      .slice(0, 10);

    return hotspots;
  }

  async getWorkflows(owner: string, repo: string): Promise<any> {
    // Returns list of workflows for the repo
    return this.request<any>(`/repos/${owner}/${repo}/actions/workflows`);
  }

  async getWorkflowRuns(owner: string, repo: string, workflow_id?: string): Promise<any> {
    let endpoint = `/repos/${owner}/${repo}/actions/runs?per_page=50`;
    if (workflow_id) endpoint = `/repos/${owner}/${repo}/actions/workflows/${workflow_id}/runs?per_page=50`;
    return this.request<any>(endpoint);
  }
}
