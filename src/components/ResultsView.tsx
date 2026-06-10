import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Boxes,
  Check,
  ChevronRight,
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
  MessageSquareText,
  MonitorSmartphone,
  Network,
  Plus,
  ScrollText,
  Server,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import type { ADR, Confidence, RepoProfileLite } from '../types';
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

/* ------------------------------------------------------------------ */
/* Shared vocabulary                                                    */
/* ------------------------------------------------------------------ */

const SECTIONS: { key: Tab; n: string; label: string; blurb: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'adrs', n: '01', label: 'Decisions', blurb: 'Inferred architecture records', icon: ScrollText },
  { key: 'ask', n: '02', label: 'Ask', blurb: 'Grounded Q&A with citations', icon: MessageSquareText },
  { key: 'onboarding', n: '03', label: 'Onboarding', blurb: 'The day-one engineer guide', icon: FileText },
  { key: 'pr', n: '04', label: 'PR review', blurb: 'Diff vs. the decisions', icon: GitPullRequest },
  { key: 'drift', n: '05', label: 'Drift', blurb: 'Architecture vs. reality', icon: GitCompareArrows },
];

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

const CONF: Record<Confidence, { label: string; bar: string; text: string; dot: string }> = {
  high: { label: 'High', bar: 'bg-emerald-400', text: 'text-emerald-300', dot: 'bg-emerald-400' },
  medium: { label: 'Medium', bar: 'bg-amber-400', text: 'text-amber-300', dot: 'bg-amber-400' },
  low: { label: 'Low', bar: 'bg-slate-500', text: 'text-slate-400', dot: 'bg-slate-500' },
};

/* ------------------------------------------------------------------ */
/* Root                                                                 */
/* ------------------------------------------------------------------ */

