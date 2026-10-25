# Local development with Docker

The local stack runs MySQL, Redis, the NestJS backend, the Next.js frontend and Mailpit next to any other Docker project. Host ports: frontend `3001`, backend `3000`, MySQL `3307`, Redis `6380`, Mailpit `8025`.

```bash
docker compose -f docker-compose.dev.yml -f docker-compose.local.yml up -d --build
```

Stop it with `down` instead of `up -d --build`. Data stays in the `mysql_dev_data` volume.

## Accounts and email

Sign-up requires email verification. Locally every email is caught by Mailpit at http://localhost:8025: open the "Verify your Genyxo Email" message and follow the link, which signs you in. Password reset emails arrive there too. The "Check your inbox" screen links to Mailpit in development builds.

## API keys

Keys live only in `apps/backend/.env`, which is git-ignored. A value that starts with `your_` counts as "not configured". After editing the file, recreate the backend so it reads the new values:

```bash
docker compose -f docker-compose.dev.yml -f docker-compose.local.yml up -d --force-recreate app
```

### OpenRouter (chat models)

1. Sign in at https://openrouter.ai and open **Keys** → **Create key**. Setting a credit limit on the key is a good guard for development.
2. Put it in `OPENROUTER_API_KEY=`.
3. Models ending in `:free` (the default "ChatGPT OSS") work without OpenRouter credit but are rate-limited. Paid models and chat title generation (`CHAT_TITLE_MODEL`, default `openai/gpt-4o-mini`) need a small balance on the OpenRouter account.

Genyxo credits are separate from OpenRouter credit: give a local account Genyxo credits with
`docker exec genyxo-mysql-dev mysql -uroot -proot_password genyxo -e "update users set credits=2500 where email='you@example.com';"`.

### Google sign-in

1. In https://console.cloud.google.com create (or pick) a project, then open **APIs & Services → OAuth consent screen**: choose External, keep it in Testing, and add your Google account under **Test users**.
2. **APIs & Services → Credentials → Create credentials → OAuth client ID**, type **Web application**.
   - Authorized JavaScript origin: `http://localhost:3001`
   - Authorized redirect URI: `http://localhost:3001/auth/google/callback`
3. Copy the client ID and secret into `GOOGLE_CLIENT_ID=` and `GOOGLE_CLIENT_SECRET=`. `GOOGLE_CALLBACK_URL` already points at the local callback.
4. Recreate the backend. The "Continue with Google" button appears once `/auth/providers` reports Google as configured.

Facebook works the same way with `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET` and the `/auth/facebook/callback` URL.

### Plugins (linked accounts)

The Plugins page (`/plugins`) lists 43 plugins. Each has its own page (`/plugins/<id>`) and settings page (`/plugins/<id>/settings`). Once a user connects one, any chat model can use it as tools. Every variable is listed with comments in `apps/backend/.env.example`.

Set `INTEGRATIONS_ENCRYPTION_KEY=` to 64 hex characters (`openssl rand -hex 32`) first. Without it (or `WORKSPACE_ENCRYPTION_KEY`) nothing can connect. Changing the key later disconnects all plugins.

How each plugin connects:

| Kind                                                           | Plugins                                                                                                                                                                                                             | Server setup                                                                                                                                                                                                                                                     |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Official MCP server (OAuth with automatic client registration) | Linear, Atlassian (Jira, Confluence), Stripe, PayPal, Notion, Figma, Canva, Dropbox, Supabase, Vercel, Netlify, Railway, GitLab, Wix, WordPress.com, Kahoot!, Lovable, Namecheap, CoinMarketCap, Mobbin, Higgsfield | None. Genyxo registers itself as an OAuth client at each provider on first connect, with the redirect URI `<INTEGRATIONS_PUBLIC_URL>/api/integrations/mcp/callback`. The model gets the provider's full official tool set (the same one ChatGPT and Claude use). |
| Open MCP server                                                | Malwarebytes                                                                                                                                                                                                        | None, no account.                                                                                                                                                                                                                                                |
| Genyxo OAuth app                                               | GitHub, Gmail, Google Drive, Google Calendar, Outlook Email, Outlook Calendar, Microsoft Teams, Zoom, Spotify, LinkedIn                                                                                             | Client ID and secret in `.env`, redirect URI registered at the provider (table below). Without them the plugin shows "Not configured".                                                                                                                           |
| User's own key                                                 | Render, Shopify, MongoDB Atlas, Tripo 3D                                                                                                                                                                            | None. The user pastes a key on the plugin page; the server checks it with the provider before saving.                                                                                                                                                            |
| No account                                                     | Stack Overflow, Binance, Bybit (public data), Xmind, Superpowers (skills), Apple Music                                                                                                                              | None, except Apple Music: `APPLE_MUSIC_TEAM_ID`, `APPLE_MUSIC_KEY_ID`, `APPLE_MUSIC_PRIVATE_KEY`.                                                                                                                                                                |
| No public API                                                  | Shazam                                                                                                                                                                                                              | Shown as "No public API"; it cannot be connected.                                                                                                                                                                                                                |

