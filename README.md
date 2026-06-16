<div align="center">

<img width="100%" src="https://capsule-render.vercel.app/api?type=waving&color=0:4F46E5,40:7C3AED,100:A855F7&height=200&section=header&text=ArchDecision&fontSize=58&fontColor=ffffff&animation=fadeIn&fontAlignY=38" />

<a href="https://archdecision.vercel.app">
  <img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=600&size=21&duration=3400&pause=900&color=A855F7&center=true&vCenter=true&width=780&height=50&lines=The+AI+that+explains+WHY+your+codebase+is+the+way+it+is;Grounded+Architecture+Decision+Records+from+any+repo;Citation-backed+codebase+Q%26A+%E2%80%94+no+hallucination;Paste+a+GitHub+repo+%E2%86%92+ADRs+%2B+onboarding+in+~60s" alt="Typing SVG" />
</a>

<br/><br/>

<img src="https://img.shields.io/badge/TypeScript-1E1B4B?style=for-the-badge&logo=typescript&logoColor=white" />
<img src="https://img.shields.io/badge/React-4F46E5?style=for-the-badge&logo=react&logoColor=white" />
<img src="https://img.shields.io/badge/Vite-6D28D9?style=for-the-badge&logo=vite&logoColor=white" />
<img src="https://img.shields.io/badge/Gemini%202.5%20Flash-7C3AED?style=for-the-badge&logo=googlegemini&logoColor=white" />
<img src="https://img.shields.io/badge/Vercel%20Serverless-1E1B4B?style=for-the-badge&logo=vercel&logoColor=white" />
<img src="https://img.shields.io/badge/SSE-A855F7?style=for-the-badge&logo=serverless&logoColor=white" />

<br/>

<a href="https://archdecision.vercel.app"><img src="https://img.shields.io/badge/▶%20Live%20Demo-7C3AED?style=for-the-badge&logo=vercel&logoColor=white" /></a>
<a href="./LICENSE"><img src="https://img.shields.io/badge/License-MIT-4F46E5?style=for-the-badge" /></a>
<img src="https://img.shields.io/badge/No%20login%20·%20No%20setup-6D28D9?style=for-the-badge" />

</div>

---

<div align="center">

**Paste a GitHub repo → grounded Architecture Decision Records, a codebase you can question in plain English, and a one-click onboarding doc — in ~60 seconds, on any public repo.**

# ▶ [archdecision.vercel.app](https://archdecision.vercel.app)

*Open the link, paste a repo like `pallets/flask`, hit **Analyze**. Everything below is only for running it yourself.*

</div>

---

## <img src="https://img.shields.io/badge/-The%20Problem-1E1B4B?style=flat-square" height="22"/> &nbsp; The Problem

Codebases are full of decisions whose reasoning has evaporated. The person who chose PostgreSQL left. The Slack thread is gone. New engineers waste weeks rediscovering context, and teams repeat solved mistakes.

ADRs (Architecture Decision Records) are the known best practice for capturing this — and almost nobody writes them, because writing them by hand is tedious work with delayed payoff.

> **ArchDecision removes the tedium. The decision record writes itself** — recovered from the one source of truth that never leaves: the code.

---

## <img src="https://img.shields.io/badge/-What%20It%20Does-1E1B4B?style=flat-square" height="22"/> &nbsp; What It Does

| Feature | What you get |
| :--- | :--- |
| **ADR Generator** *(core)* | A grounded set of Architecture Decision Records in Nygard format — context, decision, rationale, alternatives, consequences, and the **evidence** each was inferred from. |
| **Ask Your Codebase** *(core)* | A chat scoped to the repo. Ask *"why Redis here?"* and get a grounded answer **with file citations**, not a generic hallucination. |
| **Onboarding Doc** *(core)* | The day-one "how this codebase works" guide every team needs and nobody writes — sectioned and ready to commit. |
| **PR Architectural Review** *(stretch)* | Paste a pull request URL — checked against the generated ADRs and flags likely architectural violations as questions for the reviewer. |
| **Tech Debt Drift Map** *(stretch)* | Cross-references the ADRs against the repo's current structure to show where the code has drifted from the decisions it was built on. |

### Design Principles

- **Grounded or silent** — every claim cites specific evidence (a dependency, a file, a config). No confident hallucination.
- **Honest confidence** — each ADR is labelled `high` / `medium` / `low`. Inferred is labelled *inferred*.
- **Zero setup to first value** — paste a URL. No login, no install, no config.
- **Artifacts, not just answers** — everything downloads as committable Markdown for `/docs/adr/`.

---

## <img src="https://img.shields.io/badge/-How%20It%20Works-1E1B4B?style=flat-square" height="22"/> &nbsp; How It Works

```
 Browser SPA  ──HTTPS/SSE──▶  Serverless API  ──▶  GitHub REST API
 (React/Vite)                 (Vercel fns)     └──▶  Gemini 2.5 Flash
```

