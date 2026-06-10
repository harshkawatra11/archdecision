import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronDown, Copy, FileCode2 } from 'lucide-react';
import type { ADR } from '../types';
import { CONFIDENCE_STYLES } from '../lib/constants';
import { adrToMarkdown } from '../lib/markdown';
import { copyText } from '../lib/download';

const EVIDENCE_LABEL: Record<string, string> = {
  dependency: 'dep',
  file: 'file',
  config: 'config',
  structure: 'structure',
  readme: 'readme',
};

export default function AdrCard({ adr, index }: { adr: ADR; index: number }) {
  const [open, setOpen] = useState(index === 0);
  const [copied, setCopied] = useState(false);
  const conf = CONFIDENCE_STYLES[adr.confidence] ?? CONFIDENCE_STYLES.medium;

  const copy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await copyText(adrToMarkdown(adr));
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: Math.min(index * 0.06, 0.4), ease: 'easeOut' }}
      className="card overflow-hidden"
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 p-4 text-left transition hover:bg-white/[0.02]"
      >
        <span className="font-mono text-xs text-slate-600">{adr.id}</span>
        <span className="flex-1 font-medium text-slate-100">{adr.title}</span>
        <span
          className={`hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 sm:inline-flex ${conf.text} ${conf.ring}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${conf.dot}`} />
          {conf.label}
        </span>
        <span
          onClick={copy}
          role="button"
          tabIndex={0}
          title="Copy as Markdown"
          className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 transition hover:bg-white/5 hover:text-slate-200"
        >
          {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
        </span>
        <ChevronDown className={`h-4 w-4 text-slate-500 transition ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="space-y-4 border-t border-white/5 p-5 text-sm">
              <Field label="Context" body={adr.context} />
              <Field label="Decision" body={adr.decision} />
              <Field label="Rationale" body={adr.rationale} />

              {adr.alternatives.length > 0 && (
                <Section label="Alternatives considered">
                  <ul className="space-y-1.5">
                    {adr.alternatives.map((a, i) => (
                      <li key={i} className="text-slate-400">
                        <span className="font-medium text-slate-200">{a.option}</span> — {a.whyRejected}
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              {adr.consequences.length > 0 && (
                <Section label="Consequences">
                  <ul className="list-disc space-y-1 pl-4 text-slate-400">
                    {adr.consequences.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </Section>
              )}

              <Section label="Evidence">
                <div className="space-y-1.5">
                  {adr.evidence.map((e, i) => (
                    <div key={i} className="flex items-start gap-2 rounded-lg bg-ink-900/60 px-3 py-2">
                      <FileCode2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent/70" />
                      <div className="min-w-0">
                        <span className="mr-2 rounded bg-ink-700 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-slate-400">
                          {EVIDENCE_LABEL[e.type] ?? e.type}
                        </span>
                        <span className="font-mono text-xs text-accent-soft">{e.ref}</span>
                        {e.note && <p className="mt-0.5 text-xs text-slate-500">{e.note}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}

function Field({ label, body }: { label: string; body: string }) {
  return (
    <div>
      <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</h4>
      <p className="leading-relaxed text-slate-300">{body}</p>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</h4>
      {children}
    </div>
  );
}
