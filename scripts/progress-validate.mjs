import { chromium } from 'playwright';
import path from 'node:path';

const APP_URL = 'http://127.0.0.1:5173/reader-harness';
const EPUB_PATH = path.resolve('/home/ruben/Shelves/TheWayOfKingsPrime.epub');

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

// Capture debug logs
const debugLogs = [];
page.on('console', (msg) => {
  debugLogs.push(msg.text());
});

await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
await page.setInputFiles('[data-testid="harness-file-input"]', EPUB_PATH);

console.log('Waiting for book to load...');
await page.waitForFunction(() => {
  const el = document.querySelector('[data-testid="harness-loading"]');
  return el && /false/i.test(el.textContent || '');
}, null, { timeout: 120_000 });

console.log('Waiting for indexing…');
let waited = 0;
while (waited < 600_000) {
  const status = await page.textContent('[data-testid="harness-indexing"]');
  if (/false/i.test(status || '')) break;
  await page.waitForTimeout(5000);
  waited += 5000;
  if (waited % 30000 === 0) console.log(`  Still indexing… (${waited / 1000}s)`);
}
console.log('Indexing complete.');

// Check that spine boundaries were built
await page.waitForTimeout(1000);
const boundaryCount = await page.textContent('[data-testid="harness-boundaries"]');
console.log('Boundary map:', boundaryCount);

// Also dump boundaries from the window API 
const spineInfo = await page.evaluate(() => {
  return window.__readerHarness?.getSpineInfo?.() ?? null;
});
if (spineInfo) {
  console.log('\n=== SPINE BOUNDARY DATA (from locations) ===\n');
  for (const item of spineInfo.slice(0, 15)) {
    console.log(`  idx=${item.index} pct=${item.pctFromCfi} href=${item.href}`);
  }
  console.log(`  ... (${spineInfo.length} total spine items)`);
}

// Page through first 80 steps
console.log('\n=== PAGING THROUGH FIRST 80 STEPS ===\n');
const history = [];
let prev = null;
let nonIncreasing = 0;

for (let i = 0; i < 80; i += 1) {
  await page.click('[data-testid="harness-next"]');
  await page.waitForTimeout(250);

  const progressText = await page.textContent('[data-testid="harness-progress"]');
  const cfiText = await page.textContent('[data-testid="harness-cfi"]');

  const progressMatch = (progressText || '').match(/Progress:\s*([0-9.eE+-]+)/i);
  const progress = progressMatch ? Number(progressMatch[1]) : NaN;
  const cfi = (cfiText || '').replace(/^CFI:\s*/i, '').trim();

  if (!Number.isFinite(progress)) continue;

  const isNI = prev && cfi !== prev.cfi && progress <= prev.progress;
  if (isNI) nonIncreasing++;

  history.push({ step: i + 1, progress, cfi: cfi.slice(0, 80), nonIncreasing: !!isNI });
  prev = { progress, cfi };
}

console.log('step | progress | displayPct | cfi | flag');
console.log('-----+----------+------------+-----+-----');
for (const h of history) {
  const displayPct = Math.round(h.progress * 100);
  const marker = h.nonIncreasing ? ' <<< NON-INCREASING' : '';
  console.log(`  ${String(h.step).padStart(3)} | ${h.progress.toFixed(12)} | ${String(displayPct).padStart(3)}% | ${h.cfi.slice(0, 50)} ${marker}`);
}

console.log(`\n=== SUMMARY: steps=${history.length} nonIncreasing=${nonIncreasing} ===`);

// Check if first 20 steps all show 0%
const firstSteps = history.slice(0, 20);
const allZeroDisplay = firstSteps.every(h => Math.round(h.progress * 100) === 0);
if (allZeroDisplay) {
  console.log('WARNING: First 20 steps all display as 0% — insufficient progress granularity!');
} else {
  const firstNonZero = firstSteps.findIndex(h => Math.round(h.progress * 100) > 0);
  console.log(`OK: First non-zero displayed percentage at step ${firstNonZero + 1}`);
}

await browser.close();
