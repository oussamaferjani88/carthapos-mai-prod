/* =========================================================================
   CarthaPOS PFE — 20 slide definitions.
   Every element is a native, editable PowerPoint object (see lib/deck.js).
   Authored on a 1920x1080 px canvas; content band y 372 .. 928.
   ========================================================================= */
const { W, H, C, M } = require('./design');
const { Page } = require('./deck');

const CW = W - M.l - M.r; // 1680
const CX = W / 2;

const UML_FRAME = { x: 1.0, y: 2.5, w: 11.33, h: 4.4 }; // inches, shared with pptx overlay

/* ---------------------------------------------------------------------
   UML placeholder slide — a large empty frame the user drops a diagram into
--------------------------------------------------------------------- */
function umlSlide(pptx, kicker, num, title, subtitle) {
  const s = new Page(pptx, { kicker, num });
  s.header(title, subtitle);
  const fx = UML_FRAME.x * 144, fy = UML_FRAME.y * 144, fw = UML_FRAME.w * 144, fh = UML_FRAME.h * 144;
  s.panel(fx, fy, fw, fh, { fill: C.surface, stroke: C.hair, sw: 1.5, r: 20, dash: true });
  const tick = (cx, cy, dx, dy) => { s.seg(cx, cy, cx + dx, cy, { color: C.hair, width: 1.5 }); s.seg(cx, cy, cx, cy + dy, { color: C.hair, width: 1.5 }); };
  tick(fx + 26, fy + 26, 30, 30); tick(fx + fw - 26, fy + 26, -30, 30);
  tick(fx + 26, fy + fh - 26, 30, -30); tick(fx + fw - 26, fy + fh - 26, -30, -30);
  s.text(CX, fy + fh / 2 + 8, 'UML diagram area', { size: 22, anchor: 'middle', fill: C.ink3, font: 'regular' });
  s.foot();
  return s;
}

/* line-art glyph, ~26px box around (cx,cy), all native shapes */
function glyph(s, cx, cy, kind, col = C.accent) {
  const seg = (a, b, c, d, w = 2.4) => s.seg(a, b, c, d, { color: col, width: w });
  switch (kind) {
    case 'gen':
      s.rect(cx - 10, cy - 12, 20, 24, { stroke: col, sw: 2.2, r: 2 });
      seg(cx + 3, cy - 12, cx + 3, cy - 5); seg(cx + 3, cy - 5, cx + 10, cy - 5);
      seg(cx - 5, cy - 1, cx + 5, cy - 1, 1.8); seg(cx - 5, cy + 5, cx + 5, cy + 5, 1.8);
      break;
    case 'custom':
      s.circle(cx, cy, 7, { stroke: col, sw: 2.2 });
      seg(cx, cy - 13, cx, cy - 9); seg(cx, cy + 9, cx, cy + 13);
      seg(cx - 13, cy, cx - 9, cy); seg(cx + 9, cy, cx + 13, cy);
      break;
    case 'license':
      s.rect(cx - 11, cy - 8, 22, 16, { stroke: col, sw: 2.2, r: 2 });
      s.seg(cx - 11, cy - 1, cx + 11, cy - 1, { color: col, width: 2 });
      s.dot(cx - 5, cy + 4, 1.8, col); seg(cx + 1, cy + 4, cx + 7, cy + 4, 1.8);
      break;
    case 'deploy':
      seg(cx, cy + 11, cx, cy - 10); seg(cx - 8, cy - 2, cx, cy - 10); seg(cx + 8, cy - 2, cx, cy - 10);
      s.seg(cx - 11, cy + 11, cx + 11, cy + 11, { color: col, width: 2.2 });
      break;
    case 'analyze':
      s.seg(cx - 11, cy + 9, cx + 11, cy + 9, { color: col, width: 2.2 });
      seg(cx - 6, cy + 9, cx - 6, cy + 2); seg(cx, cy + 9, cx, cy - 4); seg(cx + 6, cy + 9, cx + 6, cy + 4);
      break;
    case 'shield':
      s.shape('pentagon', cx - 11, cy - 12, 22, 24, { stroke: col, sw: 2.2, rotate: 180 });
      seg(cx - 4, cy + 1, cx - 1, cy + 4); seg(cx - 1, cy + 4, cx + 5, cy - 4);
      break;
    case 'db':
      s.shape('can', cx - 10, cy - 11, 20, 22, { stroke: col, sw: 2.2 });
      break;
    case 'flow':
      seg(cx - 12, cy, cx + 6, cy); seg(cx, cy - 6, cx + 6, cy); seg(cx, cy + 6, cx + 6, cy);
      break;
    case 'gear':
      s.shape('gear6', cx - 13, cy - 13, 26, 26, { stroke: col, sw: 2 });
      break;
    case 'user':
      s.circle(cx, cy - 5, 6, { stroke: col, sw: 2.4 });
      s.shape('arc', cx - 11, cy + 1, 22, 24, { stroke: col, sw: 2.4, angleRange: [180, 360] });
      break;
    case 'cart':
      s.rect(cx - 11, cy - 8, 20, 14, { stroke: col, sw: 2.2, r: 2 });
      seg(cx - 15, cy - 8, cx - 11, cy - 8, 2.2);
      s.dot(cx - 4, cy + 11, 2.2, col); s.dot(cx + 5, cy + 11, 2.2, col);
      break;
    default:
      s.circle(cx, cy, 8, { stroke: col, sw: 2.4 });
  }
}

