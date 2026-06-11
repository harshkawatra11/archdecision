# ArchDecision — Development Plan

## Context

ArchDecision is a web app for the Microsoft Build AI Hackathon 2026 that reads any
public GitHub repo and reverse-engineers the architectural decisions baked into it,
producing: (A) grounded Architecture Decision Records, (B) a "Ask Your Codebase"
grounded chat, and (C) a one-click onboarding doc. The build target is a solo dev over 5 days on entirely free infrastructure, optimized for a 4-minute live
demo. This plan turns [ArchDecision_PRD.txt](ArchDecision_PRD.txt) into an executable
build. The directory is currently greenfield (only the PRD exists).

**Decisions locked with the user:**
- **Host:** Vercel (static frontend + serverless functions on one free deploy).
- **LLM:** Gemini 2.5 Flash (free tier, 1M context, native JSON mode). Key lives only
  in serverless env vars — never in the client bundle.
- **Scope:** Full 5-day plan, build core (Features A/B/C) first; stretch (D/E) gated.

**Guiding principles** (resolve all ambiguity): Grounded-or-silent · Zero setup to first
value · Artifacts not just answers · Honest confidence labels · Fast perceived speed
(stream + visible pipeline).

---

## Tech Stack

- **Frontend:** React + Vite + TypeScript + Tailwind. `react-markdown` for ADR/doc
  rendering. SSE/`ReadableStream` for streaming.
- **Backend:** Vercel serverless functions (Node.js + TypeScript) under `/api`.
- **External:** GitHub REST API (plain `fetch`, no SDK) · Gemini 2.5 Flash (`@google/genai`).
- **No DB, no auth, no paid services.** Optional in-memory profile cache keyed by
  `${owner}/${repo}@${sha}` (best-effort; rebuilds on cold function).

## Project Structure

```
/api
  analyze.ts        # POST /api/analyze  — ingestion + ADR generation (SSE stages)
  ask.ts            # POST /api/ask      — grounded Q&A (SSE)
  onboarding.ts     # POST /api/onboarding (SSE Markdown)
  pr-review.ts      # POST /api/pr-review (stretch)
  health.ts         # GET  /api/health
  _lib/
    github.ts       # URL parse, metadata, tree, contents, rate-limit handling
    ingest.ts       # signal-file selection, manifest parsing, RepoProfile assembly
    profile.ts      # RepoProfile + structureSummary builders, token budgeting
    llm.ts          # thin Gemini wrapper (generate, JSON mode, stream) — swappable
    prompts.ts      # system/user prompts for ADR, ask, onboarding, pr-review
    schema.ts       # shared TS types + JSON schema + validators (Section 11)
/src
  App.tsx, components/ (InputZone, PipelineStepper, AdrCard, AskPanel,
    OnboardingPanel, ExportBar), lib/api.ts (SSE client), types.ts
```

Shared types (`schema.ts` mirrored into `src/types.ts`) come straight from PRD §11:
`RepoProfile`, `FileNode`, `ManifestFile`, `SignalFile`, `ADR`, `Evidence`,
`AskRequest/Response`, `OnboardingDoc`, `PRReview`.

---

## Day-by-Day Build

### Day 1 — Foundations + ingestion (riskiest; front-load)
- Scaffold Vite + React + TS + Tailwind; init `/api` functions; deploy a "hello"
  to Vercel **today** to de-risk deployment. Set `GEMINI_API_KEY` in Vercel env.
- `_lib/github.ts`: parse URL forms (`https://github.com/o/r[.git]`, `github.com/o/r`,
  `o/r`); `GET /repos/{o}/{r}` (default branch, sha, description, visibility);
  `GET /git/trees/{branch}?recursive=1` (whole tree, one call; honor GitHub `truncated`).
  Read `X-RateLimit-Remaining`; accept optional PAT per-request (never log/cache).
- `_lib/ingest.ts`: signal-file selection by tiers (PRD §13.4 / §25.2) —
  T1 manifests, T2 infra/CI, T3 README + `/docs/adr|architecture`, T4 sampled entry
  points; stop at token budget. Fetch contents via `contents/{path}?ref={sha}`,
  base64-decode, truncate ~8k chars/file, limited concurrency.
- `_lib/profile.ts`: parse manifests → direct deps; compute `structureSummary`
  (topLevelDirs, serviceCount = dirs with own manifest, hasDocker, hasCI, testDirs,
  largestFiles); assemble `RepoProfile`; budget-check (drop T4, then truncate T3,
  set `truncated=true`).
