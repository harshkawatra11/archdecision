import { useCallback, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
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
        <div className="bg-grid min-h-full">
          <div className="mx-auto max-w-6xl px-5 pb-24">
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
  const features = [
    { title: 'Grounded ADRs', body: 'Every decision cites the dependency, file, or config it was inferred from.', tag: 'Core' },
    { title: 'Ask your codebase', body: 'Plain-English questions, answered with file citations — not hallucinations.', tag: 'Core' },
    { title: 'Onboarding doc', body: 'The day-one guide every team needs, generated and ready to commit.', tag: 'Core' },
    { title: 'PR architectural review', body: 'Check a pull request against the ADRs and flag likely violations.', tag: 'Stretch' },
    { title: 'Tech debt drift map', body: 'See where the code has diverged from the architecture it was built on.', tag: 'Stretch' },
  ];
  return (
    <div className="mx-auto mt-16 grid max-w-3xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {features.map((f, i) => (
        <motion.div
          key={f.title}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 + i * 0.08 }}
          className="card p-4"
        >
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-100">{f.title}</h3>
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                f.tag === 'Core' ? 'bg-accent/15 text-accent-soft' : 'bg-white/5 text-slate-500'
              }`}
            >
              {f.tag}
            </span>
          </div>
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
