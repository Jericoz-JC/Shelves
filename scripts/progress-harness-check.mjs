import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const APP_URL = process.env.BASE_URL ?? process.env.APP_URL ?? 'http://127.0.0.1:5173/reader-harness';
const rawEpubPath = process.argv[2] ?? process.env.EPUB_PATH ?? path.resolve(process.cwd(), 'TheWayOfKingsPrime.epub');
const EPUB_PATH = path.resolve(rawEpubPath);

if (!fs.existsSync(EPUB_PATH)) {
  throw new Error(`EPUB file not found: ${EPUB_PATH}\nPass a path via EPUB_PATH or argv[2].`);
}

const browser = await chromium.launch({ headless: true });
try {
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
} finally {
  await browser.close();
}
