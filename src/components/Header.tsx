import { useRef } from 'react';
import { Github, GitBranch } from 'lucide-react';
import { useGSAP } from '../hooks/useGSAP';
import { GITHUB_REPO_URL } from '../lib/constants';

export default function Header() {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    (gsap) => {
      gsap.from(ref.current!.querySelectorAll('[data-anim]'), {
        y: -14,
        opacity: 0,
        duration: 0.7,
        ease: 'power3.out',
        stagger: 0.08,
      });
    },
    ref,
  );

  return (
    <header ref={ref} className="flex items-center justify-between py-5">
      <div data-anim className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent/10 ring-1 ring-accent/30">
          <GitBranch className="h-5 w-5 text-accent-soft" strokeWidth={2.2} />
        </div>
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-slate-100">ArchDecision</h1>
          <p className="-mt-0.5 text-xs text-slate-500">Why your codebase is the way it is</p>
        </div>
      </div>
      <a
        data-anim
        href={GITHUB_REPO_URL}
        target="_blank"
        rel="noreferrer noopener"
        className="group inline-flex items-center gap-2 rounded-lg border border-white/10 bg-ink-850/60 px-3.5 py-2 text-sm font-medium text-slate-300 transition hover:border-accent/40 hover:text-white"
      >
        <Github className="h-4 w-4 transition group-hover:text-accent-soft" />
        GitHub Repo
      </a>
    </header>
  );
}
