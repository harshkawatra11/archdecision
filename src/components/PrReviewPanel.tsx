import { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, GitPullRequest, Info, Loader2, ShieldAlert } from 'lucide-react';
import type { ADR, PRFinding, PRReview, RepoProfileLite } from '../types';
import { prReview, ApiError } from '../lib/api';

interface Props {
  profile: RepoProfileLite;
  adrs: ADR[];
  pat: string;
}

const SEVERITY: Record<PRFinding['severity'], { icon: React.ReactNode; ring: string; text: string; label: string }> = {
  conflict: { icon: <ShieldAlert className="h-4 w-4" />, ring: 'ring-rose-400/30 bg-rose-500/5', text: 'text-rose-300', label: 'Conflict' },
  warning: { icon: <AlertTriangle className="h-4 w-4" />, ring: 'ring-amber-400/30 bg-amber-500/5', text: 'text-amber-300', label: 'Warning' },
  info: { icon: <Info className="h-4 w-4" />, ring: 'ring-sky-400/30 bg-sky-500/5', text: 'text-sky-300', label: 'Info' },
};

export default function PrReviewPanel({ profile, adrs, pat }: Props) {
  const [prUrl, setPrUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; hint?: string | null } | null>(null);
  const [review, setReview] = useState<PRReview | null>(null);

  const run = async () => {
    const url = prUrl.trim();
    if (!url || busy) return;
    setBusy(true);
    setError(null);
    setReview(null);
    try {
      const result = await prReview({ prUrl: url, adrs, pat: pat || undefined });
      setReview(result);
    } catch (e) {
      if (e instanceof ApiError) setError({ message: e.message, hint: e.hint });
      else setError({ message: 'Could not review that PR. Please try again.' });
    }
    setBusy(false);
  };

  return (
    <div>
      <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-ink-950/60 p-2 pl-4 focus-within:border-accent/40">
        <GitPullRequest className="h-4 w-4 shrink-0 text-slate-600" />
        <input
          value={prUrl}
          onChange={(e) => setPrUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && run()}
          placeholder={`https://github.com/${profile.owner}/${profile.repo}/pull/123`}
          className="flex-1 bg-transparent py-1.5 font-mono text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none"
        />
        <button
          onClick={run}
          disabled={busy || !prUrl.trim()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-sm font-medium text-white transition enabled:hover:bg-accent-soft disabled:opacity-40"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Review'}
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/5 p-4">
          <p className="text-sm font-medium text-rose-200">{error.message}</p>
          {error.hint && <p className="mt-1 text-xs text-rose-300/70">{error.hint}</p>}
        </div>
      )}

      {review && (
        <div className="mt-5 space-y-3">
          {review.truncated && (
            <p className="rounded-lg border border-amber-400/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-300">
              The diff was large and has been truncated — findings cover the analyzed portion.
            </p>
          )}
          {review.findings.length === 0 ? (
            <div className="flex items-center gap-3 rounded-xl border border-emerald-400/20 bg-emerald-500/5 p-4">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
              <p className="text-sm text-emerald-200">
                No architectural conflicts detected. This PR appears consistent with the recorded decisions.
              </p>
            </div>
          ) : (
            review.findings.map((f, i) => {
              const s = SEVERITY[f.severity] ?? SEVERITY.info;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`rounded-xl p-4 ring-1 ${s.ring}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${s.text}`}>
                      {s.icon}
                      {s.label}
                    </span>
                    {f.adrId && (
                      <span className="rounded-md bg-ink-800 px-2 py-0.5 font-mono text-[11px] text-slate-400">{f.adrId}</span>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-slate-200">{f.summary}</p>
                  {f.reviewerQuestion && (
                    <p className="mt-2 text-sm italic text-slate-400">“{f.reviewerQuestion}”</p>
                  )}
                  {f.diffRefs.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {f.diffRefs.map((d) => (
                        <span key={d} className="rounded-md bg-ink-800 px-2 py-1 font-mono text-[11px] text-slate-400">
                          {d}
                        </span>
                      ))}
                    </div>
                  )}
                </motion.div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
