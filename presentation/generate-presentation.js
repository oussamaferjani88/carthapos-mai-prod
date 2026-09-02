/* =========================================================================
   CarthaPOS PFE — presentation builder (native, fully editable)

   Produces:
     output/CarthaPOS_PFE_Presentation.pptx   every element is an editable
                                               PowerPoint object (no images)
     output/CarthaPOS_PFE_Presentation.pdf     rendered by installed PowerPoint
     output/previews/slide-01..20.png          rendered by installed PowerPoint

   Run:  npm run build
   ========================================================================= */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const { newDeck, Page, IN, hx } = require('./lib/deck');
const { SLIDES, UML_FRAME } = require('./lib/slides');
const { C } = require('./lib/design');

const ROOT = __dirname;
const DIR = {
  prev: path.join(ROOT, 'output', 'previews'),
  out: path.join(ROOT, 'output'),
};
for (const d of Object.values(DIR)) fs.mkdirSync(d, { recursive: true });

const PPTX = path.join(DIR.out, 'CarthaPOS_PFE_Presentation.pptx');
const PDF = path.join(DIR.out, 'CarthaPOS_PFE_Presentation.pdf');

(async function main() {
  console.log('CarthaPOS PFE — building native (editable) presentation\n');

  const pptx = newDeck();

  SLIDES.forEach((def, i) => {
    const num = i + 1;
    const page = def.build(pptx, num);

    if (def.uml) {
      // native, selectable drop-target + deletable instruction note
      page.s.addShape('roundRect', {
        x: UML_FRAME.x, y: UML_FRAME.y, w: UML_FRAME.w, h: UML_FRAME.h,
        rectRadius: 0.12,
        fill: { type: 'none' },
        line: { color: hx(C.accent), width: 1, dashType: 'dash', transparency: 35 },
      });
      page.s.addText('◇  Insert your existing UML diagram here, then delete this note', {
        x: UML_FRAME.x, y: UML_FRAME.y + UML_FRAME.h - 0.44, w: UML_FRAME.w, h: 0.36,
        align: 'center', fontFace: 'Segoe UI', fontSize: 11, color: '8A867C',
      });
      page.s.addNotes('UML PLACEHOLDER SLIDE — paste your prepared diagram inside the dashed frame, then delete the grey note and the dashed frame. The frame covers ~82% of the slide.');
    }

    console.log(`  slide ${String(num).padStart(2, '0')}  ${def.title}`);
  });

  await pptx.writeFile({ fileName: PPTX });
  console.log(`\n  wrote ${path.relative(ROOT, PPTX)}  (${(fs.statSync(PPTX).size / 1e6).toFixed(2)} MB)`);

  // ---- render previews + PDF with the installed PowerPoint --------------
  const ps1 = path.join(ROOT, 'lib', 'export-pptx.ps1');
  try {
    const out = execFileSync('powershell.exe', [
      '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ps1,
      '-Pptx', PPTX, '-OutDir', DIR.prev, '-Pdf',
    ], { encoding: 'utf8', timeout: 5 * 60 * 1000 });
    console.log('\n' + out.trim().split('\n').map((l) => '  ' + l).join('\n'));
  } catch (e) {
    console.warn('\n  ! PowerPoint export skipped: ' + (e.message || e));
    console.warn('  the .pptx is still complete — open it in PowerPoint directly.');
  }

  // ---- structural check ------------------------------------------------
  const buf = fs.readFileSync(PPTX);
  const slideParts = [...new Set(buf.toString('latin1').match(/ppt\/slides\/slide\d+\.xml/g) || [])].length;
  console.log('\n— quality control —');
  console.log(`  pptx slide parts: ${slideParts}/${SLIDES.length}`);
  if (fs.existsSync(PDF)) console.log(`  pdf: ${(fs.statSync(PDF).size / 1e6).toFixed(2)} MB`);
  const pngs = fs.existsSync(DIR.prev) ? fs.readdirSync(DIR.prev).filter((f) => f.endsWith('.png')) : [];
  console.log(`  preview PNGs: ${pngs.length}`);
  console.log(slideParts === SLIDES.length ? '  ✓ all slides present' : '  ! slide count mismatch');

  console.log('\ndone:');
  console.log('  ' + path.relative(ROOT, PPTX));
  if (fs.existsSync(PDF)) console.log('  ' + path.relative(ROOT, PDF));
  if (pngs.length) console.log('  ' + path.relative(ROOT, DIR.prev) + '/slide-01..' + String(pngs.length).padStart(2, '0') + '.png');
})().catch((e) => { console.error(e); process.exit(1); });
