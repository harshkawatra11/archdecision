<div align="center">

# ArchDecision

### The AI that explains *why* your codebase is the way it is

Paste a GitHub repo → grounded **Architecture Decision Records**, a codebase you can
**question in plain English**, and a **one-click onboarding doc** — in ~60 seconds, on any public repo.

</div>

---

## The problem

Codebases are full of decisions whose reasoning has evaporated. The person who chose
PostgreSQL left. The Slack thread is gone. New engineers waste weeks rediscovering context,
and teams repeat solved mistakes.

ADRs (Architecture Decision Records) are the known best practice for capturing this — and
almost nobody writes them, because writing them by hand is tedious work with delayed payoff.

**ArchDecision removes the tedium. The decision record writes itself** — recovered from the
one source of truth that never leaves: the code.

## What it does

| Feature | What you get |
| --- | --- |
| **ADR Generator** | 5–8 Architecture Decision Records in the Nygard format — context, decision, rationale, alternatives, consequences, and the **evidence** each was inferred from. |
| **Ask Your Codebase** | A chat scoped to the repo. Ask *"why Redis here?"* and get a grounded answer **with file citations**, not a generic hallucination. |
| **Onboarding Doc** | The day-one "how this codebase works" guide every team needs and nobody writes. Generated, sectioned, and ready to commit. |
| **PR Review** *(stretch)* | Check a pull request diff against the generated ADRs and flag likely architectural violations. |

### Principles

- **Grounded or silent** — every claim cites specific evidence (a dependency, a file, a config). No confident hallucination.
- **Honest confidence** — each ADR is labelled `high` / `medium` / `low`. Inferred is labelled inferred.
- **Zero setup to first value** — paste a URL. No login, no install, no config.
- **Artifacts, not just answers** — everything downloads as committable Markdown for `/docs/adr/`.

## How it works

```
 Browser SPA  ──HTTPS/SSE──▶  Serverless API  ──▶  GitHub REST API
 (React/Vite)                 (Vercel fns)     └──▶  Gemini 2.5 Flash
```

1. **Ingest** — parse the repo URL, pull metadata + the full file tree in one call, select
   *signal files* (manifests, Dockerfiles, CI configs, READMEs, entry points) within a token
   budget, and parse dependency manifests.
2. **Profile** — assemble a compact, structured `RepoProfile` (tree + parsed deps + truncated
   signal files). This is the grounding/compression layer fed to the model — never the raw repo.
3. **Infer** — Gemini reads the profile and returns structured ADRs (JSON mode + schema
   validation + one repair retry). Ask & Onboarding reuse the cached profile.

The Gemini key lives **only** in a server-side env var and never reaches the browser. Repo
content is treated as untrusted **data** to analyze, not instructions to follow.

## Tech stack

- **Frontend** — React + Vite + TypeScript + Tailwind, with GSAP (intro loader) and
  Framer Motion (transitions). `react-markdown` renders the artifacts.
- **Backend** — Vercel serverless functions (Node + TypeScript) under [`/api`](./api), streamed via SSE.
- **LLM** — Gemini 2.5 Flash (free tier, 1M-token context, native JSON mode) behind a thin,
  swappable interface ([`api/_lib/llm.ts`](./api/_lib/llm.ts)).
- **Data** — GitHub REST API (plain `fetch`). No database, no auth, no paid services.

## Getting started

### Prerequisites

- Node.js 20.12+ (Node 24 recommended)
- A free Google Gemini API key — <https://aistudio.google.com/apikey>

### Run locally

```bash
git clone https://github.com/harshkawatra11/archdecision.git
cd archdecision
npm install

cp .env.example .env        # then set GEMINI_API_KEY in .env

npm run dev                 # web on :5173, API on :3001 (Vite proxies /api)
```

Open <http://localhost:5173>. The dev server runs the same handlers that deploy to Vercel as
serverless functions, with Vite proxying `/api` to them.

> Without a `GEMINI_API_KEY`, the UI still loads and GitHub ingestion works; analysis returns a
> friendly "engine not configured" message instead of crashing.

### GitHub rate limits

Unauthenticated GitHub allows 60 requests/hour — fine for a few analyses. Hitting the limit (or
analyzing a private repo)? Expand **"Add a token"** in the UI and paste a
[personal access token](https://github.com/settings/tokens). It's used **only for that request**
— never logged, never stored.

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Run frontend + API together (hot reload). |
| `npm run build` | Type-check and build the production frontend to `dist/`. |
| `npm run typecheck` | Type-check without emitting. |
| `npm run preview` | Preview the production build. |

## Deploy to Vercel

1. Push this repo to GitHub.
2. Import it on [Vercel](https://vercel.com/new) — the framework preset (Vite) and
   [`vercel.json`](./vercel.json) are already configured.
3. Add the environment variable **`GEMINI_API_KEY`** in Project Settings → Environment Variables.
4. Deploy. The `/api/*` files become serverless functions automatically; the SPA is served from `dist/`.

Verify with `GET /api/health` → `{ "ok": true, ... }`.

## API

| Endpoint | Purpose |
| --- | --- |
| `POST /api/analyze` | Ingestion + ADR generation. SSE pipeline stages, then the result. |
| `POST /api/ask` | Grounded Q&A over the analyzed repo. SSE tokens + a sources frame. |
| `POST /api/onboarding` | Generate the onboarding doc. SSE Markdown. |
| `POST /api/pr-review` | *(stretch)* Check a PR diff against the ADRs. |
| `GET /api/health` | Uptime + whether the LLM is configured. |

## Project structure

```
api/                serverless functions + _lib/ (github, ingest, profile, llm, prompts, schema, cache)
server/dev.ts       local Express harness that mounts the same handlers
src/                React SPA — components/, hooks/, lib/ (api client, markdown, download)
vercel.json         build + functions + SPA rewrite config
```

## Notes & honesty

ADRs are **inferred** and labelled with a confidence level — a draft a human confirms, which is
exactly how ADRs should be written anyway. Grounding every claim in concrete evidence makes the
output auditable rather than authoritative.

## License

MIT — see [LICENSE](./LICENSE).

<div align="center">
<sub>Built for the Microsoft Build AI Hackathon 2026 · institutional memory your codebase never had.</sub>
</div>
