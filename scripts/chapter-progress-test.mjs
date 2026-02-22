import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto('http://127.0.0.1:5173/reader-harness', { waitUntil: 'domcontentloaded' });
await page.setInputFiles('[data-testid="harness-file-input"]', '/home/ruben/Shelves/TheWayOfKingsPrime.epub');

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

  const h = await page.evaluate(() => {
    const h = window.__readerHarness;
    if (!h) return null;
    return {
      prog: h.getProgress(),
      chProg: h.getChapterProgress(),
      chName: h.getChapterName(),
      chIdx: h.getChapterIndex(),
    };
  });
  if (!h) continue;

  const key = h.chIdx;
  if (!chapterRanges[key]) {
    chapterRanges[key] = { min: h.chProg, max: h.chProg, name: h.chName, steps: 0, firstBookProg: h.prog, lastBookProg: h.prog, nonMonotonic: 0 };
  }
  const r = chapterRanges[key];
  r.steps++;
  if (h.chProg < r.min) r.min = h.chProg;
  if (h.chProg > r.max) r.max = h.chProg;
  r.lastBookProg = h.prog;

  // Check monotonicity within chapter
  if (prevChIdx === h.chIdx && h.chProg < prevChProg - 0.0001) {
    r.nonMonotonic++;
    console.log('  x Step ' + (i+1) + ': ch' + h.chIdx + ' progress went DOWN: ' + prevChProg.toFixed(6) + ' -> ' + h.chProg.toFixed(6));
  }

  // Chapter transition
  if (prevChIdx !== null && prevChIdx !== h.chIdx) {
    const prevName = chapterRanges[prevChIdx] ? chapterRanges[prevChIdx].name : '?';
    console.log(
      '  Transition at step ' + (i+1) + ': ch' + prevChIdx + ' "' + prevName.trim() + '" -> ch' + h.chIdx + ' "' + h.chName.trim() + '" ' +
      '(chProg: ' + (prevChProg != null ? prevChProg.toFixed(4) : '?') + ' -> ' + h.chProg.toFixed(4) + ')'
    );
  }

  prevChIdx = h.chIdx;
  prevChProg = h.chProg;
}

console.log('\n=== CHAPTER SUMMARY ===');
const sortedEntries = Object.entries(chapterRanges).sort((a, b) => Number(a[0]) - Number(b[0]));
for (const [idx, r] of sortedEntries) {
  const label = r.name.trim().substring(0, 40);
  console.log(
    '  ch' + idx + ' "' + label + '" -- ' + r.steps + ' steps, ' +
    'chProg: ' + r.min.toFixed(4) + ' -> ' + r.max.toFixed(4) + ', ' +
    'bookProg: ' + r.firstBookProg.toFixed(6) + ' -> ' + r.lastBookProg.toFixed(6) + ', ' +
    'non-monotonic: ' + r.nonMonotonic
  );
}

const totalNonMono = Object.values(chapterRanges).reduce((s, r) => s + r.nonMonotonic, 0);
console.log('\nTotal non-monotonic: ' + totalNonMono);
console.log(totalNonMono === 0 ? 'PASS: ALL CHAPTERS MONOTONIC' : 'FAIL: SOME CHAPTERS NON-MONOTONIC');

// Check if chapter progress was ever non-zero
const allSteps = Object.values(chapterRanges).reduce((s, r) => s + r.steps, 0);
const hasProgress = Object.values(chapterRanges).some(r => r.max > 0);
if (!hasProgress) {
  console.log('\nWARNING: chapter progress was ALWAYS 0 -- feature may be broken!');
}

await browser.close();
process.exit(totalNonMono > 0 ? 1 : 0);
