# CarthaPOS — PFE Defense Presentation

Generator for the Final Year Engineering Project (PFE) defense deck.

- **Student:** Oussama Ferjani
- **Academic year:** 2025 – 2026
- **Company:** MAKTABI SARL
- **Academic supervisor:** Mme Safa Fennia

## Deliverables

| File | What it is |
|---|---|
| `output/CarthaPOS_PFE_Presentation.pptx` | The presentation — 20 slides, 16:9. **Every element is a native, editable PowerPoint object** (text boxes, shapes, lines) — no slide is an image |
| `output/CarthaPOS_PFE_Presentation.pdf` | PDF export, rendered by the installed PowerPoint |
| `output/previews/slide-01..20.png` | Per-slide preview images, rendered by the installed PowerPoint |

## Everything is editable

Open the `.pptx` in PowerPoint and you can:

- **edit any text** — titles, subtitles, bullets, labels, numbers are all real text boxes
- **restyle any shape** — cards, panels, dividers, accent bars, chips, connectors are native shapes
- **move / resize / delete anything**
- **swap the illustrations** — the app-window mock-ups, bar charts, star schema, and line-art
  icons are built from grouped shapes; select and delete one, then drop in a real screenshot
  or your own graphic

## How it was generated

`pptxgenjs` writes the `.pptx` directly as native shapes and text. No images are embedded.
The slides are authored on a 1920 × 1080 px design grid and converted to inches.

```
lib/design.js            design tokens — palette, fonts, margins
lib/deck.js              the native drawing helpers (text, panel, card, metric, chip,
                         chain, pipeline, windowMock, bars, donut, glyph icons, …)
lib/slides.js            the 20 slide definitions (content + layout)
lib/export-pptx.ps1      drives the installed PowerPoint (COM) to render PNG previews + PDF
generate-presentation.js orchestrates the build
```

### Design system

- Background warm ivory `#F7F5EF`, text charcoal `#1D1D1F`
- Accents: terracotta `#B15A38` (Carthage), sage `#43695E` (BI/data), muted blue `#4A6B86` (infra)
- Font: **Segoe UI** family (Light / Semilight / Semibold) — installed on every Windows machine.
  To switch to Inter or Aptos, edit the `FACE` map in `lib/deck.js` and rebuild.

## How to regenerate

```bash
cd presentation
npm install        # first time only — installs pptxgenjs (+ nothing native)
npm run build      # writes output/*.pptx, then renders previews + PDF via PowerPoint
```

`npm run build` needs Microsoft PowerPoint installed **only** for the PNG/PDF previews —
the `.pptx` itself is written without it. If PowerPoint is absent the build still produces
the `.pptx` and just skips the preview/PDF step.

To change content or layout, edit `lib/slides.js` (per-slide) or `lib/deck.js` (helpers),
then `npm run build`.

## UML diagram slides — you insert these yourself

**Slides 5 and 6 are placeholders for your own existing UML diagrams.**

| Slide | Title | Put here |
|---|---|---|
| 5 | System Context | Your global use-case / system-context UML |
| 6 | Global Class Architecture | Your global class diagram |

Each has a large dashed frame (~82% of the slide) with corner ticks and an instruction note.
Open the `.pptx`, paste your prepared diagram inside the frame, then delete the grey note
and the dashed frame. Nothing else on those slides needs to change.

## Slide map

| # | Slide | # | Slide |
|---|---|---|---|
| 1 | Title | 11 | Generated POS Application |
| 2 | The Problem | 12 | Security & Licensing |
| 3 | Existing Solutions | 13 | Role-Based Access Control |
| 4 | CarthaPOS Vision | 14 | From POS Data to Business Intelligence |
| 5 | **System Context (UML — your diagram)** | 15 | Analytical Data Warehouse |
| 6 | **Global Class Architecture (UML — your diagram)** | 16 | Personalized BI Dashboards |
| 7 | Technical Architecture | 17 | Build & Deployment Pipeline |
| 8 | Platform Functional Architecture | 18 | Results |
| 9 | From Configuration to POS | 19 | Limitations & Future Perspectives |
| 10 | Customize the POS | 20 | Conclusion |
