import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ChevronDown, KeyRound, Loader2, ShieldCheck } from 'lucide-react';
import { EXAMPLE_REPOS } from '../lib/constants';

interface Props {
  onAnalyze: (repoUrl: string, pat: string) => void;
  busy: boolean;
}

export default function InputZone({ onAnalyze, busy }: Props) {
  const [url, setUrl] = useState('');
  const [pat, setPat] = useState('');
  const [showPat, setShowPat] = useState(false);

  const submit = () => {
    if (!url.trim() || busy) return;
    onAnalyze(url.trim(), pat.trim());
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="relative mx-auto w-full max-w-2xl text-center"
    >

      <div className="relative">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </span>
          Context on arrival
        </div>

        <h1 className="font-display font-semibold tracking-[-0.03em] text-slate-100">
          <span className="block whitespace-nowrap text-[1.95rem] leading-[1.15] sm:text-[2.9rem]">New Repository. No Context.</span>
          <span className="block pb-1 text-[2.3rem] leading-[1.2] text-emerald-400 sm:text-[3.5rem]">
            Not Anymore.
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-md text-pretty text-[15px] leading-[1.65] text-slate-400">
          ArchDecision reconstructs the architectural decisions inside any codebase, so your first
          day is spent contributing, not guessing how it all fits together.
        </p>

        <div className="mt-10">
          {/* Command box */}
          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-ink-900/90 p-2 pl-4 shadow-card transition focus-within:border-white/25">
            <span className="select-none font-mono text-sm text-slate-600">github.com/</span>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              placeholder="owner/repo — or paste a full URL"
              autoFocus
              spellCheck={false}
              className="min-w-0 flex-1 bg-transparent py-2.5 font-mono text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none"
            />
            <kbd className="hidden select-none rounded-md border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[10px] text-slate-600 sm:block">
              ↵
            </kbd>
            <button
              onClick={submit}
              disabled={busy || !url.trim()}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white transition enabled:hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              {busy ? 'Analyzing' : 'Analyze'}
            </button>
          </div>

          {/* Example repos */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs">
            <span className="text-slate-600">Try</span>
            {EXAMPLE_REPOS.map((r) => (
              <button
                key={r.url}
                disabled={busy}
                title={r.note}
                onClick={() => {
                  setUrl(r.url);
                  onAnalyze(r.url, pat.trim());
                }}
                className="rounded-lg border border-white/[0.08] bg-white/[0.02] px-2.5 py-1.5 font-mono text-slate-400 transition hover:border-white/20 hover:bg-white/[0.05] hover:text-slate-200 disabled:opacity-40"
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* PAT */}
          <div className="mt-5 flex flex-col items-center">
            <button
              onClick={() => setShowPat((s) => !s)}
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 transition hover:text-slate-300"
            >
              <KeyRound className="h-3.5 w-3.5" />
              Private repo or hitting limits? Add a token
              <ChevronDown className={`h-3.5 w-3.5 transition ${showPat ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence initial={false}>
              {showPat && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="w-full max-w-md overflow-hidden"
                >
                  <input
                    type="password"
                    value={pat}
                    onChange={(e) => setPat(e.target.value)}
                    placeholder="ghp_… GitHub personal access token"
                    className="mt-3 w-full rounded-xl border border-white/10 bg-ink-900 px-3.5 py-2.5 font-mono text-sm text-slate-200 placeholder:text-slate-600 focus:border-accent/40 focus:outline-none"
                  />
                  <p className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-slate-600">
                    <ShieldCheck className="h-3 w-3" />
                    Used only for this request — never logged, never stored.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
