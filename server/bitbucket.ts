export interface BitbucketRepo {
  id: string;
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

export class BitbucketService {
  private baseUrl = "https://api.bitbucket.org/2.0";

  constructor(private token: string, private appPassword: string) {}

  private async request<T>(endpoint: string): Promise<T> {
    const auth = Buffer.from(`${this.token}:${this.appPassword}`).toString("base64");
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: {
        "Authorization": `Basic ${auth}`,
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Bitbucket API error: ${response.statusText}`);
    }

    return response.json();
  }

  async getRepositories(): Promise<BitbucketRepo[]> {
    const repos = await this.request<{ values: any[]; next?: string }>("/repositories?role=member&pagelen=50");
    const allRepos: any[] = [...repos.values];
    
    // Handle pagination if needed
    let nextUrl = repos.next;
    while (nextUrl && allRepos.length < 50) {
      const nextPage = await fetch(nextUrl, {
        headers: {
          "Authorization": `Basic ${Buffer.from(`${this.token}:${this.appPassword}`).toString("base64")}`,
          "Accept": "application/json",
        },
      }).then((r) => r.json());
      allRepos.push(...nextPage.values);
      nextUrl = nextPage.next;
    }

    return allRepos.map((repo) => ({
      id: repo.uuid,
      name: repo.name,
      full_name: repo.full_name,
      owner: repo.owner?.username || repo.workspace?.slug || "unknown",
      description: repo.description,
      default_branch: repo.mainbranch?.name || "main",
      updated_at: repo.updated_on,
    }));
  }

  async getCommitActivity(owner: string, repo: string, days: number = 7): Promise<CommitActivity[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const commits = await this.request<{ values: any[]; next?: string }>(
      `/repositories/${owner}/${repo}/commits?since=${since.toISOString()}&pagelen=100`
    );

    const activityMap = new Map<string, number>();
    commits.values?.forEach((commit) => {
      const date = new Date(commit.date).toISOString().split("T")[0];
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
      this.request<{ values: any[] }>(`/repositories/${owner}/${repo}/pullrequests?state=OPEN&pagelen=100`),
      this.request<{ values: any[] }>(`/repositories/${owner}/${repo}/pullrequests?state=MERGED&pagelen=100`),
    ]);

    const merged = closedPRs.values?.length || 0;
    const closed = 0; // Bitbucket doesn't have a separate closed state

    return {
      open: openPRs.values?.length || 0,
      merged,
      closed,
    };
  }

  async getOpenIssues(owner: string, repo: string): Promise<number> {
    // Bitbucket doesn't have a built-in issues API in v2.0
    // This would require using the issue tracker API if enabled
    return 0;
  }

  async getContributors(owner: string, repo: string): Promise<ContributorActivity[]> {
    const commits = await this.request<{ values: any[] }>(
      `/repositories/${owner}/${repo}/commits?pagelen=100`
    );

    const contributorMap = new Map<string, number>();
    commits.values?.forEach((commit) => {
      const author = commit.author?.user?.username || commit.author?.raw || "Unknown";
      contributorMap.set(author, (contributorMap.get(author) || 0) + 1);
    });

    return Array.from(contributorMap.entries())
      .map(([author, commits]) => ({ author, commits }))
      .sort((a, b) => b.commits - a.commits)
      .slice(0, 10);
  }

  async getHotspotFiles(owner: string, repo: string): Promise<HotspotFile[]> {
    const since = new Date();
    since.setDate(since.getDate() - 30);

    const commits = await this.request<{ values: any[] }>(
      `/repositories/${owner}/${repo}/commits?since=${since.toISOString()}&pagelen=100`
    );

    const fileCommits = new Map<string, { count: number; lastModified: string }>();

    for (const commit of commits.values || []) {
      try {
        const commitDetail = await this.request<any>(
          `/repositories/${owner}/${repo}/commit/${commit.hash}`
        );
        // Bitbucket commit detail includes file changes
        commitDetail.diffstat?.values?.forEach((stat: any) => {
          const path = stat.old?.path || stat.new?.path;
          if (path) {
            const existing = fileCommits.get(path);
            if (existing) {
              existing.count++;
              if (new Date(commit.date) > new Date(existing.lastModified)) {
                existing.lastModified = commit.date;
              }
            } else {
              fileCommits.set(path, {
                count: 1,
                lastModified: commit.date,
              });
            }
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

