import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize,
  RotateCcw,
  Download,
  FileImage,
  FileText,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { exportSvg, exportPng, exportPdf, relKeyOf } from '../../lib/model-export';
import { HEALTH_TONE, healthTone } from '../../lib/bi-model-utils';

const NODE_W = 250;
const HEADER_H = 40;
const ROW_H = 17;
const PAD_B = 8;
const DIM_X = 44;
const FACT_X = 990;
const NODE_GAP = 30;
const MARGIN = 44;
const WIDTH = FACT_X + NODE_W + MARGIN;
const MIN_VIEW_H = 420;

const ROLE_BADGE = {
  primary_key: { t: 'PK', bg: '#dbeafe', fg: '#1d4ed8', label: 'Clé primaire' },
  foreign_key: { t: 'FK', bg: '#ede9fe', fg: '#6d28d9', label: 'Clé étrangère' },
  business_key: { t: 'BK', bg: '#e0e7ff', fg: '#4338ca', label: 'Clé métier' },
  measure: { t: 'M', bg: '#d1fae5', fg: '#047857', label: 'Mesure' },
  attribute: null,
};

function num(n) {
  return Number.isFinite(n) ? n.toLocaleString('fr-FR') : String(n);
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function nodeH(cols) {
  return HEADER_H + 1 + (cols || []).length * ROW_H + PAD_B;
}

function ColumnRow({ x, y, col }) {
  const badge = ROLE_BADGE[col.role] || ROLE_BADGE.attribute;
  return (
    <g>
      {badge ? (
        <>
          <rect x={x + 6} y={y} width={22} height={12} rx={3} fill={badge.bg} />
          <text x={x + 17} y={y + 9} textAnchor="middle" fontSize="7.5" fontWeight="700" fill={badge.fg}>
            {badge.t}
          </text>
        </>
      ) : (
        <circle cx={x + 17} cy={y + 6} r={2.5} fill="#94a3b8" />
      )}
      <text x={x + 34} y={y + 9} fontSize="10.5" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fill="#334155">
        {col.name}
      </text>
      <title>{badge ? badge.label : 'Attribut'}{col.note ? ` — ${col.note}` : ''}</title>
    </g>
  );
}

export default function StarSchema({
  model,
  selectedNode,
  selectedRel,
  searchQuery = '',
  filter = 'all',
  focusRequest = null,
  outerSvgRef = null,
  onSelectNode,
  onSelectRel,
}) {
  const { dimensions, facts, relationships } = model;
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const dragRef = useRef(null);
  const [view, setView] = useState({ scale: 1, tx: 0, ty: 0 });
  const [viewH, setViewH] = useState(() =>
    Math.max(MIN_VIEW_H, Math.round(((typeof window !== 'undefined' ? window.innerWidth : 1280) - 280) * 0.9))
  );
  const [panning, setPanning] = useState(false);
  const [hover, setHover] = useState(null);
  const [tip, setTip] = useState({ x: 0, y: 0 });

  const healthMap = useMemo(() => {
    const m = {};
    (model.fkHealth || []).forEach((h) => { m[relKeyOf(h)] = h; });
    return m;
  }, [model.fkHealth]);

  const relByKey = useMemo(() => {
    const m = {};
    relationships.forEach((r) => { m[relKeyOf(r)] = r; });
    return m;
  }, [relationships]);

  const dimByName = useMemo(() => Object.fromEntries(dimensions.map((d) => [d.name, d])), [dimensions]);
  const factByName = useMemo(() => Object.fromEntries(facts.map((f) => [f.name, f])), [facts]);

  const dimY = useMemo(() => {
    const m = {};
    let y = MARGIN;
    dimensions.forEach((d) => { m[d.name] = y; y += nodeH(d.columns) + NODE_GAP; });
    return m;
  }, [dimensions]);
  const factY = useMemo(() => {
    const m = {};
    let y = MARGIN;
    facts.forEach((f) => { m[f.name] = y; y += nodeH(f.columns) + NODE_GAP; });
    return m;
  }, [facts]);

  const height = useMemo(
    () => MARGIN + Math.max(dimensions.reduce((a, d) => a + nodeH(d.columns) + NODE_GAP, 0), facts.reduce((a, f) => a + nodeH(f.columns) + NODE_GAP, 0)),
    [dimensions, facts]
  );

  const edges = useMemo(
    () => relationships.filter((r) => dimY[r.dimension] !== undefined && factY[r.fact] !== undefined),
    [relationships, dimY, factY]
  );

  const healthOf = (r) => healthMap[relKeyOf(r)] || null;

  const searchSet = useMemo(() => {
    if (!searchQuery || !searchQuery.trim()) return null;
    const q = searchQuery.trim().toLowerCase();
    const set = new Set();
    const matches = (t) =>
      t.name.toLowerCase().includes(q) ||
      (t.columns || []).some((c) => String(c.name).toLowerCase().includes(q));
    dimensions.forEach((d) => { if (matches(d)) set.add(d.name); });
    facts.forEach((f) => { if (matches(f)) set.add(f.name); });
    return set;
  }, [searchQuery, dimensions, facts]);

  const selectedRelObj = useMemo(
    () => (selectedRel ? relByKey[selectedRel] || null : null),
    [selectedRel, relByKey]
  );

  const visibleEdges = useMemo(() => {
    if (filter === 'dimensions' || filter === 'facts') return [];
    return edges.filter((r) => {
      if (filter === 'broken') return (healthOf(r)?.health ?? 100) < 100;
      if (filter === 'healthy') return (healthOf(r)?.health ?? 100) === 100;
      if (filter === 'selectedFact') {
        return !!selectedNode && selectedNode.kind === 'fact' && r.fact === selectedNode.name;
      }
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edges, filter, selectedNode, healthMap]);

  const nodeRendered = (name, kind) => {
    if (filter === 'dimensions') return kind === 'dimension';
    if (filter === 'facts') return kind === 'fact';
    return true;
  };

  const nodeLit = (name, kind) => {
    if (!nodeRendered(name, kind)) return false;
    if (hover) {
      const rel = relByKey[hover];
      if (!rel) return false;
      return (kind === 'fact' && rel.fact === name) || (kind === 'dimension' && rel.dimension === name);
    }
    if (searchSet) return searchSet.has(name);
    if (selectedRelObj) {
      return (kind === 'fact' && selectedRelObj.fact === name) || (kind === 'dimension' && selectedRelObj.dimension === name);
    }
    if (selectedNode) {
      if (selectedNode.kind === kind && selectedNode.name === name) return true;
      return relationships.some(
        (r) =>
          (r.fact === name || r.dimension === name) &&
          (r.fact === selectedNode.name || r.dimension === selectedNode.name)
      );
    }
    if (filter === 'broken' || filter === 'healthy' || filter === 'selectedFact') {
      return visibleEdges.some((r) => r.fact === name || r.dimension === name);
    }
    return true;
  };

  const edgeActive = (r) => {
    if (hover) return relKeyOf(r) === hover;
    if (searchSet) return searchSet.has(r.fact) && searchSet.has(r.dimension);
    if (selectedRel) return relKeyOf(r) === selectedRel;
    if (selectedNode) return r.fact === selectedNode.name || r.dimension === selectedNode.name;
    return true;
  };

  const isNodeSelected = (name, kind) =>
    selectedNode && selectedNode.kind === kind && selectedNode.name === name;

  const hasFocus = !!(hover || searchSet || selectedRelObj || selectedNode);

  const edgeStroke = (r, active) => {
    if (active && hover && relKeyOf(r) === hover) return HEALTH_TONE.cyan;
    if (active && selectedRel && relKeyOf(r) === selectedRel) return HEALTH_TONE.cyan;
    const h = healthOf(r);
    return HEALTH_TONE[healthTone(h ? h.health : null)];
  };

  const edgeWidth = (r) => {
    const h = healthOf(r);
    return clamp(1.3 + Math.log10((h ? h.rows : 0) + 1) * 1.05, 1.3, 6);
  };

  const edgePath = (x1, y1, x2, y2) => {
    const dx = (x2 - x1) * 0.5;
    return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
  };

  const fitView = () => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const nextH = Math.max(MIN_VIEW_H, Math.round(rect.width * (height / WIDTH)));
    setViewH(nextH);
    const scale = clamp(Math.min(rect.width / WIDTH, nextH / height), 0.1, 3);
    setView({ scale, tx: (rect.width - WIDTH * scale) / 2, ty: (nextH - height * scale) / 2 });
  };

  const resetView = () => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setView({ scale: 1, tx: Math.max(0, (rect.width - WIDTH) / 2), ty: Math.max(0, (rect.height - height) / 2) });
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;
    const raf = requestAnimationFrame(fitView);
    let ro;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => fitView());
      ro.observe(el);
    }
    return () => {
      cancelAnimationFrame(raf);
      if (ro) ro.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model, height]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;
    const onWheel = (e) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      setView((v) => {
        const scale = clamp(v.scale * factor, 0.15, 3);
        const k = scale / v.scale;
        return { scale, tx: cx - (cx - v.tx) * k, ty: cy - (cy - v.ty) * k };
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !focusRequest) return;
    const rect = el.getBoundingClientRect();
    const { kind, name } = focusRequest;
    const y = kind === 'dimension' ? dimY[name] : factY[name];
    if (y === undefined) return;
    const cols = (kind === 'dimension' ? dimByName[name] : factByName[name])?.columns || [];
    const cx = (kind === 'dimension' ? DIM_X : FACT_X) + NODE_W / 2;
    const cy = y + nodeH(cols) / 2;
    setView((v) => ({ ...v, tx: rect.width / 2 - cx * v.scale, ty: rect.height / 2 - cy * v.scale }));
  }, [focusRequest, dimY, factY, dimByName, factByName]);

  const onPointerDown = (e) => {
    if (e.target && (e.target.closest('[data-node]') || e.target.closest('[data-edge]') || e.target.closest('button'))) return;
    dragRef.current = { x: e.clientX, y: e.clientY, tx: view.tx, ty: view.ty };
    setPanning(true);
    try {
      containerRef.current?.setPointerCapture(e.pointerId);
    } catch {
      // ignore capture errors
    }
  };
  const onPointerMove = (e) => {
    const d = dragRef.current;
    if (!d) return;
    setView((v) => ({ ...v, tx: d.tx + (e.clientX - d.x), ty: d.ty + (e.clientY - d.y) }));
  };
  const onPointerUp = (e) => {
    const d = dragRef.current;
    if (d) {
      const moved = Math.abs(e.clientX - d.x) + Math.abs(e.clientY - d.y) > 4;
      dragRef.current = null;
      if (!moved) {
        onSelectNode(null);
        onSelectRel(null);
      }
    }
    setPanning(false);
  };

  const zoomBy = (factor) => {
    setView((v) => ({ ...v, scale: clamp(v.scale * factor, 0.15, 3) }));
  };

  const toggleNode = (name, kind) => {
    if (isNodeSelected(name, kind)) onSelectNode(null);
    else onSelectNode({ kind, name });
  };

  const onEdgeMove = (e) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTip({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const fileName = (ext) => `modele-dimensionnel.${ext}`;
  const exportTargets = [
    { label: 'SVG', icon: Download, run: () => exportSvg(svgRef.current, fileName('svg')) },
    { label: 'PNG', icon: FileImage, run: () => exportPng(svgRef.current, fileName('png')) },
    { label: 'PDF', icon: FileText, run: () => exportPdf(svgRef.current, fileName('pdf'), 'Modèle dimensionnel — Schéma en étoile') },
  ];

  const hoverHealth = hover ? healthMap[hover] : null;
  const hoverRel = hover ? relByKey[hover] : null;

  return (
    <div
      ref={containerRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className={cnWrap(panning)}
      style={{ height: viewH, backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '16px 16px' }}
    >
      <div
        style={{ transform: `translate(${view.tx}px, ${view.ty}px) scale(${view.scale})`, transformOrigin: '0 0' }}
        className="relative origin-top-left"
      >
        <svg
          ref={(el) => {
            svgRef.current = el;
            if (outerSvgRef) outerSvgRef.current = el;
          }}
          width={WIDTH}
          height={height}
          viewBox={`0 0 ${WIDTH} ${height}`}
        >
          {visibleEdges.map((r) => {
            const dim = dimByName[r.dimension];
            const fact = factByName[r.fact];
            const dimIdx = Math.max(0, (dim.columns || []).findIndex((c) => c.name === r.pk));
            const factIdx = Math.max(0, (fact.columns || []).findIndex((c) => c.name === r.fk));
            const y1 = dimY[r.dimension] + HEADER_H + 1 + dimIdx * ROW_H + ROW_H / 2;
            const y2 = factY[r.fact] + HEADER_H + 1 + factIdx * ROW_H + ROW_H / 2;
            const x1 = DIM_X + NODE_W;
            const x2 = FACT_X;
            const active = edgeActive(r);
            const stroke = edgeStroke(r, active);
            const width = active ? Math.max(edgeWidth(r), 2.2) : 1.2;
            const opacity = active ? (hover || selectedRel || selectedNode || searchSet ? 1 : 0.95) : 0.12;
            const mx = (x1 + x2) / 2;
            const my = (y1 + y2) / 2;
            const key = relKeyOf(r);
            return (
              <g
                key={key}
                data-edge
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectNode(null);
                  onSelectRel(selectedRel === key ? null : key);
                }}
                onMouseEnter={() => setHover(key)}
                onMouseLeave={() => { setHover(null); setTip({ x: 0, y: 0 }); }}
                onMouseMove={onEdgeMove}
                style={{ cursor: 'pointer' }}
              >
                <path d={edgePath(x1, y1, x2, y2)} fill="none" stroke="transparent" strokeWidth={18} />
                <path d={edgePath(x1, y1, x2, y2)} fill="none" stroke={stroke} strokeWidth={width} strokeOpacity={opacity} />
                <circle cx={x1 - 10} cy={y1 - 13} r={8} fill="#ffffff" stroke={stroke} strokeWidth={active ? 1.5 : 1} opacity={opacity + 0.15} />
                <text x={x1 - 10} y={y1 - 9.5} textAnchor="middle" fontSize="9" fontWeight="700" fill={stroke} opacity={opacity + 0.15}>1</text>
                <circle cx={x2 + 10} cy={y2 - 13} r={8} fill="#ffffff" stroke={stroke} strokeWidth={active ? 1.5 : 1} opacity={opacity + 0.15} />
                <text x={x2 + 10} y={y2 - 9.5} textAnchor="middle" fontSize="9" fontWeight="700" fill={stroke} opacity={opacity + 0.15}>N</text>
                <g opacity={active ? 1 : 0.25}>
                  <rect x={mx - 95} y={my - 24} width={190} height={48} rx={6} fill="#ffffff" opacity={0.92} stroke="#e2e8f0" />
                  <text x={mx} y={my - 13} textAnchor="middle" fontSize="8.5" fill="#64748b">Cardinalité 1 → N</text>
                  <text x={mx} y={my} textAnchor="middle" fontSize="9.5" fontWeight="600" fontFamily="ui-monospace, monospace" fill="#6d28d9">{r.fact}.{r.fk}</text>
                  <text x={mx} y={my + 11} textAnchor="middle" fontSize="9" fill="#94a3b8">↓</text>
                  <text x={mx} y={my + 23} textAnchor="middle" fontSize="9.5" fontWeight="600" fontFamily="ui-monospace, monospace" fill="#1d4ed8">{r.dimension}.{r.pk}</text>
                </g>
              </g>
            );
          })}

          {dimensions.map((d) => {
            if (!nodeRendered(d.name, 'dimension')) return null;
            const y = dimY[d.name];
            const h = nodeH(d.columns);
            const sel = isNodeSelected(d.name, 'dimension');
            const lit = nodeLit(d.name, 'dimension');
            const con = lit && hasFocus && !sel;
            const stroke = sel ? '#0f172a' : con ? '#059669' : '#2563eb';
            return (
              <g
                key={d.name}
                data-node
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectRel(null);
                  toggleNode(d.name, 'dimension');
                }}
                style={{ cursor: 'pointer' }}
                opacity={lit ? 1 : 0.13}
              >
                <rect x={DIM_X} y={y} width={NODE_W} height={h} rx={8} fill="#2563eb" />
                <rect x={DIM_X} y={y + HEADER_H} width={NODE_W} height={h - HEADER_H} fill="#ffffff" />
                <rect x={DIM_X} y={y + HEADER_H - 8} width={NODE_W} height={8} fill="#2563eb" />
                <line x1={DIM_X} y1={y + HEADER_H} x2={DIM_X + NODE_W} y2={y + HEADER_H} stroke="#dbeafe" strokeWidth={1} />
                <text x={DIM_X + 12} y={y + 25} fill="#ffffff" fontSize="12.5" fontWeight="700">{d.name}</text>
                <text x={DIM_X + NODE_W - 12} y={y + 25} textAnchor="end" fill="#dbeafe" fontSize="9.5">{num(d.count)} lignes</text>
                <rect x={DIM_X} y={y} width={NODE_W} height={h} rx={8} fill="none" stroke={stroke} strokeWidth={sel ? 3 : con ? 2.5 : 1} />
                {(d.columns || []).map((c, i) => (
                  <ColumnRow key={c.name} x={DIM_X} y={y + HEADER_H + 1 + i * ROW_H} col={c} />
                ))}
              </g>
            );
          })}

          {facts.map((f) => {
            if (!nodeRendered(f.name, 'fact')) return null;
            const y = factY[f.name];
            const h = nodeH(f.columns);
            const sel = isNodeSelected(f.name, 'fact');
            const lit = nodeLit(f.name, 'fact');
            const con = lit && hasFocus && !sel;
            const stroke = sel ? '#0f172a' : con ? '#059669' : '#c2410c';
            return (
              <g
                key={f.name}
                data-node
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectRel(null);
                  toggleNode(f.name, 'fact');
                }}
                style={{ cursor: 'pointer' }}
                opacity={lit ? 1 : 0.13}
              >
                <rect x={FACT_X} y={y} width={NODE_W} height={h} rx={8} fill="#ea580c" />
                <rect x={FACT_X} y={y + HEADER_H} width={NODE_W} height={h - HEADER_H} fill="#ffffff" />
                <rect x={FACT_X} y={y + HEADER_H - 8} width={NODE_W} height={8} fill="#ea580c" />
                <line x1={FACT_X} y1={y + HEADER_H} x2={FACT_X + NODE_W} y2={y + HEADER_H} stroke="#fed7aa" strokeWidth={1} />
                <text x={FACT_X + 12} y={y + 25} fill="#ffffff" fontSize="12.5" fontWeight="700">{f.name}</text>
                <text x={FACT_X + NODE_W - 12} y={y + 25} textAnchor="end" fill="#ffedd5" fontSize="9.5">{num(f.count)} lignes</text>
                {f.grain && (
                  <g>
                    <circle cx={FACT_X + NODE_W - 34} cy={y + 18} r={8} fill="#ffffff" opacity={0.25} />
                    <text x={FACT_X + NODE_W - 34} y={y + 21} textAnchor="middle" fontSize="9.5" fontWeight="700" fill="#ffffff">i</text>
                    <title>{f.grain}</title>
                  </g>
                )}
                <rect x={FACT_X} y={y} width={NODE_W} height={h} rx={8} fill="none" stroke={stroke} strokeWidth={sel ? 3 : con ? 2.5 : 1} />
                {(f.columns || []).map((c, i) => (
                  <ColumnRow key={c.name} x={FACT_X} y={y + HEADER_H + 1 + i * ROW_H} col={c} />
                ))}
              </g>
            );
          })}
        </svg>
      </div>

      {hover && hoverRel && (
        <div
          className="pointer-events-none absolute z-20 w-64 rounded-lg border bg-background/95 p-3 shadow-lg backdrop-blur"
          style={{ left: tip.x + 16, top: tip.y + 16 }}
        >
          <p className="text-xs font-semibold text-muted-foreground">Relation</p>
          <p className="mt-1.5 font-mono text-xs font-semibold text-violet-700">{hoverRel.fact}.{hoverRel.fk}</p>
          <p className="text-center text-[10px] text-muted-foreground">↓</p>
          <p className="text-center font-mono text-xs font-semibold text-blue-700">{hoverRel.dimension}.{hoverRel.pk}</p>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Cardinalité</span>
            <span className="font-semibold">{hoverRel.cardinality || '1:N'}</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Clés correspondantes</span>
            <span className="font-semibold tabular-nums">
              {hoverHealth ? `${num(hoverHealth.matched)} / ${num(hoverHealth.matched + hoverHealth.orphan)}` : '—'}
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Santé</span>
            <span className="font-semibold">{hoverHealth ? `${hoverHealth.health}%` : '—'}</span>
          </div>
        </div>
      )}

      <div className="absolute top-3 left-3 z-10 flex flex-wrap items-center gap-1 rounded-lg border bg-background/90 p-1 shadow-sm backdrop-blur">
        <Button variant="ghost" size="icon" title="Zoom arrière" onClick={() => zoomBy(1 / 1.2)}>
          <ZoomOut className="h-4 w-4" />
        </Button>
        <span className="w-12 text-center text-xs font-medium text-muted-foreground tabular-nums">{Math.round(view.scale * 100)}%</span>
        <Button variant="ghost" size="icon" title="Zoom avant" onClick={() => zoomBy(1.2)}>
          <ZoomIn className="h-4 w-4" />
        </Button>
        <span className="mx-1 h-4 w-px bg-border" />
        <Button variant="ghost" size="icon" title="Ajuster à l'écran" onClick={fitView}>
          <Maximize className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" title="Réinitialiser la vue" onClick={resetView}>
          <RotateCcw className="h-4 w-4" />
        </Button>
        <span className="mx-1 h-4 w-px bg-border" />
        {exportTargets.map((t) => (
          <Button key={t.label} variant="ghost" size="icon" title={`Exporter en ${t.label}`} onClick={t.run}>
            <t.icon className="h-4 w-4" />
            <span className="ml-1 hidden text-xs xl:inline">{t.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}

function cnWrap(panning) {
  return `relative w-full select-none overflow-hidden rounded-lg border bg-slate-50/60 ${panning ? 'cursor-grabbing' : 'cursor-grab'}`;
}
