# ArchDecision - Research Library feature + deck roadmap line

## Context
ArchDecision's core (analyze, ADRs, Ask, onboarding, PR review, drift) is complete and working.
The user wants a forward-looking companion feature that signals where the product is going: a
"Research" button in the header, beside GitHub, that opens a polished, searchable in-app library of
AI/ML whitepapers and official documentation (OpenAI, Anthropic, Google DeepMind, NVIDIA, Meta,
Mistral, and others), accessed like a reference hub. It should also be reflected in the chosen pitch
deck (`public/pitch-deck.html`) as a roadmap item, without adding an eighth slide.

Locked decisions: full-screen overlay (the SPA is router-free, so no routing dependency); the button
reads "Research" and the hub is titled "Research Library"; the deck mention is a compact roadmap line
on the Solution slide. Hard rule: only real, verifiable links (canonical arXiv abstract pages and
official company research/docs pages). No fabricated entries (e.g. no "neomon 3 Ultra").

## New file 1: `src/lib/library.ts` (typed catalog, mirrors the `EXAMPLE_REPOS` pattern)
- Types + constants:
  ```ts
  export interface Paper { title: string; org: string; year: number; topics: string[]; url: string; blurb: string; }
  export const ORGS: string[]   // OpenAI, Anthropic, Google DeepMind, NVIDIA, Meta AI, Mistral AI, Microsoft, Hugging Face, Academic
  export const TOPICS: string[] // Agents, Reasoning, LLMs, SLMs, Multimodal, Training & Scaling, Alignment & Safety, Retrieval, Systems & Efficiency, Documentation
  export const LIBRARY: Paper[]
  ```
- Seed ~30 real, canonical entries (arXiv `abs/` pages + official doc/research hubs). Representative set
  (all well-known, stable URLs): Attention Is All You Need (1706.03762), GPT-3 (2005.14165),
  InstructGPT (2203.02155), GPT-4 Technical Report (2303.08774), Constitutional AI (2212.08073),
  Chain-of-Thought (2201.11903), ReAct (2210.03629), Toolformer (2302.04761), LLaMA (2302.13971),
  Llama 2 (2307.09288), Llama 3 (2407.21783), Mistral 7B (2310.06825), Mixtral (2401.04088),
  RAG (2005.11401), LoRA (2106.09685), Chinchilla (2203.15556), PaLM (2204.02311),
  Gemini report (2312.11805), Whisper (2212.04356), DPO (2305.18290), Switch Transformers (2101.03961),
  Self-Consistency (2203.11171), Tree of Thoughts (2305.10601), FlashAttention (2205.14135),
  Scaling Laws (2001.08361), Phi/"Textbooks Are All You Need" (2306.11644), DistilBERT (1910.01108);
  plus official docs hubs: Anthropic docs (docs.anthropic.com), OpenAI docs (platform.openai.com/docs),
  Google DeepMind publications (deepmind.google/research/publications), NVIDIA technical blog
  (developer.nvidia.com/blog), Hugging Face Papers (huggingface.co/papers).
- During implementation, sanity-check each URL with WebFetch before committing the list; drop or fix any
  that do not resolve. Keep `topics`/`org` values drawn from the `TOPICS`/`ORGS` constants so filters stay consistent.

## New file 2: `src/components/ResearchLibrary.tsx` (trigger button + overlay)
- Self-contained: owns its own `open` state, so `Header` just renders `<ResearchLibrary />`.
- Trigger `<button>` styled to match the GitHub link in [Header.tsx:33](src/components/Header.tsx#L33)
  (same border/bg/padding/text classes) with a `BookOpen` (lucide-react) icon + "Research". Carries
  `data-anim` so it joins the existing GSAP header stagger.
- Overlay: `framer-motion` `AnimatePresence` (already a dependency, used in
  [AskPanel.tsx](src/components/AskPanel.tsx)). Fixed `inset-0`, dark backdrop (click to close),
  centered panel `max-w-5xl` ~`80vh`, dark theme tokens reused (`bg-ink-900/950`, `border-white/10`,
  `text-slate-*`, `accent`). `role="dialog"` `aria-modal`.
- Panel contents:
  - Header row: "Research Library" title + one-line subtitle + close (X) button.
  - Search `<input>` filtering by title/org/topic/blurb (case-insensitive), autofocused on open.
  - Filter chips: an "All" chip plus the `ORGS` (and/or `TOPICS`) list; single active filter; mirror the
    chip styling from `EXAMPLE_REPOS` rendering in [InputZone.tsx:78](src/components/InputZone.tsx#L78).
  - Results: responsive card grid. Each card = title, `org · year`, blurb, topic tag pills, and an
    external-link affordance; whole card is an `<a target="_blank" rel="noreferrer noopener">`.
  - Empty state when nothing matches the query/filter.
- Interactions: `Esc` closes (keydown listener while open), backdrop click closes, body scroll locked
  while open. Reuse the keyboard-handling shape already in
  [ResultsView.tsx](src/components/ResultsView.tsx) (esc-to-close pattern) for consistency.

## Modified file: `src/components/Header.tsx`
- Wrap the right side in a `flex items-center gap-2` container and render `<ResearchLibrary />`
  immediately BEFORE the existing GitHub `<a>`. No other change; GSAP stagger still applies via `data-anim`.

## Modified file: `public/pitch-deck.html` (Solution slide, no new slide)
- Keep the existing scalability/usability footnote (it is a template-required sub-point). Append a
  compact second line in the same `.foot-note` block: a "What's next" roadmap line, e.g. "What's next:
  an in-app Research Library, a curated, searchable hub of AI/ML whitepapers and official docs (OpenAI,
  Anthropic, Google, NVIDIA), one click from the header." Use a small green label for "What's next".
- Slightly tighten the scalability sentence if needed so the slide still fits exactly one printed page.
- No em-dashes, no hype words (project deck rules). Verify the deck still renders to exactly 7 pages.

## Out of scope
- No backend/API changes (purely client + static data). No router dependency. README untouched unless
  the user asks. The catalog is static and easy to extend later (the "continuously updated" framing is
  product narrative, not a live feed in this pass).

## Verification
1. `npm run typecheck` passes.
2. `npm run dev`; on `http://localhost:5173` the header shows "Research" left of "GitHub"; both animate
   in via GSAP.
3. Click "Research": overlay opens, search box focused. Typing filters cards; clicking an org/topic chip
   filters; "All" resets. A card opens the correct external page in a new tab. `Esc` and backdrop click
   both close; background does not scroll while open.
4. Spot-check 5-6 links resolve to the right paper/doc (done during build via WebFetch).
5. Headless-print `public/pitch-deck.html` to PDF: confirm still exactly 7 pages (`/Count 7`), the
   roadmap line is present on the Solution slide, and `grep` shows 0 em-dashes.
