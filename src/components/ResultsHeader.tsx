import { motion } from 'framer-motion';
import { AlertTriangle, Boxes, Database, Download, GitCommitHorizontal, Github, Layers } from 'lucide-react';
import type { ADR, RepoProfileLite } from '../types';
import { bundleMarkdown } from '../lib/markdown';
import { downloadText } from '../lib/download';

interface Props {
  profile: RepoProfileLite;
  adrs: ADR[];
  onboardingDoc: string | null;
  onReset: () => void;
}

export default function ResultsHeader({ profile, adrs, onboardingDoc, onReset }: Props) {
  const langs = Object.keys(profile.languages).slice(0, 4);
  const s = profile.structureSummary;

  const downloadAll = () =>
    downloadText(`archdecision-${profile.repo}.md`, bundleMarkdown(profile, adrs, onboardingDoc));

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="card mx-auto w-full max-w-3xl p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Github className="h-4 w-4 text-slate-500" />
            <a
              href={`https://github.com/${profile.owner}/${profile.repo}`}
              target="_blank"
              rel="noreferrer noopener"
              className="truncate font-mono text-sm font-medium text-slate-100 hover:text-accent-soft"
            >
              {profile.owner}/{profile.repo}
            </a>
          </div>
          {profile.description && <p className="mt-1.5 max-w-xl text-sm text-slate-400">{profile.description}</p>}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500">
            <Fact icon={<GitCommitHorizontal className="h-3.5 w-3.5" />}>{profile.sha.slice(0, 8)}</Fact>
            {langs.length > 0 && <Fact icon={<Layers className="h-3.5 w-3.5" />}>{langs.join(', ')}</Fact>}
            <Fact icon={<Database className="h-3.5 w-3.5" />}>{profile.stats.totalFiles} files</Fact>
            {s.serviceCount >= 2 && <Fact icon={<Boxes className="h-3.5 w-3.5" />}>{s.serviceCount} services</Fact>}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={downloadAll}
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-accent-soft"
          >
            <Download className="h-4 w-4" />
            Download all
          </button>
          <button
            onClick={onReset}
            className="rounded-xl border border-white/10 px-3.5 py-2 text-sm text-slate-300 transition hover:border-accent/40"
          >
            New analysis
          </button>
        </div>
      </div>

      {(profile.stats.truncated || profile.isMonorepo) && (
        <div className="mt-4 flex flex-col gap-2">
          {profile.isMonorepo && (
            <Banner>
              Looks like a <strong>monorepo</strong> ({s.serviceCount} sub-projects with their own manifests). ADRs
              describe the top-level architecture.
            </Banner>
          )}
          {profile.stats.truncated && (
            <Banner>
              This repo is large — analysis was <strong>truncated</strong> to a budget. Confidence may be lower where
              signal was incomplete.
            </Banner>
          )}
        </div>
      )}
    </motion.div>
  );
}

function Fact({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-mono">
      {icon}
      {children}
    </span>
  );
}

function Banner({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-amber-400/20 bg-amber-400/5 px-3 py-2 text-xs text-amber-200/90">
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
      <span>{children}</span>
    </div>
  );
}
