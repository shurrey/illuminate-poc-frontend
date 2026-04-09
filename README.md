# Blackboard Illuminate POC

A proof-of-concept reimagining of [Anthology Illuminate](https://illuminate.blackboard.com) — an analytics platform for higher education. Built with Next.js 16, deployed as a static site to AWS S3 + CloudFront via CDK.

This POC demonstrates a modern, unified analytics dashboard with live Snowflake data, a conversational AI interface powered by a multi-agent system, and a live data dictionary — all integrated with Cognito authentication.

## Features

### Dashboard (`/`)
- **Live KPI Cards** — 6 metrics pulled from Snowflake in real-time via a query API:
  - Active Students (term-over-term enrollment)
  - Retention Rate (rolling 90-day window)
  - Platform Engagement (7-day student activity)
  - Active Courses (courses with recent activity)
  - Instructor Engagement (grading activity, RSI compliance indicator)
  - Classic Courses Still Active (Original Experience sunset tracker)
- Each card shows: value, sparkline trend, percentage change, and three action icons:
  - **View SQL** — see the exact Snowflake query behind the metric
  - **Info** — detailed explanation of methodology
  - **Ask Illuminate** — pre-filled prompt to dig deeper with the AI agent
- **Customizable layout** — toggle which sections are visible
- **Ask About Your Data** — natural language search box that redirects to the AI chat with auto-submit

### Ask Illuminate (`/chat`)
- Full conversational AI interface connected to a multi-agent backend
- **Streaming SSE** — real-time status updates, agent thinking, tool calls
- **Chain of thought** — expandable view of agent reasoning and tool usage
- **Rich responses** — markdown text, Recharts visualizations, sortable data tables, SQL transparency
- **Export** — CSV download, clipboard copy for data artifacts
- **Pre-filled prompts** — accepts `?prompt=...` (pre-fill) and `?autoSubmit=true` (auto-send) URL params

### Reporting (`/reporting`)
- Browse 10 analytics reports across Learning, Teaching, Leading, Data Q&A, and Custom categories
- Search and filter by area
- Click into detailed report views with:
  - Collapsible sidebar of sibling reports
  - Breadcrumb navigation
  - Filter controls
  - Tabbed chart visualizations (line, bar, area via Recharts)

### Data Dictionary (`/developer`)
- **Live from the Illuminate API** — fetches submodels, definitions, and entity relationships on page load
- **9 CDM schemas**, 99 tables, 1,518 columns, 221 foreign key relationships
- Domain sidebar with color-coded schemas and entity counts
- Entity grid with column counts and relationship counts
- **Detail panel** (slide-over) with two tabs:
  - **Schema** — full column table (name, type, description, PK highlighting) + clickable relationship navigation
  - **Data Preview** — live 20-row preview from Snowflake with expandable cell popovers for long/JSON values
- Global search across domains, tables, and columns

### Settings (`/settings`)
- Account preferences placeholder (Profile, Notifications, Privacy & Security, Snowflake Service Accounts, Language & Region)

## Architecture

```
Browser
  ├── Static site (S3 + CloudFront)
  │   ├── Next.js 16 static export
  │   ├── Cognito auth (amazon-cognito-identity-js)
  │   └── Tailwind CSS + Recharts
  │
  ├── Agent API (Lambda Function URL) ← illuminate-conversational-intelligence project
  │   ├── POST /api/chat/stream (SSE streaming, multi-agent orchestration)
  │   ├── GET  /api/v1/dictionary/* (submodels, definitions, erd, preview)
  │   └── POST /api/v1/dashboard/query (Snowflake SQL execution)
  │
  └── Cognito User Pool ← shared with illuminate-conversational-intelligence
```

### Infrastructure (CDK)

The `infra/` directory contains an AWS CDK stack that deploys:

- **S3 Bucket** — hosts the static site files
- **CloudFront Distribution** — HTTPS, SPA fallback routing (404 → index.html)
- **SSM Parameter Lookups** — reads Cognito pool/client IDs and API URL from parameters published by the companion project

The stack does **not** manage Cognito, the Lambda API, or Snowflake — those belong to the [illuminate-conversational-intelligence](https://github.com/anthropics/illuminate-conversational-intelligence) project.

## Prerequisites

- **Node.js 22+**
- **AWS CLI** configured with credentials
- **CDK CLI** (`npm install -g aws-cdk`)
- The **illuminate-conversational-intelligence** project deployed, with SSM parameters published:
  - `/illuminate/dev/cognito-pool-id`
  - `/illuminate/dev/cognito-client-id`
  - `/illuminate/dev/api-url`

## Setup

```bash
# Install dependencies
npm install
cd infra && npm install && cd ..

# Configure environment
cp .env.example .env.local
# Edit .env.local with values from SSM or the companion project's stack outputs
```

## Development

```bash
npm run dev
# Open http://localhost:3000
```

## Build & Deploy

```bash
# Build the static site
npm run build

# Deploy to AWS (reads SSM params, creates S3 + CloudFront)
cd infra
npx cdk deploy -c environment=dev

# Add your CloudFront domain to the API Lambda's CORS config
./scripts/add-cors-origin.sh illuminate-api-dev https://YOUR_CLOUDFRONT_DOMAIN.cloudfront.net
```

### First Deploy

```bash
# Bootstrap CDK (one-time per AWS account/region)
cd infra
npx cdk bootstrap

# Deploy
npx cdk deploy -c environment=dev
```

The stack outputs will show:
- `SiteUrl` — your CloudFront URL
- `UserPoolId` / `UserPoolClientId` — from SSM
- `AgentApiUrl` — Lambda Function URL from SSM

After the first deploy, update `.env.local` with the CloudFront URL for the redirect URLs, rebuild, and redeploy to bake in the correct values.

### Tear Down

```bash
cd infra
npx cdk destroy -c environment=dev
```

## Project Structure

```
illuminate-poc/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── page.tsx            # Dashboard (live KPI cards, AI search, feed)
│   │   ├── chat/page.tsx       # Ask Illuminate (conversational AI)
│   │   ├── developer/page.tsx  # Data Dictionary (live schema browser)
│   │   ├── reporting/          # Reports list + detail views
│   │   └── settings/page.tsx   # Settings placeholder
│   │
│   ├── components/
│   │   ├── Navigation.tsx      # Dark header with nav, Snowflake logo, utilities
│   │   ├── NavDrawer.tsx       # Slide-out hamburger menu
│   │   ├── LiveKPICard.tsx     # Dashboard metric card (live Snowflake data)
│   │   ├── CardModals.tsx      # SQL view + info modals for KPI cards
│   │   ├── DataQASearch.tsx    # AI search box (redirects to /chat)
│   │   ├── BrandLogo.tsx       # Blackboard Illuminate wordmark
│   │   ├── SnowflakeLogo.tsx   # Snowflake Inc. official logo SVG
│   │   ├── chat/               # Chat components (MessageBubble, ThinkingBubble, etc.)
│   │   └── schema/             # Data Dictionary components (DomainSidebar, EntityGrid, etc.)
│   │
│   ├── context/
│   │   ├── AuthContext.tsx      # Cognito login (amazon-cognito-identity-js)
│   │   └── UserContext.tsx      # User preferences (favorites, recent, widgets)
│   │
│   ├── data/
│   │   ├── dashboardCards.ts   # KPI card config (SQL queries, descriptions, prompts)
│   │   ├── mockReports.ts      # Static report catalog
│   │   ├── mockChanges.ts      # Static "What Changed" feed
│   │   └── mockAlerts.ts       # Static notifications
│   │
│   ├── hooks/
│   │   ├── useChat.ts          # Chat state + SSE streaming
│   │   ├── useDashboardCards.ts # Live KPI card data fetching
│   │   └── useDictionary.ts    # Live data dictionary fetching
│   │
│   ├── services/
│   │   ├── agentClient.ts      # Agent API client (chat streaming)
│   │   ├── authService.ts      # Cognito authentication service
│   │   ├── dashboardApi.ts     # Dashboard query API client
│   │   └── dictionaryApi.ts    # Data dictionary API client
│   │
│   └── types/
│       └── chat.ts             # Chat message, artifact, streaming event types
│
├── infra/                       # AWS CDK infrastructure
│   ├── bin/app.ts              # CDK app entry point
│   ├── lib/
│   │   ├── illuminate-stack.ts # Main stack (hosting + SSM lookups)
│   │   └── hosting.ts          # S3 + CloudFront construct
│   └── scripts/
│       └── add-cors-origin.sh  # Safely append CORS origin to API Lambda
│
├── .env.example                 # Environment variable template
├── next.config.ts               # Static export configuration
└── package.json
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.1.7 (static export) |
| Language | TypeScript 5.9 |
| Styling | Tailwind CSS 4.2 |
| Charts | Recharts 3.8 |
| Auth | amazon-cognito-identity-js (Cognito USER_PASSWORD_AUTH) |
| Markdown | react-markdown + remark-gfm |
| SQL Formatting | sql-formatter |
| Hosting | AWS S3 + CloudFront |
| IaC | AWS CDK (TypeScript) |
| Data | Snowflake (via companion project's Lambda API) |
| AI | Multi-agent system (via companion project's Bedrock AgentCore) |

## Related Projects

- **illuminate-conversational-intelligence** — Multi-agent backend (Bedrock AgentCore), Lambda API proxy, Cognito user pool, Snowflake integration, CDK infrastructure
- **illuminate-mcp** — MCP server for schema exploration and SQL generation