// horizontal step chain with chevrons, auto-fits CW
function chain(s, steps, y, o = {}) {
  const { h = 128, accent = C.accent, glyphs = null } = o;
  const n = steps.length;
  const bw = (CW - (n - 1) * 44) / n;
  steps.forEach((t, i) => {
    const x = M.l + i * (bw + 44);
    s.panel(x, y, bw, h, { r: 16, shadow: true });
    if (glyphs) glyph(s, x + 40, y + 44, glyphs[i] || 'flow', accent);
    s.text(x + 26, y + h - (glyphs ? 30 : h / 2 - 6), t, { size: 18, fill: C.ink, font: 'semi', w: bw - 40, lh: 1.1 });
    if (i < n - 1) s.chevron(x + bw + 22, y + h / 2, { color: accent, s: 11 });
  });
  return bw;
}

// two-row step pipeline (snake), auto-fits, returns bottom y
function pipeline(s, steps, y0, o = {}) {
  const { rowH = 108, gapY = 78, cols = 4, accent = C.blue } = o;
  const rows = Math.ceil(steps.length / cols);
  const bw = (CW - (cols - 1) * 46) / cols;
  for (let r = 0; r < rows; r++) {
    const ry = y0 + r * (rowH + gapY);
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c; if (idx >= steps.length) break;
      const x = M.l + c * (bw + 46);
      s.panel(x, ry, bw, rowH, { r: 14, shadow: true });
      s.dot(x + 28, ry + rowH / 2, 15, C.surfaceAlt);
      s.text(x + 28, ry + rowH / 2 + 1, String(idx + 1), { size: 15, anchor: 'middle', fill: accent, font: 'semi', w: 40 });
      s.text(x + 54, ry + rowH / 2 + 2, steps[idx], { size: 18, fill: C.ink, w: bw - 70 });
      if (c < cols - 1 && idx + 1 < steps.length) s.arrow(x + bw + 9, ry + rowH / 2, x + bw + 46 - 7, ry + rowH / 2, { color: C.ink3, width: 2 });
    }
    if (r < rows - 1) s.elbow(M.l + (cols - 1) * (bw + 46) + bw / 2, ry + rowH + 4, M.l + bw / 2, ry + rowH + gapY, { color: C.hair, width: 1.4 });
  }
  return y0 + (rows - 1) * (rowH + gapY) + rowH;
}

/* ===================================================================== */
const SLIDES = [];
const push = (o) => SLIDES.push(o);

/* ---- 1. TITLE ----------------------------------------------------- */
push({
  title: 'Title', file: 'slide-01',
  build(pptx, num) {
    const s = new Page(pptx, { kicker: '', num });
    s.text(M.l, 210, 'FINAL YEAR ENGINEERING PROJECT   ·   2025 / 2026', { size: 16, font: 'semi', fill: C.accent, spacing: 3.4, bold: true });
    s.text(M.l, 452, 'CarthaPOS', { size: 132, font: 'light', fill: C.ink });
    s.rule(M.l, 512, 620, { color: C.hair });
    s.text(M.l, 586, 'Intelligent SaaS platform for automated POS generation', { size: 30, fill: C.ink2, font: 'regular' });
    s.text(M.l, 628, 'and Business Intelligence', { size: 30, fill: C.ink2, font: 'regular' });
    s.text(M.l, 700, 'Software Engineering   ·   Business Intelligence', { size: 18, fill: C.ink3, spacing: 1.2 });

    // motif — POS -> flow -> chart
    const my = 812;
    s.panel(M.l, my, 108, 78, { r: 12 });
    for (let i = 0; i < 3; i++) s.rule(M.l + 22, my + 24 + i * 15, 44, { color: i ? C.hair : C.accent, width: 4 });
    s.chevron(M.l + 158, my + 39, { color: C.accent, s: 12 });
    s.circle(M.l + 232, my + 39, 24, { stroke: C.data, sw: 2.4 });
    s.bars(M.l + 292, my + 12, 82, 54, [2, 4, 3, 5], { color: C.data });

    // credits, right
    const bx = 1180;
    [['Student', 'Oussama Ferjani'], ['Academic year', '2025 – 2026'], ['Company', 'MAKTABI SARL'], ['Academic supervisor', 'Mme Safa Fennia']]
      .forEach((r, i) => {
        const y = 300 + i * 118;
        s.text(bx, y, r[0].toUpperCase(), { size: 13, font: 'semi', fill: C.ink3, spacing: 2.2 });
        s.text(bx, y + 40, r[1], { size: 25, fill: C.ink, font: 'regular' });
        s.rule(bx, y + 68, 520, { color: C.hairSoft });
      });

    s.text(M.l, H - 54, 'CarthaPOS', { size: 14, fill: C.ink3, font: 'semi', spacing: 1.4 });
    s.text(W - M.r, H - 54, '01 / 20', { size: 14, fill: C.ink3, anchor: 'end', font: 'regular' });
    return s;
  },
});

