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
    <header ref={ref} className="flex items-center justify-between py-3.5">
      <div data-anim className="flex items-center gap-3">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-accent/10 ring-1 ring-accent/30">
          <GitBranch className="h-4 w-4 text-accent-soft" strokeWidth={2.2} />
        </div>
        <div className="flex items-baseline gap-3">
          <h1 className="text-[15px] font-semibold tracking-tight text-slate-100">ArchDecision</h1>
          <p className="hidden text-xs text-slate-500 sm:block">Why your codebase is the way it is</p>
        </div>
      </div>
      <a
        href={GITHUB_REPO_URL}
        target="_blank"
        rel="noreferrer noopener"
        className="group inline-flex items-center gap-2 rounded-md border border-[rgba(240,246,252,0.1)] bg-[#21262d] px-3 py-1.5 text-[13px] font-semibold text-slate-100 shadow-sm transition hover:border-[rgba(240,246,252,0.2)] hover:bg-[#30363d]"
      >
        <Github className="h-4 w-4 text-slate-300 transition group-hover:text-white" fill="currentColor" strokeWidth={0} />
        GitHub
      </a>
    </header>
  );
}
