import { useCallback, useEffect, useMemo, useState } from 'react';
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
  GitCompareArrows,
  GitPullRequest,
  Github,
  MessageSquareText,
  MonitorSmartphone,
  Network,
  Plus,
  Quote,
  ScrollText,
  Server,
  ShieldCheck,
  X,
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

const TABS: { key: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'adrs', label: 'Decisions', icon: ScrollText },
  { key: 'ask', label: 'Ask', icon: MessageSquareText },
  { key: 'onboarding', label: 'Onboarding', icon: FileText },
  { key: 'pr', label: 'PR review', icon: GitPullRequest },
  { key: 'drift', label: 'Drift', icon: GitCompareArrows },
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

const CONF: Record<Confidence, { label: string; chip: string; dot: string; bar: string }> = {
  high: {
    label: 'High',
    chip: 'bg-emerald-400/10 text-emerald-300 ring-emerald-400/25',
    dot: 'bg-emerald-400',
    bar: 'bg-emerald-400',
  },
  medium: {
    label: 'Medium',
    chip: 'bg-amber-400/10 text-amber-300 ring-amber-400/25',
    dot: 'bg-amber-400',
    bar: 'bg-amber-400',
  },
  low: {
    label: 'Low',
    chip: 'bg-slate-400/10 text-slate-400 ring-slate-400/25',
    dot: 'bg-slate-500',
    bar: 'bg-slate-500',
  },
};

/* ------------------------------------------------------------------ */
/* Root                                                                 */
/* ------------------------------------------------------------------ */