- **Exit:** `POST /api/analyze` returns a correct `RepoProfile` JSON; eyeballed on
  3 canonical repos (small/clean, large/messy, non-JS Python/Go).

### Day 2 — Feature A: ADR generation end-to-end
- `_lib/llm.ts` + `_lib/prompts.ts`: ADR system prompt (architectural-autopsy,
  grounded, confidence-labeled — PRD §14.2) + JSON mode against ADR schema; one
  schema-repair retry on validation failure; low temperature.
- `analyze.ts`: SSE stage events (`fetching → structure → signals → inferring → done`)
  then final payload `{ profileLite, adrs[], sha }`. Confidence rubric per §25.3.
- Frontend: InputZone (URL + collapsible PAT note "used only this request, never
  stored" + "Try an example"), PipelineStepper (5 stages), AdrCard (collapsible:
  id/title/confidence badge → context, decision, rationale, alternatives,
  consequences, **Evidence**).
- **Exit:** paste URL → 5–8 grounded ADRs render in <60s on all 3 test repos.

### Day 3 — Feature B (Ask) + Feature C (Onboarding)
- `ask.ts`: heuristic retrieval v1 (keyword/path match vs file paths + dep list;
  always include manifests + README); token-budgeted; grounded prompt (cite sources,
  admit when code lacks the answer — §14.3); SSE answer tokens + trailing `sources[]`
  frame; keep last 3 turns of history.
- Frontend AskPanel: chat list + input, Markdown answers, source chips linking to
  the file on GitHub. Handle off-topic / unanswerable / retrieval-miss gracefully.
- `onboarding.ts`: reuse cached profile + ADRs; single Gemini call → structured
  Markdown with the exact section list (§7.3); run instructions grounded in
  scripts/Makefile/Dockerfile or honestly marked absent. SSE stream.
- **Exit:** a real question → grounded cited answer (first token <5s); one-click
  onboarding doc that is useful and repo-specific.

### Day 4 — Hardening + export + polish
- All edge cases (§18): bad URL, 404, private-no-PAT, empty repo (1 honest
  "insufficient signal" ADR — never error page), monorepo banner, truncated-tree
  banner, unknown stack (lower confidence), GitHub 5xx retry-once, Gemini malformed
  JSON repair-retry → readable error card, rate-limit → PAT suggestion. **No raw
  stack traces ever reach the user.**
- Export: "Download all" (concatenated Markdown of ADRs + onboarding) + per-ADR
  "Copy as Markdown" for PR-ing into `/docs/adr/`.
- Explicit states: empty / loading / success / partial / error / rate-limited.
  Visual polish, dark mode, no layout shift, Enter-to-submit.
- Optional: start **one** stretch feature (D PR-review or E drift map) only if
  core is rock-solid.
- **Exit:** a stranger can use it unaided.

### Day 5 — Demo prep + buffer (NO new features)
- Pick 1–2 demo repos; rehearse the 4-min script (§20) to muscle memory.
- Pre-warm cache; record 60-sec backup video; prep judge-question answers
  (competition, moat, accuracy, real-vs-inferred).
- Final deploy freeze; `/api/health` green smoke test.

---

## Key Implementation Notes
- **Grounding is the product.** The `RepoProfile` (tree + parsed deps + truncated
  signal files) is the compression + grounding layer passed as *structured* context,
  never raw concatenated files. Every ADR claim cites `Evidence[]`.
- **Streaming everywhere** for perceived speed; never a bare 60s spinner.
- **LLM layer behind a thin interface** so Gemini is swappable without touching features.
- **Token budget:** target <250k input tokens for analyze, far less for ask.
- **Security:** Gemini key server-side only (verify built bundle has no key); repo
  text treated as DATA not instructions (prompt-injection framing in system prompts).

## Verification
- Per-feature acceptance (§21.1): A → 5–8 ADRs <60s, each with non-empty
  context/decision/rationale + ≥1 evidence, valid Markdown download, works on all
  3 repos. B → grounded answer with ≥1 citation, streams, off-topic handled.
  C → repo-specific sectioned doc, run instructions grounded or marked absent.
- Failure-mode tests (§21.3): bad URL, 404, private-no-PAT, empty, rate-limit,
  malformed model JSON → each yields a friendly state, not a crash.
- End-to-end: deploy to Vercel, run each of the 3 canonical repos through
  analyze → ask → onboarding → download on the live URL.
- `GET /api/health` returns `{ ok: true, time }`.

## Out of Scope (do not build)
Accounts/auth/billing, multi-repo/org analysis, persistent history, real-time
collab, paid Azure services, mobile apps, fine-tuning. Stretch D/E only if core ships.
