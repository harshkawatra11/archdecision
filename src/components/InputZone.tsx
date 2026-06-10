import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ChevronDown, KeyRound, Loader2, ShieldCheck, Sparkles } from 'lucide-react';
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
      className="mx-auto w-full max-w-2xl text-center"
    >
      <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-3 py-1 text-xs font-medium text-accent-soft">
        <Sparkles className="h-3.5 w-3.5" />
        Grounded in your code — never a confident hallucination
      </div>
      <h2 className="text-balance text-4xl font-semibold tracking-tight text-slate-100 sm:text-5xl">
        The AI that explains <span className="text-accent-soft">why</span> your codebase
        <br className="hidden sm:block" /> is the way it is
      </h2>
      <p className="mx-auto mt-4 max-w-xl text-pretty text-slate-400">
        Paste a GitHub repo. In ~60 seconds, get grounded Architecture Decision Records, a codebase
        you can question in plain English, and a one-click onboarding doc.
      </p>

      <div className="mt-8">
        <div className="card flex items-center gap-2 p-2 pl-4 focus-within:shadow-glow transition-shadow">
          <span className="select-none font-mono text-sm text-slate-600">github.com/</span>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="owner/repo  — or paste a full URL"
            autoFocus
            spellCheck={false}
            className="min-w-0 flex-1 bg-transparent py-2.5 font-mono text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none"
          />
          <button
            onClick={submit}
            disabled={busy || !url.trim()}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white transition enabled:hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            {busy ? 'Analyzing' : 'Analyze'}
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs">
          <span className="text-slate-600">Try:</span>
          {EXAMPLE_REPOS.map((r) => (
            <button
              key={r.url}
              disabled={busy}
              onClick={() => {
                setUrl(r.url);
                onAnalyze(r.url, pat.trim());
              }}
              className="rounded-full border border-white/10 px-2.5 py-1 font-mono text-slate-400 transition hover:border-accent/40 hover:text-accent-soft disabled:opacity-40"
            >
              {r.label}
            </button>
          ))}
        </div>

        <div className="mt-4 text-left">
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
                className="overflow-hidden"
              >
                <input
                  type="password"
                  value={pat}
                  onChange={(e) => setPat(e.target.value)}
                  placeholder="ghp_… GitHub personal access token"
                  className="mt-2 w-full rounded-xl border border-white/10 bg-ink-900 px-3 py-2 font-mono text-sm text-slate-200 placeholder:text-slate-600 focus:border-accent/40 focus:outline-none"
                />
                <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-600">
                  <ShieldCheck className="h-3 w-3" />
                  Used only for this request — never logged, never stored.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.section>
  );
}