Redirect URIs for Genyxo OAuth apps. Zoom and Spotify refuse `localhost`, so Genyxo sends them `127.0.0.1` and their callback forwards to the public host to finish (the browser keeps using http://localhost:3001):

| Provider                        | Variables                                                                | Redirect URI                                                                                      |
| ------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| GitHub                          | `GITHUB_INTEGRATION_CLIENT_ID/SECRET`                                    | `http://localhost:3001/api/integrations/github/callback`                                          |
| Google (Gmail, Drive, Calendar) | `GOOGLE_INTEGRATION_CLIENT_ID/SECRET` (falls back to the sign-in client) | `http://localhost:3001/api/integrations/google/callback`                                          |
| Microsoft (Outlook, Teams)      | `MICROSOFT_INTEGRATION_CLIENT_ID/SECRET`, `MICROSOFT_INTEGRATION_TENANT` | `http://localhost:3001/api/integrations/microsoft/callback`                                       |
| Zoom                            | `ZOOM_INTEGRATION_CLIENT_ID/SECRET`                                      | `http://127.0.0.1:3001/api/integrations/zoom/callback` (Zoom rejects `localhost` with error 4700) |
| Spotify                         | `SPOTIFY_INTEGRATION_CLIENT_ID/SECRET`                                   | `http://127.0.0.1:3001/api/integrations/spotify/callback` (Spotify rejects `localhost`)           |
| LinkedIn                        | `LINKEDIN_INTEGRATION_CLIENT_ID/SECRET`                                  | `http://localhost:3001/api/integrations/linkedin/callback`                                        |

Provider notes:

- **GitHub**: OAuth App, homepage `http://localhost:3001`. Scopes requested: `repo read:user workflow`.
- **Google**: add the redirect URI to the OAuth client, enable the **Gmail API**, **Google Drive API** and **Google Calendar API**, and add the scopes `gmail.readonly`, `gmail.compose`, `drive.readonly`, `drive.file` and `calendar.events` on the consent screen. While the app is in Testing, only listed test users can connect.
- **Microsoft**: Web platform redirect URI; delegated Graph permissions `User.Read`, `Mail.ReadWrite`, `Mail.Send`, `Calendars.ReadWrite`, `Chat.ReadWrite`, `Team.ReadBasic.All`, `Channel.ReadBasic.All`, `ChannelMessage.Send`, `offline_access`. Microsoft has no per-app revocation: Disconnect deletes the tokens here and tells the user to remove the app from their account.
- **Zoom**: General App, user-managed; add `meeting:read:list_meetings`, `meeting:write:meeting`, `user:read:user` in the app.
- **LinkedIn**: add the products "Sign In with LinkedIn using OpenID Connect" and "Share on LinkedIn". LinkedIn does not let third-party apps search members.
- **MCP plugins**: some need a paid plan at the provider (Mobbin) or spend the user's provider credits (Higgsfield). PayPal and Stripe act on the real account the user signs in with.

Recreate the backend after editing `.env`. End-to-end check: connect GitHub on `/plugins` and ask in a chat "list my open PRs"; connect Gmail and ask "draft an email to X about Y": a confirmation card appears and nothing is saved until you click **Confirm**. Connect Linear (no keys needed) and ask "what is assigned to me?".

## Tests

- Workspace browser suite (mocked API, own dev server on port 3013):
  `cd apps/web && npx playwright test -c playwright.workspace.config.ts --workers=1`
- Live check against the Docker stack and real model replies (needs `OPENROUTER_API_KEY` and a verified account):
  `cd apps/web && GX_LIVE_EMAIL=you@example.com GX_LIVE_PASSWORD=... npx playwright test -c playwright.live.config.ts`

## Switching back to another Docker project

`docker compose ls` shows running projects. Stop Genyxo with the `down` command above, then start the other project from its own folder (for example `docker compose -f docker-compose.dev.yml up -d`). Both can also run at the same time as long as their host ports differ.
