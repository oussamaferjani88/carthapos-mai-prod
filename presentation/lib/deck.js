/* =========================================================================
   CarthaPOS PFE — native PowerPoint builder
   Everything on every slide is a real, editable PowerPoint object:
   text boxes, shapes, lines. No slide is an image.
   Coordinates are authored in px on a 1920x1080 canvas and converted to inches.
   ========================================================================= */
const PptxGenJS = require('pptxgenjs');
const { W, H, C, M } = require('./design');

const IN = (px) => Math.round((px / 144) * 1000) / 1000; // px -> inches
const PT = (px) => Math.round(px * 0.5 * 10) / 10; // px font-size -> points
const SP = (px) => Math.round(px * 0.5 * 10) / 10; // px letter-spacing -> points
const hx = (c) => String(c).replace('#', '').toUpperCase();

const FACE = {
  display: 'Segoe UI Semilight',
  light: 'Segoe UI Light',
  regular: 'Segoe UI',
  semi: 'Segoe UI Semibold',
};
const faceOf = (f) => FACE[f] || FACE.regular;

function newDeck() {
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: 'CARTHA_16x9', width: 13.333, height: 7.5 });
  pptx.layout = 'CARTHA_16x9';
  pptx.author = 'Oussama Ferjani';
  pptx.company = 'MAKTABI SARL';
  pptx.subject = 'Final Year Engineering Project';
  pptx.title = 'CarthaPOS — Intelligent SaaS Platform for Automated POS Generation and Business Intelligence';
  return pptx;
}

class Page {
  constructor(pptx, { kicker = '', num = 1, total = 20 } = {}) {
    this.pptx = pptx;
    this.T = pptx.ShapeType;
    this.s = pptx.addSlide();
    this.s.background = { color: hx(C.bg) };
    this.kicker = kicker;
    this.num = num;
    this.total = total;
  }

  /* ---- text ---------------------------------------------------------
     x,y is the SVG-style anchor: y ~ text baseline, x per `anchor`.     */
  text(x, y, str, o = {}) {
    const size = o.size ?? 26;
    const anchor = o.anchor ?? 'start'; // start | middle | end
    const align = anchor === 'middle' ? 'center' : anchor === 'end' ? 'right' : 'left';
    const wPx = o.w ?? (anchor === 'middle' ? 1000 : anchor === 'end' ? Math.max(80, x - M.l) : W - M.r - x);
    const xPx = anchor === 'middle' ? x - wPx / 2 : anchor === 'end' ? x - wPx : x;
    const hPx = o.h ?? size * 1.35;
    const topPx = y - size * 1.02;
    this.s.addText(String(str), {
      x: IN(xPx), y: IN(topPx), w: IN(wPx), h: IN(hPx),
      align, valign: 'middle',
      fontFace: faceOf(o.font),
      fontSize: PT(size),
      color: hx(o.fill ?? C.ink),
      bold: !!o.bold || o.weight === 'bold' || o.weight === '600',
      italic: !!o.italic,
      charSpacing: o.spacing ? SP(o.spacing) : 0,
      lineSpacingMultiple: o.lh ?? 1.12,
      margin: 0,
      wrap: o.wrap ?? false,
      fit: 'none',
    });
    return this;
  }

  // wrapped paragraph — PowerPoint does the wrapping inside width wPx
  para(x, y, str, wPx, o = {}) {
    const size = o.size ?? 24;
    const lh = o.lh ?? 1.42;
    const hPx = o.h ?? size * lh * 8;
    this.s.addText(String(str), {
      x: IN(x), y: IN(y - size * 1.02), w: IN(wPx), h: IN(hPx),
      align: o.anchor === 'middle' ? 'center' : 'left',
      valign: 'top',
      fontFace: faceOf(o.font),
      fontSize: PT(size),
      color: hx(o.fill ?? C.ink2),
      bold: !!o.bold || o.weight === 'bold',
      italic: !!o.italic,
      lineSpacingMultiple: lh,
      margin: 0, wrap: true, fit: 'none',
    });
    return this;
  }

