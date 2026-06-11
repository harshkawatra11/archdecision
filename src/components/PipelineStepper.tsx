import { motion } from 'framer-motion';
import { Check, Loader2 } from 'lucide-react';
import type { PipelineStage } from '../types';

const STEPS: { key: PipelineStage; label: string }[] = [
  { key: 'fetching', label: 'Fetching repo' },
  { key: 'structure', label: 'Reading structure' },
  { key: 'signals', label: 'Identifying signal files' },
  { key: 'inferring', label: 'Inferring decisions' },
  { key: 'done', label: 'Generating records' },
];

const ORDER: PipelineStage[] = ['fetching', 'structure', 'signals', 'inferring', 'done'];

export default function PipelineStepper({ stage, detail }: { stage: PipelineStage; detail?: string }) {
  const currentIdx = ORDER.indexOf(stage);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="card mx-auto w-full max-w-2xl p-5"
    >
      <ol className="space-y-3">
        {STEPS.map((step, i) => {
          const isDone = i < currentIdx || stage === 'done';
          const isActive = i === currentIdx && stage !== 'done';
          return (
            <li key={step.key} className="flex items-center gap-3">
              <span
                className={`grid h-6 w-6 place-items-center rounded-full border text-xs transition ${
                  isDone
                    ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300'
                    : isActive
                      ? 'border-white/30 bg-white/[0.06] text-slate-200'
                      : 'border-white/10 text-slate-600'
                }`}
              >
                {isDone ? (
                  <Check className="h-3.5 w-3.5" />
                ) : isActive ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  i + 1
                )}
              </span>
              <span
                className={`text-sm transition ${
                  isDone ? 'text-slate-400' : isActive ? 'font-medium text-slate-100' : 'text-slate-600'
                }`}
              >
                {step.label}
              </span>
              {isActive && detail && (
                <span className="ml-auto truncate font-mono text-xs text-slate-600">{detail}</span>
              )}
            </li>
          );
        })}
      </ol>
    </motion.div>
  );
}