/* ---- 2. THE PROBLEM --------------------------------------------- */
push({
  title: 'The Problem', file: 'slide-02',
  build(pptx, num) {
    const s = new Page(pptx, { kicker: '01 · Context', num });
    s.header('The Problem', 'Traditional POS software is built once and rarely bends');

    const px = M.l, py = 392, pw = 632, ph = 500;
    s.panel(px, py, pw, ph, { fill: C.surface });
    s.text(px + 40, py + 52, 'TRADITIONAL POS', { size: 14, font: 'semi', fill: C.ink3, spacing: 2.6 });
    // simple monitor + lock, native
    const tx = px + 236, ty = py + 96;
    s.rect(tx, ty, 160, 116, { stroke: C.line, sw: 2.2, r: 10 });
    s.seg(tx + 58, ty + 116, tx + 46, ty + 150, { color: C.line, width: 2.2 });
    s.seg(tx + 102, ty + 116, tx + 114, ty + 150, { color: C.line, width: 2.2 });
    s.seg(tx + 34, ty + 150, tx + 126, ty + 150, { color: C.line, width: 2.2 });
    s.shape('arc', tx + 66, ty + 34, 28, 28, { stroke: C.line, sw: 2.2, angleRange: [180, 360] });
    s.rect(tx + 70, ty + 48, 20, 22, { fill: C.white, stroke: C.line, sw: 2, r: 4 });
    ['Fixed products & features', 'Hard to customize', 'Separate, manual deployments', 'No centralized control', 'Weak Business Intelligence link']
      .forEach((t, i) => {
        const y = py + 300 + i * 38;
        s.seg(px + 44, y - 7, px + 52, y + 1, { color: C.accent, width: 2.6 });
        s.seg(px + 52, y + 1, px + 66, y - 16, { color: C.accent, width: 2.6 });
        s.text(px + 84, y, t, { size: 19, fill: C.ink2 });
      });

    const qx = 838, qw = W - M.r - qx;
    s.text(qx, 470, 'THE BUSINESS NEED', { size: 14, font: 'semi', fill: C.accent, spacing: 2.8, bold: true });
    s.rect(qx, 510, 5, 250, { fill: C.accentSoft, r: 2.5 });
    s.para(qx + 42, 566,
      'How can we generate customized POS systems for different business sectors — while managing clients, licences, modules and analytics from a single platform?',
      qw - 42, { size: 33, fill: C.ink, lh: 1.5, font: 'display' });
    s.text(qx, 838, 'SIX BUSINESS SECTORS, ONE GENERATOR', { size: 13, font: 'semi', fill: C.ink3, spacing: 2.4 });
    let cx = qx;
    ['Restaurants', 'Cafés', 'Bakeries', 'Retail', 'Pharmacies', 'Salons'].forEach((c) => { cx += s.chip(cx, 864, c, { accent: C.ink2, size: 16 }) + 14; });
    s.foot();
    return s;
  },
});

/* ---- 3. EXISTING SOLUTIONS ------------------------------------ */
push({
  title: 'Existing Solutions', file: 'slide-03',
  build(pptx, num) {
    const s = new Page(pptx, { kicker: '02 · State of the Art', num });
    s.header('Existing Solutions', 'Three mature categories — none covers the full need');
    const cols = [
      { t: 'Traditional POS', a: C.accent, l: ['Sector-specific, but fixed', 'No central client management', 'No analytics layer'] },
      { t: 'SaaS admin platforms', a: C.blue, l: ['Manage accounts & billing', 'Do not build the POS software', 'Generic, not sector-aware'] },
      { t: 'Standalone BI tools', a: C.data, l: ['Powerful dashboards', 'No POS data model', 'No per-client isolation'] },
    ];
    const cw = 502, gap = (CW - 3 * cw) / 2, y = 392, ch = 340;
    const railY = y + ch + 44;
    cols.forEach((c, i) => {
      const x = M.l + i * (cw + gap);
      s.card(x, y, cw, ch, { title: c.t, kicker: `Category ${i + 1}`, lines: c.l, accent: c.a });
      s.vline(x + cw / 2, y + ch + 6, railY - (y + ch + 6), { color: C.hair, width: 1.4 });
    });
    s.rule(M.l + cw / 2, railY, CW - cw, { color: C.hair, width: 1.4 });
    s.vline(CX, railY, 34, { color: C.hair, width: 1.4 });
    const pw = 660, py = railY + 34;
    s.panel(CX - pw / 2, py, pw, 84, { r: 42, fill: C.surface, stroke: C.accent, sw: 2 });
    s.text(CX, py + 46, 'CarthaPOS  =  the intersection of all three', { size: 23, anchor: 'middle', fill: C.ink, font: 'semi', w: pw });
    s.foot();
    return s;
  },
});

/* ---- 4. VISION ---------------------------------------------- */
push({
  title: 'CarthaPOS Vision', file: 'slide-04',
  build(pptx, num) {
    const s = new Page(pptx, { kicker: '03 · Vision', num });
    s.header('CarthaPOS', 'One continuous lifecycle — from a client to actionable insight');
    const verbs = [['Generate', 'gen'], ['Customize', 'custom'], ['License', 'license'], ['Deploy', 'deploy'], ['Analyze', 'analyze']];
    const bw = 262, y = 404, gap = (CW - 5 * bw) / 4, bh = 200;
    verbs.forEach((v, i) => {
      const x = M.l + i * (bw + gap);
      s.panel(x, y, bw, bh, { r: 18, shadow: true });
      glyph(s, x + 46, y + 66, v[1]);
      s.text(x + 32, y + 150, v[0], { size: 25, fill: C.ink, font: 'semi', w: bw - 50 });
      if (i < 4) s.chevron(x + bw + gap / 2, y + bh / 2, { color: C.accent, s: 13 });
    });
    const eco = ['Client', 'CarthaPOS platform', 'Customized POS', 'Operational data', 'Business Intelligence', 'Client insights'];
    const ey = 706, ebw = 246, egap = (CW - 6 * ebw) / 5;
    s.text(M.l, ey - 24, 'THE ECOSYSTEM', { size: 14, font: 'semi', fill: C.ink3, spacing: 2.8 });
    eco.forEach((t, i) => {
      const x = M.l + i * (ebw + egap);
      s.panel(x, ey, ebw, 96, { r: 14, fill: i === 1 || i === 4 ? C.surfaceAlt : C.surface });
      s.text(x + ebw / 2, ey + 54, t, { size: 17, anchor: 'middle', fill: C.ink, w: ebw - 20, lh: 1.1 });
      if (i < 5) s.arrow(x + ebw + 8, ey + 48, x + ebw + egap - 8, ey + 48, { color: C.ink3, width: 2 });
    });
    s.panel(CX - 210, ey + 150, 420, 46, { r: 23, fill: C.bg, stroke: C.dataSoft, sw: 1.5 });
    s.text(CX, ey + 176, 'insights feed the next configuration', { size: 15, anchor: 'middle', fill: C.data, italic: true, w: 420 });
    s.arrow(M.l + ebw / 2, ey + 104, M.l + ebw / 2, ey + 150, { color: C.data, width: 1.6, dash: true });
    s.arrow(W - M.r - ebw / 2, ey + 150, W - M.r - ebw / 2, ey + 104, { color: C.data, width: 1.6, dash: true });
    s.foot();
    return s;
  },
});

