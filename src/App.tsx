import { useCallback, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, FileText, MessageSquareText, ScrollText } from 'lucide-react';
import Loader from './components/Loader';
import Header from './components/Header';
import InputZone from './components/InputZone';
import PipelineStepper from './components/PipelineStepper';
import ResultsHeader from './components/ResultsHeader';
import AdrCard from './components/AdrCard';
import AskPanel from './components/AskPanel';
import OnboardingPanel from './components/OnboardingPanel';
import { analyze } from './lib/api';
import type { ADR, PipelineStage, RepoProfileLite } from './types';

type View = 'idle' | 'analyzing' | 'results';
type Tab = 'adrs' | 'ask' | 'onboarding';

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
  const [tab, setTab] = useState<Tab>('adrs');
  const [onboardingDoc, setOnboardingDoc] = useState('');
  const [pat, setPat] = useState('');

  const runAnalyze = useCallback((repoUrl: string, token: string) => {
    setPat(token);
    setError(null);
    setProfile(null);
    setAdrs([]);
    setOnboardingDoc('');
    setTab('adrs');
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
        <div className="bg-grid min-h-full">
          <div className="mx-auto max-w-5xl px-5 pb-24">
            <Header />

            <main className="mt-10">
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
                  <motion.div
                    key="results"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                  >
                    <ResultsHeader profile={profile} adrs={adrs} onboardingDoc={onboardingDoc || null} onReset={reset} />
                    <Tabs tab={tab} setTab={setTab} adrCount={adrs.length} />

                    <div className="mx-auto w-full max-w-3xl">
                      <AnimatePresence mode="wait">
                        {tab === 'adrs' && (
                          <motion.div key="adrs" {...fade} className="space-y-3">
                            {adrs.map((adr, i) => (
                              <AdrCard key={adr.id} adr={adr} index={i} />
                            ))}
                          </motion.div>
                        )}
                        {tab === 'ask' && (
                          <motion.div key="ask" {...fade} className="card p-5">
                            <AskPanel profile={profile} pat={pat} />
                          </motion.div>
                        )}
                        {tab === 'onboarding' && (
                          <motion.div key="onboarding" {...fade} className="card p-6">
                            <OnboardingPanel
                              profile={profile}
                              adrs={adrs}
                              pat={pat}
                              doc={onboardingDoc}
                              setDoc={setOnboardingDoc}
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
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

const fade = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.25 },
};

function Tabs({ tab, setTab, adrCount }: { tab: Tab; setTab: (t: Tab) => void; adrCount: number }) {
  const items: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'adrs', label: `Decision Records (${adrCount})`, icon: <ScrollText className="h-4 w-4" /> },
    { key: 'ask', label: 'Ask the codebase', icon: <MessageSquareText className="h-4 w-4" /> },
    { key: 'onboarding', label: 'Onboarding doc', icon: <FileText className="h-4 w-4" /> },
  ];
  return (
    <div className="mx-auto flex w-full max-w-3xl gap-1 rounded-xl border border-white/5 bg-ink-850/60 p-1">
      {items.map((it) => (
        <button
          key={it.key}
          onClick={() => setTab(it.key)}
          className={`relative flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
            tab === it.key ? 'text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {tab === it.key && (
            <motion.span
              layoutId="tab-pill"
              className="absolute inset-0 rounded-lg bg-accent/15 ring-1 ring-accent/30"
              transition={{ type: 'spring', stiffness: 400, damping: 32 }}
            />
          )}
          <span className="relative z-10 flex items-center gap-2">
            {it.icon}
            <span className="hidden sm:inline">{it.label}</span>
          </span>
        </button>
      ))}
    </div>
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
  const features = [
    { title: 'Grounded ADRs', body: 'Every decision cites the dependency, file, or config it was inferred from.' },
    { title: 'Ask your codebase', body: 'Plain-English questions, answered with file citations — not hallucinations.' },
    { title: 'Onboarding doc', body: 'The day-one guide every team needs, generated and ready to commit.' },
  ];
  return (
    <div className="mx-auto mt-16 grid max-w-3xl gap-4 sm:grid-cols-3">
      {features.map((f, i) => (
        <motion.div
          key={f.title}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 + i * 0.1 }}
          className="card p-4"
        >
          <h3 className="text-sm font-semibold text-slate-100">{f.title}</h3>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{f.body}</p>
        </motion.div>
      ))}
    </div>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/5 py-6 text-center text-xs text-slate-600">
      ArchDecision — institutional memory your codebase never had. ADRs are inferred drafts to confirm, not ground
      truth.
    </footer>
  );
}
