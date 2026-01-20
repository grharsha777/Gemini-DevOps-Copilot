export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  owner: string;
  description: string | null;
  default_branch: string;
  updated_at: string;
  stargazers_count?: number;
  language?: string | null;
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

  constructor(private token: string) { }

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
      stargazers_count: repo.stargazers_count,
      language: repo.language,
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

  private async requestWithBody<T>(endpoint: string, method: string = "GET", body?: any): Promise<T> {
    const options: RequestInit = {
      method,
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, options);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`GitHub API error: ${response.statusText} - ${errorText}`);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  async createRepository(name: string, description?: string, isPrivate: boolean = false): Promise<GitHubRepo> {
    const repo = await this.requestWithBody<any>("/user/repos", "POST", {
      name,
      description: description || "",
      private: isPrivate,
      auto_init: false,
    });

    return {
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      owner: repo.owner.login,
      description: repo.description,
      default_branch: repo.default_branch,
      updated_at: repo.updated_at,
    };
  }

  async pushFiles(
    owner: string,
    repo: string,
    files: Array<{ path: string; content: string }>,
    message: string = "Initial commit from CodeVortexAI"
  ): Promise<string> {
    try {
      // Get the default branch
      const repoInfo = await this.request<any>(`/repos/${owner}/${repo}`);
      const defaultBranch = repoInfo.default_branch || "main";

      // Get the latest commit SHA
      let baseCommitSha: string;
      try {
        const refResponse = await this.request<any>(`/repos/${owner}/${repo}/git/ref/heads/${defaultBranch}`);
        baseCommitSha = refResponse.object.sha;
      } catch (error) {
        // If branch doesn't exist, create initial commit
        baseCommitSha = "";
      }

      let baseTreeSha: string | undefined;
      if (baseCommitSha) {
        // Get the tree SHA from the commit
        const commitResponse = await this.request<any>(`/repos/${owner}/${repo}/git/commits/${baseCommitSha}`);
        baseTreeSha = commitResponse.tree.sha;
      }

      // Create blobs for all files
      const blobs = await Promise.all(
        files.map(async (file) => {
          const blob = await this.requestWithBody<any>(`/repos/${owner}/${repo}/git/blobs`, "POST", {
            content: Buffer.from(file.content).toString("base64"),
            encoding: "base64",
          });
          return {
            path: file.path,
            mode: "100644",
            type: "blob",
            sha: blob.sha,
          };
        })
      );

      // Create a new tree
      const treeBody: any = {
        tree: blobs,
      };
      if (baseTreeSha) {
        treeBody.base_tree = baseTreeSha;
      }

      const tree = await this.requestWithBody<any>(`/repos/${owner}/${repo}/git/trees`, "POST", treeBody);

      // Create a new commit
      const commitBody: any = {
        message,
        tree: tree.sha,
      };
      if (baseCommitSha) {
        commitBody.parents = [baseCommitSha];
      }

      const commit = await this.requestWithBody<any>(`/repos/${owner}/${repo}/git/commits`, "POST", commitBody);

      // Update the branch reference
      try {
        await this.requestWithBody<any>(`/repos/${owner}/${repo}/git/refs/heads/${defaultBranch}`, "PATCH", {
          sha: commit.sha,
        });
      } catch (error) {
        // If ref doesn't exist, create it
        await this.requestWithBody<any>(`/repos/${owner}/${repo}/git/refs`, "POST", {
          ref: `refs/heads/${defaultBranch}`,
          sha: commit.sha,
        });
      }

      return commit.sha;
    } catch (error: any) {
      throw new Error(`Failed to push files: ${error.message}`);
    }
  }

  async getFileContent(owner: string, repo: string, path: string, branch: string = "main"): Promise<string> {
    try {
      const file = await this.request<any>(`/repos/${owner}/${repo}/contents/${path}?ref=${branch}`);
      return Buffer.from(file.content, "base64").toString("utf-8");
    } catch (error) {
      throw new Error(`Failed to get file content: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
}
