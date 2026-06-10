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
        data-anim
        href={GITHUB_REPO_URL}
        target="_blank"
        rel="noreferrer noopener"
        className="group inline-flex items-center gap-2.5 self-center rounded-full border border-ink-600 bg-black py-1.5 pl-2 pr-4 transition hover:border-ink-500"
      >
        <span className="grid h-6 w-6 place-items-center rounded-full bg-black">
          <Github className="h-[18px] w-[18px] text-[#8b949e] transition group-hover:text-slate-200" fill="currentColor" strokeWidth={0} />
        </span>
        <span className="text-[13px] font-semibold text-slate-200">GitHub Repo</span>
      </a>
    </header>
  );
}