  /* ---- primitives ------------------------------------------------- */
  rule(x, y, wPx, o = {}) {
    this.s.addShape(this.T.line, {
      x: IN(x), y: IN(y), w: IN(wPx), h: 0,
      line: { color: hx(o.color ?? C.hair), width: o.width ?? 1, dashType: o.dash ? 'dash' : 'solid' },
    });
    return this;
  }

  vline(x, y, hPx, o = {}) {
    this.s.addShape(this.T.line, {
      x: IN(x), y: IN(y), w: 0, h: IN(hPx),
      line: { color: hx(o.color ?? C.hair), width: o.width ?? 1, dashType: o.dash ? 'dash' : 'solid' },
    });
    return this;
  }

  panel(x, y, w, h, o = {}) {
    const r = o.r ?? 22;
    const opt = {
      x: IN(x), y: IN(y), w: IN(w), h: IN(h),
      fill: o.fill === 'none' ? { type: 'none' } : { color: hx(o.fill ?? C.surface) },
      line: o.stroke === 'none'
        ? { type: 'none' }
        : { color: hx(o.stroke ?? C.hair), width: o.sw ?? 1, dashType: o.dash ? 'dash' : 'solid' },
    };
    if (o.shadow) opt.shadow = { type: 'outer', color: '000000', opacity: 0.06, blur: 9, offset: 3, angle: 90 };
    if (r > 0) {
      opt.rectRadius = IN(Math.min(r, h / 2, w / 2));
      this.s.addShape(this.T.roundRect, opt);
    } else {
      this.s.addShape(this.T.rect, opt);
    }
    return this;
  }

  // filled rectangle (bars, accent bars) — optional rounded, optional stroke-only
  rect(x, y, w, h, o = {}) {
    const opt = {
      x: IN(x), y: IN(y), w: IN(w), h: IN(h),
      fill: o.fill && o.fill !== 'none' ? { color: hx(o.fill), transparency: o.transparency ?? 0 } : { type: 'none' },
      line: o.stroke ? { color: hx(o.stroke), width: o.sw ?? 1.5 } : { type: 'none' },
    };
    if (o.r) { opt.rectRadius = IN(o.r); this.s.addShape(this.T.roundRect, opt); }
    else this.s.addShape(this.T.rect, opt);
    return this;
  }

  circle(cx, cy, r, o = {}) {
    this.s.addShape(this.T.ellipse, {
      x: IN(cx - r), y: IN(cy - r), w: IN(2 * r), h: IN(2 * r),
      fill: o.fill && o.fill !== 'none' ? { color: hx(o.fill) } : { type: 'none' },
      line: o.stroke === 'none' ? { type: 'none' } : { color: hx(o.stroke ?? C.line), width: o.sw ?? 2 },
    });
    return this;
  }

  dot(cx, cy, r, fill = C.ink) {
    this.s.addShape(this.T.ellipse, {
      x: IN(cx - r), y: IN(cy - r), w: IN(2 * r), h: IN(2 * r),
      fill: { color: hx(fill) }, line: { type: 'none' },
    });
    return this;
  }

  // generic shape placed by px bounding box
  shape(type, x, y, w, h, o = {}) {
    const opt = {
      x: IN(x), y: IN(y), w: IN(w), h: IN(h),
      fill: o.fill && o.fill !== 'none' ? { color: hx(o.fill) } : { type: 'none' },
      line: o.stroke === 'none' || !o.stroke ? (o.noline ? { type: 'none' } : { color: hx(o.stroke ?? C.line), width: o.sw ?? 2 }) : { color: hx(o.stroke), width: o.sw ?? 2 },
    };
    if (o.rotate) opt.rotate = o.rotate;
    if (o.rectRadius != null) opt.rectRadius = IN(o.rectRadius);
    if (o.angleRange) opt.angleRange = o.angleRange;
    this.s.addShape(this.T[type], opt);
    return this;
  }

