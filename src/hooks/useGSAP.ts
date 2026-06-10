import { useLayoutEffect, type RefObject } from 'react';
import gsap from 'gsap';

/**
 * Run a GSAP setup function scoped to a container ref. The context is reverted
 * on cleanup so animations don't leak across re-renders (gsap.context).
 */
export function useGSAP(
  setup: (g: typeof gsap) => void,
  scope: RefObject<HTMLElement | null>,
  deps: unknown[] = [],
): void {
  useLayoutEffect(() => {
    if (!scope.current) return;
    const ctx = gsap.context(() => setup(gsap), scope.current);
    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
