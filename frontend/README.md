# AutoPrepAI

AutoPrepAI is a professional, green-on-dark CSV preprocessing tool. It analyzes tabular data, highlights issues, applies intelligent fixes, and exports a reproducible pipeline. The app supports dual-mode operation:
- Production SaaS: Next.js API routes + Supabase (via @supabase/ssr)
- Demo: Works client-only, with graceful localStorage fallback when API/DB are not configured

## Features
- Drag-and-drop or paste CSV
- Metrics cards (rows, columns, missing, quality score)
- Tabs: Column Analysis, Data Issues, Data Preview, Explanation
- Preprocessing actions: trim whitespace, remove empty rows, impute numeric mean, impute categorical mode
- Save to database (Supabase) + Reopen projects
- Explainability panel (human-readable report)
- Pipeline export (Python/pandas)
- Health check endpoint and connection-status chip

## Architecture

\`\`\`mermaid
flowchart LR
  A[Client UI<br/>Next.js App Router] -- fetch  B[/API Routes<br/>/api/*/]
  B -- service client  C[(Supabase<br/>Postgres + Storage)]
  A -- local fallback  D[localStorage]
  A  E[Explainability & Export<br/>client-only]
  B  F[/api/health<br/>Supabase probe/]
\`\`\`

- Client UI: app/page.jsx (all client-side rendering)
- API Routes: app/api/** use createServiceClient (server-side @supabase/ssr)
- DB/Storage: Supabase (anonymous/demo-friendly endpoints provided)
- Fallback: If NEXT_PUBLIC_FLASK_API_URL is not set and Supabase is unavailable, the client uses localStorage to keep the app usable

## Environment
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY (server; used only in API routes)
- Optional demo backend: NEXT_PUBLIC_FLASK_API_URL, NEXT_PUBLIC_FLASK_API_KEY (client will prefer it if provided)

## Run Tests
Use the Scripts panel to run:
- Unit: scripts/unit-preprocess.test.mjs
- E2E (health): scripts/e2e-health.test.mjs

The unit test validates preprocessing logic (trim, empty-row removal, imputations). The E2E health test calls /api/health and verifies DB connectivity.

## Demo Data
- Built-in sample datasets: Pima, Iris, Titanic (subset). Load them from the empty-state picker.

## Roadmap Ideas
- Shareable read-only project links
- Versioned runs with “compare before/after”
- More transforms (scaling, one-hot encoding), with export support
- Optional LLM rationale refinement for explanations
