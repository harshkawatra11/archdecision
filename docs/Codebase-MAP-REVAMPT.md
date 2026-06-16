# ArchDecision - Codebase Map revamp (clarity, real data, fullscreen)

## Context
The map works but has three problems a recruiter would catch: (1) it shows misleading data, language
nodes read "0% of the codebase" because tiny languages round to zero, and modules are bare names with
no real context; (2) on first view it is a dense ~60-node radial that is hard to read; (3) the expand
button only fits-to-view, it does not actually go fullscreen. This revamp makes every node trace to
real, accurate data, maximizes first-view understanding via progressive disclosure, gives each folder
complete grounded context, and wires a true fullscreen mode with no size limit.

Locked decisions: progressive disclosure (collapsed by default, drill in), grounded folder stats only
(no extra model call), real browser Fullscreen API, honest language percentages.

## 1. Real per-folder context (server, grounded, free)
The server still holds `profile.fileTree` (path/type/size) and strips it in `toLite`
([profile.ts:131](api/_lib/profile.ts#L131)). Compute folder facts there.
- `api/_lib/schema.ts`: add `FolderInfo { name; fileCount; sizeKB; subdirs: string[]; topExtensions: string[] }`
  and `folders: FolderInfo[]` on `RepoProfileLite`. Mirror both in `src/types.ts`.
- `api/_lib/profile.ts`: add `computeFolders(nodes, topLevelDirs)` returning, per top-level dir: file
  count and KB (files whose path starts with `dir/`), immediate `subdirs` (cap ~6), and `topExtensions`
  (top ~3 by count). Include in `toLite`. Compute for ALL top-level dirs so detail is always available.

## 2. Honest languages (no "0%")
- In `src/lib/graph.ts` language-branch build: compute each language's share from bytes, keep only
  languages >= 1% (drops trivial noise), and set the note to the real percent (one decimal if < 10%,
  never "0%"). Skip the Languages branch entirely if none qualify.

## 3. Progressive disclosure (the readability fix)
- `src/lib/graph.ts`: keep `buildGraph` producing the full graph, but attach each module node's
  `FolderInfo` (matched by name) and replace `radialLayout` with `layoutVisible(graph, expanded, dims)`:
  - Visible set = repo + all area branches + decisions of expanded areas + evidence of expanded decisions.
  - Area arc weight = expanded ? its visible subtree size : 1, so expanding a branch grows it and the
    others reflow. Lay out only visible nodes on the three rings (areas, decisions, evidence).
  - Return the visible nodes + the links among them, plus a per-node `expandable`/`childCount` hint.
- `src/components/CodebaseMap.tsx`:
  - `expanded: Set<string>` state (area + decision ids), empty by default -> first view is just the
    repo and its labeled architecture branches with counts. Clean and uncrowded on any repo size.
  - Click an **area** toggles its decisions; click a **decision** toggles its evidence; click anything
    selects it for the detail panel. A small +/- glyph (and the count) marks expandable, collapsed nodes.
  - Recompute layout via `useMemo` keyed on `[sha, expandedKey]`; reflow is instant.
  - Toolbar gains **Expand all / Collapse all**; the bottom branch legend stays and a legend click
    expands+focuses that branch.
  - Decision/evidence labels show when their branch is expanded or on hover (no global clutter).

## 4. Real fullscreen + no size limit
- `src/components/CodebaseMap.tsx`: container ref + Fullscreen API. A dedicated button (lucide
  `Expand`/`Shrink`, separate from the existing fit-to-view) calls `container.requestFullscreen()` /
  `document.exitFullscreen()`; a `fullscreenchange` listener syncs the icon and re-fits.
- Container height grows from the fixed 680px to ~`72vh` normally and `100vh` in fullscreen; the SVG is
  width/height 100% so it scales. The virtual canvas stays large and fit-to-view handles framing, so
  the map is "as big as it wants" and fills the screen in fullscreen.

## 5. Richer, accurate detail panel
- Module nodes: show grounded folder context, e.g. "142 files · 38 KB · subfolders: routing,
  dependencies, … · mostly .py, .pyi". Language nodes: the corrected percent. Decisions/evidence keep
  their existing plain-English detail. Raise the module-node cap from 8 to ~14 (progressive disclosure
  keeps it readable) so folder coverage is closer to complete.

## Out of scope
- No new model call, no new runtime dependency. Evidence refs remain the model's cited grounding
  (validating each ref against the full tree is a possible later pass, not this one). PR/Drift/Ask/
  Onboarding/Decisions tabs untouched. Deck untouched (the map is already listed there).

## Verification
1. `npm run typecheck` passes.
2. `npm run dev`; analyze fastapi. First view is clean: repo + labeled branches with counts, no
   crowding. No language node shows "0%".
3. Click a branch -> its decisions appear and the layout reflows; click a decision -> its evidence
   appears; Expand all / Collapse all work.
4. Click a module -> detail shows real file count, subfolders, and dominant file types matching the
   actual repo. Click a language -> a real, non-zero percent.
5. Click the fullscreen button -> the map enters true browser fullscreen and fills the screen; exit
   restores it. Resize stays readable.
6. Try a large multi-service repo and a tiny repo; both read clearly.
