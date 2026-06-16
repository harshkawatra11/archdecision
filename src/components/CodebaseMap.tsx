import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronsDownUp, ChevronsUpDown, Download, ExternalLink, Expand, HelpCircle, Maximize2, Minus, Plus, ScrollText, Shrink, X,
} from 'lucide-react';
import type { ADR, RepoProfileLite } from '../types';
import { buildGraph, childCount, graphBounds, layoutVisible, type GNode } from '../lib/graph';
import { downloadText } from '../lib/download';

const W = 1480;
const H = 980;
const CX = W / 2;
const CY = H / 2;

interface Props {
  profile: RepoProfileLite;
  adrs: ADR[];
  onOpenDecision: (index: number) => void;
}

const CONF_LABEL = { high: 'High confidence', medium: 'Medium confidence', low: 'Low confidence' } as const;
const CONF_DOT = { high: '#3fb950', medium: '#d29922', low: '#8b949e' } as const;
const EV_NOUN: Record<string, string> = {
  dependency: 'a dependency', file: 'a source file', config: 'a config file', readme: 'the README', structure: 'a structural fact',
};

export default function CodebaseMap({ profile, adrs, onOpenDecision }: Props) {
  const graph = useMemo(() => buildGraph(profile, adrs), [profile.sha]); // eslint-disable-line react-hooks/exhaustive-deps

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const expandedKey = useMemo(() => [...expanded].sort().join('|'), [expanded]);

  // Lay out only the visible part for the current expansion, and fit it.
  const { vis, fit } = useMemo(() => {
    const v = layoutVisible(graph, expanded, { width: W, height: H });
    const b = graphBounds(v.nodes);
    const bw = Math.max(1, b.maxX - b.minX);
    const bh = Math.max(1, b.maxY - b.minY);
    const pad = 120;
    const k = Math.min(2, Math.max(0.3, Math.min((W - pad * 2) / bw, (H - pad * 2) / bh)));
    return { vis: v, fit: { x: W / 2 - k * (b.minX + bw / 2), y: H / 2 - k * (b.minY + bh / 2), k } };
  }, [graph, expandedKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const byId = useMemo(() => new Map(graph.nodes.map((n) => [n.id, n])), [graph]);
  const areas = useMemo(() => graph.nodes.filter((n) => n.type === 'area'), [graph]);
  const childCounts = useMemo(() => {
    const m = new Map<string, number>();
    graph.nodes.forEach((n) => {
      if (n.type === 'area' || n.type === 'decision') m.set(n.id, childCount(graph, n.id));
    });
    return m;
  }, [graph]);

  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [t, setT] = useState(fit);
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [guide, setGuide] = useState(true);
  const [isFull, setIsFull] = useState(false);
  const pan = useRef({ on: false, start: { x: 0, y: 0 }, startT: { x: 0, y: 0 }, moved: false });

  // Re-fit on expansion changes.
  useEffect(() => {
    setT(fit);
  }, [fit]);

  useEffect(() => {
    const onFs = () => setIsFull(document.fullscreenElement === wrapRef.current);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  const toUser = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const p = pt.matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const u = toUser(e.clientX, e.clientY);
      setT((prev) => {
        const wx = (u.x - prev.x) / prev.k;
        const wy = (u.y - prev.y) / prev.k;
        const k = Math.min(3, Math.max(0.25, prev.k * (e.deltaY < 0 ? 1.12 : 1 / 1.12)));
        return { x: u.x - wx * k, y: u.y - wy * k, k };
      });
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, [toUser]);

  const zoomCenter = (f: number) =>
    setT((prev) => {
      const wx = (W / 2 - prev.x) / prev.k;
      const wy = (H / 2 - prev.y) / prev.k;
      const k = Math.min(3, Math.max(0.25, prev.k * f));
      return { x: W / 2 - wx * k, y: H / 2 - wy * k, k };
    });

  const toggleExpand = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  const expandAll = () => {
    const all = new Set<string>();
    graph.nodes.forEach((n) => {
      if ((n.type === 'area' || n.type === 'decision') && (childCounts.get(n.id) || 0) > 0) all.add(n.id);
    });
    setExpanded(all);
  };
  const collapseAll = () => setExpanded(new Set());

  const onNodeClick = (n: GNode) => {
    setSelected(n.id);
    if (n.type === 'area' || (n.type === 'decision' && (childCounts.get(n.id) || 0) > 0)) toggleExpand(n.id);
  };

  const onBgDown = (e: React.PointerEvent) => {
    const u = toUser(e.clientX, e.clientY);
    pan.current = { on: true, start: u, startT: { x: t.x, y: t.y }, moved: false };
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!pan.current.on) return;
    const u = toUser(e.clientX, e.clientY);
    if (Math.hypot(u.x - pan.current.start.x, u.y - pan.current.start.y) > 4) pan.current.moved = true;
    setT((prev) => ({ ...prev, x: pan.current.startT.x + (u.x - pan.current.start.x), y: pan.current.startT.y + (u.y - pan.current.start.y) }));
  };
  const onUp = () => {
    if (pan.current.on && !pan.current.moved) setSelected(null);
    pan.current.on = false;
  };

  const toggleFull = async () => {
    if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
    else await wrapRef.current?.requestFullscreen().catch(() => {});
  };

  const activeBranch = useMemo(() => {
    const id = hovered ?? selected;
    if (!id) return null;
    const n = byId.get(id);
    if (!n || n.type === 'repo') return null;
    return n.branch || n.id;
  }, [hovered, selected, byId]);

  const sel = selected ? byId.get(selected) : null;
  const selAdr = sel?.type === 'decision' && sel.adrIndex != null ? adrs[sel.adrIndex] : null;
  const selTypeLabel = !sel ? '' : sel.type === 'area'
    ? sel.id === 'area:__structure' ? 'Module group' : sel.id === 'area:__stack' ? 'Language group' : 'Architecture area'
    : { repo: 'Repository', decision: 'Architectural decision', evidence: 'Evidence', module: 'Folder', language: 'Language' }[sel.type] || '';

  const downloadSvg = () => {
    const svg = svgRef.current;
    if (!svg) return;
    downloadText(`archdecision-${profile.repo}-map.svg`, '<?xml version="1.0" encoding="UTF-8"?>\n' + svg.outerHTML);
  };

  const isDim = (n: GNode) => activeBranch != null && n.type !== 'repo' && n.branch !== activeBranch && n.id !== activeBranch;
  const showLabel = (n: GNode) => {
    if (n.type === 'repo' || n.type === 'area') return true;
    if (selected === n.id) return true;
    if (activeBranch && n.branch === activeBranch) return true;
    return t.k > 1.5;
  };
  const linkPath = (s: GNode, tg: GNode) => {
    const sr = Math.hypot(s.x - CX, s.y - CY);
    return `M ${s.x} ${s.y} Q ${CX + Math.cos(tg.angle) * sr} ${CY + Math.sin(tg.angle) * sr} ${tg.x} ${tg.y}`;
  };
  const expandableOpen = (n: GNode) => (n.type === 'area' || n.type === 'decision') && (childCounts.get(n.id) || 0) > 0
    ? (expanded.has(n.id) ? 'open' : 'closed')
    : null;

  return (
    <div className="mx-auto max-w-6xl">
      <p className="mb-3 text-center text-sm text-slate-400">
        A mind-map of this repository. Start with the branches, then click one to open its decisions, and a
        decision to see the evidence that proves it.
      </p>

      <div
        ref={wrapRef}
        className="relative overflow-hidden rounded-2xl border border-white/10 bg-ink-950"
        style={{ height: isFull ? '100vh' : '72vh' }}
      >
        {/* reading guide */}
        {guide ? (
          <div className="absolute left-3 top-3 z-20 w-[270px] rounded-xl border border-white/10 bg-ink-900/90 p-3.5 backdrop-blur">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-emerald-300">
                <HelpCircle className="h-3.5 w-3.5" /> How to read this
              </span>
              <button onClick={() => setGuide(false)} className="text-slate-500 hover:text-slate-200" aria-label="Dismiss"><X className="h-3.5 w-3.5" /></button>
            </div>
            <ul className="mt-2.5 space-y-1.5 text-[12px] leading-relaxed text-slate-300">
              <li><span className="text-emerald-300">Center</span> is the repository.</li>
              <li>Each <span className="text-slate-100">colored branch</span> is an architecture area, a module group, or the languages.</li>
              <li><span className="text-slate-100">Click a branch</span> to open its decisions; click a decision to see its evidence.</li>
              <li>Click any node for full, plain-English detail. Use the fullscreen button for a bigger canvas.</li>
            </ul>
          </div>
        ) : (
          <button onClick={() => setGuide(true)} className="absolute left-3 top-3 z-20 grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-ink-900/80 text-slate-300 backdrop-blur transition hover:text-white" title="How to read this">
            <HelpCircle className="h-4 w-4" />
          </button>
        )}

        {/* toolbar */}
        <div className="absolute right-3 top-3 z-20 flex items-center gap-1.5">
          <ToolBtn onClick={expandAll} title="Expand all"><ChevronsUpDown className="h-4 w-4" /></ToolBtn>
          <ToolBtn onClick={collapseAll} title="Collapse all"><ChevronsDownUp className="h-4 w-4" /></ToolBtn>
          <span className="mx-0.5 h-5 w-px bg-white/10" />
          <ToolBtn onClick={() => zoomCenter(1 / 1.2)} title="Zoom out"><Minus className="h-4 w-4" /></ToolBtn>
          <ToolBtn onClick={() => zoomCenter(1.2)} title="Zoom in"><Plus className="h-4 w-4" /></ToolBtn>
          <ToolBtn onClick={() => setT(fit)} title="Fit to view"><Maximize2 className="h-4 w-4" /></ToolBtn>
          <ToolBtn onClick={downloadSvg} title="Download as SVG"><Download className="h-4 w-4" /></ToolBtn>
          <ToolBtn onClick={toggleFull} title={isFull ? 'Exit fullscreen' : 'Fullscreen'}>{isFull ? <Shrink className="h-4 w-4" /> : <Expand className="h-4 w-4" />}</ToolBtn>
        </div>

        {/* branch legend */}
        <div className="absolute bottom-3 left-3 right-3 z-20 flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border border-white/[0.07] bg-ink-900/80 px-3 py-2 backdrop-blur">
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-slate-500">Branches</span>
          {areas.map((a) => (
            <button
              key={a.id}
              onMouseEnter={() => setHovered(a.id)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => { setSelected(a.id); toggleExpand(a.id); }}
              className={`flex items-center gap-1.5 text-[11px] transition hover:text-white ${expanded.has(a.id) ? 'text-white' : 'text-slate-300'}`}
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: a.color }} />
              {a.label}
              <span className="text-slate-600">{childCounts.get(a.id) || 0}</span>
            </button>
          ))}
        </div>

        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          height="100%"
          preserveAspectRatio="xMidYMid meet"
          className="block touch-none select-none"
          style={{ cursor: pan.current.on ? 'grabbing' : 'grab' }}
          onPointerDown={onBgDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerLeave={onUp}
        >
          <defs>
            <radialGradient id="map-bg" cx="50%" cy="48%" r="60%">
              <stop offset="0%" stopColor="#0e1620" />
              <stop offset="100%" stopColor="#010409" />
            </radialGradient>
            <filter id="elev" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.55" />
            </filter>
          </defs>
          <rect x={0} y={0} width={W} height={H} fill="url(#map-bg)" />

          <g transform={`translate(${t.x},${t.y}) scale(${t.k})`}>
            {vis.links.map((l, i) => {
              const a = byId.get(l.source);
              const b = byId.get(l.target);
              if (!a || !b) return null;
              const branch = b.branch || b.id;
              const hot = activeBranch != null && branch === activeBranch;
              const dim = activeBranch != null && !hot;
              return <path key={i} d={linkPath(a, b)} fill="none" stroke={l.color} strokeOpacity={hot ? 0.85 : dim ? 0.06 : 0.3} strokeWidth={hot ? 2 : 1.3} />;
            })}

            {vis.nodes.map((n) => {
              const dim = isDim(n);
              const focus = hovered === n.id || selected === n.id;
              const r = focus ? n.r * 1.16 : n.r;
              const labelOut = n.r + 13;
              const lx = Math.cos(n.angle) * labelOut;
              const ly = Math.sin(n.angle) * labelOut;
              const anchor = n.type === 'repo' ? 'middle' : Math.cos(n.angle) > 0.35 ? 'start' : Math.cos(n.angle) < -0.35 ? 'end' : 'middle';
              const count = n.type === 'area' ? childCounts.get(n.id) || 0 : 0;
              const exp = expandableOpen(n);
              return (
                <g
                  key={n.id}
                  transform={`translate(${n.x},${n.y})`}
                  style={{ cursor: 'pointer', opacity: dim ? 0.22 : 1 }}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); onNodeClick(n); }}
                  onPointerEnter={() => setHovered(n.id)}
                  onPointerLeave={() => setHovered(null)}
                >
                  {focus && <circle r={r + 7} fill="none" stroke={n.color} strokeOpacity={0.4} strokeWidth={2} />}
                  <circle r={r} fill={n.color} fillOpacity={n.type === 'evidence' ? 0.82 : 1} stroke={selected === n.id ? '#fff' : 'rgba(1,4,9,0.6)'} strokeWidth={selected === n.id ? 2.5 : 1.5} filter="url(#elev)" />
                  {n.type === 'decision' && n.confidence && <circle r={r * 0.42} fill={CONF_DOT[n.confidence]} stroke="rgba(1,4,9,0.5)" strokeWidth={1} />}
                  {/* expand/collapse glyph */}
                  {exp && (
                    <text textAnchor="middle" dy={n.type === 'area' ? 5 : 4} fontSize={n.type === 'area' ? 16 : 13} fontWeight={800} fill="#021207" style={{ pointerEvents: 'none' }}>
                      {exp === 'open' ? '–' : '+'}
                    </text>
                  )}
                  {n.type === 'repo' && <text textAnchor="middle" dy={4} fontSize={12} fontWeight={700} fill="#021207" style={{ pointerEvents: 'none' }}>REPO</text>}
                  {showLabel(n) && n.type !== 'repo' && (
                    <text x={lx} y={ly} textAnchor={anchor} dominantBaseline="middle" fontSize={n.type === 'area' ? 14 : 11.5} fontWeight={n.type === 'area' ? 700 : 500} fill={dim ? '#6e7681' : n.type === 'area' ? '#f0f6fc' : '#c9d1d9'} style={{ pointerEvents: 'none', paintOrder: 'stroke' }} stroke="#010409" strokeWidth={3.5} strokeOpacity={0.92}>
                      {n.label}{n.type === 'area' && count > 0 ? `  ·  ${count}` : ''}
                    </text>
                  )}
                  {n.type === 'repo' && (
                    <text y={n.r + 18} textAnchor="middle" fontSize={14} fontWeight={700} fill="#f0f6fc" style={{ pointerEvents: 'none', paintOrder: 'stroke' }} stroke="#010409" strokeWidth={4} strokeOpacity={0.92}>{n.label}</text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>

        {/* detail panel */}
        {sel && (
          <div className="absolute right-3 top-14 z-20 max-h-[70%] w-80 overflow-y-auto rounded-xl border border-white/10 bg-ink-900/95 p-4 shadow-card backdrop-blur">
            <div className="flex items-start justify-between gap-2">
              <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: sel.color }}>
                <span className="h-2 w-2 rounded-full" style={{ background: sel.color }} />{selTypeLabel}
              </span>
              <button onClick={() => setSelected(null)} className="text-slate-500 hover:text-slate-200" aria-label="Close"><X className="h-4 w-4" /></button>
            </div>
            <p className="mt-2 text-[15px] font-semibold leading-snug text-slate-100">{sel.label}</p>

            {selAdr && (
              <div className="mt-2.5 space-y-2.5 text-[12.5px] leading-relaxed">
                <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: CONF_DOT[selAdr.confidence] }} /><span className="text-slate-400">{CONF_LABEL[selAdr.confidence]}</span></div>
                <p className="text-slate-300"><span className="font-semibold text-slate-100">Decision. </span>{selAdr.decision}</p>
                <p className="text-slate-400"><span className="font-semibold text-slate-200">Why. </span>{selAdr.rationale}</p>
                <button onClick={() => onOpenDecision(sel.adrIndex!)} className="mt-1 inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-[12px] font-semibold text-white transition hover:bg-accent-soft"><ScrollText className="h-3.5 w-3.5" /> Open full decision</button>
              </div>
            )}

            {sel.type === 'module' && sel.folder && (
              <div className="mt-2.5 space-y-2 text-[12.5px] leading-relaxed text-slate-400">
                <p className="text-slate-300">
                  <span className="font-semibold text-slate-100">{sel.folder.fileCount}</span> file{sel.folder.fileCount === 1 ? '' : 's'}
                  {sel.folder.sizeKB ? <> · <span className="font-semibold text-slate-100">{sel.folder.sizeKB}</span> KB</> : null}
                  {sel.folder.topExtensions.length ? <> · mostly {sel.folder.topExtensions.map((e) => `.${e}`).join(', ')}</> : null}
                </p>
                {sel.folder.subdirs.length > 0 && (
                  <p><span className="font-semibold text-slate-200">Subfolders. </span>{sel.folder.subdirs.join(', ')}</p>
                )}
                <a href={`https://github.com/${profile.owner}/${profile.repo}/tree/${profile.sha}/${sel.label}`} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1.5 text-[12px] font-medium text-accent hover:underline"><ExternalLink className="h-3.5 w-3.5" /> Browse folder on GitHub</a>
              </div>
            )}

            {sel.type === 'evidence' && (
              <div className="mt-2.5 space-y-2 text-[12.5px] leading-relaxed">
                <p className="text-slate-400">This decision is grounded in {EV_NOUN[sel.evType || 'file'] || 'evidence'}.</p>
                <p className="break-all rounded-md bg-white/[0.03] px-2 py-1.5 font-mono text-[11px] text-slate-300">{sel.ref}</p>
                {sel.note && <p className="text-slate-400">{sel.note}</p>}
                {sel.evType === 'file' && sel.ref && (
                  <a href={`https://github.com/${profile.owner}/${profile.repo}/blob/${profile.sha}/${sel.ref.split(':')[0].trim()}`} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1.5 text-[12px] font-medium text-accent hover:underline"><ExternalLink className="h-3.5 w-3.5" /> View on GitHub</a>
                )}
              </div>
            )}

            {sel.type === 'language' && <p className="mt-2 text-[12.5px] leading-relaxed text-slate-400">{sel.note}</p>}

            {sel.type === 'area' && (() => {
              const n = childCounts.get(sel.id) || 0;
              const noun = sel.id === 'area:__structure' ? 'module' : sel.id === 'area:__stack' ? 'language' : 'recorded decision';
              const lead = sel.id === 'area:__structure' ? 'A group of the top-level modules in the repo'
                : sel.id === 'area:__stack' ? 'The primary languages detected'
                : 'An architecture area';
              return <p className="mt-2 text-[12.5px] leading-relaxed text-slate-400">{lead}, with {n} {noun}{n === 1 ? '' : 's'}. {expanded.has(sel.id) ? 'Click again to collapse it.' : 'Click to open it.'}</p>;
            })()}

            {sel.type === 'repo' && <p className="mt-2 text-[12.5px] leading-relaxed text-slate-400">The codebase at commit {profile.sha.slice(0, 8)}. Each branch is one area of its architecture.</p>}
          </div>
        )}
      </div>

      <p className="mt-3 text-center text-[12px] text-slate-600">
        Click a branch to expand · scroll to zoom · drag to pan · click a node for plain-English detail.
      </p>
    </div>
  );
}

function ToolBtn({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button onClick={onClick} title={title} aria-label={title} className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-ink-900/80 text-slate-300 backdrop-blur transition hover:border-white/25 hover:text-white">
      {children}
    </button>
  );
}
