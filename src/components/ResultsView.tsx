import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Boxes,
  Check,
  ChevronLeft,
  CircleDot,
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
/* Vocabulary                                                           */
/* ------------------------------------------------------------------ */

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

// GitHub-dark state colors: green / yellow / gray.
const CONF: Record<Confidence, { label: string; icon: string; text: string; badge: string }> = {
  high: {
    label: 'High confidence',
    icon: 'text-[#3fb950]',
    text: 'text-[#3fb950]',
    badge: 'border-[#3fb950]/40 bg-[#3fb950]/10 text-[#56d364]',
  },
  medium: {
    label: 'Medium confidence',
    icon: 'text-[#d29922]',
    text: 'text-[#d29922]',
    badge: 'border-[#d29922]/40 bg-[#d29922]/10 text-[#e3b341]',
  },
  low: {
    label: 'Low confidence',
    icon: 'text-slate-500',
    text: 'text-slate-400',
    badge: 'border-slate-500/40 bg-slate-500/10 text-slate-400',
  },
};

/* ------------------------------------------------------------------ */
/* Root                                                                 */
/* ------------------------------------------------------------------ */

export default function ResultsView({ profile, adrs, pat, onboardingDoc, setOnboardingDoc, onReset }: Props) {
  const [tab, setTab] = useState<Tab>('adrs');
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const tabs: { key: Tab; label: string; icon: React.ComponentType<{ className?: string }>; count?: number }[] = [
    { key: 'adrs', label: 'Decisions', icon: ScrollText, count: adrs.length },
    { key: 'ask', label: 'Ask', icon: MessageSquareText },
    { key: 'onboarding', label: 'Onboarding', icon: FileText },
    { key: 'pr', label: 'PR review', icon: GitPullRequest },
    { key: 'drift', label: 'Drift', icon: GitCompareArrows },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      {/* Repo head */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
        <div className="flex min-w-0 items-center gap-2 text-xl">
          <a
            href={`https://github.com/${profile.owner}`}
            target="_blank"
            rel="noreferrer noopener"
            className="truncate font-normal text-accent hover:underline"
          >
            {profile.owner}
          </a>
          <span className="text-slate-600">/</span>
          <a
            href={`https://github.com/${profile.owner}/${profile.repo}`}
            target="_blank"
            rel="noreferrer noopener"
            className="truncate font-semibold text-accent hover:underline"
          >
            {profile.repo}
          </a>
          <span className="ml-1 rounded-full border border-ink-500 px-2 py-0.5 text-[11px] font-medium text-slate-400">
            analyzed
          </span>
          {(profile.isMonorepo || profile.stats.truncated) && (
            <span
              title={
                profile.isMonorepo
                  ? 'Monorepo — records describe the top-level architecture.'
                  : 'Large repo — analysis was truncated to a token budget.'
              }
              className="inline-flex items-center gap-1 rounded-full border border-[#d29922]/40 bg-[#d29922]/10 px-2 py-0.5 text-[11px] font-medium text-[#e3b341]"
            >
              <AlertTriangle className="h-3 w-3" />
              {profile.isMonorepo ? 'monorepo' : 'truncated'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              downloadText(`archdecision-${profile.repo}.md`, bundleMarkdown(profile, adrs, onboardingDoc || null))
            }
            className="inline-flex items-center gap-1.5 rounded-md border border-[rgba(240,246,252,0.1)] bg-[#238636] px-3 py-1.5 text-[13px] font-semibold text-white transition hover:bg-[#2ea043]"
          >
            <Download className="h-3.5 w-3.5" />
            Export report
          </button>
          <button
            onClick={onReset}
            className="inline-flex items-center gap-1.5 rounded-md border border-ink-600 bg-ink-800 px-3 py-1.5 text-[13px] font-medium text-slate-300 transition hover:border-ink-500 hover:bg-ink-700"
          >
            <Plus className="h-3.5 w-3.5" />
            New analysis
          </button>
        </div>
      </div>

      <p className="-mt-1 pb-3 font-mono text-[11px] text-slate-500">
        <GitCommitHorizontal className="mr-1 inline h-3.5 w-3.5 align-[-2px]" />
        {profile.defaultBranch} @ {profile.sha.slice(0, 10)} · {profile.stats.totalFiles.toLocaleString()} files ·{' '}
        {Object.keys(profile.languages).slice(0, 3).join(', ')}
      </p>

      {/* Tab nav — GitHub repo-nav style with coral underline */}
      <div className="flex gap-1 overflow-x-auto border-b border-ink-600">
        {tabs.map(({ key, label, icon: Icon, count }) => {
          const active = tab === key;
          return (
            <button
              key={key}
              onClick={() => {
                setTab(key);
                if (key !== 'adrs') setOpenIdx(null);
              }}
              className={`relative flex shrink-0 items-center gap-2 rounded-t-md px-3.5 py-2.5 text-[13px] transition hover:bg-white/[0.03] ${
                active ? 'font-semibold text-slate-100' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className={`h-4 w-4 ${active ? 'text-slate-300' : 'text-slate-600'}`} />
              {label}
              {count != null && (
                <span className="rounded-full bg-white/[0.08] px-1.5 py-px font-mono text-[11px] font-normal text-slate-400">
                  {count}
                </span>
              )}
              {active && (
                <motion.span
                  layoutId="tab-underline"
                  className="absolute inset-x-1 -bottom-px h-[2px] rounded-full bg-[#f78166]"
                  transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Body */}
      <div className="pt-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab + (tab === 'adrs' ? String(openIdx != null) : '')}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
          >
            {tab === 'adrs' &&
              (openIdx == null ? (
                <DecisionList adrs={adrs} onOpen={setOpenIdx} />
              ) : (
                <RecordPage
                  adrs={adrs}
                  index={openIdx}
                  setIndex={setOpenIdx}
                  owner={profile.owner}
                  repo={profile.repo}
                  sha={profile.sha}
                />
              ))}
            {tab === 'ask' && (
              <PanelFrame blurb="Plain-English questions answered from the repo itself — every answer cites its sources.">
                <AskPanel profile={profile} pat={pat} />
              </PanelFrame>
            )}
            {tab === 'onboarding' && (
              <PanelFrame blurb="The day-one guide a new engineer needs — stack, layout, how to run it, where to start reading.">
                <OnboardingPanel profile={profile} adrs={adrs} pat={pat} doc={onboardingDoc} setDoc={setOnboardingDoc} />
              </PanelFrame>
            )}
            {tab === 'pr' && (
              <PanelFrame blurb={`Check a pull request against the ${adrs.length} recorded decisions and flag likely violations.`}>
                <PrReviewPanel profile={profile} adrs={adrs} pat={pat} />
              </PanelFrame>
            )}
            {tab === 'drift' && (
              <PanelFrame blurb="Where the code has diverged from the architecture it was built on.">
                <DriftPanel profile={profile} adrs={adrs} pat={pat} />
              </PanelFrame>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function PanelFrame({ blurb, children }: { blurb: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-4xl">
      <p className="mb-4 text-[13px] text-slate-500">{blurb}</p>
      <div className="surface p-6">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Decision list — GitHub issues box                                    */
/* ------------------------------------------------------------------ */

function DecisionList({ adrs, onOpen }: { adrs: ADR[]; onOpen: (i: number) => void }) {
  const counts = useMemo(() => {
    const acc: Record<Confidence, number> = { high: 0, medium: 0, low: 0 };
    adrs.forEach((a) => (acc[a.confidence] = (acc[a.confidence] ?? 0) + 1));
    return acc;
  }, [adrs]);

  if (!adrs.length) {
    return <div className="surface grid place-items-center p-14 text-sm text-slate-500">No decision records.</div>;
  }

  return (
    <div className="surface overflow-hidden">
      {/* List header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-600 bg-ink-850 px-4 py-2.5">
        <span className="inline-flex items-center gap-2 text-[13px] font-semibold text-slate-200">
          <CircleDot className="h-4 w-4 text-[#3fb950]" />
          {adrs.length} architectural decisions
          <span className="font-normal text-slate-500">· inferred &amp; grounded</span>
        </span>
        <span className="flex items-center gap-4 text-[12px] text-slate-500">
          {(['high', 'medium', 'low'] as Confidence[]).map((k) =>
            counts[k] > 0 ? (
              <span key={k} className="inline-flex items-center gap-1.5">
                <CircleDot className={`h-3.5 w-3.5 ${CONF[k].icon}`} />
                {counts[k]} {k}
              </span>
            ) : null,
          )}
        </span>
      </div>

      {/* Rows */}
      <ul>
        {adrs.map((adr, i) => {
          const c = CONF[adr.confidence] ?? CONF.medium;
          const Icon = CATEGORY_ICON[adr.category] ?? FileText;
          return (
            <li key={adr.id} className="border-b border-ink-700/70 last:border-0">
              <button
                onClick={() => onOpen(i)}
                className="flex w-full items-start gap-3 px-4 py-3.5 text-left transition hover:bg-white/[0.02]"
              >
                <CircleDot className={`mt-0.5 h-4 w-4 shrink-0 ${c.icon}`} />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-[14.5px] font-semibold text-slate-100 hover:text-accent">{adr.title}</span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-ink-500 px-2 py-px text-[11px] capitalize text-slate-400">
                      <Icon className="h-3 w-3" />
                      {adr.category}
                    </span>
                  </span>
                  <span className="mt-1 block truncate text-[12px] text-slate-500">
                    {adr.id} · {adr.decision}
                  </span>
                </span>
                <span
                  className="hidden shrink-0 items-center gap-1.5 pt-0.5 font-mono text-[12px] text-slate-500 sm:inline-flex"
                  title={`${adr.evidence.length} evidence citations`}
                >
                  <FileCode2 className="h-3.5 w-3.5" />
                  {adr.evidence.length}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Record page — GitHub issue detail with metadata sidebar              */
/* ------------------------------------------------------------------ */

const EVIDENCE_LABEL: Record<string, string> = {
  dependency: 'dependency',
  file: 'file',
  config: 'config',
  structure: 'structure',
  readme: 'readme',
};

function RecordPage({
  adrs,
  index,
  setIndex,
  owner,
  repo,
  sha,
}: {
  adrs: ADR[];
  index: number;
  setIndex: (i: number | null) => void;
  owner: string;
  repo: string;
  sha: string;
}) {
  const adr = adrs[index];
  const [copied, setCopied] = useState(false);
  const c = CONF[adr.confidence] ?? CONF.medium;
  const Icon = CATEGORY_ICON[adr.category] ?? FileText;

  const back = useCallback(() => setIndex(null), [setIndex]);
  const prev = useCallback(() => index > 0 && setIndex(index - 1), [index, setIndex]);
  const next = useCallback(() => index < adrs.length - 1 && setIndex(index + 1), [index, adrs.length, setIndex]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.key === 'Escape') back();
      else if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [back, prev, next]);

  const copy = async () => {
    await copyText(adrToMarkdown(adr));
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div>
      {/* Back + position */}
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={back}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-accent hover:underline"
        >
          <ChevronLeft className="h-4 w-4" />
          All decisions
        </button>
        <span className="font-mono text-[11px] tabular-nums text-slate-600">
          {index + 1} of {adrs.length} <span className="hidden sm:inline">· ← → to navigate · esc for list</span>
        </span>
      </div>

      {/* Title */}
      <h1 className="text-[1.6rem] font-semibold leading-snug tracking-tight text-slate-50">
        {adr.title} <span className="font-normal text-slate-600">{adr.id}</span>
      </h1>
      <div className="mt-2.5 flex flex-wrap items-center gap-2 border-b border-ink-600 pb-4">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-semibold ${c.badge}`}
        >
          <CircleDot className="h-3.5 w-3.5" />
          {c.label}
        </span>
        <span className="text-[12px] text-slate-500">
          Status <span className="font-medium text-slate-400">inferred</span> from{' '}
          <span className="font-medium text-slate-400">{adr.evidence.length} evidence citations</span> in{' '}
          <a
            href={`https://github.com/${owner}/${repo}/tree/${sha}`}
            target="_blank"
            rel="noreferrer noopener"
            className="font-mono text-accent hover:underline"
          >
            {owner}/{repo}@{sha.slice(0, 7)}
          </a>
        </span>
      </div>

      {/* Main + sidebar */}
      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_272px]">
        <div className="min-w-0">
          {/* Decision box */}
          <div className="overflow-hidden rounded-md border border-ink-600">
            <div className="border-b border-ink-600 bg-ink-850 px-4 py-2 text-[12px] font-semibold text-slate-300">
              Decision
            </div>
            <p className="px-4 py-3.5 text-[14.5px] leading-relaxed text-slate-100">{adr.decision}</p>
          </div>

          <div className="mt-7 max-w-[72ch] space-y-7">
            <DocBlock heading="Context">
              <p>{adr.context}</p>
            </DocBlock>

            <DocBlock heading="Rationale">
              <p>{adr.rationale}</p>
            </DocBlock>

            {adr.alternatives.length > 0 && (
              <DocBlock heading="Alternatives considered">
                <div className="overflow-hidden rounded-md border border-ink-600">
                  {adr.alternatives.map((a, i) => (
                    <div key={i} className="flex gap-4 border-b border-ink-700/70 px-4 py-3 last:border-0">
                      <span className="w-28 shrink-0 truncate text-[13px] font-semibold text-slate-200" title={a.option}>
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

            <DocBlock heading="Evidence">
              <div className="overflow-hidden rounded-md border border-ink-600">
                {adr.evidence.map((e, i) => {
                  const looksLikePath = e.type === 'file' || e.type === 'config' || /\.[a-z]{1,5}(:|$)/i.test(e.ref);
                  const filePart = e.ref.split(/[:\s]/)[0];
                  return (
                    <div key={i} className="flex items-start gap-3 border-b border-ink-700/70 px-4 py-3 last:border-0">
                      <FileCode2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                          <span className="rounded-full border border-ink-500 px-1.5 py-px text-[10px] text-slate-500">
                            {EVIDENCE_LABEL[e.type] ?? e.type}
                          </span>
                          {looksLikePath && filePart ? (
                            <a
                              href={`https://github.com/${owner}/${repo}/blob/${sha}/${filePart}`}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="break-all font-mono text-[12px] text-accent hover:underline"
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

          {/* Prev / next */}
          <div className="mt-9 flex items-center justify-between border-t border-ink-600 pt-4">
            {index > 0 ? (
              <button
                onClick={prev}
                className="group inline-flex max-w-[45%] items-center gap-2 text-left text-[13px] text-slate-400 transition hover:text-accent"
              >
                <ArrowLeft className="h-4 w-4 shrink-0" />
                <span className="truncate">{adrs[index - 1].title}</span>
              </button>
            ) : (
              <span />
            )}
            {index < adrs.length - 1 ? (
              <button
                onClick={next}
                className="group inline-flex max-w-[45%] items-center gap-2 text-right text-[13px] text-slate-400 transition hover:text-accent"
              >
                <span className="truncate">{adrs[index + 1].title}</span>
                <ArrowRight className="h-4 w-4 shrink-0" />
              </button>
            ) : (
              <span />
            )}
          </div>
        </div>

        {/* Metadata sidebar */}
        <aside className="order-first space-y-5 lg:order-none lg:self-start lg:border-l lg:border-ink-700/60 lg:pl-6">
          <SideSection title="Confidence">
            <span className={`inline-flex items-center gap-1.5 text-[13px] font-medium ${c.text}`}>
              <CircleDot className="h-3.5 w-3.5" />
              {c.label}
            </span>
            <p className="mt-1.5 text-[11px] leading-relaxed text-slate-600">
              {adr.confidence === 'high'
                ? 'Directly evidenced by a dependency or config.'
                : adr.confidence === 'medium'
                  ? 'Strongly implied by structure or combined signals.'
                  : 'Inferred from indirect cues — confirm with a human.'}
            </p>
          </SideSection>

          <SideSection title="Category">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-ink-500 px-2.5 py-1 text-[12px] capitalize text-slate-300">
              <Icon className="h-3.5 w-3.5 text-slate-500" />
              {adr.category}
            </span>
          </SideSection>

          <SideSection title="Actions">
            <button
              onClick={copy}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-ink-600 bg-ink-800 px-3 py-1.5 text-[12.5px] font-medium text-slate-300 transition hover:border-ink-500 hover:bg-ink-700"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-[#3fb950]" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copied!' : 'Copy as Markdown'}
            </button>
            <p className="mt-1.5 text-center text-[10.5px] text-slate-600">PR-ready for /docs/adr</p>
          </SideSection>
        </aside>
      </div>
    </div>
  );
}

function SideSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-ink-700/60 pb-5 last:border-0 last:pb-0">
      <h4 className="mb-2 text-[11px] font-semibold text-slate-500">{title}</h4>
      {children}
    </div>
  );
}

function DocBlock({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2.5 border-b border-ink-700/60 pb-1.5 text-[13px] font-semibold text-slate-200">{heading}</h3>
      <div className="text-[14px] leading-[1.7] text-slate-300">{children}</div>
    </section>
  );
}
