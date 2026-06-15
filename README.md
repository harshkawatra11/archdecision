<div align="center">

# ArchDecision

### The AI that explains *why* your codebase is the way it is

Paste a GitHub repo → grounded **Architecture Decision Records**, a codebase you can
**question in plain English**, and a **one-click onboarding doc** — in ~60 seconds, on any public repo.

<br/>

## ▶ Try it now — no setup, no login

# **[archdecision.vercel.app](https://archdecision.vercel.app)**

Just open the link, paste a repo like `pallets/flask`, and hit **Analyze**.
Everything below is *only* for running it yourself.

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
| **ADR Generator** *(core)* | A grounded set of Architecture Decision Records in the Nygard format, as many as the evidence supports — context, decision, rationale, alternatives, consequences, and the **evidence** each was inferred from. |
| **Ask Your Codebase** *(core)* | A chat scoped to the repo. Ask *"why Redis here?"* and get a grounded answer **with file citations**, not a generic hallucination. |
| **Onboarding Doc** *(core)* | The day-one "how this codebase works" guide every team needs and nobody writes. Generated, sectioned, and ready to commit. |
| **PR Architectural Review** *(stretch)* | Paste a pull request URL — it's checked against the generated ADRs and flags likely architectural violations, each phrased as a question for the reviewer. |
| **Tech Debt Drift Map** *(stretch)* | Your architecture vs. your reality — cross-references the ADRs against the repo's current structural metrics to show where the code has drifted from the decisions it was built on. |

All five features are implemented and live in the app.

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
3. **Infer** — the model reads the profile and returns structured ADRs (JSON + schema
   validation + one repair retry). Ask & Onboarding reuse the cached profile.

The model API key lives **only** in a server-side env var and never reaches the browser. Repo
content is treated as untrusted **data** to analyze, not instructions to follow.

## Tech stack

- **Frontend** — React + Vite + TypeScript + Tailwind, with GSAP (intro loader) and
  Framer Motion (transitions). `react-markdown` renders the artifacts.
- **Backend** — Vercel serverless functions (Node + TypeScript) under [`/api`](./api), streamed via SSE.
- **LLM** — Gemini 2.5 Flash behind a thin, **swappable** OpenAI-compatible interface
  ([`api/_lib/llm.ts`](./api/_lib/llm.ts)) — point it at Groq, OpenRouter, or GitHub Models by changing env vars.
- **Data** — GitHub REST API (plain `fetch`). No database, no auth, no paid services.

---

## Run it locally

> **You don't need to do any of this to evaluate the project** — the
> [live version](https://archdecision.vercel.app) is fully functional. These steps are for
> running your own copy.

### Prerequisites

- **Node.js 20.12+** (Node 24 recommended) — check with `node -v`
- A **free Google Gemini API key** — get one in 30 seconds at <https://aistudio.google.com/apikey>

### 1. Get the code

**Option A — clone with Git:**

```bash
git clone https://github.com/harshkawatra11/archdecision.git
cd archdecision
```

**Option B — download the ZIP:**

Click **Code → Download ZIP** on the GitHub page, unzip it, then open a terminal in the
unzipped folder:

```bash
cd path/to/archdecision   # the folder you unzipped
```

### 2. Install dependencies

```bash
npm install
```

### 3. Add your API key

Copy the example env file and open it:

```bash
cp .env.example .env
```

Then edit `.env` and paste your Gemini key into `LLM_API_KEY`:

```dotenv
# Paste your Gemini key from https://aistudio.google.com/apikey
LLM_API_KEY=your_gemini_key_here

# Already set for Gemini — leave as-is
LLM_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai
LLM_MODEL=gemini-2.5-flash

# Optional: a GitHub token raises the API limit from 60/hr to 5000/hr.
# No scopes needed for public repos. Create at https://github.com/settings/tokens
GITHUB_TOKEN=
```

> **No key?** The app still runs and GitHub ingestion works — analysis just returns a friendly
> "engine not configured" message instead of generating ADRs. To skip setup entirely, use the
> [live deployment](https://archdecision.vercel.app).

### 4. Start the app

```bash
npm run dev
```

This starts the web app on **http://localhost:5173** and the API on **:3001** (Vite proxies
`/api` to it). Open <http://localhost:5173> and paste a repo.

You'll know the key was picked up when the API log prints `LLM_API_KEY detected ✓`.

### GitHub rate limits

Unauthenticated GitHub allows 60 requests/hour — fine for a few analyses. Hitting the limit (or
analyzing a private repo)? Either set `GITHUB_TOKEN` in `.env`, or expand **"Add a token"** in
the UI and paste a [personal access token](https://github.com/settings/tokens). A token pasted in
the UI is used **only for that request** — never logged, never stored.

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Run frontend + API together (hot reload). |
| `npm run build` | Type-check and build the production frontend to `dist/`. |
| `npm run typecheck` | Type-check without emitting. |
| `npm run preview` | Preview the production build. |

---

## Deploy your own to Vercel

1. Push this repo to your GitHub.
2. Import it on [Vercel](https://vercel.com/new) — the framework preset (Vite) and
   [`vercel.json`](./vercel.json) are already configured.
3. Add these environment variables in Project Settings → Environment Variables:
   - `LLM_API_KEY` — your Gemini key
   - `LLM_BASE_URL` — `https://generativelanguage.googleapis.com/v1beta/openai`
   - `LLM_MODEL` — `gemini-2.5-flash`
   - `GITHUB_TOKEN` — *(optional)* a GitHub PAT to raise rate limits
4. Deploy. The `/api/*` files become serverless functions automatically; the SPA is served from `dist/`.

Verify with `GET /api/health` → `{ "ok": true, ... }`.

## API

| Endpoint | Purpose |
| --- | --- |
| `POST /api/analyze` | Ingestion + ADR generation. SSE pipeline stages, then the result. |
| `POST /api/ask` | Grounded Q&A over the analyzed repo. SSE tokens + a sources frame. |
| `POST /api/onboarding` | Generate the onboarding doc. SSE Markdown. |
| `POST /api/pr-review` | Check a PR diff against the ADRs → structured findings. |
| `POST /api/drift` | Map drift between the ADRs and the repo's current structure → structured findings. |
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
</content>