/* ---- 5 & 6. UML PLACEHOLDERS ------------------------------ */
push({ title: 'System Context', file: 'slide-05', uml: true, build: (pptx, n) => umlSlide(pptx, '04 · Requirements', n, 'System Context', 'Global use-case view — actors, the platform boundary and external services') });
push({ title: 'Global Class Architecture', file: 'slide-06', uml: true, build: (pptx, n) => umlSlide(pptx, '04 · Requirements', n, 'Global Class Architecture', 'Core domain model — clients, licences, modules, POS projects and BI entities') });

/* ---- 7. TECHNICAL ARCHITECTURE -------------------------- */
push({
  title: 'Technical Architecture', file: 'slide-07',
  build(pptx, num) {
    const s = new Page(pptx, { kicker: '05 · Architecture', num });
    s.header('Technical Architecture', 'Four independently deployed projects around one API');
    const proj = [
      { t: 'BACKEND', a: C.accent, l: ['Node.js · Express', 'Prisma · PostgreSQL', 'One API for everything'] },
      { t: 'ADMIN', a: C.blue, l: ['React · Vite', 'shadcn / Radix UI', 'Staff control panel'] },
      { t: 'POS TEMPLATE', a: C.data, l: ['Electron · React', 'SQLite — offline', 'Blueprint per client'] },
      { t: 'FRONTEND', a: C.ink3, l: ['React · Vite · TS', 'Client portal', 'Marketing site'] },
    ];
    const cw = 392, gap = (CW - 4 * cw) / 3, y = 388, ch = 268;
    proj.forEach((p, i) => {
      const x = M.l + i * (cw + gap);
      s.card(x, y, cw, ch, { title: p.t, lines: p.l, accent: p.a });
      s.arrow(x + cw / 2, y + ch + 10, x + cw / 2, y + ch + 58, { color: C.hair, width: 1.6, dash: true });
    });
    const iy = y + ch + 74, infra = [['Main SaaS database', 'db'], ['BI warehouse', 'db'], ['GitHub Actions', 'gen'], ['Metabase', 'analyze'], ['Render', 'deploy']];
    s.panel(M.l, iy, CW, 150, { fill: C.surfaceAlt, stroke: C.hairSoft });
    s.text(M.l + 34, iy + 40, 'PLATFORM INFRASTRUCTURE', { size: 13, font: 'semi', fill: C.ink3, spacing: 2.6 });
    const ibw = (CW - 68) / 5;
    infra.forEach((t, i) => {
      const x = M.l + 34 + i * ibw;
      glyph(s, x + 18, iy + 96, t[1], C.blue);
      s.text(x + 46, iy + 100, t[0], { size: 17, fill: C.ink, w: ibw - 50 });
      if (i < 4) s.vline(x + ibw - 20, iy + 66, 60, { color: C.hair, width: 1 });
    });
    s.foot();
    return s;
  },
});

/* ---- 8. FUNCTIONAL ARCHITECTURE ----------------------- */
push({
  title: 'Platform Functional Architecture', file: 'slide-08',
  build(pptx, num) {
    const s = new Page(pptx, { kicker: '06 · Functional', num });
    s.header('Platform Functional Architecture', 'Five functional domains served by one shared backend');
    s.panel(CX - 240, 396, 480, 80, { r: 40, fill: C.surfaceAlt, stroke: C.accent, sw: 2 });
    s.text(CX, 442, 'CarthaPOS Platform', { size: 25, anchor: 'middle', fill: C.ink, font: 'semi', w: 480 });
    const br = [
      { t: 'Client Portal', l: ['My projects', 'Re-generation', 'Modules & billing'] },
      { t: 'Administration', l: ['Clients & licences', 'Modules & sectors', 'Users · RBAC'] },
      { t: 'POS Generation & Licensing', l: ['Guided wizard', 'Build pipeline', 'Signed licences'] },
      { t: 'Generated POS Operations', l: ['Sales · stock', 'Sector modules', 'BI export'] },
      { t: 'Business Intelligence', l: ['Upload & ETL', 'Data warehouse', 'Dashboards'] },
    ];
    const cw = 306, gap = (CW - 5 * cw) / 4, y = 560, railY = 520;
    s.vline(CX, 476, railY - 476, { color: C.hair, width: 1.4 });
    s.rule(M.l + cw / 2, railY, CW - cw, { color: C.hair, width: 1.4 });
    br.forEach((b, i) => {
      const x = M.l + i * (cw + gap);
      s.vline(x + cw / 2, railY, y - railY, { color: C.hair, width: 1.4 });
      s.panel(x, y, cw, 92, { fill: C.surface });
      s.text(x + cw / 2, y + 40, b.t, { size: 18, anchor: 'middle', fill: C.ink, font: 'semi', w: cw - 24, lh: 1.14 });
      b.l.forEach((k, j) => {
        const ky = y + 132 + j * 64;
        s.panel(x + 14, ky, cw - 28, 48, { r: 10, fill: C.surface });
        s.dot(x + 40, ky + 24, 2.6, C.accent);
        s.text(x + 58, ky + 29, k, { size: 15.5, fill: C.ink2, w: cw - 90 });
      });
    });
    s.foot();
    return s;
  },
});

