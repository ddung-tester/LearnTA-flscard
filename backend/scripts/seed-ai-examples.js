/**
 * seed-ai-examples.js
 * Quét toàn bộ cards trong DB và gọi Gemini AI để sinh tense_examples
 * cho các card chưa có (tense_examples IS NULL).
 *
 * Xem trước (dry-run): node scripts/seed-ai-examples.js
 * Áp dụng:             node scripts/seed-ai-examples.js --apply
 * Giới hạn số card:    node scripts/seed-ai-examples.js --apply --limit=50
 *
 * Free tier: 20 RPM → delay 3.5s/request = ~17 req/min (an toàn).
 */
require("dotenv/config");
const pool = require("../src/config/db");
const { generateTenseExamples } = require("../src/services/aiService");

const APPLY = process.argv.includes("--apply");
const limitArg = process.argv.find((a) => a.startsWith("--limit="));
const LIMIT = limitArg ? Number(limitArg.split("=")[1]) : Infinity;

// 3500ms = ~17 req/phút, nằm trong quota 20 RPM free tier
const DELAY_MS = 3500;
const MAX_RETRIES = 3;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateWithRetry(termEn, meaningVi, partOfSpeech) {
  let lastErr;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await generateTenseExamples(termEn, meaningVi, partOfSpeech);
    } catch (err) {
      lastErr = err;
      const is429 = err.message.includes("429") || err.message.includes("quota");
      const is503 = err.message.includes("503");
      if ((is429 || is503) && attempt < MAX_RETRIES) {
        const waitMs = attempt * 15000; // 15s, 30s
        console.warn(`  ⏳ Rate limit, thử lại sau ${waitMs / 1000}s... (lần ${attempt}/${MAX_RETRIES})`);
        await sleep(waitMs);
      } else {
        throw err;
      }
    }
  }
  throw lastErr;
}

async function main() {
  console.log(`Mode: ${APPLY ? "APPLY" : "DRY-RUN"}`);

  const [cards] = await pool.query(
    `SELECT id, term_en, meaning_vi, part_of_speech
     FROM cards
     WHERE tense_examples IS NULL
     ORDER BY id ASC`
  );

  const targets = cards.slice(0, isFinite(LIMIT) ? LIMIT : cards.length);
  const etaMin = Math.ceil((targets.length * DELAY_MS) / 60000);
  console.log(
    `Found ${cards.length} cards without tense_examples. Processing ${targets.length}...` +
    (APPLY ? ` (ETA ~${etaMin} phút với delay ${DELAY_MS}ms/từ)` : "")
  );

  if (!APPLY) {
    console.log("Sample targets:", targets.slice(0, 5).map((c) => c.term_en));
    console.log("Run with --apply to process.");
    await pool.end();
    return;
  }

  let success = 0;
  let failed = 0;

  for (let i = 0; i < targets.length; i++) {
    const card = targets[i];
    try {
      const examples = await generateWithRetry(
        card.term_en,
        card.meaning_vi,
        card.part_of_speech || ""
      );
      await pool.execute(
        "UPDATE cards SET tense_examples = ? WHERE id = ? AND tense_examples IS NULL",
        [JSON.stringify(examples), card.id]
      );
      success++;
      console.log(`✅ [${i + 1}/${targets.length}] ${card.term_en}`);
    } catch (err) {
      failed++;
      console.error(`❌ [${i + 1}/${targets.length}] ${card.term_en}: ${err.message.split("\n")[0]}`);
    }
    if (i < targets.length - 1) await sleep(DELAY_MS);
  }

  console.log(`\nDone. ✅ ${success} thành công | ❌ ${failed} thất bại`);
  await pool.end();
}

main().catch((err) => {
  console.error(err.message);
  process.exitCode = 1;
});

