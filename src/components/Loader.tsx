import { useEffect, useRef } from 'react';
import gsap from 'gsap';

/**
 * First-paint loader. Draws the ArchDecision mark, runs a short reveal timeline,
 * then calls onDone. Respects prefers-reduced-motion.
 */
export default function Loader({ onDone }: { onDone: () => void }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      const t = setTimeout(onDone, 300);
      return () => clearTimeout(t);
    }

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ onComplete: onDone });
      tl.from('.loader-mark path', {
        strokeDashoffset: 220, // animates the stroke "drawing" in (no paid plugin needed)
        duration: 0.9,
        ease: 'power2.inOut',
        stagger: 0.12,
      })
        .from('.loader-word span', { y: 18, opacity: 0, duration: 0.5, ease: 'power3.out', stagger: 0.04 }, '-=0.3')
        .from('.loader-sub', { opacity: 0, y: 8, duration: 0.4 }, '-=0.15')
        .to('.loader-bar-fill', { scaleX: 1, duration: 0.7, ease: 'power1.inOut' }, '-=0.5')
        .to('.loader-root', { opacity: 0, duration: 0.45, ease: 'power2.in', delay: 0.15 });
    }, root);

    return () => ctx.revert();
  }, [onDone]);

  const word = 'ArchDecision';

  return (
    <div
      ref={root}
      className="loader-root fixed inset-0 z-50 grid place-items-center bg-ink-950 bg-grid"
    >
      <div className="flex flex-col items-center">
        <svg className="loader-mark mb-6 h-16 w-16" viewBox="0 0 32 32" fill="none">
          <path
            d="M9 22 L16 8 L23 22"
            stroke="#5b8cff"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="220"
          />
          <path d="M12.2 16 H19.8" stroke="#8fb0ff" strokeWidth="2.4" strokeLinecap="round" strokeDasharray="220" />
        </svg>
        <div className="loader-word flex text-2xl font-semibold tracking-tight text-slate-100">
          {word.split('').map((c, i) => (
            <span key={i} className="inline-block">
              {c}
            </span>
          ))}
        </div>
        <p className="loader-sub mt-2 text-sm text-slate-500">Reading the reasoning your codebase forgot</p>
        <div className="mt-7 h-[3px] w-44 overflow-hidden rounded-full bg-ink-700">
          <div className="loader-bar-fill h-full w-full origin-left scale-x-0 rounded-full bg-gradient-to-r from-accent to-accent-soft" />
        </div>
      </div>
    </div>
  );
}
