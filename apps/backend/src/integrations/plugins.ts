import type { PluginDefinition } from "./catalog";

const GOOGLE_IDENTITY = ["openid", "email"];

/**
 * Every plugin on /plugins. MCP plugins expose the provider's own official
 * tool set (the same one ChatGPT and Claude use); REST plugins add a raw API
 * tool so any documented endpoint is reachable.
 */
export const PLUGINS: PluginDefinition[] = [
  // ---------- Google and Microsoft (Genyxo OAuth apps) ----------
  {
    id: "gmail",
    name: "Gmail",
    description: "Read and manage Gmail",
    about:
      "Search your inbox with Gmail's own query syntax, read whole threads, and turn them into summaries, replies and follow-ups. Genyxo drafts or sends mail only after you confirm the exact recipients and text.",
    prompts: [
      "Summarize unread emails from today and tell me which ones need a reply",
      "Find the latest invoice from my accountant and pull out the total and due date",
      "Draft a polite reply to the last email from Anna saying I'll send the files Friday",
    ],
    categories: ["popular", "productivity", "communication"],
    auth: {
      type: "oauth",
      family: "google",
      scopes: [
        ...GOOGLE_IDENTITY,
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/gmail.compose",
      ],
    },
    permissions: ["Read your email", "Create drafts", "Send email you confirm"],
    capabilities: [
      "Search and read messages and threads",
      "Draft replies and new emails",
      "Send email after you confirm it",
      "Any other Gmail API call through the raw API tool",
    ],
    apps: [
      {
        name: "Gmail",
        description:
          "Google's Gmail API for messages, threads, labels and drafts.",
      },
    ],
    website: "https://mail.google.com/",
    version: "1.1.0",
    tint: "#ea4335",
  },
  {
    id: "google-drive",
    name: "Google Drive",
    description: "Drive, Docs, Sheets or Slides",
    about:
      "Find files across Drive by name or full text and read Docs, Sheets and Slides as clean text or CSV, so answers come from your real documents. New files are uploaded only after you confirm them.",
    prompts: [
      "Find my most recent planning doc and list its open action items",
      "Compare the totals in the two newest budget spreadsheets",
      "Save this meeting summary to Drive as a new document",
    ],
    categories: ["popular", "productivity", "small-business"],
    auth: {
      type: "oauth",
      family: "google",
      scopes: [
        ...GOOGLE_IDENTITY,
        "https://www.googleapis.com/auth/drive.readonly",
        "https://www.googleapis.com/auth/drive.file",
      ],
    },
    permissions: ["Read your files", "Upload files you confirm"],
    capabilities: [
      "Search Drive by name or content",
      "Read Docs, Sheets and text files",
      "Upload a new file after you confirm",
      "Any other Drive API call through the raw API tool",
    ],
    apps: [
      {
        name: "Google Drive",
        description: "Files, folders and Google Workspace documents.",
      },
    ],
    website: "https://drive.google.com/",
    version: "1.1.0",
    tint: "#1fa463",
  },
  {
    id: "google-calendar",
    name: "Google Calendar",
    description: "Manage Google Calendar events",
    about:
      "See what's coming up, find free time and plan your week with your real schedule. New and changed events, including guests and locations, are saved only after you confirm them.",
    prompts: [
      "What's on my calendar this week, and where do I have a free 2-hour block?",
      "Move tomorrow's design review to Thursday at 15:00",
      "Create a 30-minute call with anna@example.com next Monday morning",
    ],
    categories: ["popular", "productivity"],
    auth: {
      type: "oauth",
      family: "google",
      scopes: [
        ...GOOGLE_IDENTITY,
        "https://www.googleapis.com/auth/calendar.events",
      ],
    },
    permissions: ["Read your events", "Create and change events you confirm"],
    capabilities: [
      "List upcoming events",
      "Create or update events after you confirm",
      "Any other Calendar API call through the raw API tool",
    ],
    apps: [
      {
        name: "Google Calendar",
        description: "Events on your primary calendar.",
      },
    ],
    website: "https://calendar.google.com/",
    version: "1.1.0",
    tint: "#4285f4",
  },
  {
    id: "outlook-email",
    name: "Outlook Email",
    description: "Triage Outlook inboxes",
    about:
      "Triage Outlook and Microsoft 365 mail: search, read, summarize and prepare replies. Drafts and sent mail go through Microsoft Graph only after you confirm the exact message.",
    prompts: [
      "Summarize my latest Outlook emails and flag anything urgent",
      "Find the contract email from last month and list the attachments",
      "Draft a reply accepting Tuesday's meeting",
    ],
    categories: ["popular", "communication", "small-business"],
    auth: {
      type: "oauth",
      family: "microsoft",
      scopes: ["offline_access", "User.Read", "Mail.ReadWrite", "Mail.Send"],
    },
    permissions: ["Read your mail", "Create drafts", "Send email you confirm"],
    capabilities: [
      "Search and read messages",
      "Draft email",
      "Send email after you confirm",
      "Any other Microsoft Graph mail call through the raw API tool",
    ],
    apps: [
      {
        name: "Outlook Mail",
        description:
          "Microsoft Graph mail for work, school and personal accounts.",
      },
    ],
    website: "https://outlook.office.com/",
    version: "1.1.0",
    tint: "#0a64c9",
  },
  {
    id: "outlook-calendar",
    name: "Outlook Calendar",
    description: "Plan your Outlook schedule",
    about:
      "Read your Outlook calendar across any date range and schedule meetings with Teams links. Every new or changed event waits for your confirmation.",
    prompts: [
      "What meetings do I have this week in Outlook?",
      "Book a 45-minute Teams meeting with the design team on Friday afternoon",
      "Shift my 1:1 with Max to next Wednesday, same time",
    ],
    categories: ["productivity", "small-business"],
    auth: {
      type: "oauth",
      family: "microsoft",
      scopes: ["offline_access", "User.Read", "Calendars.ReadWrite"],
    },
    permissions: ["Read your calendar", "Create and change events you confirm"],
    capabilities: [
      "List events in a date range",
      "Create or update events after you confirm",
      "Any other Graph calendar call through the raw API tool",
    ],
    apps: [
      {
        name: "Outlook Calendar",
        description: "Microsoft Graph calendar events.",
      },
    ],
    website: "https://outlook.office.com/calendar/",
    version: "1.1.0",
    tint: "#0a64c9",
  },
  {
    id: "microsoft-teams",
    name: "Microsoft Teams",
    description: "Read chats and send Teams messages",
    about:
      "Catch up on Teams chats and channels and post updates where your team already works. Messages are sent only after you confirm the destination and text.",
    prompts: [
      "List my recent Teams chats and who I talked to",
      "Post the release notes to the Engineering › General channel",
      "Send Max a Teams message that the demo moved to 3 pm",
    ],
    categories: ["communication", "small-business"],
    auth: {
      type: "oauth",
      family: "microsoft",
      scopes: [
        "offline_access",
        "User.Read",
        "Chat.ReadWrite",
        "Team.ReadBasic.All",
        "Channel.ReadBasic.All",
        "ChannelMessage.Send",
      ],
    },
    permissions: ["List your chats and teams", "Send messages you confirm"],
    capabilities: [
      "List chats, teams and channels",
      "Send a chat or channel message after you confirm",
      "Any other Graph Teams call through the raw API tool",
    ],
    apps: [
      {
        name: "Microsoft Teams",
        description: "Chats, teams and channels through Microsoft Graph.",
      },
    ],
    website: "https://teams.microsoft.com/",
    version: "1.1.0",
    tint: "#5059c9",
  },
  // ---------- Developer tools ----------
  {
    id: "github",
    name: "GitHub",
    description: "Triage PRs, issues, CI, and publish flows",
    about:
      "Use GitHub to inspect repositories, review pull requests, answer issues and check Actions runs, then prepare commits and pull requests for review. Reads run instantly; anything that writes to GitHub waits for your confirmation.",
    prompts: [
      "Summarize this pull request like a senior reviewer: what changed, what could break, and which tests are missing",
      "List my open pull requests and which ones have failing checks",
      "Turn the last 7 days of merged PRs into a stakeholder update",
    ],
    categories: ["popular", "developer"],
    auth: {
      type: "oauth",
      family: "github",
      scopes: ["repo", "read:user", "workflow"],
    },
    permissions: [
      "Read your repositories, issues and pull requests",
      "Write commits, pull requests and comments you confirm",
    ],
    capabilities: [
      "List and read repositories, pull requests, issues and comments",
      "Create a repository, commit a file, open a PR or comment after you confirm",
      "Any other GitHub REST call (Actions, releases, reviews…) through the raw API tool",
    ],
    apps: [
      {
        name: "GitHub",
        description: "Access repositories, issues, pull requests and Actions.",
      },
    ],
    website: "https://github.com/",
    version: "1.1.0",
    tint: "#6e40c9",
  },
  {
    id: "gitlab",
    name: "GitLab",
    description: "Triage GitLab MRs and CI/CD",
    about:
      "Work through merge requests, issues and pipelines on GitLab.com with GitLab's official MCP server. Ask why a pipeline failed, what a merge request changes, or what is blocking a milestone.",
    prompts: [
      "Why did the latest pipeline on main fail?",
      "Summarize open merge requests waiting for my review",
      "Create an issue for the flaky login test with the failing job link",
    ],
    categories: ["developer", "new"],
    auth: {
      type: "mcp",
      url: "https://gitlab.com/api/v4/mcp",
      scopes: ["mcp"],
    },
    permissions: [
      "Act on GitLab as you within the mcp scope",
      "Writes wait for your confirmation",
    ],
    capabilities: [
      "Search projects, issues and merge requests",
      "Read pipelines and jobs",
      "Create issues and comments after you confirm",
    ],
    apps: [
      {
        name: "GitLab",
        description: "GitLab's official MCP server for GitLab.com.",
      },
    ],
    website: "https://gitlab.com/",
    version: "1.0.0",
    tint: "#fc6d26",
  },
  {
    id: "linear",
    name: "Linear",
    description: "Plan and build products",
    about:
      "Linear's official MCP server lets any Genyxo model work your issue tracker like a teammate: find issues, file bugs, plan cycles, update projects and write comments. Changes wait for your confirmation unless you allow low-risk actions.",
    prompts: [
      "What's assigned to me this cycle, sorted by priority?",
      "File a bug for the checkout crash with steps to reproduce and assign it to me",
      "Summarize progress on the Q4 roadmap project",
    ],
    categories: ["popular", "developer", "productivity"],
    auth: {
      type: "mcp",
      url: "https://mcp.linear.app/mcp",
      scopes: ["read", "write"],
    },
    permissions: [
      "Read your workspace's issues, projects and teams",
      "Create and update items you confirm",
    ],
    capabilities: [
      "Search and read issues, projects, cycles and documents",
      "Create and update issues, projects and comments",
      "Every tool in Linear's official MCP server",
    ],
    apps: [
      { name: "Linear", description: "Issues, projects, cycles and comments." },
    ],
    website: "https://linear.app/",
    version: "1.0.0",
    tint: "#5e6ad2",
  },
  {
    id: "supabase",
    name: "Supabase",
    description: "Manage and query databases",
    about:
      "Supabase's official MCP server gives Genyxo the same toolkit as the dashboard: list projects and tables, run SQL, apply migrations, read logs and deploy edge functions. Destructive steps always wait for your confirmation.",
    prompts: [
      "List my Supabase projects and their regions",
      "Show the 10 newest rows in the orders table",
      "Why are my edge function logs showing 500 errors?",
    ],
    categories: ["popular", "developer"],
    auth: { type: "mcp", url: "https://mcp.supabase.com/mcp" },
    permissions: [
      "Read your organizations and projects",
      "Run SQL, migrations and deploys you confirm",
    ],
    capabilities: [
      "List projects, tables, extensions and migrations",
      "Run SQL and read logs",
      "Every tool in Supabase's official MCP server",
    ],
    apps: [
      {
        name: "Supabase",
        description: "Projects, Postgres, logs and edge functions.",
      },
    ],
    website: "https://supabase.com/",
    version: "2.0.0",
    tint: "#3ecf8e",
  },
  {
    id: "vercel",
    name: "Vercel",
    description: "Projects, deployments and status",
    about:
      "Check deployments, read build logs and search Vercel's docs through Vercel's official MCP server. Ask why a preview broke and get the failing step with the log lines that matter.",
    prompts: [
      "Why did my latest production deployment fail?",
      "List my Vercel projects and their production URLs",
      "Show the build logs for the newest preview deployment",
    ],
    categories: ["developer", "new"],
    auth: { type: "mcp", url: "https://mcp.vercel.com" },
    permissions: [
      "Read your teams, projects and deployments",
      "Actions you confirm",
    ],
    capabilities: [
      "List projects and deployments",
      "Read build logs",
      "Search Vercel docs",
      "Every tool in Vercel's official MCP server",
    ],
    apps: [
      { name: "Vercel", description: "Projects, deployments, logs and docs." },
    ],
    website: "https://vercel.com/",
    version: "2.0.0",
    tint: "#111111",
  },
  {
    id: "render",
    name: "Render",
    description: "Services, deploys and status",
    about:
      "Watch your Render services and deploys from chat: status, commit, trigger and timing, plus any Render API call when you need more. Paste a Render API key to connect.",
    prompts: [
      "Show my Render services and their latest deploy status",
      "Why did the last deploy of my API fail?",
      "Which services are suspended?",
    ],
    categories: ["developer"],
    auth: {
      type: "token",
      fields: [
        { key: "token", label: "API key", placeholder: "rnd_…", secret: true },
      ],
      help: "Create an API key under Account Settings → API Keys.",
      docsUrl: "https://dashboard.render.com/u/settings#api-keys",
    },
    permissions: [
      "Read services and deploys",
      "Other Render API calls you confirm",
    ],
    capabilities: [
      "List services and deploys",
      "Read deploy status",
      "Any Render API call through the raw API tool",
    ],
    apps: [{ name: "Render", description: "Render's public REST API." }],
    website: "https://render.com/",
    version: "1.1.0",
    tint: "#6d5dfc",
  },
  {
    id: "netlify",
    name: "Netlify",
    description: "Build and deploy on Netlify",
    about:
      "Create, configure and deploy Netlify projects with Netlify's official MCP server: sites, deploys, environment variables, forms and extensions, all from a chat.",
    prompts: [
      "List my Netlify sites and their last deploy status",
      "Add an environment variable API_URL to my storefront site",
      "Why did the latest deploy of my blog fail?",
    ],
    categories: ["developer", "new"],
    auth: {
      type: "mcp",
      url: "https://netlify-mcp.netlify.app/mcp",
      scopes: ["offline_access", "read", "write"],
    },
    permissions: [
      "Read your team's projects and deploys",
      "Deploys and settings you confirm",
    ],
    capabilities: [
      "Manage projects, deploys and environment variables",
      "Every tool in Netlify's official MCP server",
    ],
    apps: [
      {
        name: "Netlify",
        description: "Projects, deploys, env vars and forms.",
      },
    ],
    website: "https://www.netlify.com/",
    version: "1.0.0",
    tint: "#05bdba",
  },
  {
    id: "railway",
    name: "Railway",
    description: "Build and deploy apps",
    about:
      "Railway's hosted MCP server lets Genyxo spin up projects, add databases, set variables, deploy services and read logs, so infrastructure work happens in the same chat as the code.",
    prompts: [
      "List my Railway projects and their services",
      "Show the latest deploy logs for my API service",
      "Add a Postgres database to my side-project",
    ],
    categories: ["developer"],
    auth: { type: "mcp", url: "https://mcp.railway.com" },
    permissions: [
      "Act in your workspaces as a member",
      "Deploys and changes you confirm",
    ],
    capabilities: [
      "Manage projects, services, variables and deployments",
      "Read logs",
      "Every tool in Railway's official MCP server",
    ],
    apps: [
      {
        name: "Railway",
        description: "Projects, services, deployments and logs.",
      },
    ],
    website: "https://railway.com/",
    version: "1.0.0",
    tint: "#853bce",
  },
  {
    id: "mongodb-atlas",
    name: "MongoDB Atlas",
    description: "Connect to MongoDB Atlas",
    about:
      "Manage MongoDB Atlas with an Atlas service account: list projects and clusters, check users and network access, and call any Atlas Administration API endpoint. Changes wait for your confirmation.",
    prompts: [
      "List my Atlas projects and clusters with their tiers",
      "Which database users exist in my production project?",
      "Show the IP access list for my staging project",
    ],
    categories: ["developer"],
    auth: {
      type: "token",
      fields: [
        {
          key: "clientId",
          label: "Service account client ID",
          placeholder: "mdb_sa_id_…",
        },
        {
          key: "clientSecret",
          label: "Service account secret",
          placeholder: "mdb_sa_sk_…",
          secret: true,
        },
      ],
      help: "Create a service account under Organization → Access Manager → Service Accounts, and allow Genyxo's server IP in its API access list.",
      docsUrl: "https://www.mongodb.com/docs/atlas/configure-api-access/",
    },
    permissions: [
      "Read projects and clusters",
      "Administration API calls you confirm",
    ],
    capabilities: [
      "List projects, clusters and database users",
      "Any Atlas Administration API call through the raw API tool",
    ],
    apps: [
      {
        name: "Atlas Administration API",
        description: "Projects, clusters, users and access lists.",
      },
    ],
    website: "https://www.mongodb.com/atlas",
    version: "1.0.0",
    tint: "#00ed64",
  },
  {
    id: "stack-overflow",
    name: "Stack Overflow for Agents",
    description: "Knowledge",
    about:
      "Search Stack Overflow's public questions and answers and read accepted answers in full, so Genyxo can ground debugging advice in what developers have already verified. No account needed.",
    prompts: [
      "Find the accepted answer for 'TypeORM migration duplicate column'",
      "What do top Stack Overflow answers recommend for React hydration mismatches?",
      "Search Stack Overflow for Next.js middleware redirect loops",
    ],
    categories: ["developer", "new"],
    auth: { type: "none" },
    permissions: ["Public Stack Exchange data only"],
    capabilities: [
      "Search questions by text and tags",
      "Read questions with their answers",
      "Read any public Stack Exchange API endpoint",
    ],
    apps: [
      {
        name: "Stack Exchange API",
        description: "Public questions and answers from Stack Overflow.",
      },
    ],
    website: "https://stackoverflow.com/",
    version: "1.0.0",
    tint: "#f48024",
  },
  {
    id: "superpowers",
    name: "Superpowers",
    description: "Planning, TDD, and debugging etc.",
    about:
      "A skill pack that changes how Genyxo works on code: brainstorm before building, write a plan in small steps, test first, debug from evidence instead of guesses, and verify before claiming done. No account needed.",
    prompts: [
      "Plan the CSV export feature as small TDD steps",
      "Debug this failing test systematically before changing code",
      "Review my change for what could break before I merge it",
    ],
    categories: ["developer", "productivity", "new"],
    auth: { type: "none" },
    permissions: ["No account access"],
    capabilities: [
      "Structured brainstorming and planning",
      "Test-driven development loop",
      "Systematic root-cause debugging",
      "Verification before completion",
    ],
    apps: [
      {
        name: "Superpowers skills",
        description: "Planning, TDD, debugging and review workflows.",
      },
    ],
    website: "https://github.com/obra/superpowers",
    version: "1.0.0",
    tint: "#f5a524",
    skill:
      "Superpowers skill pack is on. For coding work: 1) Clarify the goal and constraints first; ask when requirements are ambiguous. 2) Write a short plan of small, verifiable steps before code. 3) Use test-driven development: write or name the failing test, then the minimal code, then refactor. 4) Debug systematically: reproduce, read the actual error, form one hypothesis at a time, check it with evidence, and fix the root cause, not the symptom. 5) Before saying something is done, state how it was verified and what remains unverified.",
  },
  {
    id: "lovable",
    name: "Lovable",
    description: "Build full-stack apps by chat",
    about:
      "Lovable's official MCP server lets Genyxo start and iterate on Lovable projects: describe an app, and Lovable builds the full-stack version you can open and keep editing in Lovable.",
    prompts: [
      "Build a booking app for a small barber shop with a calendar and SMS reminders",
      "List my Lovable projects",
      "Add a dark mode toggle to my portfolio project",
    ],
    categories: ["developer", "new", "design"],
    auth: { type: "mcp", url: "https://mcp.lovable.dev/mcp" },
    permissions: [
      "Read your workspaces and projects",
      "Create and change projects you confirm",
    ],
    capabilities: [
      "Create and update Lovable projects",
      "Every tool in Lovable's official MCP server",
    ],
    apps: [{ name: "Lovable", description: "Workspaces and projects." }],
    website: "https://lovable.dev/",
    version: "1.0.0",
    tint: "#ff5d8f",
  },
  // ---------- Productivity ----------
  {
    id: "notion",
    name: "Notion",
    description: "Create docs, tasks, databases",
    about:
      "Notion's official MCP server gives Genyxo full workspace access: search everything you can see, read pages and databases, create pages, add database rows and update properties.",
    prompts: [
      "Search my Notion for last week's meeting notes and list the decisions",
      "Add a task 'Prepare launch email' to my Tasks database due Friday",
      "Create a page with this project brief under Product",
    ],
    categories: ["popular", "new", "productivity"],
    auth: { type: "mcp", url: "https://mcp.notion.com/mcp" },
    permissions: [
      "Read pages and databases you can access",
      "Create and update content you confirm",
    ],
    capabilities: [
      "Search and read pages and databases",
      "Create pages and database rows",
      "Update properties and comments",
      "Every tool in Notion's official MCP server",
    ],
    apps: [{ name: "Notion", description: "Pages, databases and comments." }],
    website: "https://www.notion.com/",
    version: "2.0.0",
    tint: "#9b9a97",
  },
  {
    id: "atlassian",
    name: "Atlassian",
    description: "Jira, Confluence, Loom & More",
    about:
      "Atlassian's official Rovo MCP server gives Genyxo the whole workflow: search with JQL and CQL, create and edit Jira issues, epics and subtasks, move work through the backlog and sprints, transition statuses, log comments, and write or update Confluence pages.",
    prompts: [
      "Create a Jira epic for the onboarding redesign with five stories in the backlog",
      "What's left in the current sprint, and what is blocked?",
      "Turn this spec into a Confluence page in the Product space",
    ],
    categories: ["popular", "productivity", "developer", "small-business"],
    auth: { type: "mcp", url: "https://mcp.atlassian.com/v1/mcp" },
    permissions: [
      "Act in Jira and Confluence as you",
      "Create and change items you confirm",
    ],
    capabilities: [
      "Search Jira (JQL) and Confluence (CQL)",
      "Create and edit issues, epics, subtasks and comments",
      "Transition issues through workflows",
      "Create and update Confluence pages",
      "Every tool in Atlassian's official MCP server",
    ],
    apps: [
      { name: "Jira", description: "Issues, backlogs, sprints and workflows." },
      { name: "Confluence", description: "Spaces, pages and comments." },
    ],
    website: "https://www.atlassian.com/",
    version: "1.0.0",
    tint: "#1868db",
  },
  {
    id: "xmind",
    name: "Xmind",
    description: "Mind mapping, organize ideas",
    about:
      "Turns any topic, meeting or plan into a structured mind map file you can import into Xmind (File → Import → Markdown): one central topic, clear branches and short leaf ideas. No account needed.",
    prompts: [
      "Make a mind map of a product launch plan",
      "Map the arguments for and against moving to a 4-day week",
      "Turn these meeting notes into a mind map",
    ],
    categories: ["productivity", "new"],
    auth: { type: "none" },
    permissions: ["No account access"],
    capabilities: [
      "Create Xmind-ready mind maps as Markdown files",
      "Restructure and expand existing maps",
    ],
    apps: [
      {
        name: "Xmind import",
        description: "Markdown outlines that Xmind imports as mind maps.",
      },
    ],
    website: "https://xmind.com/",
    version: "1.0.0",
    tint: "#f23c3c",
    skill:
      "Xmind plugin is on. When the user asks for a mind map, answer with one fenced file block ```markdown file=<topic>.md whose content is a Markdown outline: a single '# Central topic' heading, '## ' for main branches and nested '- ' bullets for sub-ideas (short phrases, at most 4 levels). Then add one sentence: open Xmind → File → Import → Markdown.",
  },
  {
    id: "dropbox",
    name: "Dropbox",
    description: "Find, create, and take action",
    about:
      "Dropbox's official MCP server lets Genyxo search your files, read documents, organize folders and create share links and file requests.",
    prompts: [
      "Find my latest contract PDF in Dropbox and summarize it",
      "Create a share link for the Q3 report folder",
      "List files I changed this week",
    ],
    categories: ["small-business", "productivity"],
    auth: { type: "mcp", url: "https://mcp.dropbox.com/mcp" },
    permissions: ["Read your files and sharing", "Changes you confirm"],
    capabilities: [
      "Search and read files",
      "Organize folders and share links",
      "Every tool in Dropbox's official MCP server",
    ],
    apps: [
      {
        name: "Dropbox",
        description: "Files, folders, sharing and file requests.",
      },
    ],
    website: "https://www.dropbox.com/",
    version: "2.0.0",
    tint: "#0061ff",
  },
  // ---------- Communication ----------
  {
    id: "zoom",
    name: "Zoom",
    description: "Schedule and review meetings",
    about:
      "Schedule Zoom meetings with the right time zone and agenda, and review what's already on your Zoom calendar. New meetings are created only after you confirm.",
    prompts: [
      "List my upcoming Zoom meetings",
      "Schedule a 45-minute Zoom with the sales team tomorrow at 10:00 Prague time",
      "Create a weekly stand-up meeting link",
    ],
    categories: ["communication"],
    auth: { type: "oauth", family: "zoom", scopes: [] },
    permissions: ["List your meetings", "Create meetings you confirm"],
    capabilities: [
      "List upcoming meetings",
      "Create a meeting after you confirm",
      "Any other Zoom API call through the raw API tool",
    ],
    apps: [
      { name: "Zoom Meetings", description: "Zoom's REST API for meetings." },
    ],
    website: "https://zoom.us/",
    version: "1.1.0",
    tint: "#0b5cff",
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    description: "Find the right professional",
    about:
      "Sign in with LinkedIn to let Genyxo draft and publish posts on your profile. LinkedIn does not let third-party apps search members, so people research uses what you paste in.",
    prompts: [
      "Draft a LinkedIn post announcing our new feature in a friendly tone",
      "Publish this hiring post to my profile",
      "Rewrite my headline for a senior product designer role",
    ],
    categories: ["communication"],
    auth: {
      type: "oauth",
      family: "linkedin",
      scopes: ["openid", "profile", "email", "w_member_social"],
    },
    permissions: ["Your basic profile and email", "Posts you confirm"],
    capabilities: [
      "Read your basic profile",
      "Publish posts after you confirm",
    ],
    apps: [
      {
        name: "Sign In with LinkedIn + Share",
        description: "Profile and posting APIs open to all apps.",
      },
    ],
    website: "https://www.linkedin.com/",
    version: "1.0.0",
    tint: "#0a66c2",
  },
  {
    id: "kahoot",
    name: "Kahoot!",
    description: "Create kahoots instantly",
    about:
      "Kahoot!'s official MCP server lets Genyxo turn a topic, lesson or document into a ready-to-host kahoot with questions, answers and time limits in your account.",
    prompts: [
      "Create a 10-question kahoot about the solar system for 12-year-olds",
      "Turn these lecture notes into a kahoot quiz",
      "Make a fun team trivia kahoot about our company history",
    ],
    categories: ["entertainment", "new", "communication"],
    auth: { type: "mcp", url: "https://mcp.kahoot.it/mcp" },
    permissions: ["Your Kahoot! profile", "Kahoots created after you confirm"],
    capabilities: [
      "Create kahoots from a topic or text",
      "Every tool in Kahoot!'s official MCP server",
    ],
    apps: [{ name: "Kahoot!", description: "Create and manage kahoots." }],
    website: "https://kahoot.com/",
    version: "1.0.0",
    tint: "#46178f",
  },
  // ---------- Small business ----------
  {
    id: "shopify",
    name: "Shopify",
    description: "Create and manage your store",
    about:
      "Run your Shopify store from chat through the Admin GraphQL API: products, inventory, orders, customers, discounts and more. Reads are instant; anything that changes the store waits for your confirmation.",
    prompts: [
      "Show yesterday's orders and the total revenue",
      "Which products are low on stock?",
      "Create a 15% discount code SPRING15 for all products",
    ],
    categories: ["popular", "small-business"],
    auth: {
      type: "token",
      fields: [
        {
          key: "shop",
          label: "Store domain",
          placeholder: "your-store.myshopify.com",
        },
        {
          key: "token",
          label: "Admin API access token",
          placeholder: "shpat_…",
          secret: true,
        },
      ],
      help: "In Shopify admin open Settings → Apps → Develop apps, create an app with the Admin API scopes you want, install it and copy the access token.",
      docsUrl: "https://help.shopify.com/en/manual/apps/app-types/custom-apps",
    },
    permissions: [
      "The Admin API scopes you granted the custom app",
      "Changes you confirm",
    ],
    capabilities: [
      "Query products, orders, customers and inventory",
      "Any Admin GraphQL query or mutation (mutations after you confirm)",
    ],
    apps: [
      {
        name: "Shopify Admin",
        description: "Admin GraphQL API for your store.",
      },
    ],
    website: "https://www.shopify.com/",
    version: "1.0.0",
    tint: "#5e8e3e",
  },
  {
    id: "wix",
    name: "Wix",
    description: "Create your own website",
    about:
      "Wix's official MCP server lets Genyxo work on your Wix sites: pages, CMS collections, stores, bookings and blog, using the same APIs Wix's own AI uses.",
    prompts: [
      "List my Wix sites",
      "Add three new products to my Wix store",
      "Write and publish a blog post about our spring collection",
    ],
    categories: ["small-business", "design"],
    auth: { type: "mcp", url: "https://mcp.wix.com/mcp" },
    permissions: ["Your Wix account and sites", "Changes you confirm"],
    capabilities: [
      "Manage sites, CMS, stores, bookings and blog",
      "Every tool in Wix's official MCP server",
    ],
    apps: [{ name: "Wix", description: "Sites, CMS, eCommerce and bookings." }],
    website: "https://www.wix.com/",
    version: "1.0.0",
    tint: "#0c6efc",
  },
  {
    id: "wordpress-com",
    name: "WordPress.com",
    description: "Build & Publish with WordPress",
    about:
      "WordPress.com's official MCP server lets Genyxo draft, edit and publish posts and pages, moderate comments and check stats across your WordPress.com sites.",
    prompts: [
      "Draft a blog post about our product update and save it as a draft",
      "Which of my posts got the most views this month?",
      "List pending comments on my blog",
    ],
    categories: ["small-business", "productivity"],
    auth: {
      type: "mcp",
      url: "https://public-api.wordpress.com/wpcom/v2/mcp/v1",
    },
    permissions: [
      "Your WordPress.com sites",
      "Publishing and edits you confirm",
    ],
    capabilities: [
      "Manage posts, pages, media and comments",
      "Read site stats",
      "Every tool in WordPress.com's official MCP server",
    ],
    apps: [
      {
        name: "WordPress.com",
        description: "Sites, posts, pages and comments.",
      },
    ],
    website: "https://wordpress.com/",
    version: "1.0.0",
    tint: "#3858e9",
  },
  {
    id: "namecheap",
    name: "Namecheap",
    description: "Search domains & pricing",
    about:
      "Namecheap's official MCP server checks domain availability and pricing and helps manage the domains in your account.",
    prompts: [
      "Is genyxo.studio available, and how much is it?",
      "Suggest five short .com names for a coffee subscription brand",
      "List my domains that expire in the next 60 days",
    ],
    categories: ["small-business"],
    auth: { type: "mcp", url: "https://mcp.namecheap.com/mcp" },
    permissions: ["Your Namecheap account", "Changes you confirm"],
    capabilities: [
      "Search domains and pricing",
      "Manage account domains",
      "Every tool in Namecheap's official MCP server",
    ],
    apps: [{ name: "Namecheap", description: "Domains, pricing and DNS." }],
    website: "https://www.namecheap.com/",
    version: "1.0.0",
    tint: "#de3723",
  },
  // ---------- Finance ----------
  {
    id: "stripe",
    name: "Stripe",
    description: "Accept payments, grow revenue",
    about:
      "Stripe's official MCP server lets Genyxo look up customers and payments, create products, prices and payment links, issue invoices and refunds, and search Stripe's docs. Money-moving actions always wait for your confirmation.",
    prompts: [
      "How much revenue did we make this week?",
      "Create a payment link for the Pro plan at €29/month",
      "Refund the last payment from customer anna@example.com",
    ],
    categories: ["popular", "finance", "small-business"],
    auth: { type: "mcp", url: "https://mcp.stripe.com" },
    permissions: [
      "Your Stripe account data",
      "Payments, refunds and changes you confirm",
    ],
    capabilities: [
      "Customers, products, prices, invoices and subscriptions",
      "Payment links and refunds",
      "Every tool in Stripe's official MCP server",
    ],
    apps: [{ name: "Stripe", description: "Payments, billing and docs." }],
    website: "https://stripe.com/",
    version: "1.0.0",
    tint: "#635bff",
  },
  {
    id: "paypal",
    name: "PayPal",
    description: "Payments and business tools",
    about:
      "PayPal's official MCP server lets Genyxo create and send invoices, look up transactions, manage orders and subscriptions and handle disputes in your business account.",
    prompts: [
      "Send an invoice for €450 to client@example.com for logo design",
      "List PayPal transactions from the last 7 days",
      "Do I have any open disputes?",
    ],
    categories: ["finance", "small-business"],
    auth: { type: "mcp", url: "https://mcp.paypal.com/mcp" },
    permissions: [
      "Your PayPal business data",
      "Invoices, payments and changes you confirm",
    ],
    capabilities: [
      "Invoices, orders and subscriptions",
      "Transactions and disputes",
      "Every tool in PayPal's official MCP server",
    ],
    apps: [
      { name: "PayPal", description: "Payments, invoices and reporting." },
    ],
    website: "https://www.paypal.com/",
    version: "1.0.0",
    tint: "#003087",
  },
  {
    id: "coinmarketcap",
    name: "CoinMarketCap",
    description: "Real-time crypto market data",
    about:
      "CoinMarketCap's official MCP server brings live prices, market caps, rankings, trends and global metrics into chat. Data only: it never trades.",
    prompts: [
      "What are the top 10 coins by market cap right now?",
      "How has ETH performed over the last 30 days?",
      "Which coins are trending today?",
    ],
    categories: ["finance", "new"],
    auth: { type: "mcp", url: "https://mcp.coinmarketcap.com/mcp" },
    permissions: ["Your CoinMarketCap account for data access"],
    capabilities: [
      "Quotes, listings and rankings",
      "Trends and global metrics",
      "Every tool in CoinMarketCap's official MCP server",
    ],
    apps: [{ name: "CoinMarketCap", description: "Crypto market data." }],
    website: "https://coinmarketcap.com/",
    version: "1.0.0",
    tint: "#3861fb",
  },
  {
    id: "binance",
    name: "Binance",
    description: "Explore Binance market data",
    about:
      "Live Binance spot market data: prices, 24-hour stats, order books, recent trades and candlesticks for any trading pair. Public data only; Genyxo never places orders.",
    prompts: [
      "What's the BTC/USDT price and 24h change?",
      "Show the 4-hour candles for SOLUSDT over the last two days",
      "Which pairs had the biggest 24h volume?",
    ],
    categories: ["finance"],
    auth: { type: "none" },
    permissions: ["Public market data only"],
    capabilities: [
      "Prices, 24h stats and order books",
      "Candlesticks and recent trades",
      "Any public Binance market endpoint",
    ],
    apps: [
      {
        name: "Binance Spot API",
        description: "Public market data endpoints.",
      },
    ],
    website: "https://www.binance.com/",
    version: "1.0.0",
    tint: "#f0b90b",
  },
  {
    id: "bybit",
    name: "Bybit",
    description: "Real-time crypto market data",
    about:
      "Live Bybit market data for spot, linear and inverse markets: tickers, order books, candles, funding rates and open interest. Public data only; no trading.",
    prompts: [
      "What's the funding rate on BTCUSDT perpetual?",
      "Show ETH spot ticker on Bybit",
      "Compare open interest for BTC and ETH perpetuals",
    ],
    categories: ["finance"],
    auth: { type: "none" },
    permissions: ["Public market data only"],
    capabilities: [
      "Tickers, order books and candles",
      "Funding rates and open interest",
      "Any public Bybit v5 market endpoint",
    ],
    apps: [
      {
        name: "Bybit v5 Market API",
        description: "Public market data endpoints.",
      },
    ],
    website: "https://www.bybit.com/",
    version: "1.0.0",
    tint: "#f7a600",
  },
  // ---------- Design & media ----------
  {
    id: "figma",
    name: "Figma",
    description: "Read design files and comments",
    about:
      "Figma's official MCP server gives Genyxo the design context behind a link: frames, components, variables, styles and screenshots, so it can explain a design or turn it into code.",
    prompts: [
      "Describe the layout and components in this Figma frame: ",
      "Generate React code for this Figma screen: ",
      "List the color variables in this design file: ",
    ],
    categories: ["design", "developer"],
    auth: { type: "mcp", url: "https://mcp.figma.com/mcp" },
    permissions: ["Files you share by link with your Figma account"],
    capabilities: [
      "Read frames, components, variables and styles",
      "Get design screenshots and code context",
      "Every tool in Figma's official MCP server",
    ],
    apps: [
      { name: "Figma", description: "Design context for files and frames." },
    ],
    website: "https://www.figma.com/",
    version: "2.0.0",
    tint: "#a259ff",
  },
  {
    id: "canva",
    name: "Canva",
    description: "Create, review, edit designs",
    about:
      "Canva's official MCP server lets Genyxo search your designs and folders, create new designs from brand templates and edit their content.",
    prompts: [
      "Find my latest Instagram post designs",
      "Create a presentation from my brand template about our Q4 results",
      "List designs in the Marketing folder",
    ],
    categories: ["design", "small-business"],
    auth: { type: "mcp", url: "https://mcp.canva.com/mcp" },
    permissions: [
      "Your designs, folders and brand templates",
      "Edits you confirm",
    ],
    capabilities: [
      "Search designs and folders",
      "Create and edit designs",
      "Every tool in Canva's official MCP server",
    ],
    apps: [
      { name: "Canva", description: "Designs, folders and brand templates." },
    ],
    website: "https://www.canva.com/",
    version: "2.0.0",
    tint: "#7d2ae8",
  },
  {
    id: "mobbin",
    name: "Mobbin",
    description: "Find UI & UX design references",
    about:
      "Mobbin's official MCP server searches more than 600,000 real app screens, flows and website sections, so design answers come with references from shipped products. Needs a paid Mobbin plan.",
    prompts: [
      "Find onboarding flows from fintech apps",
      "Show pricing page sections from SaaS websites",
      "Find examples of empty states in task apps",
    ],
    categories: ["design", "new"],
    auth: { type: "mcp", url: "https://api.mobbin.com/mcp" },
    permissions: ["Your Mobbin account (read-only)"],
    capabilities: [
      "Search screens, flows and website sections",
      "Every tool in Mobbin's official MCP server",
    ],
    apps: [
      {
        name: "Mobbin",
        description: "Screens, flows and sections from real apps.",
      },
    ],
    website: "https://mobbin.com/",
    version: "1.0.0",
    tint: "#111111",
  },
  {
    id: "higgsfield",
    name: "Higgsfield",
    description: "Every image and video model",
    about:
      "Higgsfield's official MCP server generates images and videos with its full model lineup from a chat prompt. Generations spend your Higgsfield credits.",
    prompts: [
      "Generate a cinematic product shot of a glass perfume bottle on black sand",
      "Make a 5-second video of waves at sunset in anime style",
      "Create four logo concepts for a coffee brand",
    ],
    categories: ["design", "new"],
    auth: { type: "mcp", url: "https://mcp.higgsfield.ai/mcp" },
    permissions: [
      "Your Higgsfield account and credits",
      "Generations you confirm",
    ],
    capabilities: [
      "Image and video generation",
      "Every tool in Higgsfield's official MCP server",
    ],
    apps: [{ name: "Higgsfield", description: "Image and video models." }],
    website: "https://higgsfield.ai/",
    version: "1.0.0",
    tint: "#c6f432",
  },
  {
    id: "tripo",
    name: "Tripo 3D",
    description: "From text/image to 3D models",
    about:
      "Generate textured 3D models from a text description with the Tripo API, then download them as GLB. Generations use your Tripo API credits.",
    prompts: [
      "Make a low-poly 3D model of a cartoon fox",
      "Generate a realistic 3D sneaker model",
      "Create a 3D chess knight in marble",
    ],
    categories: ["design", "new"],
    auth: {
      type: "token",
      fields: [
        { key: "token", label: "API key", placeholder: "tsk_…", secret: true },
      ],
      help: "Create an API key on the Tripo platform's API Keys page.",
      docsUrl: "https://platform.tripo3d.ai/api-keys",
    },
    permissions: ["Your Tripo API credits", "Generations you confirm"],
    capabilities: [
      "Text-to-3D generation",
      "Task status and model download links",
      "Any Tripo API call through the raw API tool",
    ],
    apps: [{ name: "Tripo API", description: "3D generation tasks." }],
    website: "https://www.tripo3d.ai/",
    version: "1.0.0",
    tint: "#2563eb",
  },
  // ---------- Music & play ----------
  {
    id: "spotify",
    name: "Spotify",
    description: "Music and podcasts for you",
    about:
      "Search Spotify, build playlists from a mood or event, and control playback on your devices. Playlists and playback changes happen only after you confirm. Playback control needs Spotify Premium.",
    prompts: [
      "Make a 30-song focus playlist with instrumental electronic music",
      "What am I listening to right now?",
      "Find podcasts about product design",
    ],
    categories: ["popular", "entertainment"],
    auth: {
      type: "oauth",
      family: "spotify",
      scopes: [
        "user-read-email",
        "user-read-private",
        "playlist-read-private",
        "playlist-modify-private",
        "playlist-modify-public",
        "user-read-playback-state",
        "user-modify-playback-state",
        "user-read-currently-playing",
        "user-top-read",
        "user-library-read",
      ],
    },
    permissions: [
      "Your profile, playlists and playback state",
      "Playlist and playback changes you confirm",
    ],
    capabilities: [
      "Search tracks, albums, artists and podcasts",
      "Create playlists and add tracks",
      "Control playback (Premium)",
      "Any Spotify Web API call through the raw API tool",
    ],
    apps: [
      {
        name: "Spotify Web API",
        description: "Catalog, playlists and player.",
      },
    ],
    website: "https://open.spotify.com/",
    version: "1.0.0",
    tint: "#1db954",
  },
  {
    id: "apple-music",
    name: "Apple Music",
    description: "Build playlists and find music",
    about:
      "Search the Apple Music catalog for songs, albums, artists and playlists and get charts by country, with links that open in Apple Music. Saving to your library is not available to web apps outside Apple's MusicKit sign-in.",
    prompts: [
      "Find the top songs in Czechia on Apple Music",
      "Build a 20-song road-trip list with Apple Music links",
      "Find albums similar to Random Access Memories",
    ],
    categories: ["entertainment"],
    auth: {
      type: "none",
      env: [
        "APPLE_MUSIC_TEAM_ID",
        "APPLE_MUSIC_KEY_ID",
        "APPLE_MUSIC_PRIVATE_KEY",
      ],
    },
    permissions: ["Public Apple Music catalog only"],
    capabilities: [
      "Search the catalog",
      "Charts by storefront",
      "Song, album and artist details with links",
    ],
    apps: [
      { name: "Apple Music API", description: "Catalog search and charts." },
    ],
    website: "https://music.apple.com/",
    version: "1.0.0",
    tint: "#fa243c",
  },
  {
    id: "shazam",
    name: "Shazam",
    description: "Identify songs instantly",
    about:
      "Song recognition from audio is only available inside Apple's ShazamKit for native apps; Shazam offers no web API that Genyxo may use. Use Apple Music to search for a song you know part of.",
    prompts: [
      "What song goes 'I've been reading books of old'?",
      "Find the song from the latest iPhone ad",
      "Identify this song from its lyrics",
    ],
    categories: ["entertainment"],
    auth: {
      type: "unavailable",
      reason:
        "Shazam has no public web API. Song recognition is limited to ShazamKit in native Apple apps.",
    },
    permissions: [],
    capabilities: [],
    apps: [{ name: "ShazamKit", description: "Native Apple platforms only." }],
    website: "https://www.shazam.com/",
    version: "—",
    tint: "#0088ff",
  },
  // ---------- Safety ----------
  {
    id: "malwarebytes",
    name: "Malwarebytes",
    description: "Verify links, domains, phones",
    about:
      "Malwarebytes ScamGuard checks links, email addresses, phone numbers and domains against Malwarebytes threat intelligence before you click, reply or pay. No account needed.",
    prompts: [
      "Is this link safe to open: ",
      "Check whether this phone number is a known scam: ",
      "Who registered this domain and when?",
    ],
    categories: ["productivity", "communication", "new"],
    auth: {
      type: "mcp",
      url: "https://scamguard.malwarebytes.com/claude/mcp",
      open: true,
    },
    permissions: ["Sends only the links, numbers and addresses you ask about"],
    capabilities: [
      "Check links, emails and phone numbers",
      "Domain WHOIS lookups",
      "Report scams after you confirm",
    ],
    apps: [
      { name: "ScamGuard", description: "Malwarebytes reputation checks." },
    ],
    website: "https://www.malwarebytes.com/",
    version: "1.0.0",
    tint: "#0d3ecc",
  },
];
export const findPlugin = (id: string) =>
  PLUGINS.find((plugin) => plugin.id === id);