/* ---- 9. POS GENERATION ---------------------------- */
push({
  title: 'From Configuration to POS', file: 'slide-09',
  build(pptx, num) {
    const s = new Page(pptx, { kicker: '07 · POS Generation', num });
    s.header('From Configuration to POS', 'A guided pipeline turns a few choices into a Windows installer');
    const b = pipeline(s, ['Select client', 'Select sector', 'Select modules', 'Customize theme', 'Generate config', 'Build', 'Package', 'Download installer'], 408, { rowH: 116, gapY: 96, accent: C.accent });
    s.panel(M.l, b + 66, CW, 92, { r: 18, fill: C.surfaceAlt, stroke: C.accent, sw: 2 });
    s.text(CX, b + 66 + 34, 'RESULT', { size: 12, anchor: 'middle', fill: C.accent, font: 'semi', spacing: 2.4, w: CW });
    s.text(CX, b + 66 + 66, 'a customized Windows Electron POS, built on GitHub Actions', { size: 21, anchor: 'middle', fill: C.ink, font: 'semi', w: CW });
    s.foot();
    return s;
  },
});

/* ---- 10. CUSTOMIZATION -------------------------- */
push({
  title: 'Customize the POS', file: 'slide-10',
  build(pptx, num) {
    const s = new Page(pptx, { kicker: '08 · Customization', num });
    s.header('Customize the POS', 'A live customizer — every choice is previewed before generation');
    const wx = M.l, wy = 396, ww = 1000, wh = 496;
    const r = s.windowMock(wx, wy, ww, wh, { title: 'POS Customizer', navItems: 6 });
    s.text(r.cx, r.cy + 4, 'Layout', { size: 16, fill: C.ink3, font: 'semi' });
    ['Left', 'Top', 'Right'].forEach((t, i) => {
      const w3 = (r.cw - 24) / 3, bx = r.cx + i * (w3 + 12);
      s.panel(bx, r.cy + 22, w3, 46, { r: 8, fill: i === 0 ? C.ink : C.surface, stroke: C.hair });
      s.text(bx + w3 / 2, r.cy + 49, t, { size: 14, anchor: 'middle', fill: i === 0 ? C.white : C.ink2, w: w3 });
    });
    s.text(r.cx, r.cy + 116, 'Palette', { size: 16, fill: C.ink3, font: 'semi' });
    [C.accent, C.data, C.blue, C.ink, C.surfaceAlt].forEach((col, i) => s.circle(r.cx + 22 + i * 60, r.cy + 152, 20, { fill: col, stroke: C.hair, sw: 1.5 }));
    s.text(r.cx, r.cy + 220, 'Live preview', { size: 16, fill: C.ink3, font: 'semi' });
    s.panel(r.cx, r.cy + 238, r.cw, r.ch - 250, { r: 12, fill: C.surfaceAlt });
    s.bars(r.cx + 26, r.cy + 262, r.cw - 52, r.ch - 300, [3, 5, 4, 6, 4, 7, 5], { color: C.data });

    const co = ['Business sector', 'Modules', 'Colours & logo', 'Layout & navigation', 'POS configuration'];
    const ox = wx + ww + 64;
    co.forEach((t, i) => {
      const y = 430 + i * 96;
      s.dot(ox - 16, y - 7, 4, C.accent);
      s.text(ox, y, t, { size: 22, fill: C.ink });
      s.rule(ox, y + 26, W - M.r - ox, { color: C.hairSoft });
    });
    s.foot();
    return s;
  },
});

/* ---- 11. GENERATED POS -------------------------- */
push({
  title: 'Generated POS Application', file: 'slide-11',
  build(pptx, num) {
    const s = new Page(pptx, { kicker: '09 · Generated POS', num });
    s.header('Generated POS Application', 'An offline-capable Electron desktop app, tailored to the sector');
    const wx = M.l, wy = 392, ww = 1310, wh = 468;
    const r = s.windowMock(wx, wy, ww, wh, { title: 'Demo POS — Restaurant', navItems: 7 });
    const tiles = [['Revenue', '€ 1 248', C.accent], ['Orders', '23', C.ink], ['Avg ticket', '€ 54.2', C.data], ['Low stock', '8', C.blue]];
    const tw = (r.cw - 3 * 18) / 4;
    tiles.forEach((t, i) => {
      const x = r.cx + i * (tw + 18);
      s.panel(x, r.cy, tw, 104, { r: 12, fill: C.surface });
      s.text(x + 18, r.cy + 32, t[0], { size: 13, fill: C.ink3 });
      s.text(x + 18, r.cy + 72, t[1], { size: 26, fill: t[2], font: 'light' });
    });
    s.panel(r.cx, r.cy + 126, r.cw * 0.62, r.ch - 138, { r: 12, fill: C.surface });
    s.bars(r.cx + 26, r.cy + 156, r.cw * 0.62 - 52, r.ch - 200, [4, 6, 5, 7, 5, 8, 6], { color: C.data });
    s.donut(r.cx + r.cw * 0.83, r.cy + 126 + (r.ch - 138) / 2, 62, { color: C.accent, frac: 0.62, sw: 18 });
    const mods = ['Sales', 'Inventory', 'Products', 'Kitchen', 'Tables', 'Customers', 'Cash register', 'Reports'];
    let cx = M.l;
    mods.forEach((m) => { cx += s.chip(cx, 884, m, { accent: C.ink2 }) + 16; });
    s.foot();
    return s;
  },
});

