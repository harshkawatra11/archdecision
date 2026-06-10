import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  Boxes,
  Check,
  Copy,
  Database,
  Download,
  FileCode2,
  FileText,
  FlaskConical,
  FolderTree,
  GitBranch,
  GitCommitHorizontal,
  GitCompareArrows,
  GitPullRequest,
  Github,
  Layers,
  MessageSquareText,
  MonitorSmartphone,
  Network,
  RotateCcw,
  ScrollText,
  Server,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import type { ADR, Confidence, RepoProfileLite } from '../types';
import { CONFIDENCE_STYLES } from '../lib/constants';
import { adrToMarkdown, bundleMarkdown } from '../lib/markdown';
import { copyText, downloadText } from '../lib/download';
import AskPanel from './AskPanel';
import OnboardingPanel from './OnboardingPanel';
import PrReviewPanel from './PrReviewPanel';
import DriftPanel from './DriftPanel';

type Tab = 'adrs' | 'ask' | 'onboarding' | 'pr' | 'drift';

interface Props {
  profile: RepoProfileLite;
  adrs: ADR[];
  pat: string;
  onboardingDoc: string;
  setOnboardingDoc: React.Dispatch<React.SetStateAction<string>>;
  onReset: () => void;
}

const CATEGORY_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  datastore: Database,
  framework: Server,
  backend: Server,
  frontend: MonitorSmartphone,
  architecture: Boxes,
  auth: ShieldCheck,
  api: Network,
  caching: Zap,
  testing: FlaskConical,
  cicd: GitBranch,
  structure: FolderTree,
  general: FileText,
};

