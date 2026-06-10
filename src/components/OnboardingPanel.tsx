import { useState } from 'react';
import { BookOpen, Download, Loader2, RefreshCw } from 'lucide-react';
import type { ADR, RepoProfileLite } from '../types';
import { onboarding } from '../lib/api';
import { downloadText } from '../lib/download';
import Markdown from './Markdown';

interface Props {
  profile: RepoProfileLite;
  adrs: ADR[];
  pat: string;
  doc: string;
  setDoc: React.Dispatch<React.SetStateAction<string>>;
}

export default function OnboardingPanel({ profile, adrs, pat, doc, setDoc }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setBusy(true);
    setError(null);
    setDoc('');
    await onboarding(
      { repoUrl: `${profile.owner}/${profile.repo}`, sha: profile.sha, adrs, pat: pat || undefined },
      {
        onToken: (t) => setDoc((prev) => prev + t),
        onError: (msg) => setError(msg),
      },
    );
    setBusy(false);
  };

  if (!doc && !busy) {
    return (
      <div className="grid place-items-center py-10 text-center">
        <BookOpen className="mb-3 h-8 w-8 text-slate-700" />
        <p className="mb-4 max-w-md text-sm text-slate-400">
          The day-one doc every team needs and never writes — generated from this repo, grounded and
          downloadable.
        </p>
        {error && <p className="mb-3 text-sm text-amber-400">⚠️ {error}</p>}
        <button
          onClick={generate}
          className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-soft"
        >
          <BookOpen className="h-4 w-4" />
          Generate onboarding doc
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-end gap-2">
        <button
          onClick={generate}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-300 transition hover:border-accent/40 disabled:opacity-40"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Regenerate
        </button>
        <button
          onClick={() => downloadText(`ONBOARDING-${profile.repo}.md`, doc)}
          disabled={!doc || busy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-300 transition hover:border-accent/40 disabled:opacity-40"
        >
          <Download className="h-3.5 w-3.5" />
          Download .md
        </button>
      </div>
      {error && <p className="mb-3 text-sm text-amber-400">⚠️ {error}</p>}
      <div className={busy ? 'caret' : ''}>
        <Markdown>{doc}</Markdown>
      </div>
    </div>
  );
}
