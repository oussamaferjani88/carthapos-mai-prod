/* =========================================================================
   CarthaPOS PFE — Presentation design system
   One consistent visual language for all 20 slides.
   Canvas: 1920 x 1080 px  (16:9, 144 px per inch -> 13.333in x 7.5in)
   ========================================================================= */

const W = 1920;
const H = 1080;
const PXIN = 144; // px per inch (PowerPoint slide is 13.333 x 7.5 in)

// ---- palette -------------------------------------------------------------
const C = {
  bg: '#F7F5EF', // warm ivory background
  surface: '#FCFBF7', // card / panel
  surfaceAlt: '#EFEBDF', // subtle fill
  hair: '#DAD4C4', // hairline on cream
  hairSoft: '#E6E1D3',
  ink: '#1D1D1F', // primary charcoal
  ink2: '#5B5B60', // secondary
  ink3: '#8A867C', // muted / annotations
  line: '#2B2B2E', // illustration outline
  accent: '#B15A38', // terracotta (Carthage) — primary accent, used sparingly
  accentSoft: '#E7D7CE',
  data: '#43695E', // sage/teal — BI / data accent
  dataSoft: '#D8E2DE',
  blue: '#4A6B86', // muted blue — infra accent
  blueSoft: '#D7E0E7',
  white: '#FFFFFF',
};

// ---- type --------------------------------------------------------------
const F = {
  display: 'Segoe UI Semilight, Segoe UI, Inter, Arial, sans-serif',
  light: 'Segoe UI Light, Segoe UI, Inter, Arial, sans-serif',
  regular: 'Segoe UI, Inter, Arial, sans-serif',
  semi: 'Segoe UI Semibold, Segoe UI, Inter, Arial, sans-serif',
};

// ---- layout grid -----------------------------------------------------
const M = { l: 120, r: 120, t: 96, b: 84 };
const TITLE_BASELINE = 236; // baseline of the big slide title
const RULE_Y = 286; // hairline under the title
const CONTENT_TOP = 348; // where slide body content starts
const CONTENT_BOT = H - 132; // bottom limit for body content

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* --------------------------------------------------------------------- */
class Slide {
  constructor({ kicker = '', num = 1, total = 20 }) {
    this.kicker = kicker;
    this.num = num;
    this.total = total;
    this.parts = [];
    this._defs = [];
    // background
    this.parts.push(`<rect x="0" y="0" width="${W}" height="${H}" fill="${C.bg}"/>`);
  }

  raw(svg) { this.parts.push(svg); return this; }
  def(svg) { this._defs.push(svg); return this; }

  // ---- text -----------------------------------------------------------
  text(x, y, str, o = {}) {
    const {
      size = 26, fill = C.ink, font = F.regular, weight = 'normal',
      anchor = 'start', spacing = 0, opacity = 1, italic = false, lh = 1.32,
    } = o;
    const lines = String(str).split('\n');
    const t = lines
      .map((ln, i) =>
        `<tspan x="${x}" ${i === 0 ? '' : `dy="${size * lh}"`}>${esc(ln)}</tspan>`)
      .join('');
    this.parts.push(
      `<text x="${x}" y="${y}" font-family="${font}" font-size="${size}" font-weight="${weight}" ` +
      `fill="${fill}" text-anchor="${anchor}" letter-spacing="${spacing}" opacity="${opacity}" ` +
      `${italic ? 'font-style="italic"' : ''}>${t}</text>`,
    );
    return this;
  }

  // paragraph wrapped to width (rough width model tuned for Segoe UI)
  para(x, y, str, width, o = {}) {
    const { size = 24, lh = 1.42, ...rest } = o;
    const perChar = size * 0.505;
    const maxChars = Math.max(6, Math.floor(width / perChar));
    const words = String(str).split(/\s+/);
    const lines = [];
    let cur = '';
    for (const w of words) {
      if ((cur + ' ' + w).trim().length > maxChars && cur) { lines.push(cur); cur = w; }
      else cur = (cur + ' ' + w).trim();
    }
    if (cur) lines.push(cur);
    lines.forEach((ln, i) => this.text(x, y + i * size * lh, ln, { size, ...rest }));
    return y + lines.length * size * lh;
  }