export default function ResultsView({ profile, adrs, pat, onboardingDoc, setOnboardingDoc, onReset }: Props) {
  const [tab, setTab] = useState<Tab>('adrs');

  const nav: { key: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: 'adrs', label: 'Decisions', icon: <ScrollText className="h-4 w-4" />, count: adrs.length },
    { key: 'ask', label: 'Ask the codebase', icon: <MessageSquareText className="h-4 w-4" /> },
    { key: 'onboarding', label: 'Onboarding doc', icon: <FileText className="h-4 w-4" /> },
    { key: 'pr', label: 'PR review', icon: <GitPullRequest className="h-4 w-4" /> },
    { key: 'drift', label: 'Drift map', icon: <GitCompareArrows className="h-4 w-4" /> },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <RepoBar profile={profile} adrs={adrs} onboardingDoc={onboardingDoc} onReset={onReset} />

      <div className="grid gap-6 lg:grid-cols-[232px_minmax(0,1fr)]">
        {/* Workspace navigation */}
        <aside className="self-start lg:sticky lg:top-6">
          <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-widest text-slate-600">Workspace</p>
          <nav className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
            {nav.map((it) => {
              const active = tab === it.key;
              return (
                <button
                  key={it.key}
                  onClick={() => setTab(it.key)}
                  className={`relative flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-medium transition lg:shrink ${
                    active ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-0 rounded-xl bg-accent/12 ring-1 ring-accent/25"
                      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-2.5">
                    {it.icon}
                    {it.label}
                    {it.count != null && (
                      <span
                        className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
                          active ? 'bg-accent/20 text-accent-soft' : 'bg-white/5 text-slate-500'
                        }`}
                      >
                        {it.count}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Active section */}
        <section className="min-w-0">
          <AnimatePresence mode="wait">
            {tab === 'adrs' && (
              <motion.div key="adrs" {...swap}>
                <Decisions profile={profile} adrs={adrs} />
              </motion.div>
            )}
            {tab === 'ask' && (
              <motion.div key="ask" {...swap} className="card p-5">
                <AskPanel profile={profile} pat={pat} />
              </motion.div>
            )}
            {tab === 'onboarding' && (
              <motion.div key="onboarding" {...swap} className="card p-6">
                <OnboardingPanel
                  profile={profile}
                  adrs={adrs}
                  pat={pat}
                  doc={onboardingDoc}
                  setDoc={setOnboardingDoc}
                />
              </motion.div>
            )}
            {tab === 'pr' && (
              <motion.div key="pr" {...swap} className="card p-6">
                <PrReviewPanel profile={profile} adrs={adrs} pat={pat} />
              </motion.div>
            )}
            {tab === 'drift' && (
              <motion.div key="drift" {...swap} className="card p-6">
                <DriftPanel profile={profile} adrs={adrs} pat={pat} />
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </div>
    </motion.div>
  );
}

const swap = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.22 },
};

// --- Slim repo bar ---------------------------------------------------------

function RepoBar({
  profile,
  adrs,
  onboardingDoc,
  onReset,
}: {
  profile: RepoProfileLite;
  adrs: ADR[];
  onboardingDoc: string;
  onReset: () => void;
}) {
  const langs = Object.keys(profile.languages).slice(0, 3);
  const s = profile.structureSummary;
  const downloadAll = () =>
    downloadText(`archdecision-${profile.repo}.md`, bundleMarkdown(profile, adrs, onboardingDoc || null));

  return (
    <div className="card px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <a
            href={`https://github.com/${profile.owner}/${profile.repo}`}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-2 font-mono text-sm font-medium text-slate-100 transition hover:text-accent-soft"
          >
            <Github className="h-4 w-4 text-slate-500" />
            {profile.owner}/{profile.repo}
          </a>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
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
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3.5 py-2 text-sm text-slate-300 transition hover:border-accent/40 hover:text-white"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            New
          </button>
        </div>
      </div>

      {(profile.isMonorepo || profile.stats.truncated) && (
        <div className="mt-3 flex flex-wrap gap-2 border-t border-white/5 pt-3">
          {profile.isMonorepo && (
            <Pill>
              Monorepo — {s.serviceCount} sub-projects; ADRs describe the top-level architecture.
            </Pill>
          )}
          {profile.stats.truncated && <Pill>Large repo — analysis truncated to a budget; confidence may be lower.</Pill>}
        </div>
      )}
    </div>
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

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/20 bg-amber-400/5 px-2.5 py-1 text-[11px] text-amber-200/90">
      <AlertTriangle className="h-3 w-3 shrink-0 text-amber-400" />
      {children}
    </span>
  );
}

// --- Decisions: master / detail -------------------------------------------

function Decisions({ profile, adrs }: { profile: RepoProfileLite; adrs: ADR[] }) {
  const [selected, setSelected] = useState(adrs[0]?.id ?? '');
  const active = adrs.find((a) => a.id === selected) ?? adrs[0];

  const breakdown = useMemo(() => {
    const acc: Record<Confidence, number> = { high: 0, medium: 0, low: 0 };
    adrs.forEach((a) => (acc[a.confidence] = (acc[a.confidence] ?? 0) + 1));
    return acc;
  }, [adrs]);

  if (!adrs.length || !active) {
    return (
      <div className="card grid place-items-center p-10 text-center text-sm text-slate-400">
        No decision records were produced for this repository.
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-[228px_minmax(0,1fr)]">
      {/* Index */}
      <div className="self-start md:sticky md:top-6">
        <div className="mb-2 flex items-center gap-2 px-1 text-[11px] text-slate-500">
          <span className="font-semibold uppercase tracking-widest">{adrs.length} decisions</span>
          <span className="ml-auto flex items-center gap-2 font-mono">
            {breakdown.high > 0 && <Dot color="bg-emerald-400" n={breakdown.high} />}
            {breakdown.medium > 0 && <Dot color="bg-amber-400" n={breakdown.medium} />}
            {breakdown.low > 0 && <Dot color="bg-slate-400" n={breakdown.low} />}
          </span>
        </div>
        <ul className="flex gap-1.5 overflow-x-auto pb-1 md:max-h-[72vh] md:flex-col md:gap-1 md:overflow-y-auto md:pb-0 md:pr-1">
          {adrs.map((adr) => {
            const conf = CONFIDENCE_STYLES[adr.confidence] ?? CONFIDENCE_STYLES.medium;
            const Icon = CATEGORY_ICON[adr.category] ?? FileText;
            const isActive = adr.id === active.id;
            return (
              <li key={adr.id} className="shrink-0 md:shrink">
                <button
                  onClick={() => setSelected(adr.id)}
                  className={`group flex w-full items-start gap-2.5 rounded-xl border px-3 py-2.5 text-left transition ${
                    isActive
                      ? 'border-accent/30 bg-accent/[0.07]'
                      : 'border-transparent hover:border-white/10 hover:bg-white/[0.02]'
                  }`}
                >
                  <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${isActive ? 'text-accent-soft' : 'text-slate-600'}`} />
                  <span className="min-w-0">
                    <span className="font-mono text-[10px] text-slate-600">{adr.id}</span>
                    <span
                      className={`block max-w-[180px] truncate text-[13px] font-medium md:max-w-none md:whitespace-normal ${
                        isActive ? 'text-slate-100' : 'text-slate-300'
                      }`}
                    >
                      {adr.title}
                    </span>
                  </span>
                  <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${conf.dot}`} />
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Detail */}
      <AnimatePresence mode="wait">
        <motion.div
          key={active.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
        >
          <AdrDetail adr={active} owner={profile.owner} repo={profile.repo} sha={profile.sha} />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function Dot({ color, n }: { color: string; n: number }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`h-1.5 w-1.5 rounded-full ${color}`} />
      {n}
    </span>
  );
}

const EVIDENCE_LABEL: Record<string, string> = {
  dependency: 'dep',
  file: 'file',
  config: 'config',
  structure: 'structure',
  readme: 'readme',
};

function AdrDetail({ adr, owner, repo, sha }: { adr: ADR; owner: string; repo: string; sha: string }) {
  const [copied, setCopied] = useState(false);
  const conf = CONFIDENCE_STYLES[adr.confidence] ?? CONFIDENCE_STYLES.medium;
  const Icon = CATEGORY_ICON[adr.category] ?? FileText;

  const copy = async () => {
    await copyText(adrToMarkdown(adr));
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <article className="card overflow-hidden">
      {/* Header */}
      <div className="border-b border-white/5 p-6 md:p-7">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <span className="font-mono text-slate-500">{adr.id}</span>
              <span className="inline-flex items-center gap-1.5 rounded-md bg-white/5 px-2 py-0.5 capitalize text-slate-400">
                <Icon className="h-3 w-3" />
                {adr.category}
              </span>
              <span className="text-slate-600">· Inferred</span>
            </div>
            <h2 className="mt-2.5 text-xl font-semibold leading-tight text-slate-100 md:text-[1.6rem]">{adr.title}</h2>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span
              className={`hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 sm:inline-flex ${conf.text} ${conf.ring}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${conf.dot}`} />
              {conf.label}
            </span>
            <button
              onClick={copy}
              title="Copy as Markdown"
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-slate-400 transition hover:border-accent/40 hover:text-slate-200"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-6 p-6 md:p-7">
        {/* Decision callout — the headline answer */}
        <div className="rounded-xl border border-accent/20 bg-accent/[0.06] p-4">
          <Label accent>Decision</Label>
          <p className="mt-1.5 leading-relaxed text-slate-100">{adr.decision}</p>
        </div>

        <Block label="Context" body={adr.context} />
        <Block label="Rationale" body={adr.rationale} />

        {adr.alternatives.length > 0 && (
          <div>
            <Label>Alternatives considered</Label>
            <ul className="mt-2 space-y-2">
              {adr.alternatives.map((a, i) => (
                <li key={i} className="flex items-start gap-3 rounded-lg bg-ink-900/50 px-3 py-2.5 text-sm">
                  <span className="mt-0.5 rounded bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-rose-300/80">
                    rejected
                  </span>
                  <span className="min-w-0 text-slate-400">
                    <span className="font-medium text-slate-200">{a.option}</span>
                    {a.whyRejected && <> — {a.whyRejected}</>}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {adr.consequences.length > 0 && (
          <div>
            <Label>Consequences</Label>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-slate-400">
              {adr.consequences.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Evidence — the grounding */}
        <div>
          <div className="flex items-center gap-2">
            <Label>Evidence</Label>
            <span className="rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
              {adr.evidence.length}
            </span>
          </div>
          <div className="mt-2 grid gap-2">
            {adr.evidence.map((e, i) => {
              const looksLikePath = e.type === 'file' || e.type === 'config' || /\.[a-z]{1,5}(:|$)/i.test(e.ref);
              const filePart = e.ref.split(/[:\s]/)[0];
              return (
                <div key={i} className="flex items-start gap-2.5 rounded-lg bg-ink-900/60 px-3 py-2.5">
                  <FileCode2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent/70" />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded bg-ink-700 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-slate-400">
                        {EVIDENCE_LABEL[e.type] ?? e.type}
                      </span>
                      {looksLikePath && filePart ? (
                        <a
                          href={`https://github.com/${owner}/${repo}/blob/${sha}/${filePart}`}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="break-all font-mono text-xs text-accent-soft underline decoration-accent/30 hover:decoration-accent"
                        >
                          {e.ref}
                        </a>
                      ) : (
                        <span className="break-all font-mono text-xs text-accent-soft">{e.ref}</span>
                      )}
                    </div>
                    {e.note && <p className="mt-1 text-xs leading-relaxed text-slate-500">{e.note}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </article>
  );
}

function Label({ children, accent }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <h4 className={`text-[11px] font-semibold uppercase tracking-widest ${accent ? 'text-accent-soft' : 'text-slate-500'}`}>
      {children}
    </h4>
  );
}

function Block({ label, body }: { label: string; body: string }) {
  return (
    <div>
      <Label>{label}</Label>
      <p className="mt-1.5 text-[0.95rem] leading-relaxed text-slate-300">{body}</p>
    </div>
  );
}