  // plain line segment (no arrow), any direction
  seg(x1, y1, x2, y2, o = {}) {
    this.s.addShape(this.T.line, {
      x: IN(Math.min(x1, x2)), y: IN(Math.min(y1, y2)),
      w: IN(Math.abs(x2 - x1)), h: IN(Math.abs(y2 - y1)),
      line: { color: hx(o.color ?? C.line), width: o.width ?? 2, dashType: o.dash ? 'dash' : 'solid' },
      flipH: x2 < x1, flipV: y2 < y1,
    });
    return this;
  }

  // straight connector with an arrow head at (x2,y2)
  arrow(x1, y1, x2, y2, o = {}) {
    this.s.addShape(this.T.line, {
      x: IN(Math.min(x1, x2)), y: IN(Math.min(y1, y2)),
      w: IN(Math.abs(x2 - x1)), h: IN(Math.abs(y2 - y1)),
      line: {
        color: hx(o.color ?? C.ink3), width: o.width ?? 2,
        dashType: o.dash ? 'dash' : 'solid',
        beginArrowType: 'none', endArrowType: 'triangle',
      },
      flipH: x2 < x1, flipV: y2 < y1,
    });
    return this;
  }

  // orthogonal down·across·down connector (snaking a pipeline)
  elbow(x1, y1, x2, y2, o = {}) {
    const midY = (y1 + y2) / 2;
    const col = o.color ?? C.hair, wdt = o.width ?? 1.4;
    this.vline(x1, y1, midY - y1, { color: col, width: wdt, dash: true });
    this.rule(Math.min(x1, x2), midY, Math.abs(x2 - x1), { color: col, width: wdt, dash: true });
    this.arrow(x2, midY, x2, y2, { color: col, width: wdt });
    return this;
  }

  chevron(cx, cy, o = {}) {
    const s = o.s ?? 12;
    this.s.addShape(this.T.chevron, {
      x: IN(cx - s * 0.7), y: IN(cy - s * 0.9), w: IN(s * 1.5), h: IN(s * 1.8),
      fill: { color: hx(o.color ?? C.accent) }, line: { type: 'none' },
    });
    return this;
  }

  /* ---- composite blocks ---------------------------------------- */
  header(title, subtitle) {
    if (this.kicker) {
      this.text(M.l, 150, this.kicker.toUpperCase(), { size: 16, font: 'semi', fill: C.accent, spacing: 3.4, bold: true });
    }
    this.text(M.l, 236, title, { size: 66, font: 'display', fill: C.ink, w: W - M.l - M.r });
    this.rule(M.l, 286, W - M.l - M.r, { color: C.hair, width: 1 });
    if (subtitle) this.text(M.l, 330, subtitle, { size: 23, fill: C.ink2, font: 'regular', w: W - M.l - M.r });
    return this;
  }

  foot() {
    this.text(M.l, H - 54, 'CarthaPOS', { size: 14, fill: C.ink3, font: 'semi', spacing: 1.4 });
    this.text(W - M.r, H - 54, `${String(this.num).padStart(2, '0')} / ${this.total}`, {
      size: 14, fill: C.ink3, anchor: 'end', font: 'regular',
    });
    return this;
  }

  // titled card with an accent bar and bullet lines
  card(x, y, w, h, o = {}) {
    const { title, kicker, lines = [], accent = C.ink, r = 20, fill = C.surface } = o;
    this.panel(x, y, w, h, { r, fill, shadow: true });
    this.rect(x, y + 18, 4, h - 36, { fill: accent, r: 2 });
    const px = x + 34;
    let cy = y + 46;
    if (kicker) { this.text(px, cy, String(kicker).toUpperCase(), { size: 13, font: 'semi', fill: accent, spacing: 2.2, bold: true }); cy += 30; }
    if (title) { this.text(px, cy + 10, title, { size: 24, font: 'semi', fill: C.ink, w: w - 60 }); cy += 44; }
    lines.forEach((ln, i) => {
      const ly = cy + 12 + i * 36;
      this.dot(px + 3, ly - 7, 2.6, C.ink3);
      this.text(px + 22, ly, ln, { size: 19, fill: C.ink2, w: w - 70 });
    });
    return this;
  }

  // text whose VISUAL CENTRE sits at (cx, cy) — px
  ctext(cx, cy, str, o = {}) {
    const size = o.size ?? 20;
    return this.text(cx, cy + 0.345 * size, str, { anchor: 'middle', ...o });
  }