/* ---- 12. SECURITY & LICENSING ------------------ */
push({
  title: 'Security & Licensing', file: 'slide-12',
  build(pptx, num) {
    const s = new Page(pptx, { kicker: '10 · Security', num });
    s.header('Security & Licensing', 'Every generated POS is cryptographically bound and verified at runtime');
    chain(s, ['Client', 'Licence issued', 'Signature', 'Machine binding', 'Runtime check'], 404, {
      h: 132, accent: C.accent, glyphs: ['user', 'license', 'gear', 'db', 'shield'],
    });
    s.text(M.l, 636, 'HOW IT IS PROTECTED', { size: 14, font: 'semi', fill: C.ink3, spacing: 2.8 });
    const concepts = [
      ['Ed25519 signatures', 'tamper-evident licence payload'],
      ['AES + HMAC', 'confidential & integrity-checked'],
      ['Machine fingerprint', 'SHA-256 hardware identity'],
      ['USB verification', 'portable licence carrier'],
      ['Role-based access', 'enforced server-side'],
    ];
    const ccw = 306, cy = 664, cgap = (CW - 5 * ccw) / 4, cch = 200;
    concepts.forEach((c, i) => {
      const x = M.l + i * (ccw + cgap);
      s.panel(x, cy, ccw, cch, { fill: C.surface });
      s.text(x + 32, cy + 56, c[0], { size: 19, fill: C.ink, font: 'semi', w: ccw - 60, lh: 1.16 });
      s.rule(x + 32, cy + 84, 44, { color: C.accent, width: 3 });
      s.para(x + 32, cy + 122, c[1], ccw - 60, { size: 15.5, fill: C.ink3, lh: 1.4 });
    });
    s.foot();
    return s;
  },
});

/* ---- 13. RBAC --------------------------------- */
push({
  title: 'Role-Based Access Control', file: 'slide-13',
  build(pptx, num) {
    const s = new Page(pptx, { kicker: '11 · Access Control', num });
    s.header('Role-Based Access Control', 'A single permission model gates both the API and the interface');
    const steps = ['Users', 'Roles', 'Permissions', 'Protected routes'];
    const y0 = 404, bh = 96, sp = 44, widths = [720, 600, 480, 360], colX = M.l + 360;
    steps.forEach((t, i) => {
      const w = widths[i], x = colX - w / 2, yy = y0 + i * (bh + sp);
      const last = i === steps.length - 1;
      s.panel(x, yy, w, bh, { r: 14, fill: last ? C.surfaceAlt : C.surface, stroke: last ? C.accent : C.hair, sw: last ? 2 : 1 });
      s.text(colX, yy + bh / 2 + 2, t, { size: 21, anchor: 'middle', fill: C.ink, font: 'semi', w });
      if (i < steps.length - 1) s.arrow(colX, yy + bh + 6, colX, yy + bh + sp - 6, { color: C.ink3, width: 2.2 });
    });
    const rx = 980, rw = W - M.r - rx;
    s.text(rx, 404, 'ROLES', { size: 14, font: 'semi', fill: C.ink3, spacing: 2.8 });
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'BI_SPECIALIST'].forEach((rr, i) => {
      const y = 432 + i * 80;
      s.panel(rx, y, rw, 60, { r: 12, fill: C.surface });
      s.dot(rx + 28, y + 30, 4.5, i === 0 ? C.accent : C.ink3);
      s.text(rx + 50, y + 36, rr, { size: 19, fill: C.ink, spacing: 0.4 });
    });
    s.metric(rx, 786, rw / 2 - 12, 132, { value: '35', label: 'permission keys', accent: C.accent });
    s.metric(rx + rw / 2 + 12, 786, rw / 2 - 12, 132, { value: '10', label: 'permission groups', accent: C.blue });
    s.foot();
    return s;
  },
});

/* ---- 14. BUSINESS INTELLIGENCE ---------------- */
push({
  title: 'From POS Data to Business Intelligence', file: 'slide-14',
  build(pptx, num) {
    const s = new Page(pptx, { kicker: '12 · Business Intelligence', num });
    s.header('From POS Data to Business Intelligence', 'A governed pipeline turns raw exports into per-client dashboards');
    const b = pipeline(s, ['POS export', 'Upload (ZIP)', 'BI request', 'Validation', 'ETL pipeline', 'Warehouse load', 'Dashboard', 'Client insights'], 404, { rowH: 108, gapY: 84, accent: C.data });
    const y = b + 60, mh = 150;
    s.metric(M.l, y, 344, mh, { value: '20', label: 'BI datasets', sub: 'BiSchemaContract v2.2.0', accent: C.data });
    s.metric(M.l + 370, y, 344, mh, { value: '246', label: 'columns', sub: 'standardised export contract', accent: C.data });
    s.panel(M.l + 740, y, CW - 740, mh, { r: 18, fill: C.surfaceAlt });
    s.text(M.l + 772, y + 52, 'METHODOLOGY', { size: 12, font: 'semi', fill: C.ink3, spacing: 2.4 });
    s.para(M.l + 772, y + 92, 'GIMSI structures the BI lifecycle — goals, evaluation axes, KPIs, collection, dashboards, interpretation.', CW - 740 - 64, { size: 16, fill: C.ink2, lh: 1.42 });
    s.foot();
    return s;
  },
});

