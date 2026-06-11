import { useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, CheckCircle2, GitCompareArrows, Loader2, TrendingDown } from 'lucide-react';
import type { ADR, DriftFinding, DriftMap, RepoProfileLite } from '../types';
import { drift, ApiError } from '../lib/api';

interface Props {
  profile: RepoProfileLite;
  adrs: ADR[];
  pat: string;
}

const SEVERITY: Record<DriftFinding['severity'], { ring: string; text: string; label: string; icon: React.ReactNode }> = {
  major: { ring: 'ring-rose-400/30 bg-rose-500/5', text: 'text-rose-300', label: 'Major drift', icon: <TrendingDown className="h-4 w-4" /> },
  minor: { ring: 'ring-amber-400/30 bg-amber-500/5', text: 'text-amber-300', label: 'Minor drift', icon: <Activity className="h-4 w-4" /> },
  aligned: { ring: 'ring-emerald-400/30 bg-emerald-500/5', text: 'text-emerald-300', label: 'Aligned', icon: <CheckCircle2 className="h-4 w-4" /> },
};

const ORDER: DriftFinding['severity'][] = ['major', 'minor', 'aligned'];

export default function DriftPanel({ profile, adrs, pat }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; hint?: string | null } | null>(null);
  const [map, setMap] = useState<DriftMap | null>(null);

  const run = async () => {
    setBusy(true);
    setError(null);
    setMap(null);
    try {
      const result = await drift({
        repoUrl: `${profile.owner}/${profile.repo}`,
        sha: profile.sha,
        adrs,
        pat: pat || undefined,
      });
      setMap(result);
    } catch (e) {
      if (e instanceof ApiError) setError({ message: e.message, hint: e.hint });
      else setError({ message: 'Could not map drift. Please try again.' });
    }
    setBusy(false);
  };

  if (!map && !busy && !error) {
    return (
      <div className="grid place-items-center py-10 text-center">
        <GitCompareArrows className="mb-3 h-8 w-8 text-slate-700" />
        <p className="mb-4 max-w-md text-sm text-slate-400">
          Compares the {adrs.length} recorded decisions against the repo's current structural metrics and flags
          divergence — each finding grounded in evidence.
        </p>
        <button
          onClick={run}
          className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-soft"
        >
          <GitCompareArrows className="h-4 w-4" />
          Map the drift
        </button>
      </div>
    );
  }

  if (busy) {
    return (
      <div className="grid place-items-center py-12 text-center">
        <Loader2 className="mb-3 h-7 w-7 animate-spin text-slate-400" />
        <p className="text-sm text-slate-400">Comparing the decisions against the current structure…</p>
      </div>
    );
  }

  const findings = map ? [...map.findings].sort((a, b) => ORDER.indexOf(a.severity) - ORDER.indexOf(b.severity)) : [];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-100">Architecture vs. reality</h3>
        <button
          onClick={run}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-300 transition hover:border-white/25 disabled:opacity-40"
        >
          <GitCompareArrows className="h-3.5 w-3.5" />
          Re-map
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4">
          <p className="text-sm font-medium text-rose-200">{error.message}</p>
          {error.hint && <p className="mt-1 text-xs text-rose-300/70">{error.hint}</p>}
        </div>
      )}

      {map && (
        <div className="space-y-3">
          {map.summary && (
            <p className="rounded-xl border border-white/5 bg-ink-900/60 p-4 text-sm leading-relaxed text-slate-300">
              {map.summary}
            </p>
          )}
          {findings.map((f, i) => {
            const s = SEVERITY[f.severity] ?? SEVERITY.minor;
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
                <p className="mt-2 text-sm font-medium text-slate-100">{f.title}</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <Field label="Now" value={f.observation} />
                  <Field label="Intended" value={f.expectation} />
                </div>
                {f.recommendation && (
                  <p className="mt-3 border-t border-white/5 pt-3 text-sm text-slate-300">
                    <span className="font-semibold text-slate-200">Next step: </span>
                    {f.recommendation}
                  </p>
                )}
                {f.evidence.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {f.evidence.map((e) => (
                      <span key={e} className="rounded-md bg-ink-800 px-2 py-1 font-mono text-[11px] text-slate-400">
                        {e}
                      </span>
                    ))}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="rounded-lg bg-ink-900/60 p-3">
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-sm leading-relaxed text-slate-300">{value}</p>
    </div>
  );
}
