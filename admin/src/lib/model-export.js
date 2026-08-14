// Read-only export helpers for the dimensional-model diagram.
// No dependencies: SVG is serialized directly, PNG is rasterized through a
// canvas, PDF embeds a JPEG of that raster into a minimal hand-built document.

export const relKeyOf = (r) => `${r.fact}::${r.dimension}::${r.fk}`;

function serializeSvg(svg) {
  const clone = svg.cloneNode(true);
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
  const w = svg.getAttribute('width') || svg.viewBox?.baseVal?.width || 1006;
  const h = svg.getAttribute('height') || svg.viewBox?.baseVal?.height || 600;
  clone.setAttribute('width', String(w));
  clone.setAttribute('height', String(h));
  return new XMLSerializer().serializeToString(clone);
}

function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    a.remove();
  }, 250);
}

export function exportSvg(svg, filename) {
  const blob = new Blob([serializeSvg(svg)], { type: 'image/svg+xml;charset=utf-8' });
  download(blob, filename);
}

export function rasterizeSvg(svg, scale = 2) {
  return new Promise((resolve, reject) => {
    const svgStr = serializeSvg(svg);
    const b64 = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgStr)))}`;
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth || 1006;
      const h = img.naturalHeight || 600;
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(w * scale);
      canvas.height = Math.round(h * scale);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas);
    };
    img.onerror = reject;
    img.src = b64;
  });
}

export async function exportPng(svg, filename, scale = 2) {
  const canvas = await rasterizeSvg(svg, scale);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  download(blob, filename);
}

function concatChunks(chunks) {
  let len = 0;
  for (const c of chunks) len += c.length;
  const out = new Uint8Array(len);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.length;
  }
  return out;
}

function ascii(str) {
  const out = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i += 1) out[i] = str.charCodeAt(i) & 0xff;
  return out;
}

function escText(str) {
  return String(str).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function buildPdf(jpeg, imgW, imgH, pageW, pageH, title) {
  const availW = pageW;
  const availH = pageH - 40;
  const s = Math.min(availW / imgW, availH / imgH);
  const w = Math.floor(imgW * s);
  const h = Math.floor(imgH * s);
  const x = Math.round((pageW - w) / 2);

  const content = `BT /F1 12 Tf 24 ${pageH - 24} Td (${escText(title)}) Tj ET\nq ${w} 0 0 ${h} ${x} 0 cm /Im0 Do Q`;

  const chunks = [];
  const offsets = {};
  let count = 0;
  const push = (bytes) => {
    chunks.push(bytes);
    count += bytes.length;
  };
  const mark = (i) => {
    offsets[i] = count;
  };
  const text = (s) => ascii(s);

  push(text('%PDF-1.4\n'));
  mark(1);
  push(text('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n'));
  mark(2);
  push(text('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n'));
  mark(3);
  push(text(
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] `
    + '/Resources << /XObject << /Im0 5 0 R >> /Font << /F1 4 0 R >> >> /Contents 6 0 R >>\nendobj\n'
  ));
  mark(4);
  push(text('4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n'));
  mark(5);
  push(text(
    `5 0 obj\n<< /Type /XObject /Subtype /Image /Width ${imgW} /Height ${imgH} `
    + `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`
  ));
  push(jpeg);
  push(text('\nendstream\nendobj\n'));
  mark(6);
  push(text(`6 0 obj\n<< /Length ${content.length} >>\nstream\n${content}\nendstream\nendobj\n`));
  const xref = count;
  push(text('xref\n0 7\n0000000000 65535 f \n'));
  for (let i = 1; i <= 6; i += 1) push(text(`${String(offsets[i]).padStart(10, '0')} 00000 n \n`));
  push(text(`trailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`));
  return concatChunks(chunks);
}

