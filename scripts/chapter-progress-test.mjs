import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const APP_URL = process.env.BASE_URL ?? process.env.APP_URL ?? 'http://127.0.0.1:5173/reader-harness';
const rawEpubPath = process.argv[2] ?? process.env.TEST_EPUB ?? process.env.EPUB_PATH ?? path.resolve(process.cwd(), 'TheWayOfKingsPrime.epub');
const EPUB_PATH = path.resolve(rawEpubPath);

if (!fs.existsSync(EPUB_PATH)) {
  throw new Error(`EPUB file not found: ${EPUB_PATH}\nPass a path via TEST_EPUB, EPUB_PATH, or argv[2].`);
}

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
  await page.setInputFiles('[data-testid="harness-file-input"]', EPUB_PATH);

  console.log('Waiting for load…');
  await page.waitForFunction(() => {
    const el = document.querySelector('[data-testid="harness-loading"]');
    return el && /false/i.test(el.textContent || '');
  }, null, { timeout: 120000 });

  console.log('Waiting for indexing…');
  let w = 0;
  while (w < 600000) {
    const s = await page.textContent('[data-testid="harness-indexing"]');
    if (/false/i.test(s || '')) break;
    await page.waitForTimeout(5000);
    w += 5000;
  }
  console.log('Indexing done.\n');

  // Navigate to start
  for (let i = 0; i < 25; i++) {
    await page.click('[data-testid="harness-prev"]');
    await page.waitForTimeout(80);
  }
  await page.waitForTimeout(300);

  // Page forward 120 times, tracking chapters
  let prevChIdx = null;
  let prevChProg = null;
  const chapterRanges = {};

  for (let i = 0; i < 120; i++) {
    await page.click('[data-testid="harness-next"]');
    await page.waitForTimeout(300);

    const snapshot = await page.evaluate(() => {
      const harness = window.__readerHarness;
      if (!harness) return null;
      return {
        prog: harness.getProgress(),
        chProg: harness.getChapterProgress(),
        chName: harness.getChapterName(),
        chIdx: harness.getChapterIndex(),
      };
    });
    if (!snapshot) continue;

    const key = snapshot.chIdx;
    if (!chapterRanges[key]) {
      chapterRanges[key] = {
        min: snapshot.chProg,
        max: snapshot.chProg,
        name: snapshot.chName,
        steps: 0,
        firstBookProg: snapshot.prog,
        lastBookProg: snapshot.prog,
        nonMonotonic: 0,
      };
    }
    const r = chapterRanges[key];
    r.steps++;
    if (snapshot.chProg < r.min) r.min = snapshot.chProg;
    if (snapshot.chProg > r.max) r.max = snapshot.chProg;
    r.lastBookProg = snapshot.prog;

    // Check monotonicity within chapter
    if (prevChIdx === snapshot.chIdx && snapshot.chProg < prevChProg - 0.0001) {
      r.nonMonotonic++;
      console.log(
        '  x Step ' + (i + 1) + ': ch' + snapshot.chIdx + ' progress went DOWN: ' + prevChProg.toFixed(6) + ' -> ' + snapshot.chProg.toFixed(6)
      );
    }

    // Chapter transition
    if (prevChIdx !== null && prevChIdx !== snapshot.chIdx) {
      const prevName = chapterRanges[prevChIdx] ? chapterRanges[prevChIdx].name : '?';
      console.log(
        '  Transition at step ' +
          (i + 1) +
          ': ch' +
          prevChIdx +
          ' "' +
          prevName.trim() +
          '" -> ch' +
          snapshot.chIdx +
          ' "' +
          snapshot.chName.trim() +
          '" ' +
          '(chProg: ' +
          (prevChProg != null ? prevChProg.toFixed(4) : '?') +
          ' -> ' +
          snapshot.chProg.toFixed(4) +
          ')'
      );
    }

    prevChIdx = snapshot.chIdx;
    prevChProg = snapshot.chProg;
  }

  console.log('\n=== CHAPTER SUMMARY ===');
  const sortedEntries = Object.entries(chapterRanges).sort((a, b) => Number(a[0]) - Number(b[0]));
  for (const [idx, r] of sortedEntries) {
    const label = r.name.trim().substring(0, 40);
    console.log(
      '  ch' +
        idx +
        ' "' +
        label +
        '" -- ' +
        r.steps +
        ' steps, ' +
        'chProg: ' +
        r.min.toFixed(4) +
        ' -> ' +
        r.max.toFixed(4) +
        ', ' +
        'bookProg: ' +
        r.firstBookProg.toFixed(6) +
        ' -> ' +
        r.lastBookProg.toFixed(6) +
        ', ' +
        'non-monotonic: ' +
        r.nonMonotonic
    );
  }

  const totalNonMono = Object.values(chapterRanges).reduce((s, r) => s + r.nonMonotonic, 0);
  console.log('\nTotal non-monotonic: ' + totalNonMono);
  console.log(totalNonMono === 0 ? 'PASS: ALL CHAPTERS MONOTONIC' : 'FAIL: SOME CHAPTERS NON-MONOTONIC');

  const hasProgress = Object.values(chapterRanges).some((r) => r.max > 0);
  if (!hasProgress) {
    console.log('\nWARNING: chapter progress was ALWAYS 0 -- feature may be broken!');
  }

  process.exitCode = totalNonMono > 0 ? 1 : 0;
} finally {
  await browser.close();
}
