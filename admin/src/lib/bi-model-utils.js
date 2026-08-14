// Read-only BI model helpers for the "Modèle dimensionnel" wizard step.
// Pure client-side: never touches ETL, warehouse, validation or backend.

export const HEALTH_TONE = {
  green: '#16a34a',
  yellow: '#ca8a04',
  orange: '#ea580c',
  red: '#dc2626',
  slate: '#94a3b8',
  cyan: '#06b6d4',
};

export function healthTone(health) {
  if (health === null || health === undefined) return 'slate';
  if (health >= 100) return 'green';
  if (health >= 80) return 'yellow';
  if (health >= 60) return 'orange';
  return 'red';
}

export const HEALTH_BADGE = {
  green: 'bg-green-100 text-green-700',
  yellow: 'bg-yellow-100 text-yellow-700',
  orange: 'bg-orange-100 text-orange-700',
  red: 'bg-red-100 text-red-700',
  slate: 'bg-slate-100 text-slate-600',
  cyan: 'bg-cyan-100 text-cyan-700',
};

export const HEALTH_BAR = {
  green: 'bg-green-500',
  yellow: 'bg-yellow-500',
  orange: 'bg-orange-500',
  red: 'bg-red-500',
  slate: 'bg-slate-400',
  cyan: 'bg-cyan-500',
};

export const HEALTH_LABEL = {
  green: '100 %',
  yellow: '80–99 %',
  orange: '60–79 %',
  red: '< 60 %',
  slate: '—',
};

// Natural / business key of a dimension: the attribute mapped from a source
// `<table>_id` column (the PK `id` is the derived surrogate key).
export function dimBusinessKey(dim) {
  if (!dim || !dim.columns) return null;
  const cand = dim.columns.find(
    (c) =>
      c.role === 'attribute' &&
      c.source &&
      c.source.dataset &&
      String(c.source.column || '').toLowerCase().endsWith('_id')
  );
  if (cand) return cand;
  return dim.columns.find((c) => c.role === 'business_key') || null;
}

export function columnRoles(columns, role) {
  return (columns || []).filter((c) => c.role === role);
}

// Column picks for the join preview / generated SQL.
function takeUnique(list, max) {
  const out = [];
  const seen = new Set();
  for (const c of list) {
    if (seen.has(c.name)) continue;
    seen.add(c.name);
    out.push(c);
    if (out.length >= max) break;
  }
  return out;
}

export function joinFactColumns(fact, rel) {
  const all = fact.columns || [];
  const fk = all.find((c) => c.name === rel.fk);
  const measures = columnRoles(all, 'measure');
  const bks = columnRoles(all, 'business_key');
  return takeUnique(
    [fk, ...bks, ...measures, ...columnRoles(all, 'attribute')].filter(Boolean),
    5
  );
}

export function joinDimColumns(dim, rel) {
  const all = dim.columns || [];
  const pk = all.find((c) => c.name === rel.pk);
  const bk = dimBusinessKey(dim);
  const attrs = columnRoles(all, 'attribute').filter((c) => c !== bk);
  return takeUnique(
    [pk, bk, ...attrs].filter(Boolean),
    5
  );
}

export function generateJoinSql(rel, fact, dim) {
  const fCols = joinFactColumns(fact, rel).filter((c) => c.name !== rel.fk);
  const dCols = joinDimColumns(dim, rel).filter((c) => c.name !== rel.pk);
  const selectRows = [
    ...fCols.slice(0, 4).map((c) => `    f.${c.name}`),
    ...dCols.slice(0, 3).map((c) => `    d.${c.name}`),
  ];
  return [
    'SELECT',
    selectRows.join(',\n'),
    `FROM ${fact.name} f`,
    `LEFT JOIN ${dim.name} d ON f.${rel.fk} = d.${rel.pk};`,
  ].join('\n');
}
