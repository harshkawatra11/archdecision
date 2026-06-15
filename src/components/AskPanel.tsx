import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { CornerDownLeft, FileText, Loader2, MessagesSquare } from 'lucide-react';
import type { ADR, ChatMessage, RepoProfileLite } from '../types';
import { ask } from '../lib/api';
import Markdown from './Markdown';

interface Props {
  profile: RepoProfileLite;
  adrs: ADR[];
  pat: string;
}

const SUGGESTED = [
  'What database does this use and why?',
  'How is the project structured?',
  'What is the entry point and how does a request flow through it?',
];

export default function AskPanel({ profile, adrs, pat }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const send = async (q: string) => {
    const question = q.trim();
    if (!question || busy) return;
    setInput('');
    setBusy(true);

    const history = messages.slice(-6).map((m) => ({ role: m.role, content: m.content }));
    setMessages((m) => [
      ...m,
      { role: 'user', content: question },
      { role: 'assistant', content: '', streaming: true },
    ]);

    const update = (fn: (m: ChatMessage) => ChatMessage) =>
      setMessages((msgs) => {
        const copy = [...msgs];
        copy[copy.length - 1] = fn(copy[copy.length - 1]);
        return copy;
      });

    await ask(
      { repoUrl: `${profile.owner}/${profile.repo}`, sha: profile.sha, question, history, adrs, pat: pat || undefined },
      {
        onToken: (t) => update((m) => ({ ...m, content: m.content + t })),
        onSources: (sources, considered) => update((m) => ({ ...m, sources, considered, streaming: false })),
        onError: (msg) =>
          update((m) => ({ ...m, content: m.content || `⚠️ ${msg}`, streaming: false })),
      },
    );
    setBusy(false);
  };

  return (
    <div className="flex flex-col">
      <div ref={scrollRef} className="max-h-[460px] min-h-[220px] space-y-4 overflow-y-auto pr-1">
        {messages.length === 0 ? (
          <div className="grid place-items-center py-10 text-center">
            <MessagesSquare className="mb-3 h-8 w-8 text-slate-700" />
            <p className="text-sm text-slate-400">Ask anything about this repo — answers are grounded and cited.</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {SUGGESTED.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-slate-400 transition hover:border-white/25 hover:text-slate-200"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => <Bubble key={i} msg={m} owner={profile.owner} repo={profile.repo} sha={profile.sha} />)
        )}
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-xl border border-white/10 bg-ink-900 p-2 pl-4 focus-within:border-white/25">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send(input)}
          placeholder="Ask a question about this codebase…"
          className="flex-1 bg-transparent py-1.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none"
        />
        <button
          onClick={() => send(input)}
          disabled={busy || !input.trim()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white transition enabled:hover:bg-accent-soft disabled:opacity-40"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CornerDownLeft className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

function Bubble({ msg, owner, repo, sha }: { msg: ChatMessage; owner: string; repo: string; sha: string }) {
  if (msg.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-white/[0.07] px-4 py-2.5 text-sm text-slate-100 ring-1 ring-white/10">
          {msg.content}
        </div>
      </div>
    );
  }
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="max-w-[92%]">
      <div className="rounded-2xl rounded-bl-md bg-ink-900/70 px-4 py-3 ring-1 ring-white/5">
        {msg.content ? (
          <div className={msg.streaming ? 'caret' : ''}>
            <Markdown>{msg.content}</Markdown>
          </div>
        ) : (
          <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
        )}
        {msg.sources && msg.sources.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5 border-t border-white/5 pt-3">
            {msg.sources.map((s) => (
              <a
                key={s.path}
                href={`https://github.com/${owner}/${repo}/blob/${sha}/${s.path}`}
                target="_blank"
                rel="noreferrer noopener"
                title={s.reason}
                className="inline-flex items-center gap-1 rounded-md bg-ink-800 px-2 py-1 font-mono text-[11px] text-slate-300 transition hover:bg-ink-700 hover:text-white"
              >
                <FileText className="h-3 w-3" />
                {s.path}
              </a>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
