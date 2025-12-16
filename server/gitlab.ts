export interface GitLabRepo {
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

export class GitLabService {
  private baseUrl: string;

  constructor(private token: string, private instanceUrl: string = "https://gitlab.com") {
    this.baseUrl = `${instanceUrl}/api/v4`;
  }

  private async request<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: {
        "Authorization": `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`GitLab API error: ${response.statusText}`);
    }

    return response.json();
  }

  async getRepositories(): Promise<GitLabRepo[]> {
    const repos = await this.request<any[]>("/projects?membership=true&order_by=updated_at&sort=desc&per_page=50");
    return repos.map((repo) => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.path_with_namespace,
      owner: repo.namespace?.path || repo.owner?.username || "unknown",
      description: repo.description,
      default_branch: repo.default_branch || "main",
      updated_at: repo.last_activity_at,
    }));
  }

  async getCommitActivity(owner: string, repo: string, days: number = 7): Promise<CommitActivity[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    // GitLab uses project ID or path
    const projectPath = `${owner}/${repo}`;
    const commits = await this.request<any[]>(
      `/projects/${encodeURIComponent(projectPath)}/repository/commits?since=${since.toISOString()}&per_page=100`
    );

    const activityMap = new Map<string, number>();
    commits.forEach((commit) => {
      const date = new Date(commit.committed_date).toISOString().split("T")[0];
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
    const projectPath = `${owner}/${repo}`;
    const [openMRs, closedMRs] = await Promise.all([
      this.request<any[]>(`/projects/${encodeURIComponent(projectPath)}/merge_requests?state=opened&per_page=100`),
      this.request<any[]>(`/projects/${encodeURIComponent(projectPath)}/merge_requests?state=closed&per_page=100`),
    ]);

    const merged = closedMRs.filter((mr) => mr.merged_at).length;
    const closed = closedMRs.length - merged;

    return {
      open: openMRs.length,
      merged,
      closed,
    };
  }

  async getOpenIssues(owner: string, repo: string): Promise<number> {
    const projectPath = `${owner}/${repo}`;
    const issues = await this.request<any[]>(
      `/projects/${encodeURIComponent(projectPath)}/issues?state=opened&per_page=100`
    );
    return issues.length;
  }

  async getContributors(owner: string, repo: string): Promise<ContributorActivity[]> {
    const projectPath = `${owner}/${repo}`;
    const contributors = await this.request<any[]>(
      `/projects/${encodeURIComponent(projectPath)}/repository/contributors?per_page=10`
    );
    return contributors.map((c) => ({
      author: c.name || c.email || "Unknown",
      commits: c.commits || 0,
    }));
  }

  async getHotspotFiles(owner: string, repo: string): Promise<HotspotFile[]> {
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const projectPath = `${owner}/${repo}`;

    const commits = await this.request<any[]>(
      `/projects/${encodeURIComponent(projectPath)}/repository/commits?since=${since.toISOString()}&per_page=100`
    );

    const fileCommits = new Map<string, { count: number; lastModified: string }>();

    for (const commit of commits) {
      try {
        const commitDetail = await this.request<any>(
          `/projects/${encodeURIComponent(projectPath)}/repository/commits/${commit.id}`
        );
        commitDetail.stats?.files?.forEach((file: any) => {
          const existing = fileCommits.get(file.path);
          if (existing) {
            existing.count++;
            if (new Date(commit.committed_date) > new Date(existing.lastModified)) {
              existing.lastModified = commit.committed_date;
            }
          } else {
            fileCommits.set(file.path, {
              count: 1,
              lastModified: commit.committed_date,
            });
          }
        });
      } catch (error) {
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
}