  // ---- primitives ---------------------------------------------------
  rule(x, y, w, o = {}) {
    const { color = C.hair, width = 1.5, dash = null } = o;
    this.parts.push(
      `<line x1="${x}" y1="${y}" x2="${x + w}" y2="${y}" stroke="${color}" stroke-width="${width}" ${dash ? `stroke-dasharray="${dash}"` : ''}/>`,
    );
    return this;
  }

  vline(x, y, h, o = {}) {
    const { color = C.hair, width = 1.5, dash = null } = o;
    this.parts.push(`<line x1="${x}" y1="${y}" x2="${x}" y2="${y + h}" stroke="${color}" stroke-width="${width}" ${dash ? `stroke-dasharray="${dash}"` : ''}/>`);
    return this;
  }

  panel(x, y, w, h, o = {}) {
    const { fill = C.surface, stroke = C.hair, sw = 1.5, r = 22, dash = null, shadow = false } = o;
    if (shadow) {
      this.parts.push(`<rect x="${x + 4}" y="${y + 8}" width="${w}" height="${h}" rx="${r}" fill="#000000" opacity="0.05"/>`);
    }
    this.parts.push(
      `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" ${dash ? `stroke-dasharray="${dash}"` : ''}/>`,
    );
    return this;
  }

  circle(cx, cy, r, o = {}) {
    const { fill = 'none', stroke = C.line, sw = 2 } = o;
    this.parts.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`);
    return this;
  }

  dot(cx, cy, r, fill = C.ink) {
    this.parts.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"/>`);
    return this;
  }

  path(d, o = {}) {
    const { fill = 'none', stroke = C.line, sw = 2, cap = 'round', join = 'round', opacity = 1, dash = null } = o;
    this.parts.push(`<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="${cap}" stroke-linejoin="${join}" opacity="${opacity}" ${dash ? `stroke-dasharray="${dash}"` : ''}/>`);
    return this;
  }

  // arrow connector between two points — small, clean head
  arrow(x1, y1, x2, y2, o = {}) {
    const { color = C.ink3, width = 2, dash = null, head = 7 } = o;
    const ang = Math.atan2(y2 - y1, x2 - x1);
    const bx = x2 - Math.cos(ang) * head;
    const by = y2 - Math.sin(ang) * head;
    this.parts.push(`<line x1="${x1}" y1="${y1}" x2="${bx}" y2="${by}" stroke="${color}" stroke-width="${width}" stroke-linecap="round" ${dash ? `stroke-dasharray="${dash}"` : ''}/>`);
    const a1 = ang + Math.PI - 0.45, a2 = ang + Math.PI + 0.45;
    this.parts.push(
      `<path d="M ${x2 + Math.cos(a1) * head * 1.7} ${y2 + Math.sin(a1) * head * 1.7} L ${x2} ${y2} L ${x2 + Math.cos(a2) * head * 1.7} ${y2 + Math.sin(a2) * head * 1.7}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`,
    );
    return this;
  }

  // clean elbow connector: down · across · up (for snaking a pipeline)
  elbow(x1, y1, x2, y2, o = {}) {
    const { color = C.hair, width = 1.8, dash = '2 8' } = o;
    const midY = (y1 + y2) / 2;
    this.parts.push(`<path d="M ${x1} ${y1} L ${x1} ${midY} L ${x2} ${midY} L ${x2} ${y2 - 8}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="${dash}"/>`);
    this.arrow(x2, midY, x2, y2, { color, width, head: 6 });
    return this;
  }

  chevron(cx, cy, o = {}) {
    const { color = C.accent, s = 13, width = 3 } = o;
    this.path(`M ${cx - s} ${cy - s} L ${cx + s * 0.5} ${cy} L ${cx - s} ${cy + s}`, { stroke: color, sw: width });
    return this;
  }

  // ---- composite blocks ------------------------------------------
  header(title, subtitle) {
    // kicker
    this.text(M.l, 150, this.kicker.toUpperCase(), {
      size: 16, font: F.semi, fill: C.accent, spacing: 3.4, weight: 'bold',
    });
    // title
    this.text(M.l, TITLE_BASELINE, title, { size: 66, font: F.display, fill: C.ink });
    // rule
    this.rule(M.l, RULE_Y, W - M.l - M.r, { color: C.hair, width: 1.5 });
    if (subtitle) {
      this.text(M.l, RULE_Y + 44, subtitle, { size: 23, fill: C.ink2, font: F.regular });
    }
    return this;
  }

  foot() {
    this.text(M.l, H - 54, 'CarthaPOS', { size: 14, fill: C.ink3, font: F.semi, spacing: 1.5 });
    this.text(W - M.r, H - 54, `${String(this.num).padStart(2, '0')} / ${this.total}`, {
      size: 14, fill: C.ink3, anchor: 'end', font: F.regular, spacing: 1.5,
    });
    return this;
  }

  // a titled card with optional bullet lines and an accent bar
  card(x, y, w, h, o = {}) {
    const { title, kicker, lines = [], accent = C.ink, big, bigLabel, r = 20, fill = C.surface } = o;
    this.panel(x, y, w, h, { r, fill, shadow: true });
    this.parts.push(`<rect x="${x}" y="${y + 18}" width="4" height="${h - 36}" rx="2" fill="${accent}"/>`);
    const px = x + 34;
    let cy = y + 44;
    if (kicker) { this.text(px, cy, String(kicker).toUpperCase(), { size: 13, font: F.semi, fill: accent, spacing: 2.2, weight: 'bold' }); cy += 30; }
    if (title) { this.text(px, cy + 8, title, { size: 24, font: F.semi, fill: C.ink, weight: '600' }); cy += 42; }
    if (big) {
      this.text(px, y + h - 74, String(big), { size: 68, font: F.light, fill: accent });
      if (bigLabel) this.text(px, y + h - 34, bigLabel, { size: 17, fill: C.ink2 });
    }
    lines.forEach((ln, i) => {
      const ly = cy + 6 + i * 34;
      this.dot(px + 3, ly - 8, 2.6, C.ink3);
      this.text(px + 20, ly, ln, { size: 19, fill: C.ink2, lh: 1.3 });
    });
    return this;
  }

  // simple metric tile: big number + label (+ optional sub-label)
  metric(x, y, w, h, o = {}) {
    const { value, label, sub, accent = C.ink } = o;
    this.panel(x, y, w, h, { r: 18, shadow: true });
    const cx = x + w / 2;
    const vSize = h >= 190 ? 70 : h >= 150 ? 54 : 42;
    const numCenterY = y + h * (sub ? 0.37 : 0.45);
    this.text(cx, numCenterY + vSize * 0.34, String(value), { size: vSize, font: F.light, fill: accent, anchor: 'middle' });
    this.text(cx, y + h - (sub ? 50 : 30), String(label), { size: 17, fill: C.ink2, anchor: 'middle', font: F.regular });
    if (sub) this.text(cx, y + h - 22, String(sub), { size: 12.5, fill: C.ink3, anchor: 'middle' });
    return this;
  }

  // pill / chip
  chip(x, y, label, o = {}) {
    const { accent = C.ink2, fill = C.surface, size = 18, ph = 20, h = 46 } = o;
    const w = ph * 2 + String(label).length * size * 0.54;
    this.parts.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="${fill}" stroke="${C.hair}" stroke-width="1.5"/>`);
    this.text(x + w / 2, y + h / 2 + size * 0.35, label, { size, fill: accent, anchor: 'middle', font: F.regular });
    return w;
  }

  // horizontal or vertical step flow with connectors
  flow(steps, x, y, span, o = {}) {
    const { vertical = false, boxW = 150, boxH = 92, accent = C.ink, gap } = o;
    const n = steps.length;
    if (!vertical) {
      const g = gap != null ? gap : (span - n * boxW) / (n - 1);
      steps.forEach((s, i) => {
        const bx = x + i * (boxW + g);
        this.panel(bx, y, boxW, boxH, { r: 14 });
        this.text(bx + boxW / 2, y + boxH / 2 + 7, s, { size: 17, anchor: 'middle', fill: C.ink, font: F.regular, lh: 1.15 });
        if (i < n - 1) this.arrow(bx + boxW + 8, y + boxH / 2, bx + boxW + g - 8, y + boxH / 2, { color: accent, width: 2.2 });
      });
    } else {
      const g = gap != null ? gap : (span - n * boxH) / (n - 1);
      steps.forEach((s, i) => {
        const by = y + i * (boxH + g);
        this.panel(x, by, boxW, boxH, { r: 14 });
        this.text(x + boxW / 2, by + boxH / 2 + 7, s, { size: 17, anchor: 'middle', fill: C.ink, font: F.regular, lh: 1.15 });
        if (i < n - 1) this.arrow(x + boxW / 2, by + boxH + 6, x + boxW / 2, by + boxH + g - 6, { color: accent, width: 2.2 });
      });
    }
    return this;
  }

  // stylised application window (used for POS / dashboard mock-ups)
  windowMock(x, y, w, h, o = {}) {
    const { title = '', navItems = 4, accent = C.accent } = o;
    this.panel(x, y, w, h, { r: 18, fill: C.white, shadow: true, stroke: C.hair });
    // title bar
    this.rule(x, y + 46, w, { color: C.hairSoft, width: 1.5 });
    [0, 1, 2].forEach((i) => this.dot(x + 26 + i * 20, y + 23, 5, i === 0 ? '#E1A08C' : C.hairSoft));
    if (title) this.text(x + w / 2, y + 30, title, { size: 15, anchor: 'middle', fill: C.ink3, font: F.regular });
    // sidebar
    const sbw = Math.min(120, w * 0.16);
    this.parts.push(`<rect x="${x + 1}" y="${y + 47}" width="${sbw}" height="${h - 48}" fill="${C.surfaceAlt}" opacity="0.7"/>`);
    for (let i = 0; i < navItems; i++) {
      this.parts.push(`<rect x="${x + 22}" y="${y + 78 + i * 42}" width="${sbw - 40}" height="10" rx="5" fill="${i === 0 ? accent : C.hair}"/>`);
    }
    return { cx: x + sbw + 26, cy: y + 70, cw: w - sbw - 50, ch: h - 92 };
  }

  // mini bar chart inside a region
  bars(x, y, w, h, values, o = {}) {
    const { color = C.data, gap = 10 } = o;
    const bw = (w - gap * (values.length - 1)) / values.length;
    const mx = Math.max(...values);
    values.forEach((v, i) => {
      const bh = (v / mx) * h;
      this.parts.push(`<rect x="${x + i * (bw + gap)}" y="${y + h - bh}" width="${bw}" height="${bh}" rx="3" fill="${color}" opacity="${0.35 + 0.55 * (v / mx)}"/>`);
    });
    return this;
  }

  donut(cx, cy, r, o = {}) {
    const { color = C.accent, track = C.hairSoft, frac = 0.68, sw = 16 } = o;
    const cc = 2 * Math.PI * r;
    this.parts.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${track}" stroke-width="${sw}"/>`);
    this.parts.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-dasharray="${cc * frac} ${cc}" transform="rotate(-90 ${cx} ${cy})"/>`);
    return this;
  }

  // line-art node badge (small square with rounded corners + tiny glyph line)
  node(x, y, w, h, label, o = {}) {
    const { accent = C.ink, sub } = o;
    this.panel(x, y, w, h, { r: 12, fill: C.surface });
    this.parts.push(`<rect x="${x + 14}" y="${y + 14}" width="18" height="18" rx="4" fill="none" stroke="${accent}" stroke-width="2"/>`);
    this.text(x + 44, y + 30, label, { size: 16, font: F.semi, fill: C.ink });
    if (sub) this.text(x + 44, y + 52, sub, { size: 12.5, fill: C.ink3 });
    return this;
  }

  toString() {
    return (
      `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
      (this._defs.length ? `<defs>${this._defs.join('')}</defs>` : '') +
      this.parts.join('') +
      `</svg>`
    );
  }
}

module.exports = { W, H, PXIN, C, F, M, TITLE_BASELINE, RULE_Y, CONTENT_TOP, CONTENT_BOT, Slide, esc };
