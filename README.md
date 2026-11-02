# NEXUS OS

Your personal AI operating system. One intelligent workspace that understands your life, remembers your context, plans your work and executes tasks.

**[Open the live demo](https://aqkprogrammer.github.io/nexus-os/)**

![NEXUS OS dashboard](docs/screenshots/dashboard.png)

This repository is the complete frontend, plus a real AI chat endpoint. Workspace data is seeded and saved in the browser until the database exists. The GitHub Pages demo has no server, so its chat uses built-in demo replies.

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

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

| Script | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm start` | Run the production build |
| `npm run typecheck` | TypeScript check |

## Real AI chat

The companion streams replies from OpenAI, answers from your workspace data, and can add tasks, save memories, schedule events, create goals and launch agents.

1. Copy the template:

   ```bash
   cp .env.example .env.local
   ```

2. Add your key to `OPENAI_API_KEY` in `.env.local`, then restart `npm run dev`.

Without a key, the chat falls back to demo replies and says so under its name. `OPENAI_MODEL` selects any Responses API model.

**Privacy:** each message sends a snapshot of the workspace to OpenAI, including tasks, calendar, goals and up to 40 memories. Requests use `store: false`.

**Cost control:** the endpoint checks the request origin, allows 15 requests a minute per IP address, and caps message size and reply length. The rate limit is per server instance, so set a monthly spend limit in your OpenAI account before deploying publicly. There is no login yet, so anyone with the URL can use your key through the chat.

## Deployment

**Real AI:** deploy to a Node host such as Vercel and set `OPENAI_API_KEY` in its environment variables. Never commit the key.

**Demo:** every push to `main` runs `.github/workflows/deploy.yml`, which publishes a static build to GitHub Pages. Setting `PAGES_BASE_PATH` selects that build and leaves out the API.

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
src/lib/store.ts       App state, persisted to localStorage
src/lib/companion.ts   Demo replies used when no model is available
src/lib/chat-*.ts      Chat client, workspace context and tool definitions
src/app/api/chat/      Streaming OpenAI endpoint
```

## Connecting the backend

Chat is already real. The rest of the interface is ready for the stack below, and each remaining piece is simulated in one place, so it can be swapped without touching the screens.

| Replace | With |
| --- | --- |
| `draftPlan` in `src/lib/store.ts` | A goal-planning model call |
| `launchAgent` in `src/lib/store.ts` | The LangGraph execution engine |
| `runWorkflow` and `toggleApp` in `src/lib/store.ts` | Redis queues and MCP connectors |
| Seed data in `src/lib/data.ts` | PostgreSQL and pgvector through the API |

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