export async function exportPdf(svg, filename, title = 'Modèle dimensionnel') {
  const canvas = await rasterizeSvg(svg, 2);
  const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.92);
  const b64 = jpegDataUrl.split(',')[1];
  const bin = atob(b64);
  const jpeg = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) jpeg[i] = bin.charCodeAt(i);
  const pageW = Math.round((canvas.width * 72) / 96);
  const pageH = Math.round((canvas.height * 72) / 96);
  const pdf = buildPdf(jpeg, canvas.width, canvas.height, pageW, pageH, title);
  const blob = new Blob([pdf], { type: 'application/pdf' });
  download(blob, filename);
}

// ─── Minimal multi-page text PDF (Courier/Helvetica, no dependencies) ─────

const TEXT_MARGIN = 36;
const PAGE_W = 595;
const PAGE_H = 842;

function buildTextPdf(title, bodyLines) {
  const bodySize = 9;
  const bodyLeading = bodySize * 1.4;
  const headSize = 10.5;
  const headLeading = headSize * 1.4;
  const titleSize = 15;
  const titleLeading = titleSize * 1.25;
  const usableW = PAGE_W - TEXT_MARGIN * 2;
  const maxBodyChars = Math.floor(usableW / (0.6 * bodySize));
  const maxHeadChars = Math.floor(usableW / (0.6 * headSize));
  const maxTitleChars = Math.floor(usableW / (0.55 * titleSize));

  const wrap = (text, maxChars) => {
    if (maxChars <= 0) return [''];
    const out = [];
    let line = '';
    for (const word of String(text).split(' ')) {
      if (!line) line = word;
      else if (line.length + 1 + word.length <= maxChars) line += ` ${word}`;
      else {
        out.push(line);
        line = word;
      }
    }
    if (line) out.push(line);
    return out.length ? out : [''];
  };

  const pages = [];
  let y = PAGE_H - TEXT_MARGIN - titleLeading;
  pages.push([{ y, size: titleSize, bold: true, text: wrap(title, maxTitleChars)[0] }]);
  y -= titleLeading;
  pages[0].push({ y, size: bodySize, bold: false, text: wrap(`Généré le ${new Date().toLocaleString('fr-FR')}`, maxBodyChars)[0] });
  y -= bodyLeading * 1.6;

  for (const line of bodyLines) {
    const size = line.head ? headSize : bodySize;
    const leading = line.head ? headLeading : bodyLeading;
    const maxChars = line.head ? maxHeadChars : maxBodyChars;
    const wrapped = wrap(line.text, maxChars);
    if (y - wrapped.length * leading < TEXT_MARGIN) {
      pages.push([]);
      y = PAGE_H - TEXT_MARGIN;
    }
    const page = pages[pages.length - 1];
    for (const t of wrapped) {
      page.push({ y, size, bold: !!line.bold || !!line.head, text: t });
      y -= leading;
    }
    if (line.blank) y -= leading;
  }

  const objs = [];
  const offsets = [];
  const chunks = [];
  const pageCount = pages.length;
  const pageRef = (i) => 3 + i * 2;
  const contentRef = (i) => 4 + i * 2;
  const fontRef = 2 + pageCount * 2 + 1;
  const fontBoldRef = fontRef + 1;

  const push = (bytes) => {
    chunks.push(bytes);
  };
  const begin = () => {
    offsets[objs.length] = chunkLen();
  };
  const chunkLen = () => chunks.reduce((a, b) => a + b.length, 0);

  const o = (s) => push(ascii(s));
  const endObj = () => {
    objs.push(offsets[objs.length]);
    o('endobj\n');
  };

  push(ascii('%PDF-1.4\n'));

  begin();
  o('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\n');
  endObj();
  begin();
  o(`2 0 obj\n<< /Type /Pages /Kids [${pages.map((_, i) => `${pageRef(i)} 0 R`).join(' ')}] /Count ${pageCount} >>\n`);
  endObj();

  pages.forEach((_, i) => {
    begin();
    o(`${pageRef(i)} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 ${fontRef} 0 R /F2 ${fontBoldRef} 0 R >> >> /Contents ${contentRef(i)} 0 R >>\n`);
    endObj();
  });

  begin();
  o(`${fontRef} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>\n`);
  endObj();
  begin();
  o(`${fontBoldRef} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier-Bold >>\n`);
  endObj();

  pages.forEach((page, i) => {
    const body = page
      .map((l) => {
        const font = l.bold ? '/F2' : '/F1';
        return `BT ${font} ${l.size} Tf ${TEXT_MARGIN} ${l.y} Td (${escText(l.text)}) Tj ET`;
      })
      .join('\n');
    begin();
    o(`${contentRef(i)} 0 obj\n<< /Length ${body.length} >>\nstream\n${body}\nendstream\n`);
    endObj();
  });

  const xref = chunkLen();
  o('xref\n');
  o(`0 ${objs.length + 1}\n`);
  o('0000000000 65535 f \n');
  for (const off of objs) o(`${String(off).padStart(10, '0')} 00000 n \n`);
  o(`trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
  return concatChunks(chunks);
}

function num(n) {
  return Number.isFinite(n) ? n.toLocaleString('fr-FR') : String(n);
}

export function exportRelationshipReportPdf(model) {
  const { dimensions, facts, relationships, fkHealth, warehouseType } = model;
  const body = [
    { text: `Type d'entrepôt : ${warehouseType || 'Star Schema'}` },
    { text: `Dimensions : ${dimensions.length}   ·   Faits : ${facts.length}   ·   Relations : ${relationships.length}` },
    { blank: true },
    { head: true, text: 'RELATIONS' },
  ];
  (fkHealth || []).forEach((h) => {
    const dim = dimensions.find((d) => d.name === h.dimension);
    body.push({ head: true, text: `${h.fact} → ${h.dimension}` });
    body.push({ text: `  Jointure : ${h.fact}.${h.fk} = ${h.dimension}.${h.pk}` });
    body.push({ text: `  Cardinalité : ${h.cardinality || '1:N'}` });
    body.push({ text: `  Lignes fait : ${num(h.rows)}   ·   Lignes dimension : ${dim ? num(dim.count) : '—'}` });
    body.push({ text: `  Correspondances : ${num(h.matched)}   ·   Orphelines : ${num(h.orphan)}   ·   Sans clé : ${num(h.noKey)}` });
    body.push({ text: `  Santé des relations : ${h.health}%` });
    body.push({ blank: true });
  });
  const pdf = buildTextPdf('Rapport des relations — Modèle dimensionnel', body);
  download(new Blob([pdf], { type: 'application/pdf' }), 'rapport-relations.pdf');
}

export function exportLineageReportPdf(model) {
  const roleLabel = (r) =>
    ({
      primary_key: 'Clé primaire',
      business_key: 'Clé métier',
      foreign_key: 'Clé étrangère',
      measure: 'Mesure',
      attribute: 'Attribut',
    }[r] || r);
  const body = [];
  for (const table of [...model.dimensions, ...model.facts]) {
    const source = table.sourceDataset
      ? `${table.sourceDataset}.csv`
      : table.source && table.source.note
        ? table.source.note
        : '—';
    body.push({ head: true, text: `${table.name}  (${source})` });
    for (const c of table.columns || []) {
      const src =
        c.source && c.source.dataset
          ? `${c.source.dataset}.${c.source.column}`
          : 'dérivé';
      const note = c.note ? `  — ${c.note}` : '';
      body.push({ text: `  ${c.name}   [${roleLabel(c.role)}]   ← ${src}${note}` });
    }
    body.push({ blank: true });
  }
  const pdf = buildTextPdf('Rapport de lignage — CSV source → Entrepôt', body);
  download(new Blob([pdf], { type: 'application/pdf' }), 'rapport-lignage.pdf');
}
