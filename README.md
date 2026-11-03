# NEXUS OS

Your personal AI operating system. One intelligent workspace that understands your life, remembers your context, plans your work and executes tasks.

**[Open the live demo](https://aqkprogrammer.github.io/nexus-os/)**

![NEXUS OS dashboard](docs/screenshots/dashboard.png)

This repository is the complete frontend, plus accounts, a Postgres database and a real AI chat endpoint. The GitHub Pages demo has no server, so it has no login, keeps data in your browser and uses built-in demo replies.

## Screenshots

| AI Brain | AI Agents |
| --- | --- |
| ![AI Brain](docs/screenshots/brain.png) | ![AI Agents](docs/screenshots/agents.png) |

| Life Planner | Life Analytics |
| --- | --- |
| ![Life Planner](docs/screenshots/planner.png) | ![Life Analytics](docs/screenshots/analytics.png) |

| Automation Hub | Goal Intelligence |
| --- | --- |
| ![Automation Hub](docs/screenshots/automations.png) | ![Goal Intelligence](docs/screenshots/goals.png) |

| Actions | Privacy Vault |
| --- | --- |
| ![Actions](docs/screenshots/actions.png) | ![Privacy Vault](docs/screenshots/privacy.png) |

| Settings | Mobile |
| --- | --- |
| ![Settings](docs/screenshots/settings.png) | <img src="docs/screenshots/mobile.png" alt="Mobile dashboard" width="280"> |

## Run it

You need Node.js and a running Postgres server.

1. Install the packages and copy the settings template:

   ```bash
   npm install
   ```

   ```bash
   cp .env.example .env.local
   ```

2. Fill in `DATABASE_URL`, `BETTER_AUTH_SECRET` and `ALLOWED_EMAILS` in `.env.local`.

3. Create the database and its tables:

   ```bash
   createdb nexus_os
   ```

   ```bash
   npm run db:deploy
   ```

4. Start the app:

   ```bash
   npm run dev
   ```

Then open http://localhost:3000 and create an account with an email from `ALLOWED_EMAILS`.

| Script | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm start` | Run the production build |
| `npm run typecheck` | TypeScript check |
| `npm test` | Browser tests with Playwright |
| `npm run db:migrate` | Create a migration after changing `prisma/schema.prisma` |
| `npm run db:deploy` | Apply migrations to a database |

## Testing

`npm test` builds the app and drives it in a real browser, covering the main flows on desktop and every page at phone size. Each test signs in to a fresh account. Chat runs through the real endpoint against a small mock in `e2e/mock-openai.mjs`, so tests are free and need no key. Local runs use your installed Chrome.

The tests need a separate database, which they migrate themselves:

```bash
createdb nexus_os_test
```

They connect as your system user. Set `TEST_DATABASE_URL` to use a different connection.

Every push to `main` runs the same tests, and a failure stops the deploy.

## Accounts and data

Sign-in uses email and password through [Better Auth](https://www.better-auth.com). Passwords are hashed, and repeated attempts are rate limited.

- **Sign-up is invite-only.** Only emails in `ALLOWED_EMAILS` can create an account, so a public deployment can't be used to spend your OpenAI credit.
- **Each account has its own workspace.** It is saved to Postgres shortly after every change, and nothing personal stays in the browser.
- **New accounts start empty.** Every figure comes from the account's own data, and nothing invented, like the sample's weather, rankings or history, is shown. Settings can load the sample data to explore, or clear the workspace again.
- **Two open tabs can't silently overwrite each other.** A save from an out-of-date tab is refused, and that tab reloads the newer workspace and says so.
- **There is no password reset or email verification yet.** Both need an email provider.

The API routes check the session on every request. `src/proxy.ts` only redirects signed-out visitors, so it is not what protects the data.

## Real AI chat

The companion streams replies from OpenAI, answers from your workspace data, and can add tasks, save memories, schedule events, create goals and launch agents.

Add your key to `OPENAI_API_KEY` in `.env.local`, then restart `npm run dev`.

Without a key, the chat falls back to demo replies and says so under its name. `OPENAI_MODEL` selects any Responses API model.

**Privacy:** each message sends a snapshot of the workspace to OpenAI, including tasks, calendar, goals and up to 40 memories. Requests use `store: false`.

**Cost control:** the endpoint requires a signed-in user, checks the request origin, allows 15 requests a minute per user, and caps message size and reply length. The chat rate limit is per server instance, so set a monthly spend limit in your OpenAI account before deploying.

## Deployment

**Full app:** deploy to a Node host such as Vercel with a hosted Postgres database. Set every variable from `.env.example` in the host's settings, with `BETTER_AUTH_URL` set to the deployed address, and run `npm run db:deploy` against that database. Never commit secrets.

**Demo:** every push to `main` runs `.github/workflows/deploy.yml`, which tests the app, then publishes a static build to GitHub Pages. Setting `PAGES_BASE_PATH` selects that build and leaves out the API and login. Setting `SITE_URL` makes the link preview image use a full URL.

## Modules

| Route | Module | What works today |
| --- | --- | --- |
| `/` | Home | The nine-card dashboard, real AI companion chat and daily insight |
| `/brain` | AI Brain | Context graph, memory search and filters, pin, add, delete |
| `/agents` | AI Agents | Ten agents, launch flow, live step-by-step runs |
| `/planner` | Life Planner | Tasks, week calendar, routines with streaks |
| `/analytics` | Life Analytics | Date ranges, trend, stacked hours, heatmap, table view |
| `/automations` | Automation Hub | Workflow runner, flow diagram, app connections, templates |
| `/goals` | Goal Intelligence | Generated plans, milestones, scheduling into today |
| `/actions` | Actions | Approve, decline, snooze, bulk approve, history |
| `/privacy` | Privacy Vault | Vault controls, permission matrix, JSON export, erase |
| `/settings` | Settings | Profile, appearance, notifications, plan, devices, roadmap |

## Project layout

```
src/app/(app)/         One folder per module route
src/components/shell/  Sidebar, topbar, command palette, global modals
src/components/dashboard/  Dashboard cards, companion chat
src/components/ui.tsx  Cards, buttons, toggles, modals, toasts
src/components/charts.tsx  Area, stacked bar and heatmap charts
src/components/Mascot.tsx  Animated SVG mascot
src/lib/data.ts        Types and seed data
src/lib/store.ts       App state
src/lib/workspace-sync.ts  Loads and saves the workspace through the API
src/lib/auth.ts        Better Auth setup and the sign-up invite list
src/lib/db.ts          Prisma client
src/lib/companion.ts   Demo replies used when no model is available
src/lib/chat-*.ts      Chat client, workspace context and tool definitions
src/app/api/chat/      Streaming OpenAI endpoint
src/app/api/workspace/ Reads and saves the signed-in user's workspace
src/app/login/         Sign in and create account
prisma/                Database schema and migrations
```

## Connecting the backend

Chat, accounts and saved workspaces are already real. The rest of the interface is ready for the stack below, and each remaining piece is simulated in one place, so it can be swapped without touching the screens.

| Replace | With |
| --- | --- |
| `draftPlan` in `src/lib/store.ts` | A goal-planning model call |
| `launchAgent` in `src/lib/store.ts` | The LangGraph execution engine |
| `runWorkflow` and `toggleApp` in `src/lib/store.ts` | Redis queues and MCP connectors |
| Seed data in `src/lib/data.ts` | Real data from integrations, with pgvector for memory search |

| Layer | Technology |
| --- | --- |
| Frontend | Next.js 16, TypeScript |
| UI | Tailwind CSS |
| Backend | FastAPI + Node.js |
| Database | PostgreSQL + pgvector |
| ORM | Prisma / SQLAlchemy |
| Cache | Redis |
| AI | OpenAI models |
| Agents | LangGraph |
| Integrations | MCP |
| Background jobs | Redis queues |
| Infrastructure | Docker + AWS |

## 90-day roadmap

| Timeline | Deliverables |
| --- | --- |
| Days 1-15 | Product architecture, authentication, dashboard, AI memory |
| Days 16-30 | Goals, tasks, calendar and personal context |
| Days 31-45 | AI agent execution engine |
| Days 46-60 | Gmail, Calendar and third-party integrations |
| Days 61-75 | Automation workflows and analytics |
| Days 76-90 | Billing, onboarding, beta launch |
