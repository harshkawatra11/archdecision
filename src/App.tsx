import { useCallback, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  ChevronRight,
  FileText,
  GitCompareArrows,
  GitPullRequest,
  MessageSquareText,
  ScrollText,
} from 'lucide-react';
import Loader from './components/Loader';
import Header from './components/Header';
import InputZone from './components/InputZone';
import PipelineStepper from './components/PipelineStepper';
import ResultsView from './components/ResultsView';
import { analyze } from './lib/api';
import type { ADR, PipelineStage, RepoProfileLite } from './types';

type View = 'idle' | 'analyzing' | 'results';

interface ErrorState {
  message: string;
  hint?: string | null;
}

export default function App() {
  const [booted, setBooted] = useState(false);
  const [view, setView] = useState<View>('idle');
  const [stage, setStage] = useState<PipelineStage>('fetching');
  const [stageDetail, setStageDetail] = useState<string | undefined>();
  const [error, setError] = useState<ErrorState | null>(null);

  const [profile, setProfile] = useState<RepoProfileLite | null>(null);
  const [adrs, setAdrs] = useState<ADR[]>([]);
  const [onboardingDoc, setOnboardingDoc] = useState('');
  const [pat, setPat] = useState('');

  const runAnalyze = useCallback((repoUrl: string, token: string) => {
    setPat(token);
    setError(null);
    setProfile(null);
    setAdrs([]);
    setOnboardingDoc('');
    setStage('fetching');
    setStageDetail(undefined);
    setView('analyzing');

    analyze(repoUrl, token, {
      onStage: (st, detail) => {
        setStage(st);
        setStageDetail(detail);
      },
      onResult: (result) => {
        setProfile(result.profileLite);
        setAdrs(result.adrs);
        setView('results');
      },
      onError: (message, hint) => {
        setError({ message, hint });
        setView('idle');
      },
    });
  }, []);

  const reset = () => {
    setView('idle');
    setProfile(null);
    setAdrs([]);
    setError(null);
    setOnboardingDoc('');
  };

  return (
    <>
      <AnimatePresence>{!booted && <Loader onDone={() => setBooted(true)} />}</AnimatePresence>

      {booted && (
        <div className="min-h-full">
          {/* GitHub-style black header band */}
          <div className="border-b border-ink-600 bg-ink-950">
            <div className="mx-auto max-w-6xl px-5">
              <Header />
            </div>
          </div>

          <div className="mx-auto max-w-6xl px-5 pb-24">
            <main className="mt-8">
              <AnimatePresence mode="wait">
                {view === 'idle' && (
                  <motion.div
                    key="idle"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="pt-8 sm:pt-16"
                  >
                    {error && <ErrorBanner error={error} />}
                    <InputZone onAnalyze={runAnalyze} busy={false} />
                    <FeatureStrip />
                  </motion.div>
                )}

                {view === 'analyzing' && (
                  <motion.div
                    key="analyzing"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="pt-12 sm:pt-20"
                  >
                    <PipelineStepper stage={stage} detail={stageDetail} />
                    <p className="mt-5 text-center text-sm text-slate-500">
                      Reading the repo and inferring its decisions — grounded, not guessed.
                    </p>
                  </motion.div>
                )}

                {view === 'results' && profile && (
                  <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <ResultsView
                      profile={profile}
                      adrs={adrs}
                      pat={pat}
                      onboardingDoc={onboardingDoc}
                      setOnboardingDoc={setOnboardingDoc}
                      onReset={reset}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </main>
          </div>
          <Footer />
        </div>
      )}
    </>
  );
}

function ErrorBanner({ error }: { error: ErrorState }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto mb-6 flex max-w-2xl items-start gap-3 rounded-xl border border-rose-500/20 bg-rose-500/5 p-4"
    >
      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" />
      <div>
        <p className="text-sm font-medium text-rose-200">{error.message}</p>
        {error.hint && <p className="mt-1 text-xs text-rose-300/70">{error.hint}</p>}
      </div>
    </motion.div>
  );
}

function FeatureStrip() {
  const core = [
    {
      icon: ScrollText,
      title: 'Grounded ADRs',
      body: 'Architecture Decision Records — every claim cites the dependency, file, or config it was inferred from.',
    },
    {
      icon: MessageSquareText,
      title: 'Ask your codebase',
      body: 'Plain-English questions answered from the repo itself, with file citations — not generic hallucinations.',
    },
    {
      icon: FileText,
      title: 'Onboarding doc',
      body: 'The day-one guide every team needs and nobody writes — generated, sectioned, and ready to commit.',
    },
  ];
  const stretch = [
    {
      icon: GitPullRequest,
      title: 'PR architectural review',
      body: 'Check a pull request against the decisions and flag likely violations.',
    },
    {
      icon: GitCompareArrows,
      title: 'Tech-debt drift map',
      body: 'See where the code has diverged from the architecture it was built on.',
    },
  ];

  return (
    <div className="mx-auto mt-20 max-w-4xl">
      {/* How it works */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-0"
      >
        {[
          { n: '01', label: 'Ingest', sub: 'tree, manifests, signal files' },
          { n: '02', label: 'Profile', sub: 'compact grounded context' },
          { n: '03', label: 'Infer', sub: 'decisions with evidence' },
        ].map((s, i) => (
          <div key={s.n} className="flex items-center">
            <div className="flex items-center gap-3 px-5">
              <span className="font-mono text-[11px] text-slate-500">{s.n}</span>
              <div className="leading-tight">
                <p className="text-[13px] font-medium text-slate-200">{s.label}</p>
                <p className="text-[11px] text-slate-600">{s.sub}</p>
              </div>
            </div>
            {i < 2 && <ChevronRight className="hidden h-4 w-4 text-slate-700 sm:block" />}
          </div>
        ))}
      </motion.div>

      {/* Core features */}
      <div className="mt-10 grid gap-3 sm:grid-cols-3">
        {core.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 + i * 0.08 }}
            className="group rounded-xl border border-white/[0.07] bg-ink-900/60 p-5 transition hover:border-white/15 hover:bg-ink-900"
          >
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-white/[0.04] ring-1 ring-white/10 transition group-hover:bg-white/[0.07]">
              <f.icon className="h-4 w-4 text-slate-400" />
            </span>
            <h3 className="mt-3.5 text-[14px] font-semibold text-slate-100">{f.title}</h3>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-slate-500">{f.body}</p>
          </motion.div>
        ))}
      </div>

      {/* Stretch features */}
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {stretch.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + i * 0.08 }}
            className="group flex items-start gap-4 rounded-xl border border-white/[0.05] bg-white/[0.015] p-4 transition hover:border-white/15"
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/[0.04] ring-1 ring-white/10">
              <f.icon className="h-4 w-4 text-slate-400" />
            </span>
            <div>
              <h3 className="text-[13px] font-semibold text-slate-200">{f.title}</h3>
              <p className="mt-1 text-[12px] leading-relaxed text-slate-500">{f.body}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/5 py-7">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-5 text-[11px] text-slate-600 sm:flex-row">
        <span className="flex items-center gap-1.5">
          <span className="font-display font-medium text-slate-500">ArchDecision</span>
          <span className="text-slate-700">·</span>
          institutional memory your codebase never had.
        </span>
        <span className="tnum flex items-center gap-1.5">
          ADRs are inferred drafts to confirm, not ground truth.
          <span className="text-slate-700">·</span>
          <span>&copy; 2026 Harsh Kawatra</span>
        </span>
      </div>
    </footer>
  );
}