/* ---- 15. DATA WAREHOUSE ---------------------- */
push({
  title: 'Analytical Data Warehouse', file: 'slide-15',
  build(pptx, num) {
    const s = new Page(pptx, { kicker: '13 · Data Warehouse', num });
    s.header('Analytical Data Warehouse', 'A tenant-isolated star schema in PostgreSQL');
    const cx = 640, cy = 656, Rx = 372, Ry = 236;
    const dims = ['client', 'product', 'supplier', 'customer', 'time'];
    dims.forEach((d, i) => {
      const a = -Math.PI / 2 + i * (2 * Math.PI / 5);
      const dx = cx + Math.cos(a) * Rx, dy = cy + Math.sin(a) * Ry;
      s.arrow(cx + Math.cos(a) * 130, cy + Math.sin(a) * 78, dx - Math.cos(a) * 92, dy - Math.sin(a) * 40, { color: C.hair, width: 1.5 });
      s.panel(dx - 96, dy - 32, 192, 64, { r: 12, fill: C.surface });
      s.text(dx, dy - 4, `dim_${d}`, { size: 16, anchor: 'middle', fill: C.ink, w: 180 });
      s.text(dx, dy + 18, 'dimension', { size: 11.5, anchor: 'middle', fill: C.ink3, w: 180 });
    });
    s.panel(cx - 128, cy - 58, 256, 116, { r: 16, fill: C.surfaceAlt, stroke: C.accent, sw: 2 });
    s.text(cx, cy - 14, 'Fact hub', { size: 22, anchor: 'middle', fill: C.ink, font: 'semi', w: 256 });
    s.text(cx, cy + 20, '6 fact tables', { size: 14, anchor: 'middle', fill: C.ink3, w: 256 });
    const fx = 1190, fw = W - M.r - fx;
    s.text(fx, 404, 'FACT TABLES', { size: 14, font: 'semi', fill: C.ink3, spacing: 2.8 });
    ['fact_sales', 'fact_sale_items', 'fact_inventory', 'fact_appointments', 'fact_kitchen_orders', 'fact_kitchen_order_items']
      .forEach((f, i) => {
        const y = 430 + i * 54;
        s.panel(fx, y, fw, 42, { r: 10, fill: C.surface });
        s.rect(fx + 16, y + 12, 13, 18, { stroke: C.data, sw: 2, r: 3 });
        s.text(fx + 44, y + 22, f, { size: 16, fill: C.ink, w: fw - 60 });
      });
    s.panel(fx, 776, fw, 142, { r: 16, fill: C.surfaceAlt });
    ['Multi-tenant — every row carries tenantId', 'Conformed dim_time across all facts', 'Idempotent ETL — safe to re-run']
      .forEach((t, i) => { const y = 812 + i * 36; s.dot(fx + 28, y - 5, 3, C.data); s.text(fx + 46, y, t, { size: 15, fill: C.ink2, w: fw - 70 }); });
    s.foot();
    return s;
  },
});

/* ---- 16. METABASE ---------------------------- */
push({
  title: 'Personalized BI Dashboards', file: 'slide-16',
  build(pptx, num) {
    const s = new Page(pptx, { kicker: '14 · Metabase', num });
    s.header('Personalized BI Dashboards', 'Dashboards are provisioned per client, never shared');
    chain(s, ['Dashboard template', 'Deep copy', 'Tenant filter baked in', 'Client dashboard'], 400, { h: 108, accent: C.data });
    const dx = M.l, dy = 560, dw = 940, dh = 328;
    const r = s.windowMock(dx, dy, dw, dh, { title: 'Client BI dashboard', navItems: 3, accent: C.data });
    s.bars(r.cx, r.cy + 10, r.cw * 0.55, r.ch * 0.44, [4, 6, 5, 7, 6, 8], { color: C.data });
    s.donut(r.cx + r.cw * 0.8, r.cy + r.ch * 0.26, 50, { color: C.accent, frac: 0.55, sw: 15 });
    s.panel(r.cx, r.cy + r.ch * 0.58, r.cw, r.ch * 0.36, { r: 10, fill: C.surface });
    for (let i = 0; i < 3; i++) s.rule(r.cx + 22, r.cy + r.ch * 0.58 + 28 + i * 26, r.cw - 44, { color: C.hairSoft });
    const sx = dx + dw + 60, sw = W - M.r - sx;
    s.panel(sx, dy + 34, sw, 150, { r: 18, fill: C.surfaceAlt, stroke: C.data, sw: 2 });
    s.para(sx + 34, dy + 84, 'Each client sees only their own analytical data.', sw - 90, { size: 24, fill: C.ink, lh: 1.4, font: 'display' });
    s.para(sx, dy + 220, 'Metabase CE has no row-level security — isolation is baked into each copied dashboard at provisioning time.', sw, { size: 15.5, fill: C.ink3, lh: 1.5 });
    s.foot();
    return s;
  },
});

/* ---- 17. DEVOPS ------------------------------ */
push({
  title: 'Build & Deployment Pipeline', file: 'slide-17',
  build(pptx, num) {
    const s = new Page(pptx, { kicker: '15 · DevOps', num });
    s.header('Build & Deployment Pipeline', 'From source control to production, with automated Windows builds');
    chain(s, ['GitHub', 'Build automation', 'Docker', 'GitHub Actions', 'Render', 'Production'], 404, {
      h: 150, accent: C.blue, glyphs: ['flow', 'gear', 'db', 'gen', 'deploy', 'deploy'],
    });
    s.text(M.l, 636, 'KEY PRACTICES', { size: 14, font: 'semi', fill: C.ink3, spacing: 2.8 });
    let cx = M.l;
    ['Automated POS installer builds', 'Docker containerization', 'PostgreSQL (managed)', 'Static admin & frontend', 'CI/CD via render.yaml']
      .forEach((c) => { cx += s.chip(cx, 660, c, { accent: C.ink2 }) + 20; });
    s.panel(M.l, 748, CW, 154, { r: 16, fill: C.surfaceAlt });
    s.text(M.l + 36, 790, 'DEPLOYMENT TOPOLOGY', { size: 13, font: 'semi', fill: C.ink3, spacing: 2.4 });
    const rows = [
      ['carthapos-backend', 'Docker web service'],
      ['admin + frontend', 'static sites'],
      ['carthapos-db', 'managed PostgreSQL'],
      ['Windows installer', 'GitHub Actions runner'],
    ];
    rows.forEach((r, i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const x = M.l + 36 + col * (CW / 2 - 10), y = 830 + row * 40;
      s.dot(x, y - 6, 3, C.blue);
      s.text(x + 18, y, r[0], { size: 15.5, fill: C.ink });
      s.text(x + 286, y, '·  ' + r[1], { size: 15.5, fill: C.ink3 });
    });
    s.foot();
    return s;
  },
});

