import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

/**
 * Tests pagination back-and-forth across the first 20 pages
 * for each font size from 10 to 20.
 *
 * Checks:
 *  1. Forward progress is strictly monotonic (no non-increasing steps)
 *  2. Backward progress is strictly monotonic (no non-decreasing steps)
 *  3. After going forward 20 then back 20, we return near the start
 */

const APP_URL = process.env.BASE_URL ?? process.env.APP_URL ?? 'http://127.0.0.1:5173/reader-harness';
const rawEpubPath = process.argv[2] ?? process.env.EPUB_PATH ?? path.resolve(process.cwd(), 'TheWayOfKingsPrime.epub');
const EPUB_PATH = path.resolve(rawEpubPath);
const PAGES = 20;
const SETTLE_MS = 300; // wait after each page turn for relocated event

if (!fs.existsSync(EPUB_PATH)) {
  throw new Error(`EPUB file not found: ${EPUB_PATH}\nPass a path via EPUB_PATH or argv[2].`);
}

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();

  await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
  await page.setInputFiles('[data-testid="harness-file-input"]', EPUB_PATH);

  console.log('Waiting for book to load…');
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
  console.log('Indexing complete.\n');

function readProgress(text) {
  const m = (text || '').match(/Progress:\s*([0-9.eE+-]+)/i);
  return m ? Number(m[1]) : NaN;
}

function readCfi(text) {
  return (text || '').replace(/^CFI:\s*/i, '').trim();
}

  const allResults = [];

  for (let fontSize = 10; fontSize <= 20; fontSize++) {
  // Set font size via the harness API
  await page.evaluate((sz) => {
    window.__readerHarness?.setFontSize(sz);
  }, fontSize);

    // Wait for font size to take effect (re-render) and go back to start
    await page.waitForTimeout(600);
    // Navigate to start by going to page 1
    await page.click('[data-testid="harness-prev"]');
    await page.waitForTimeout(200);
    // Go all the way back to ensure we're at the start
    for (let i = 0; i < 25; i++) {
      await page.click('[data-testid="harness-prev"]');
      await page.waitForTimeout(80);
    }
    await page.waitForTimeout(SETTLE_MS);

    const startProgress = readProgress(await page.textContent('[data-testid="harness-progress"]'));

    // === FORWARD ===
    const forwardSteps = [];
    let forwardNonIncreasing = 0;
    let prevFwd = null;

    for (let i = 0; i < PAGES; i++) {
      await page.click('[data-testid="harness-next"]');
      await page.waitForTimeout(SETTLE_MS);

      const p = readProgress(await page.textContent('[data-testid="harness-progress"]'));
      const cfi = readCfi(await page.textContent('[data-testid="harness-cfi"]'));
      if (!Number.isFinite(p)) continue;

      if (prevFwd && cfi !== prevFwd.cfi && p <= prevFwd.progress) {
        forwardNonIncreasing++;
      }
      forwardSteps.push({ step: i + 1, progress: p, cfi });
      prevFwd = { progress: p, cfi };
    }

    const peakProgress = prevFwd?.progress ?? 0;

    // === BACKWARD ===
    const backwardSteps = [];
    let backwardNonDecreasing = 0;
    let prevBwd = null;

    for (let i = 0; i < PAGES; i++) {
      await page.click('[data-testid="harness-prev"]');
      await page.waitForTimeout(SETTLE_MS);

      const p = readProgress(await page.textContent('[data-testid="harness-progress"]'));
      const cfi = readCfi(await page.textContent('[data-testid="harness-cfi"]'));
      if (!Number.isFinite(p)) continue;

      if (prevBwd && cfi !== prevBwd.cfi && p >= prevBwd.progress) {
        backwardNonDecreasing++;
      }
      backwardSteps.push({ step: i + 1, progress: p, cfi });
      prevBwd = { progress: p, cfi };
    }

    const endProgress = prevBwd?.progress ?? 0;
    const returnDelta = Math.abs(endProgress - startProgress);

    const result = {
      fontSize,
      forwardSteps: forwardSteps.length,
      forwardNonIncreasing,
      peakProgress: peakProgress.toFixed(8),
      backwardSteps: backwardSteps.length,
      backwardNonDecreasing,
      endProgress: endProgress.toFixed(8),
      startProgress: startProgress.toFixed(8),
      returnDelta: returnDelta.toFixed(8),
      pass: forwardNonIncreasing === 0 && backwardNonDecreasing === 0,
    };

    allResults.push(result);

    const status = result.pass ? 'PASS' : 'FAIL';
    console.log(
      `[${status}] fontSize=${fontSize}  fwd=${forwardSteps.length} steps (${forwardNonIncreasing} non-incr)  ` +
        `bwd=${backwardSteps.length} steps (${backwardNonDecreasing} non-decr)  ` +
        `peak=${result.peakProgress}  return=${result.endProgress}  delta=${result.returnDelta}`
    );

    // Print detailed steps for failing cases
    if (!result.pass) {
      if (forwardNonIncreasing > 0) {
        console.log('  Forward steps:');
        for (const s of forwardSteps) {
          console.log(`    step=${s.step} progress=${s.progress.toFixed(12)} cfi=${s.cfi.slice(0, 60)}`);
        }
      }
      if (backwardNonDecreasing > 0) {
        console.log('  Backward steps:');
        for (const s of backwardSteps) {
          console.log(`    step=${s.step} progress=${s.progress.toFixed(12)} cfi=${s.cfi.slice(0, 60)}`);
        }
      }
    }
  }

  console.log('\n=== SUMMARY ===');
  const passed = allResults.filter((r) => r.pass).length;
  const failed = allResults.filter((r) => !r.pass).length;
  console.log(`${passed} passed, ${failed} failed out of ${allResults.length} font sizes tested`);

  if (failed > 0) {
    console.log('\nFailed font sizes:');
    for (const r of allResults.filter((r) => !r.pass)) {
      console.log(`  fontSize=${r.fontSize}: fwd_non_incr=${r.forwardNonIncreasing} bwd_non_decr=${r.backwardNonDecreasing}`);
    }
  }

  process.exitCode = failed > 0 ? 1 : 0;
} finally {
  await browser.close();
}
