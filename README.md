# NEXUS OS

Your personal AI operating system. One intelligent workspace that understands your life, remembers your context, plans your work and executes tasks.

**[Open the live demo](https://aqkprogrammer.github.io/nexus-os/)**

![NEXUS OS dashboard](docs/screenshots/dashboard.png)

This repository is the complete frontend. It runs on its own with seeded demo data saved in the browser, so every screen and flow works before a backend exists.

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
| `npm run build` | Static production build in `out/` |
| `npm run typecheck` | TypeScript check |

## Deployment

Every push to `main` runs `.github/workflows/deploy.yml`, which builds the static site and publishes it to GitHub Pages. The site can also be redeployed by hand from the Actions tab.

## Modules

| Route | Module | What works today |
| --- | --- | --- |
| `/` | Home | The nine-card dashboard, companion chat and daily insight |
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
src/lib/companion.ts   Companion replies
```

## Connecting the backend

The interface is ready for the stack below. Each piece is simulated in one place, so it can be swapped without touching the screens.

| Replace | With |
| --- | --- |
| `companionReply` in `src/lib/companion.ts` | A streaming model endpoint |
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