  // metric tile: big number + label (+ optional sub-label)
  metric(x, y, w, h, o = {}) {
    const { value, label, sub, accent = C.ink } = o;
    this.panel(x, y, w, h, { r: 18, shadow: true });
    const vSize = h >= 190 ? 60 : h >= 148 ? 46 : 40;
    const numC = sub ? y + h * 0.40 : y + h * 0.45;
    const labC = sub ? y + h * 0.74 : y + h * 0.76;
    this.ctext(x + w / 2, numC, String(value), { size: vSize, font: 'light', fill: accent, w: w - 16 });
    this.ctext(x + w / 2, labC, String(label), { size: 16.5, fill: C.ink2, font: 'regular', w: w - 16 });
    if (sub) this.ctext(x + w / 2, y + h * 0.90, String(sub), { size: 12, fill: C.ink3, w: w - 20 });
    return this;
  }

  // pill / chip — returns its width in px
  chip(x, y, label, o = {}) {
    const { accent = C.ink2, fill = C.surface, size = 18, h = 46 } = o;
    const w = 42 + String(label).length * size * 0.56;
    this.panel(x, y, w, h, { r: h / 2, fill, stroke: C.hair, sw: 1 });
    this.text(x + w / 2, y + h / 2 + size * 0.04, label, { size, fill: accent, anchor: 'middle', font: 'regular', w });
    return w;
  }

  // stylised application window (POS / dashboard mock-ups)
  windowMock(x, y, w, h, o = {}) {
    const { title = '', navItems = 4, accent = C.accent } = o;
    this.panel(x, y, w, h, { r: 18, fill: C.white, stroke: C.hair, shadow: true });
    this.rule(x, y + 46, w, { color: C.hairSoft, width: 1 });
    [0, 1, 2].forEach((i) => this.dot(x + 26 + i * 20, y + 23, 5, i === 0 ? '#E1A08C' : C.hairSoft));
    if (title) this.text(x + w / 2, y + 30, title, { size: 15, anchor: 'middle', fill: C.ink3, font: 'regular', w: w * 0.7 });
    const sbw = Math.min(120, w * 0.16);
    this.rect(x + 1, y + 47, sbw, h - 48, { fill: C.surfaceAlt });
    for (let i = 0; i < navItems; i++) {
      this.rect(x + 22, y + 78 + i * 42, sbw - 40, 10, { fill: i === 0 ? accent : C.hair, r: 5 });
    }
    return { cx: x + sbw + 26, cy: y + 70, cw: w - sbw - 50, ch: h - 92 };
  }

  // mini bar chart, native rectangles
  bars(x, y, w, h, values, o = {}) {
    const { color = C.data, gap = 10 } = o;
    const n = values.length;
    const bw = (w - gap * (n - 1)) / n;
    const mx = Math.max(...values);
    values.forEach((v, i) => {
      const bh = (v / mx) * h;
      this.rect(x + i * (bw + gap), y + h - bh, bw, bh, { fill: color, r: 3, transparency: Math.round((1 - (0.45 + 0.55 * (v / mx))) * 100) });
    });
    return this;
  }

  // ring — a native block-arc "donut" approximated with two ellipses + an arc wedge
  donut(cx, cy, r, o = {}) {
    const { color = C.accent, track = C.hairSoft, frac = 0.68, sw = 16 } = o;
    // track ring
    this.s.addShape(this.T.ellipse, {
      x: IN(cx - r), y: IN(cy - r), w: IN(2 * r), h: IN(2 * r),
      fill: { type: 'none' }, line: { color: hx(track), width: sw * 0.5 },
    });
    // progress arc
    this.s.addShape(this.T.arc, {
      x: IN(cx - r), y: IN(cy - r), w: IN(2 * r), h: IN(2 * r),
      fill: { type: 'none' }, line: { color: hx(color), width: sw * 0.5 },
      angleRange: [-90, -90 + Math.round(frac * 360)],
    });
    return this;
  }
}

module.exports = { newDeck, Page, IN, PT, hx, faceOf };