/* ---- 18. RESULTS --------------------------- */
push({
  title: 'Results', file: 'slide-18',
  build(pptx, num) {
    const s = new Page(pptx, { kicker: '16 · Results', num });
    s.header('Results', 'What the platform delivers today');
    const cards = [
      ['6', 'business sectors', C.accent],
      ['20', 'BI datasets', C.data],
      ['246', 'BI columns', C.data],
      ['35', 'RBAC permissions', C.blue],
      ['6', 'warehouse facts', C.data],
      ['5', 'warehouse dimensions', C.data],
    ];
    const cw = 508, ch = 196, gx = (CW - 3 * cw) / 2, gy = 40, y0 = 396;
    cards.forEach((c, i) => {
      const x = M.l + (i % 3) * (cw + gx);
      const y = y0 + Math.floor(i / 3) * (ch + gy);
      s.metric(x, y, cw, ch, { value: c[0], label: c[1], accent: c[2] });
    });
    const py = y0 + 2 * ch + gy + 34;
    s.panel(M.l, py, CW, 74, { r: 37, fill: C.surfaceAlt, stroke: C.accent, sw: 2 });
    s.text(CX, py + 40, 'Fully automated Windows POS generation, end to end', { size: 21, anchor: 'middle', fill: C.ink, font: 'semi', w: CW });
    s.foot();
    return s;
  },
});

/* ---- 19. LIMITATIONS & FUTURE ------------- */
push({
  title: 'Limitations & Future Perspectives', file: 'slide-19',
  build(pptx, num) {
    const s = new Page(pptx, { kicker: '17 · Outlook', num });
    s.header('Limitations & Future Perspectives');
    const midX = M.l + 640;
    s.vline(midX, 396, 520, { color: C.hairSoft });
    s.text(M.l, 428, 'LIMITATIONS', { size: 15, font: 'semi', fill: C.ink3, spacing: 2.8 });
    ['Local Metabase & single-region deployment', 'ETL runs synchronously on upload — no job queue', 'Per-tenant Metabase sandboxing is still manual', 'Some advanced modules exist only as previews']
      .forEach((t, i) => {
        const y = 502 + i * 106;
        s.dot(M.l + 4, y - 7, 3.6, C.ink3);
        s.para(M.l + 28, y, t, midX - M.l - 100, { size: 21, fill: C.ink2, lh: 1.44 });
      });
    const fx = midX + 60, fw = W - M.r - fx;
    s.text(fx, 428, 'FUTURE VISION', { size: 15, font: 'semi', fill: C.accent, spacing: 2.8, bold: true });
    s.panel(fx, 466, fw, 132, { r: 16, fill: C.surface });
    s.text(fx + 30, 504, 'PROMPT', { size: 12, font: 'semi', fill: C.ink3, spacing: 2 });
    s.para(fx + 30, 542, '“Create a restaurant POS with table management, kitchen orders, loyalty and dark-blue branding.”', fw - 320, { size: 18, fill: C.ink, lh: 1.44, italic: true });
    s.arrow(fx + fw / 2, 616, fx + fw / 2, 652, { color: C.accent, width: 2.8 });
    s.text(fx + fw / 2 + 22, 640, 'AI generation', { size: 14, fill: C.accent, font: 'semi' });
    s.panel(fx, 664, fw, 70, { r: 14, fill: C.surfaceAlt, stroke: C.accent, sw: 2 });
    s.text(fx + fw / 2, 702, 'Customized POS, generated from language', { size: 19, anchor: 'middle', fill: C.ink, font: 'semi', w: fw });
    s.text(fx, 782, 'ALSO ON THE ROADMAP', { size: 12, font: 'semi', fill: C.ink3, spacing: 2.2 });
    const fut = ['Full ERP', 'AI-assisted config', 'Dedicated POS hardware', 'Smarter analytics', 'Automation'];
    let cx = fx, cy = 806;
    fut.forEach((c) => {
      const w = s.chip(cx, cy, c, { accent: C.ink2, size: 16 });
      cx += w + 14;
      if (cx > W - M.r - 240) { cx = fx; cy += 58; }
    });
    s.foot();
    return s;
  },
});

/* ---- 20. CONCLUSION --------------------- */
push({
  title: 'Conclusion', file: 'slide-20',
  build(pptx, num) {
    const s = new Page(pptx, { kicker: '', num });
    s.text(M.l, 210, 'CONCLUSION', { size: 16, font: 'semi', fill: C.accent, spacing: 3.6, bold: true });
    s.text(M.l, 392, 'CarthaPOS', { size: 112, font: 'light', fill: C.ink });
    s.rule(M.l, 448, CW, { color: C.hair });
    const verbs = ['GENERATE', 'CUSTOMIZE', 'SECURE', 'DEPLOY', 'ANALYZE'];
    const bw = 300, y = 520, gap = (CW - 5 * bw) / 4;
    verbs.forEach((v, i) => {
      const x = M.l + i * (bw + gap);
      s.panel(x, y, bw, 120, { r: 16, fill: i % 2 ? C.surface : C.surfaceAlt });
      s.text(x + bw / 2, y + 66, v, { size: 22, anchor: 'middle', fill: C.ink, font: 'semi', spacing: 1.6, w: bw });
      if (i < 4) s.chevron(x + bw + gap / 2, y + 60, { color: C.accent, s: 12 });
    });
    s.para(M.l, 748, 'One platform connecting POS generation, centralized management and Business Intelligence.', 1360, { size: 31, fill: C.ink2, lh: 1.5, font: 'display' });
    s.text(M.l, 894, 'Thank you', { size: 46, font: 'light', fill: C.ink });
    s.text(M.l, H - 54, 'Oussama Ferjani   ·   MAKTABI SARL   ·   2025 – 2026', { size: 15, fill: C.ink3, spacing: 0.4 });
    s.text(W - M.r, H - 54, '20 / 20', { size: 14, fill: C.ink3, anchor: 'end', font: 'regular' });
    return s;
  },
});

module.exports = { SLIDES, UML_FRAME };
