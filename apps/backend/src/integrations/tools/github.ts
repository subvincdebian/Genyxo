import {
  b,
  int,
  IntegrationTool,
  n,
  need,
  object,
  s,
  str,
  ToolContext,
} from "./types";

const API = "https://api.github.com";
const headers = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
};
const gh = <T = any>(
  ctx: ToolContext,
  path: string,
  init: Parameters<ToolContext["fetch"]>[1] = {},
) =>
  ctx.fetch<T>(`${API}${path}`, {
    ...init,
    headers: { ...headers, ...init.headers },
  });
const seg = (value: string) => encodeURIComponent(value);
const repoPath = (args: Record<string, any>) =>
  `/repos/${seg(need(args, "owner", 100))}/${seg(need(args, "repo", 100))}`;

const pull = (pr: any) => ({
  number: pr.number,
  title: pr.title,
  state: pr.state,
  draft: pr.draft,
  author: pr.user?.login,
  repository:
    pr.repository_url?.replace(`${API}/repos/`, "") || pr.base?.repo?.full_name,
  url: pr.html_url,
  updated: pr.updated_at,
});
const repoFields = {
  owner: s("Repository owner (user or organization)"),
  repo: s("Repository name"),
};

export const githubTools: IntegrationTool[] = [
  {
    name: "github_list_repos",
    pluginId: "github",
    label: "Listing repositories",
    description:
      "List repositories the user can access, most recently updated first.",
    parameters: object({ limit: n("Maximum repositories, up to 50") }),
    run: async (ctx, args) =>
      (
        await gh<any[]>(ctx, "/user/repos", {
          query: { sort: "updated", per_page: int(args, "limit", 20, 50) },
        })
      ).map((repo) => ({
        name: repo.full_name,
        private: repo.private,
        description: repo.description,
        default_branch: repo.default_branch,
        url: repo.html_url,
        updated: repo.updated_at,
      })),
  },
  {
    name: "github_list_pull_requests",
    pluginId: "github",
    label: "Listing pull requests",
    description:
      "List pull requests. Without owner/repo, lists open pull requests the user authored across GitHub. Use query for other GitHub search filters such as 'review-requested:@me'.",
    parameters: object({
      ...repoFields,
      state: { type: "string", enum: ["open", "closed", "all"] },
      query: s("Extra GitHub search qualifiers"),
      limit: n("Maximum results, up to 50"),
    }),
    run: async (ctx, args) => {
      const limit = int(args, "limit", 20, 50);
      const state = str(args, "state") || "open";
      if (args.owner && args.repo)
        return (
          await gh<any[]>(ctx, `${repoPath(args)}/pulls`, {
            query: { state, per_page: limit },
          })
        ).map(pull);
      const filters = str(args, "query", { max: 300 }) || "author:@me";
      const q = `is:pr ${state === "all" ? "" : `is:${state}`} ${filters}`
        .replace(/\s+/g, " ")
        .trim();
      const result = await gh(ctx, "/search/issues", {
        query: { q, per_page: limit, sort: "updated" },
      });
      return { total: result.total_count, items: result.items.map(pull) };
    },
  },
  {
    name: "github_get_pull_request",
    pluginId: "github",
    label: "Reading pull request",
    description:
      "Read one pull request with its changed files and review comments.",
    parameters: object({ ...repoFields, number: n("Pull request number") }, [
      "owner",
      "repo",
      "number",
    ]),
    run: async (ctx, args) => {
      const base = `${repoPath(args)}/pulls/${int(args, "number", 0, 1e9)}`;
      const [pr, files, comments] = await Promise.all([
        gh(ctx, base),
        gh<any[]>(ctx, `${base}/files`, { query: { per_page: 50 } }),
        gh<any[]>(ctx, `${base.replace("/pulls/", "/issues/")}/comments`, {
          query: { per_page: 30 },
        }),
      ]);
      return {
        ...pull(pr),
        body: pr.body?.slice(0, 4000),
        head: pr.head?.ref,
        base: pr.base?.ref,
        mergeable: pr.mergeable,
        files: files.map((file) => ({
          file: file.filename,
          status: file.status,
          additions: file.additions,
          deletions: file.deletions,
        })),
        comments: comments.map((comment) => ({
          author: comment.user?.login,
          body: comment.body?.slice(0, 1500),
        })),
      };
    },
  },
  {
    name: "github_list_issues",
    pluginId: "github",
    label: "Listing issues",
    description:
      "List issues in a repository, or issues assigned to the user when no repository is given.",
    parameters: object({
      ...repoFields,
      state: { type: "string", enum: ["open", "closed", "all"] },
      limit: n("Maximum results, up to 50"),
    }),
    run: async (ctx, args) => {
      const query = {
        state: str(args, "state") || "open",
        per_page: int(args, "limit", 20, 50),
      };
      const items = await gh<any[]>(
        ctx,
        args.owner && args.repo ? `${repoPath(args)}/issues` : "/issues",
        { query },
      );
      return items
        .filter((item) => !item.pull_request)
        .map((issue) => ({
          number: issue.number,
          title: issue.title,
          state: issue.state,
          repository: issue.repository?.full_name,
          labels: issue.labels?.map((label: any) => label.name),
          url: issue.html_url,
        }));
    },
  },
  {
    name: "github_get_issue",
    pluginId: "github",
    label: "Reading issue",
    description: "Read one issue with its comments.",
    parameters: object({ ...repoFields, number: n("Issue number") }, [
      "owner",
      "repo",
      "number",
    ]),
    run: async (ctx, args) => {
      const base = `${repoPath(args)}/issues/${int(args, "number", 0, 1e9)}`;
      const [issue, comments] = await Promise.all([
        gh(ctx, base),
        gh<any[]>(ctx, `${base}/comments`, { query: { per_page: 30 } }),
      ]);
      return {
        number: issue.number,
        title: issue.title,
        state: issue.state,
        author: issue.user?.login,
        body: issue.body?.slice(0, 4000),
        url: issue.html_url,
        comments: comments.map((comment) => ({
          author: comment.user?.login,
          body: comment.body?.slice(0, 1500),
        })),
      };
    },
  },
  {
    name: "github_create_repo",
    pluginId: "github",
    label: "Creating repository",
    write: true,
    description:
      "Create a new repository for the user. Needs the user's confirmation.",
    parameters: object(
      {
        name: s("Repository name"),
        description: s("Short description"),
        private: b("Create as private (default true)"),
      },
      ["name"],
    ),
    preview: (args) => ({
      title: "Create GitHub repository",
      fields: [
        { label: "Name", value: need(args, "name", 100) },
        {
          label: "Visibility",
          value: args.private === false ? "Public" : "Private",
        },
        ...(args.description
          ? [{ label: "Description", value: String(args.description) }]
          : []),
      ],
    }),
    run: async (ctx, args) => {
      const repo = await gh(ctx, "/user/repos", {
        json: {
          name: need(args, "name", 100),
          description: str(args, "description", { max: 350 }),
          private: args.private !== false,
          auto_init: true,
        },
      });
      return { name: repo.full_name, url: repo.html_url };
    },
  },
  {
    name: "github_commit_file",
    pluginId: "github",
    label: "Committing file",
    write: true,
    description:
      "Create or update one file in a repository as a commit. Needs the user's confirmation.",
    parameters: object(
      {
        ...repoFields,
        path: s("File path in the repository"),
        content: s("Full new file content"),
        message: s("Commit message"),
        branch: s("Branch (default branch when omitted)"),
      },
      ["owner", "repo", "path", "content", "message"],
    ),
    preview: (args) => ({
      title: "Commit to GitHub",
      fields: [
        {
          label: "Repository",
          value: `${need(args, "owner")}/${need(args, "repo")}`,
        },
        { label: "File", value: need(args, "path", 500) },
        { label: "Branch", value: str(args, "branch") || "default branch" },
        { label: "Message", value: need(args, "message", 500) },
      ],
      body: need(args, "content", 200_000),
    }),
    run: async (ctx, args) => {
      const path = need(args, "path", 500)
        .replace(/^\/+/, "")
        .split("/")
        .map(seg)
        .join("/");
      const branch = str(args, "branch", { max: 200 });
      const existing = await gh(ctx, `${repoPath(args)}/contents/${path}`, {
        query: { ref: branch },
      }).catch(() => null);
      const result = await gh(ctx, `${repoPath(args)}/contents/${path}`, {
        method: "PUT",
        json: {
          message: need(args, "message", 500),
          content: Buffer.from(need(args, "content", 200_000), "utf8").toString(
            "base64",
          ),
          branch,
          sha: existing?.sha,
        },
      });
      return {
        commit: result.commit?.sha,
        url: result.content?.html_url || result.commit?.html_url,
      };
    },
  },
  {
    name: "github_create_pull_request",
    pluginId: "github",
    label: "Opening pull request",
    write: true,
    description:
      "Open a pull request from head into base. Needs the user's confirmation.",
    parameters: object(
      {
        ...repoFields,
        title: s("Pull request title"),
        head: s("Branch with the changes"),
        base: s("Branch to merge into"),
        body: s("Description"),
      },
      ["owner", "repo", "title", "head", "base"],
    ),
    preview: (args) => ({
      title: "Open pull request",
      fields: [
        {
          label: "Repository",
          value: `${need(args, "owner")}/${need(args, "repo")}`,
        },
        {
          label: "Branches",
          value: `${need(args, "head")} → ${need(args, "base")}`,
        },
        { label: "Title", value: need(args, "title", 300) },
      ],
      body: str(args, "body"),
    }),
    run: async (ctx, args) => {
      const pr = await gh(ctx, `${repoPath(args)}/pulls`, {
        json: {
          title: need(args, "title", 300),
          head: need(args, "head", 200),
          base: need(args, "base", 200),
          body: str(args, "body", { max: 60_000 }),
        },
      });
      return { number: pr.number, url: pr.html_url };
    },
  },
  {
    name: "github_comment",
    pluginId: "github",
    label: "Posting comment",
    write: true,
    description:
      "Comment on an issue or pull request. Needs the user's confirmation.",
    parameters: object(
      {
        ...repoFields,
        number: n("Issue or pull request number"),
        body: s("Comment text in Markdown"),
      },
      ["owner", "repo", "number", "body"],
    ),
    preview: (args) => ({
      title: "Comment on GitHub",
      fields: [
        {
          label: "Thread",
          value: `${need(args, "owner")}/${need(args, "repo")}#${int(args, "number", 0, 1e9)}`,
        },
      ],
      body: need(args, "body", 60_000),
    }),
    run: async (ctx, args) => {
      const comment = await gh(
        ctx,
        `${repoPath(args)}/issues/${int(args, "number", 0, 1e9)}/comments`,
        { json: { body: need(args, "body", 60_000) } },
      );
      return { url: comment.html_url };
    },
  },
];

export async function githubAccount(ctx: ToolContext) {
  const user = await gh(ctx, "/user");
  return { label: user.login as string, metadata: { login: user.login } };
}