1. **Ingest** — parse the repo URL, pull metadata + the full file tree in one call, select *signal files* (manifests, Dockerfiles, CI configs, READMEs, entry points) within a token budget, and parse dependency manifests.
2. **Profile** — assemble a compact, structured `RepoProfile` (tree + parsed deps + truncated signal files). This is the grounding/compression layer fed to the model — **never the raw repo**.
3. **Infer** — the model reads the profile and returns structured ADRs (JSON + schema validation + one repair retry). Ask & Onboarding reuse the cached profile.

> The model API key lives **only** in a server-side env var and never reaches the browser. Repo content is treated as untrusted **data** to analyze, not instructions to follow (prompt-injection boundary).

---

## <img src="https://img.shields.io/badge/-Tech%20Stack-1E1B4B?style=flat-square" height="22"/> &nbsp; Tech Stack

<div align="center">

<img src="https://skillicons.dev/icons?i=ts,react,vite,tailwind,vercel,nodejs&theme=dark" />

</div>

- **Frontend** — React + Vite + TypeScript + Tailwind, with GSAP (intro loader) and Framer Motion (transitions). `react-markdown` renders the artifacts.
- **Backend** — Vercel serverless functions (Node + TypeScript) under [`/api`](./api), streamed via SSE.
- **LLM** — Gemini 2.5 Flash behind a thin, **swappable** OpenAI-compatible interface ([`api/_lib/llm.ts`](./api/_lib/llm.ts)) — point it at Groq, OpenRouter, or GitHub Models by changing env vars.
- **Data** — GitHub REST API (plain `fetch`). No database, no auth, no paid services.

---

<details>
<summary><b>🚀 Run It Locally</b></summary>

<br/>

> You don't need any of this to evaluate the project — the [live version](https://archdecision.vercel.app) is fully functional. These steps are for running your own copy.

**Prerequisites**
- **Node.js 20.12+** (Node 24 recommended) — check with `node -v`
- A **free Google Gemini API key** — get one in 30 seconds at <https://aistudio.google.com/apikey>

```bash
git clone https://github.com/harshkawatra11/archdecision.git
cd archdecision
npm install
cp .env.example .env      # paste your Gemini key into LLM_API_KEY
npm run dev               # web on :5173, API on :3001 (Vite proxies /api)
```

You'll know the key was picked up when the API log prints `LLM_API_KEY detected ✓`.

```dotenv
LLM_API_KEY=your_gemini_key_here
LLM_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai
LLM_MODEL=gemini-2.5-flash
GITHUB_TOKEN=          # optional — raises GitHub limit from 60/hr to 5000/hr
```

| Command | What it does |
| :--- | :--- |
| `npm run dev` | Run frontend + API together (hot reload). |
| `npm run build` | Type-check and build the production frontend to `dist/`. |
| `npm run typecheck` | Type-check without emitting. |
| `npm run preview` | Preview the production build. |

</details>

<details>
<summary><b>📡 API Reference</b></summary>

<br/>

| Endpoint | Purpose |
| :--- | :--- |
| `POST /api/analyze` | Ingestion + ADR generation. SSE pipeline stages, then the result. |
| `POST /api/ask` | Grounded Q&A over the analyzed repo. SSE tokens + a sources frame. |
| `POST /api/onboarding` | Generate the onboarding doc. SSE Markdown. |
| `POST /api/pr-review` | Check a PR diff against the ADRs → structured findings. |
| `POST /api/drift` | Map drift between the ADRs and the repo's current structure. |
| `GET /api/health` | Uptime + whether the LLM is configured. |

</details>

<details>
<summary><b>📁 Project Structure & Deploy</b></summary>

<br/>

```
api/                serverless functions + _lib/ (github, ingest, profile, llm, prompts, schema, cache)
server/dev.ts       local Express harness that mounts the same handlers
src/                React SPA — components/, hooks/, lib/ (api client, markdown, download)
vercel.json         build + functions + SPA rewrite config
```

**Deploy your own to Vercel:** import the repo on [Vercel](https://vercel.com/new) (Vite preset + `vercel.json` pre-configured), set `LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL` (and optional `GITHUB_TOKEN`), deploy. The `/api/*` files become serverless functions automatically. Verify with `GET /api/health` → `{ "ok": true, ... }`.

</details>

---

## <img src="https://img.shields.io/badge/-Notes%20&%20Honesty-1E1B4B?style=flat-square" height="22"/> &nbsp; Notes & Honesty

ADRs are **inferred** and labelled with a confidence level — a draft a human confirms, which is exactly how ADRs should be written anyway. Grounding every claim in concrete evidence makes the output auditable rather than authoritative.

---

## License

MIT — see [LICENSE](./LICENSE).

<div align="center">
<sub>Institutional memory your codebase never had.</sub>

<img width="100%" src="https://capsule-render.vercel.app/api?type=waving&color=0:A855F7,50:7C3AED,100:4F46E5&height=120&section=footer" />
</div>
