import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BookOpen, Search, Sparkles, X } from 'lucide-react';
import { ORGS, PREVIEW, TOPICS } from '../lib/library';

// The Research Library: a curated, searchable hub of AI/ML whitepapers and official docs.
// Currently a polished "coming soon" preview (see src/lib/library.ts).
export default function ResearchLibrary() {
  const [open, setOpen] = useState(false);

  // Esc to close + lock background scroll while the overlay is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <button
        data-anim
        onClick={() => setOpen(true)}
        className="group inline-flex items-center gap-2 rounded-md border border-[rgba(240,246,252,0.1)] bg-[#21262d] px-3 py-1.5 text-[13px] font-semibold text-slate-100 shadow-sm transition hover:border-[rgba(240,246,252,0.2)] hover:bg-[#30363d]"
      >
        <BookOpen className="h-4 w-4 text-slate-300 transition group-hover:text-white" strokeWidth={2.1} />
        Research
        <span className="rounded-full bg-emerald-400/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-300">
          Soon
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[100] grid place-items-center p-4 sm:p-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* backdrop */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setOpen(false)} />

            {/* panel */}
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Research Library"
              initial={{ opacity: 0, y: 14, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.99 }}
              transition={{ duration: 0.24, ease: [0.2, 0.7, 0.2, 1] }}
              className="relative flex max-h-[84vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-ink-950 shadow-card"
            >
              {/* header */}
              <div className="flex items-start gap-3 border-b border-white/[0.07] px-6 py-5">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-400/10 ring-1 ring-emerald-400/20">
                  <BookOpen className="h-5 w-5 text-emerald-300" strokeWidth={2} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2.5">
                    <h2 className="font-display text-lg font-semibold tracking-tight text-slate-100">Research Library</h2>
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                      <Sparkles className="h-3 w-3" /> Coming soon
                    </span>
                  </div>
                  <p className="mt-1 text-[13px] leading-relaxed text-slate-400">
                    A curated, searchable hub of papers and official docs across computer science, from networking,
                    databases, and operating systems to distributed systems, security, agentic AI, LLMs, and SLMs.
                    Not limited to AI and ML.
                  </p>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-white/[0.06] hover:text-slate-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* scrollable body */}
              <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
                {/* disabled search */}
                <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-ink-900/70 px-3.5 py-2.5">
                  <Search className="h-4 w-4 text-slate-600" />
                  <input
                    disabled
                    placeholder="Search whitepapers and docs… (available at launch)"
                    className="min-w-0 flex-1 cursor-not-allowed bg-transparent text-sm text-slate-300 placeholder:text-slate-600 focus:outline-none"
                  />
                </div>

                {/* sources */}
                <div className="mt-6">
                  <p className="mb-2.5 font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500">Sources</p>
                  <div className="flex flex-wrap gap-2">
                    {ORGS.map((o) => (
                      <span
                        key={o}
                        className="rounded-lg border border-white/[0.08] bg-white/[0.02] px-2.5 py-1.5 text-xs font-medium text-slate-300"
                      >
                        {o}
                      </span>
                    ))}
                  </div>
                </div>

                {/* topics */}
                <div className="mt-5">
                  <p className="mb-2.5 font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500">Topics</p>
                  <div className="flex flex-wrap gap-2">
                    {TOPICS.map((t) => (
                      <span
                        key={t}
                        className="rounded-full border border-white/[0.06] bg-white/[0.02] px-2.5 py-1 text-xs text-slate-400"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                {/* preview cards */}
                <div className="mt-6">
                  <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500">
                    A taste of what is coming
                  </p>
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                    {PREVIEW.map((p) => (
                      <div
                        key={p.title}
                        className="group rounded-xl border border-white/[0.07] bg-ink-900/50 p-3.5 transition hover:border-white/15 hover:bg-ink-900"
                      >
                        <p className="text-[13.5px] font-semibold leading-snug text-slate-200">{p.title}</p>
                        <p className="mt-1.5 font-mono text-[11px] text-slate-500">
                          {p.org} · {p.year}
                        </p>
                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                          {p.topics.map((t) => (
                            <span
                              key={t}
                              className="rounded-md bg-white/[0.04] px-1.5 py-0.5 text-[10px] font-medium text-slate-400"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* footer */}
              <div className="border-t border-white/[0.07] px-6 py-3.5">
                <p className="text-center text-[12px] text-slate-500">
                  Direct links to each paper and doc are being added. The library updates as new releases ship.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
