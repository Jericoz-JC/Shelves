import { chromium } from 'playwright';
import path from 'node:path';

const APP_URL = 'http://127.0.0.1:5173/reader-harness';
const EPUB_PATH = path.resolve('/home/ruben/Shelves/TheWayOfKingsPrime.epub');

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });

await page.setInputFiles('[data-testid="harness-file-input"]', EPUB_PATH);

await page.waitForFunction(() => {
  const el = document.querySelector('[data-testid="harness-loading"]');
  return el && /false/i.test(el.textContent || '');
}, null, { timeout: 120000 });

await page.waitForFunction(() => {
  const el = document.querySelector('[data-testid="harness-indexing"]');
  return el && /false/i.test(el.textContent || '');
}, null, { timeout: 240000 });

await page.waitForTimeout(1200);

const samples = [];
let nonIncreasing = 0;
let previous = null;
let checkedSteps = 0;

for (let i = 0; i < 220; i += 1) {
  await page.click('[data-testid="harness-next"]');
  await page.waitForTimeout(180);

  const progressText = await page.textContent('[data-testid="harness-progress"]');
  const cfiText = await page.textContent('[data-testid="harness-cfi"]');

  const progressMatch = (progressText || '').match(/Progress:\s*([0-9.]+)/i);
  const progress = progressMatch ? Number(progressMatch[1]) : NaN;
  const cfi = (cfiText || '').replace(/^CFI:\s*/i, '').trim();

  if (!Number.isFinite(progress)) continue;
  checkedSteps += 1;

  if (previous && cfi && cfi !== previous.cfi && progress <= previous.progress) {
    nonIncreasing += 1;
    samples.push({
      step: i + 1,
      previous: previous.progress,
      current: progress,
      previousCfi: previous.cfi,
      currentCfi: cfi,
    });
    if (samples.length >= 20) break;
  }

  previous = { progress, cfi };
}

console.log(JSON.stringify({ checkedSteps, nonIncreasing, samples }, null, 2));

await browser.close();