export default function ResultsView({ profile, adrs, pat, onboardingDoc, setOnboardingDoc, onReset }: Props) {
  const [tab, setTab] = useState<Tab>('adrs');

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      <CommandBar profile={profile} adrs={adrs} onboardingDoc={onboardingDoc} onReset={onReset} />

      <div className="mt-8 grid gap-10 lg:grid-cols-[248px_minmax(0,1fr)]">
        <SectionRail tab={tab} setTab={setTab} adrCount={adrs.length} />

        <main className="min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              {tab === 'adrs' && <DecisionsSection profile={profile} adrs={adrs} />}
              {tab === 'ask' && (
                <Section
                  title="Ask the codebase"
                  blurb="Plain-English questions answered from the repo itself — every answer cites the files it relied on."
                >
                  <div className="surface p-5">
                    <AskPanel profile={profile} pat={pat} />
                  </div>
                </Section>
              )}
              {tab === 'onboarding' && (
                <Section
                  title="Onboarding document"
                  blurb="The day-one guide a new engineer needs — stack, layout, how to run it, where to start reading."
                >
                  <div className="surface p-6 md:p-8">
                    <OnboardingPanel profile={profile} adrs={adrs} pat={pat} doc={onboardingDoc} setDoc={setOnboardingDoc} />
                  </div>
                </Section>
              )}
              {tab === 'pr' && (
                <Section
                  title="Pull request review"
                  blurb={`Check a PR against the ${adrs.length} recorded decisions and surface likely architectural violations.`}
                >
                  <div className="surface p-6">
                    <PrReviewPanel profile={profile} adrs={adrs} pat={pat} />
                  </div>
                </Section>
              )}
              {tab === 'drift' && (
                <Section
                  title="Tech-debt drift map"
                  blurb="Where the code has diverged from the architecture it was built on — grounded in current structure."
                >
                  <div className="surface p-6">
                    <DriftPanel profile={profile} adrs={adrs} pat={pat} />
                  </div>
                </Section>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Command bar                                                          */
/* ------------------------------------------------------------------ */

function CommandBar({
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
  const downloadAll = () =>
    downloadText(`archdecision-${profile.repo}.md`, bundleMarkdown(profile, adrs, onboardingDoc || null));

  return (
    <div className="surface flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-3.5">
      <a
        href={`https://github.com/${profile.owner}/${profile.repo}`}
        target="_blank"
        rel="noreferrer noopener"
        className="group inline-flex min-w-0 items-center gap-2.5"
      >
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/[0.04] ring-1 ring-white/10">
          <Github className="h-4 w-4 text-slate-400" />
        </span>
        <span className="min-w-0 leading-tight">
          <span className="block truncate font-mono text-[13px] font-medium text-slate-100 group-hover:text-accent-soft">
            {profile.owner}/{profile.repo}
          </span>
          <span className="block font-mono text-[11px] text-slate-600">
            {profile.sha.slice(0, 8)} · {profile.defaultBranch}
          </span>
        </span>
      </a>

      <div className="hidden h-7 w-px bg-white/[0.07] md:block" />

      <div className="hidden flex-wrap items-center gap-x-5 gap-y-1 text-[11px] text-slate-500 md:flex">
        <Meta icon={GitCommitHorizontal} label="Files" value={String(profile.stats.totalFiles)} />
        {langs.length > 0 && <Meta icon={FolderTree} label="Languages" value={langs.join(' · ')} />}
        {profile.structureSummary.serviceCount >= 2 && (
          <Meta icon={Boxes} label="Services" value={String(profile.structureSummary.serviceCount)} />
        )}
        {(profile.isMonorepo || profile.stats.truncated) && (
          <span
            className="inline-flex items-center gap-1.5 text-amber-300/90"
            title={
              profile.isMonorepo
                ? 'Monorepo — records describe the top-level architecture.'
                : 'Large repo — analysis was truncated to a token budget.'
            }
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            {profile.isMonorepo ? 'Monorepo' : 'Truncated'}
          </span>
        )}
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={downloadAll}
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-3.5 py-2 text-[13px] font-semibold text-white transition hover:bg-accent-soft"
        >
          <Download className="h-3.5 w-3.5" />
          Export
        </button>
        <button
          onClick={onReset}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3.5 py-2 text-[13px] font-medium text-slate-300 transition hover:border-white/25 hover:text-white"
        >
          <Plus className="h-3.5 w-3.5" />
          New analysis
        </button>
      </div>
    </div>
  );
}

function Meta({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon className="h-3.5 w-3.5 text-slate-600" />
      <span className="text-slate-600">{label}</span>
      <span className="font-mono text-slate-300">{value}</span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Section rail                                                         */
/* ------------------------------------------------------------------ */

function SectionRail({ tab, setTab, adrCount }: { tab: Tab; setTab: (t: Tab) => void; adrCount: number }) {
  return (
    <aside className="self-start lg:sticky lg:top-6">
      <nav className="flex gap-1 overflow-x-auto pb-2 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:pb-0">
        {SECTIONS.map((s) => {
          const active = tab === s.key;
          const Icon = s.icon;
          return (
            <button
              key={s.key}
              onClick={() => setTab(s.key)}
              className={`group relative flex shrink-0 items-center gap-3 rounded-lg py-2.5 pl-4 pr-3 text-left transition lg:shrink ${
                active ? 'bg-white/[0.04]' : 'hover:bg-white/[0.02]'
              }`}
            >
              {active && (
                <motion.span
                  layoutId="rail-marker"
                  className="absolute left-0 top-2 bottom-2 hidden w-[2px] rounded-full bg-accent lg:block"
                  transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                />
              )}
              <span className={`font-mono text-[10px] tabular-nums ${active ? 'text-accent-soft' : 'text-slate-700'}`}>
                {s.n}
              </span>
              <span className="min-w-0 leading-tight">
                <span
                  className={`flex items-center gap-2 whitespace-nowrap text-[13px] font-medium ${
                    active ? 'text-slate-100' : 'text-slate-400 group-hover:text-slate-200'
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 ${active ? 'text-accent-soft' : 'text-slate-600'}`} />
                  {s.label}
                  {s.key === 'adrs' && (
                    <span
                      className={`rounded px-1 font-mono text-[10px] tabular-nums ${
                        active ? 'bg-accent/15 text-accent-soft' : 'bg-white/[0.05] text-slate-500'
                      }`}
                    >
                      {adrCount}
                    </span>
                  )}
                </span>
                <span className="mt-0.5 hidden whitespace-nowrap text-[11px] text-slate-600 lg:block">{s.blurb}</span>
              </span>
            </button>
          );
        })}
      </nav>

      <p className="mt-6 hidden border-t border-white/[0.06] px-4 pt-4 text-[11px] leading-relaxed text-slate-600 lg:block">
        Records are <span className="text-slate-400">inferred</span> from code evidence and labelled with confidence —
        a draft to confirm, not ground truth.
      </p>
    </aside>
  );
}

/* ------------------------------------------------------------------ */
/* Generic section frame                                                */
/* ------------------------------------------------------------------ */

function Section({ title, blurb, children }: { title: string; blurb: string; children: React.ReactNode }) {
  return (
    <div>
      <header className="mb-5">
        <h2 className="text-lg font-semibold tracking-tight text-slate-100">{title}</h2>
        <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-slate-500">{blurb}</p>
      </header>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Decisions                                                            */
/* ------------------------------------------------------------------ */

function DecisionsSection({ profile, adrs }: { profile: RepoProfileLite; adrs: ADR[] }) {
  const [idx, setIdx] = useState(0);
  const active = adrs[Math.min(idx, adrs.length - 1)];

  const breakdown = useMemo(() => {
    const acc: Record<Confidence, number> = { high: 0, medium: 0, low: 0 };
    adrs.forEach((a) => (acc[a.confidence] = (acc[a.confidence] ?? 0) + 1));
    return acc;
  }, [adrs]);

  // Keyboard: ↑/↓ or j/k walk the records when not typing in an input.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        setIdx((i) => Math.min(i + 1, adrs.length - 1));
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        setIdx((i) => Math.max(i - 1, 0));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [adrs.length]);

  if (!adrs.length || !active) {
    return (
      <Section title="Decisions" blurb="No decision records were produced for this repository.">
        <div className="surface grid place-items-center p-12 text-sm text-slate-500">Nothing to show.</div>
      </Section>
    );
  }

  return (
    <div>
      {/* Overview strip */}
      <header className="mb-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-slate-100">Architecture decisions</h2>
            <p className="mt-1 text-[13px] text-slate-500">
              {adrs.length} records inferred from{' '}
              <span className="font-mono text-slate-400">
                {profile.owner}/{profile.repo}
              </span>{' '}
              — each grounded in cited evidence.
            </p>
          </div>
          <ConfidenceMeter breakdown={breakdown} total={adrs.length} />
        </div>
      </header>

      <div className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
        {/* Record index */}
        <div className="self-start xl:sticky xl:top-6">
          <ol className="surface flex gap-1 overflow-x-auto p-1.5 xl:max-h-[74vh] xl:flex-col xl:overflow-y-auto">
            {adrs.map((adr, i) => {
              const isActive = i === idx;
              const c = CONF[adr.confidence] ?? CONF.medium;
              const Icon = CATEGORY_ICON[adr.category] ?? FileText;
              return (
                <li key={adr.id} className="shrink-0 xl:shrink">
                  <button
                    onClick={() => setIdx(i)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition ${
                      isActive ? 'bg-accent/[0.09] ring-1 ring-accent/25' : 'hover:bg-white/[0.03]'
                    }`}
                  >
                    <span
                      className={`font-mono text-[11px] tabular-nums ${isActive ? 'text-accent-soft' : 'text-slate-600'}`}
                    >
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block max-w-[200px] truncate text-[13px] font-medium leading-snug xl:max-w-none xl:whitespace-normal ${
                          isActive ? 'text-slate-100' : 'text-slate-300'
                        }`}
                      >
                        {adr.title}
                      </span>
                      <span className="mt-1 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-600">
                        <Icon className="h-3 w-3" />
                        {adr.category}
                      </span>
                    </span>
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${c.dot}`} title={`${c.label} confidence`} />
                  </button>
                </li>
              );
            })}
          </ol>
          <p className="mt-2.5 hidden px-2 text-[11px] text-slate-700 xl:block">
            <kbd className="rounded border border-white/10 bg-white/[0.04] px-1 font-mono text-[10px]">↑</kbd>{' '}
            <kbd className="rounded border border-white/10 bg-white/[0.04] px-1 font-mono text-[10px]">↓</kbd> to move
            between records
          </p>
        </div>

        {/* Record document */}
        <AnimatePresence mode="wait">
          <motion.div
            key={active.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            <RecordDocument
              adr={active}
              index={idx}
              total={adrs.length}
              owner={profile.owner}
              repo={profile.repo}
              sha={profile.sha}
              onPrev={() => setIdx((i) => Math.max(i - 1, 0))}
              onNext={() => setIdx((i) => Math.min(i + 1, adrs.length - 1))}
            />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function ConfidenceMeter({ breakdown, total }: { breakdown: Record<Confidence, number>; total: number }) {
  const order: Confidence[] = ['high', 'medium', 'low'];
  return (
    <div className="min-w-[220px]">
      <div className="flex h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
        {order.map((k) =>
          breakdown[k] > 0 ? (
            <div key={k} className={`${CONF[k].bar}`} style={{ width: `${(breakdown[k] / total) * 100}%` }} />
          ) : null,
        )}
      </div>
      <div className="mt-2 flex items-center gap-4 text-[11px]">
        {order.map((k) =>
          breakdown[k] > 0 ? (
            <span key={k} className="inline-flex items-center gap-1.5 text-slate-500">
              <span className={`h-1.5 w-1.5 rounded-full ${CONF[k].dot}`} />
              <span className="font-mono tabular-nums text-slate-300">{breakdown[k]}</span> {CONF[k].label.toLowerCase()}
            </span>
          ) : null,
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* The record document                                                  */
/* ------------------------------------------------------------------ */

const EVIDENCE_LABEL: Record<string, string> = {
  dependency: 'dependency',
  file: 'file',
  config: 'config',
  structure: 'structure',
  readme: 'readme',
};

function RecordDocument({
  adr,
  index,
  total,
  owner,
  repo,
  sha,
  onPrev,
  onNext,
}: {
  adr: ADR;
  index: number;
  total: number;
  owner: string;
  repo: string;
  sha: string;
  onPrev: () => void;
  onNext: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const c = CONF[adr.confidence] ?? CONF.medium;
  const Icon = CATEGORY_ICON[adr.category] ?? FileText;

  const copy = async () => {
    await copyText(adrToMarkdown(adr));
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <article className="surface overflow-hidden">
      {/* Document head */}
      <header className="border-b border-white/[0.06] px-7 py-6 md:px-9 md:py-7">
        <div className="flex items-center justify-between gap-4 text-[11px]">
          <div className="flex items-center gap-2.5 text-slate-500">
            <span className="font-mono">{adr.id}</span>
            <ChevronRight className="h-3 w-3 text-slate-700" />
            <span className="inline-flex items-center gap-1.5 capitalize">
              <Icon className="h-3.5 w-3.5" />
              {adr.category}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-1.5 font-medium ${c.text}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
              {c.label} confidence
            </span>
            <button
              onClick={copy}
              title="Copy as Markdown — ready for /docs/adr"
              className="inline-flex items-center gap-1.5 rounded-md border border-white/10 px-2 py-1 text-[11px] text-slate-400 transition hover:border-white/25 hover:text-slate-200"
            >
              {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
              {copied ? 'Copied' : '.md'}
            </button>
          </div>
        </div>

        <h1 className="mt-3 text-[1.45rem] font-semibold leading-snug tracking-tight text-slate-50 md:text-[1.7rem]">
          {adr.title}
        </h1>

        {/* The decision itself — the one line a reader needs */}
        <p className="mt-3 border-l-2 border-accent/60 pl-4 text-[15px] leading-relaxed text-slate-200">
          {adr.decision}
        </p>
      </header>

      {/* Document body */}
      <div className="px-7 py-6 md:px-9 md:py-8">
        <div className="max-w-[68ch] space-y-7">
          <DocBlock heading="Context">
            <p>{adr.context}</p>
          </DocBlock>

          <DocBlock heading="Rationale">
            <p>{adr.rationale}</p>
          </DocBlock>

          {adr.alternatives.length > 0 && (
            <DocBlock heading="Alternatives considered">
              <div className="not-prose divide-y divide-white/[0.05] overflow-hidden rounded-xl border border-white/[0.07]">
                {adr.alternatives.map((a, i) => (
                  <div key={i} className="flex gap-4 bg-white/[0.015] px-4 py-3">
                    <span className="w-28 shrink-0 truncate pt-px text-[13px] font-medium text-slate-200" title={a.option}>
                      {a.option}
                    </span>
                    <span className="text-[13px] leading-relaxed text-slate-400">{a.whyRejected || '—'}</span>
                  </div>
                ))}
              </div>
            </DocBlock>
          )}

          {adr.consequences.length > 0 && (
            <DocBlock heading="Consequences">
              <ul className="space-y-2">
                {adr.consequences.map((co, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="mt-[0.62em] h-1 w-1 shrink-0 rounded-full bg-slate-600" />
                    <span>{co}</span>
                  </li>
                ))}
              </ul>
            </DocBlock>
          )}

          <DocBlock heading={`Evidence · ${adr.evidence.length}`}>
            <div className="not-prose space-y-1.5">
              {adr.evidence.map((e, i) => {
                const looksLikePath = e.type === 'file' || e.type === 'config' || /\.[a-z]{1,5}(:|$)/i.test(e.ref);
                const filePart = e.ref.split(/[:\s]/)[0];
                return (
                  <div
                    key={i}
                    className="flex items-start gap-3 rounded-lg border border-white/[0.05] bg-white/[0.015] px-3.5 py-2.5"
                  >
                    <FileCode2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent/60" />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                        <span className="text-[10px] font-medium uppercase tracking-wider text-slate-600">
                          {EVIDENCE_LABEL[e.type] ?? e.type}
                        </span>
                        {looksLikePath && filePart ? (
                          <a
                            href={`https://github.com/${owner}/${repo}/blob/${sha}/${filePart}`}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="break-all font-mono text-[12px] text-accent-soft hover:underline"
                          >
                            {e.ref}
                          </a>
                        ) : (
                          <span className="break-all font-mono text-[12px] text-slate-300">{e.ref}</span>
                        )}
                      </div>
                      {e.note && <p className="mt-1 text-[12px] leading-relaxed text-slate-500">{e.note}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </DocBlock>
        </div>
      </div>

      {/* Document footer: position + prev/next */}
      <footer className="flex items-center justify-between border-t border-white/[0.06] px-7 py-4 md:px-9">
        <span className="font-mono text-[11px] tabular-nums text-slate-600">
          {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={onPrev}
            disabled={index === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-[12px] text-slate-400 transition enabled:hover:border-white/25 enabled:hover:text-slate-200 disabled:opacity-30"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Previous
          </button>
          <button
            onClick={onNext}
            disabled={index === total - 1}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-[12px] text-slate-400 transition enabled:hover:border-white/25 enabled:hover:text-slate-200 disabled:opacity-30"
          >
            Next
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </footer>
    </article>
  );
}

function DocBlock({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{heading}</h3>
      <div className="text-[14px] leading-[1.75] text-slate-300">{children}</div>
    </section>
  );
}
