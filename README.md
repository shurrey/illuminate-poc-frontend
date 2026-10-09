# Blackboard Illuminate POC

A proof-of-concept reimagining of [Anthology Illuminate](https://illuminate.blackboard.com) — an analytics platform for higher education. Built with Next.js 16, deployed as a static site to AWS S3 + CloudFront via CDK.

This POC demonstrates a unified analytics dashboard, a conversational AI interface and a query builder, all driven by the semantic layer in the companion backend. Every number on screen — dashboard cards, chat answers, saved queries — comes from a semantic contract (a metric, or a dataset with measures, dimensions and filters) that the backend compiles to Snowflake SQL. Authentication is through Cognito.

## Features

### Dashboard (`/`)
- **Live KPI cards.** Each card is a semantic contract, defined in `src/data/dashboardCards.ts` and compiled and run through `POST /api/v1/semantic/query`. The six default cards are:
  - Active Students
  - Student Engagement
  - Active in the Last 7 Days
  - Courses with Student Activity
  - Classic Courses
  - Average Grade
- **Card actions.** Each card has View SQL (the compiled SQL), Info (the metric definition, plus any tenant overlays applied), Ask Illuminate, and Retry when a query fails.
- **Custom cards.** You can add cards from `/cards/new`, from the Query Builder, or by pinning a chat answer. They are stored in the browser (`CardStoreContext`).
- **Customizable layout and Ask About Your Data.** The search box opens the chat with the question already submitted.

### Ask Illuminate (`/chat`)
- Conversational AI that answers from the semantic layer. It searches the catalog and runs semantic queries, and uses freehand SQL only as a labelled fallback.
- **Provenance bar** on each answer shows the datasets, metrics and tenant overlays it used. **Pin as card** turns a semantic answer into a dashboard card.
- **Streaming SSE** — real-time status updates, agent thinking, tool calls
- **Chain of thought** — expandable view of agent reasoning and tool usage
- **Rich responses** — markdown text, Recharts visualizations, sortable data tables, SQL transparency
- **Export** — CSV download, clipboard copy for data artifacts
- **Pre-filled prompts** — accepts `?prompt=...` (pre-fill) and `?autoSubmit=true` (auto-send) URL params

### Query Builder (`/queries`)
- **New Query.** Build a contract by picking a dataset or metric, then measures, dimensions, filters and a time range. It compiles as you edit and shows the SQL and any errors. You can also describe the query in plain language and have the agent draft the contract. Run it, save it, or make it a card. An answer with no governed metric behind it is marked Ungoverned and can't be saved or made a card.
- **My Queries.** Saved contracts. Open one in the editor, or delete it.
- **Import.** Paste SQL and the agent maps it to an equivalent semantic contract.

### Reporting (`/reporting`)
- Browse 10 analytics reports across Learning, Teaching, Leading, Data Q&A, and Custom categories
- Search and filter by area
- Click into detailed report views with:
  - Collapsible sidebar of sibling reports
  - Breadcrumb navigation
  - Filter controls
  - Tabbed chart visualizations (line, bar, area via Recharts)

### Data Dictionary (`/developer`)
- **Tables view.** The raw CDM schema, loaded live from `/api/v1/dictionary/*`: a domain sidebar, an entity grid, and a detail panel with columns, relationships and a 20-row data preview.
- **ERD view.** Entity-relationship diagrams, rendered with Mermaid.
- **Semantic Layer view.** The semantic catalog: datasets, metrics, measures, dimensions, filters, and PII-protected columns.

### Metric Definitions (`/admin/definitions`, admins only)
- Edit tenant overlays on measures, filters and metric defaults. Every edit is compiled before it saves.
- Each overlay is versioned. Saving over a newer version returns a 409 conflict and reloads the editor. You can view an overlay's history, revert it, or delete it.

### Settings (`/settings`)
- Account preferences placeholder (Profile, Notifications, Privacy & Security, Language & Region)

## Architecture

```
Browser
  ├── Static site (S3 + CloudFront)
  │   ├── Next.js 16 static export
  │   ├── Cognito auth (amazon-cognito-identity-js)
  │   └── Tailwind CSS + Recharts
  │
  ├── Agent API (Lambda Function URL) ← illuminate-conversational-intelligence project
  │   ├── POST /api/chat/stream          (SSE chat, semantic-first tools)
  │   ├── GET  /api/v1/semantic/catalog  (datasets, metrics, tenant overlays applied)
  │   ├── POST /api/v1/semantic/compile  (contract → SQL, no execution)
  │   ├── POST /api/v1/semantic/query    (contract → SQL → rows, with provenance)
  │   ├── /api/v1/admin/overlay(s)       (tenant overlay CRUD, history, revert)
  │   └── GET  /api/v1/dictionary/*      (raw schema browser and preview)
  │
  └── Cognito User Pool ← shared with illuminate-conversational-intelligence
```

### Infrastructure (CDK)

The `infra/` directory contains an AWS CDK stack that deploys:

- **S3 Bucket** — hosts the static site files
- **CloudFront Distribution** — HTTPS, SPA fallback routing (404 → index.html)
- **SSM Parameter Lookups** — reads Cognito pool/client IDs and API URL from parameters published by the companion project
- **CORS origin custom resource** — appends the CloudFront origin to the API Lambda's `ALLOWED_ORIGINS`, leaving its other environment variables alone

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
```

The stack adds the CloudFront origin to the API Lambda's `ALLOWED_ORIGINS` itself. Redeploying the backend resets `ALLOWED_ORIGINS` from the backend's own config, so redeploy this stack after it. You can also run `infra/scripts/add-cors-origin.sh <function-name> <origin>`, which does the same thing by hand.

## Lint

```bash
npm run lint
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
│   ├── app/                       # Next.js App Router pages
│   │   ├── page.tsx               # Dashboard (KPI cards, AI search, feed)
│   │   ├── chat/page.tsx          # Ask Illuminate
│   │   ├── queries/page.tsx       # Query Builder (New, My Queries, Import)
│   │   ├── cards/new/page.tsx     # Card builder
│   │   ├── developer/page.tsx     # Data Dictionary + Semantic Layer view
│   │   ├── admin/definitions/     # Tenant overlay editor (admins)
│   │   ├── reporting/             # Reports list + detail views (mock data)
│   │   └── settings/page.tsx      # Settings placeholder
│   │
│   ├── components/
│   │   ├── LiveKPICard.tsx        # Dashboard card (runs its contract)
│   │   ├── CardModals.tsx         # SQL and info modals for cards
│   │   ├── chat/                  # MessageBubble (provenance, pin), charts, tables
│   │   ├── queries/               # ContractEditor, NewQuery, MyQueries, ImportQuery
│   │   ├── semantic/              # SemanticLayerView
│   │   └── schema/                # Raw schema browser components
│   │
│   ├── context/                   # Auth, user prefs, card store, query builder state
│   ├── data/
│   │   ├── dashboardCards.ts      # Card contracts, formats, default cards
│   │   └── mock*.ts               # Static reports, feed, alerts
│   │
│   ├── hooks/
│   │   ├── useChat.ts             # Chat state + SSE streaming
│   │   ├── useDashboardCards.ts   # Runs card contracts (keyed by contract, retry)
│   │   ├── useSemanticCatalog.ts  # Loads the catalog (ETag revalidation)
│   │   ├── useSemanticGeneration.ts # Natural language / SQL → contract via the agent
│   │   └── useDictionary.ts       # Raw schema fetching
│   │
│   ├── services/
│   │   ├── agentClient.ts         # Chat streaming and cancel
│   │   ├── semanticApi.ts         # Catalog, compile, query
│   │   ├── adminApi.ts            # Overlay CRUD, history, revert
│   │   ├── dictionaryApi.ts       # Raw schema API
│   │   └── authService.ts         # Cognito authentication
│   │
│   └── types/                     # chat, semantic (handwritten API types), queryBuilder
│
├── infra/                         # AWS CDK infrastructure
│   ├── bin/app.ts                 # CDK app entry point
│   ├── lib/
│   │   ├── illuminate-stack.ts    # Stack: hosting, SSM lookups, CORS origin
│   │   └── hosting.ts             # S3 + CloudFront construct
│   └── scripts/add-cors-origin.sh # Manual CORS origin append
│
├── eslint.config.mjs              # ESLint flat config
├── .env.example                   # Environment variable template
├── next.config.ts                 # Static export configuration
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
| Data | Semantic layer → Snowflake (via companion project's Lambda API) |
| AI | Amazon Bedrock chat with semantic-layer tools (companion project) |

## Related Projects

- **illuminate-conversational-intelligence** — Semantic layer (dataset and metric definitions, compiler, tenant overlays), Bedrock chat, Lambda API, Cognito user pool, Snowflake integration, CDK infrastructure
- **illuminate-mcp** — MCP server for schema exploration and SQL generation