export default function ResultsView({ profile, adrs, pat, onboardingDoc, setOnboardingDoc, onReset }: Props) {
  const [tab, setTab] = useState<Tab>('adrs');
  const [inspecting, setInspecting] = useState<number | null>(null);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      <ConsoleHeader profile={profile} adrs={adrs} onboardingDoc={onboardingDoc} onReset={onReset} />
      <TabBar tab={tab} setTab={setTab} />

      <div className="pt-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            {tab === 'adrs' && <DecisionsConsole profile={profile} adrs={adrs} onInspect={setInspecting} />}
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

      <Inspector
        adrs={adrs}
        index={inspecting}
        setIndex={setInspecting}
        owner={profile.owner}
        repo={profile.repo}
        sha={profile.sha}
      />
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Console header + tabs                                                */
/* ------------------------------------------------------------------ */

function ConsoleHeader({
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
  const downloadAll = () =>
    downloadText(`archdecision-${profile.repo}.md`, bundleMarkdown(profile, adrs, onboardingDoc || null));

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 pb-5">
      <div className="flex min-w-0 items-center gap-3.5">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/[0.04] ring-1 ring-white/10">
          <Github className="h-[18px] w-[18px] text-slate-300" />
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <a
              href={`https://github.com/${profile.owner}/${profile.repo}`}
              target="_blank"
              rel="noreferrer noopener"
              className="truncate text-[15px] font-semibold tracking-tight text-slate-100 hover:text-accent-soft"
            >
              {profile.owner}<span className="text-slate-600">/</span>{profile.repo}
            </a>
            {(profile.isMonorepo || profile.stats.truncated) && (
              <span
                title={
                  profile.isMonorepo
                    ? 'Monorepo — records describe the top-level architecture.'
                    : 'Large repo — analysis was truncated to a token budget.'
                }
                className="inline-flex items-center gap-1 rounded-md bg-amber-400/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-300 ring-1 ring-amber-400/20"
              >
                <AlertTriangle className="h-3 w-3" />
                {profile.isMonorepo ? 'Monorepo' : 'Truncated'}
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate font-mono text-[11px] text-slate-600">
            {profile.defaultBranch} · {profile.sha.slice(0, 10)} · analyzed{' '}
            {profile.stats.totalFiles.toLocaleString()} files
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={downloadAll}
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-accent-soft"
        >
          <Download className="h-3.5 w-3.5" />
          Export report
        </button>
        <button
          onClick={onReset}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3.5 py-2 text-[13px] font-medium text-slate-300 transition hover:border-white/25 hover:text-white"
        >
          <Plus className="h-3.5 w-3.5" />
          New
        </button>
      </div>
    </div>
  );
}

function TabBar({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-white/[0.07]">
      {TABS.map(({ key, label, icon: Icon }) => {
        const active = tab === key;
        return (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`relative flex shrink-0 items-center gap-2 px-4 pb-3 pt-1 text-[13px] font-medium transition ${
              active ? 'text-slate-100' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Icon className={`h-4 w-4 ${active ? 'text-accent-soft' : 'text-slate-600'}`} />
            {label}
            {active && (
              <motion.span
                layoutId="tab-underline"
                className="absolute inset-x-2 -bottom-px h-[2px] rounded-full bg-accent"
                transition={{ type: 'spring', stiffness: 500, damping: 40 }}
              />
            )}
          </button>
        );
      })}
    </div>
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
/* Decisions console: stats + table                                     */
/* ------------------------------------------------------------------ */

function DecisionsConsole({
  profile,
  adrs,
  onInspect,
}: {
  profile: RepoProfileLite;
  adrs: ADR[];
  onInspect: (i: number) => void;
}) {
  const stats = useMemo(() => {
    const conf: Record<Confidence, number> = { high: 0, medium: 0, low: 0 };
    const categories = new Set<string>();
    let evidence = 0;
    adrs.forEach((a) => {
      conf[a.confidence] = (conf[a.confidence] ?? 0) + 1;
      categories.add(a.category);
      evidence += a.evidence.length;
    });
    return { conf, categories: categories.size, evidence };
  }, [adrs]);

  if (!adrs.length) {
    return (
      <div className="surface grid place-items-center p-14 text-sm text-slate-500">
        No decision records were produced for this repository.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stat tiles */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Decision records" value={String(adrs.length)} sub="inferred from code evidence" />
        <StatTile
          label="Confidence"
          value={`${stats.conf.high} high`}
          sub={`${stats.conf.medium} medium · ${stats.conf.low} low`}
          meter={
            <div className="mt-2 flex h-1 overflow-hidden rounded-full bg-white/[0.06]">
              {(['high', 'medium', 'low'] as Confidence[]).map((k) =>
                stats.conf[k] > 0 ? (
                  <div key={k} className={CONF[k].bar} style={{ width: `${(stats.conf[k] / adrs.length) * 100}%` }} />
                ) : null,
              )}
            </div>
          }
        />
        <StatTile label="Categories covered" value={String(stats.categories)} sub="datastore, framework, CI…" />
        <StatTile label="Evidence citations" value={String(stats.evidence)} sub="deps, files, configs, structure" />
      </div>

      {/* Records table */}
      <div className="surface overflow-hidden">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-white/[0.07] text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">
              <th className="px-5 py-3 font-semibold">#</th>
              <th className="px-3 py-3 font-semibold">Decision</th>
              <th className="hidden px-3 py-3 font-semibold md:table-cell">Category</th>
              <th className="hidden px-3 py-3 font-semibold sm:table-cell">Confidence</th>
              <th className="hidden px-3 py-3 text-right font-semibold lg:table-cell">Evidence</th>
              <th className="w-10 px-3 py-3" />
            </tr>
          </thead>
          <tbody>
            {adrs.map((adr, i) => {
              const c = CONF[adr.confidence] ?? CONF.medium;
              const Icon = CATEGORY_ICON[adr.category] ?? FileText;
              return (
                <tr
                  key={adr.id}
                  onClick={() => onInspect(i)}
                  className="group cursor-pointer border-b border-white/[0.04] transition last:border-0 hover:bg-white/[0.025]"
                >
                  <td className="px-5 py-4 align-top font-mono text-[11px] tabular-nums text-slate-600">
                    {String(i + 1).padStart(2, '0')}
                  </td>
                  <td className="max-w-0 px-3 py-4 align-top" style={{ width: '52%' }}>
                    <p className="truncate text-[14px] font-medium text-slate-100 group-hover:text-white">{adr.title}</p>
                    <p className="mt-1 truncate text-[12px] text-slate-500">{adr.decision}</p>
                  </td>
                  <td className="hidden px-3 py-4 align-top md:table-cell">
                    <span className="inline-flex items-center gap-1.5 text-[12px] capitalize text-slate-400">
                      <Icon className="h-3.5 w-3.5 text-slate-600" />
                      {adr.category}
                    </span>
                  </td>
                  <td className="hidden px-3 py-4 align-top sm:table-cell">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${c.chip}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
                      {c.label}
                    </span>
                  </td>
                  <td className="hidden px-3 py-4 text-right align-top font-mono text-[12px] tabular-nums text-slate-500 lg:table-cell">
                    {adr.evidence.length}
                  </td>
                  <td className="px-3 py-4 align-top">
                    <ChevronRight className="h-4 w-4 text-slate-700 transition group-hover:translate-x-0.5 group-hover:text-slate-400" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-center text-[11px] text-slate-700">
        Click a record to inspect it · grounded in{' '}
        <span className="font-mono text-slate-500">
          {profile.owner}/{profile.repo}@{profile.sha.slice(0, 7)}
        </span>
      </p>
    </div>
  );
}

function StatTile({ label, value, sub, meter }: { label: string; value: string; sub: string; meter?: React.ReactNode }) {
  return (
    <div className="surface px-4 py-3.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">{label}</p>
      <p className="mt-1.5 text-xl font-semibold tabular-nums tracking-tight text-slate-100">{value}</p>
      {meter}
      <p className="mt-1 truncate text-[11px] text-slate-600">{sub}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Slide-over inspector                                                 */
/* ------------------------------------------------------------------ */

const EVIDENCE_LABEL: Record<string, string> = {
  dependency: 'dependency',
  file: 'file',
  config: 'config',
  structure: 'structure',
  readme: 'readme',
};

function Inspector({
  adrs,
  index,
  setIndex,
  owner,
  repo,
  sha,
}: {
  adrs: ADR[];
  index: number | null;
  setIndex: (i: number | null) => void;
  owner: string;
  repo: string;
  sha: string;
}) {
  const adr = index != null ? adrs[index] : null;
  const [copied, setCopied] = useState(false);

  const close = useCallback(() => setIndex(null), [setIndex]);
  const prev = useCallback(() => index != null && index > 0 && setIndex(index - 1), [index, setIndex]);
  const next = useCallback(
    () => index != null && index < adrs.length - 1 && setIndex(index + 1),
    [index, adrs.length, setIndex],
  );

  useEffect(() => {
    if (index == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [index, close, prev, next]);

  const copy = async () => {
    if (!adr) return;
    await copyText(adrToMarkdown(adr));
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <AnimatePresence>
      {adr && index != null && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={close}
            className="fixed inset-0 z-40 bg-ink-950/70 backdrop-blur-[2px]"
          />
          <motion.aside
            key="panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 40 }}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[600px] flex-col border-l border-white/[0.08] bg-ink-900 shadow-2xl"
          >
            {/* Inspector chrome */}
            <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-3.5">
              <div className="flex items-center gap-2.5 text-[11px] text-slate-500">
                <span className="font-mono">{adr.id}</span>
                <span className="text-slate-700">·</span>
                <span className="capitalize">{adr.category}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={copy}
                  title="Copy as Markdown — ready for /docs/adr"
                  className="inline-flex items-center gap-1.5 rounded-md border border-white/10 px-2 py-1 text-[11px] text-slate-400 transition hover:border-white/25 hover:text-slate-200"
                >
                  {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                  {copied ? 'Copied' : 'Copy .md'}
                </button>
                <button
                  onClick={close}
                  className="grid h-7 w-7 place-items-center rounded-md text-slate-500 transition hover:bg-white/5 hover:text-slate-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Scrollable document */}
            <div className="min-h-0 flex-1 overflow-y-auto px-7 py-6">
              <div className="flex items-center gap-2">
                {(() => {
                  const c = CONF[adr.confidence] ?? CONF.medium;
                  return (
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${c.chip}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
                      {c.label} confidence
                    </span>
                  );
                })()}
                <span className="text-[11px] text-slate-600">Status: inferred</span>
              </div>

              <h2 className="mt-3 text-[1.35rem] font-semibold leading-snug tracking-tight text-slate-50">{adr.title}</h2>

              <div className="mt-4 flex gap-3 rounded-xl border border-accent/20 bg-accent/[0.05] p-4">
                <Quote className="h-4 w-4 shrink-0 text-accent/70" />
                <p className="text-[14px] leading-relaxed text-slate-100">{adr.decision}</p>
              </div>

              <div className="mt-7 space-y-7">
                <InspectorBlock heading="Context">
                  <p>{adr.context}</p>
                </InspectorBlock>

                <InspectorBlock heading="Rationale">
                  <p>{adr.rationale}</p>
                </InspectorBlock>

                {adr.alternatives.length > 0 && (
                  <InspectorBlock heading="Alternatives considered">
                    <div className="space-y-2">
                      {adr.alternatives.map((a, i) => (
                        <div key={i} className="rounded-lg border border-white/[0.06] bg-white/[0.015] px-3.5 py-2.5">
                          <p className="text-[13px] font-medium text-slate-200">{a.option}</p>
                          {a.whyRejected && (
                            <p className="mt-0.5 text-[12px] leading-relaxed text-slate-500">{a.whyRejected}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </InspectorBlock>
                )}

                {adr.consequences.length > 0 && (
                  <InspectorBlock heading="Consequences">
                    <ul className="space-y-2">
                      {adr.consequences.map((co, i) => (
                        <li key={i} className="flex gap-3">
                          <span className="mt-[0.6em] h-1 w-1 shrink-0 rounded-full bg-slate-600" />
                          <span>{co}</span>
                        </li>
                      ))}
                    </ul>
                  </InspectorBlock>
                )}

                <InspectorBlock heading={`Evidence · ${adr.evidence.length}`}>
                  <div className="space-y-1.5">
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
                </InspectorBlock>
              </div>
            </div>

            {/* Inspector footer */}
            <div className="flex items-center justify-between border-t border-white/[0.06] px-6 py-3.5">
              <span className="font-mono text-[11px] tabular-nums text-slate-600">
                {String(index + 1).padStart(2, '0')} / {String(adrs.length).padStart(2, '0')}
                <span className="ml-3 hidden text-slate-700 sm:inline">← → to navigate · esc to close</span>
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={prev}
                  disabled={index === 0}
                  className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-slate-400 transition enabled:hover:border-white/25 enabled:hover:text-slate-200 disabled:opacity-30"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={next}
                  disabled={index === adrs.length - 1}
                  className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-slate-400 transition enabled:hover:border-white/25 enabled:hover:text-slate-200 disabled:opacity-30"
                >
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function InspectorBlock({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{heading}</h3>
      <div className="text-[13.5px] leading-[1.7] text-slate-300">{children}</div>
    </section>
  );
}
