import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const STOCK_LISTS = {
  conservative:     ["AAPL", "MSFT", "GOOGL", "AMZN", "JPM", "JNJ", "V", "PG"],
  moderate:         ["AAPL", "MSFT", "NVDA", "TSLA", "AMZN", "GOOGL", "META", "AMD"],
  aggressive:       ["NVDA", "TSLA", "AMD", "COIN", "PLTR", "MSTR", "SMCI", "META", "AMZN", "MSFT"],
  ultra_aggressive: ["NVDA", "TSLA", "COIN", "PLTR", "MSTR", "SMCI", "AMD", "RIVN", "SOUN", "RKLB"]
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function insertBatch(base44, records) {
  await Promise.all(records.map(r => base44.asServiceRole.entities.PriceHistory.create(r)));
}

async function insertWithRetry(base44, records) {
  try {
    await insertBatch(base44, records);
  } catch (err) {
    if (err.message?.includes("429") || err.status === 429) {
      await delay(3000);
      await insertBatch(base44, records); // one retry
    } else {
      throw err;
    }
  }
}

async function fetchYahooHistory(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=3mo`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" }
  });
  if (!res.ok) throw new Error(`Yahoo Finance ${res.status} for ${symbol}`);
  const json = await res.json();
  const result = json?.chart?.result?.[0];
  if (!result) throw new Error(`No data from Yahoo for ${symbol}`);

  const timestamps = result.timestamp || [];
  const q = result.indicators?.quote?.[0] || {};
  const closes = q.close || [];
  const opens = q.open || [];
  const highs = q.high || [];
  const lows = q.low || [];
  const volumes = q.volume || [];

  return timestamps.map((ts, i) => ({
    date: new Date(ts * 1000).toISOString().split("T")[0],
    open: opens[i] ?? null,
    high: highs[i] ?? null,
    low: lows[i] ?? null,
    close: closes[i] ?? null,
    volume: volumes[i] ?? null
  })).filter(d => d.close !== null);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    // Get user's risk profile
    const configs = await base44.asServiceRole.entities.UserConfig.list();
    const config = configs[0];
    if (!config) return Response.json({ error: "No config found" }, { status: 404 });

    const riskLevel = config.risk_level || "moderate";
    const symbols = STOCK_LISTS[riskLevel] || STOCK_LISTS.moderate;

    // Load existing PriceHistory to avoid duplicates (get all symbol+date combos)
    const existing = await base44.asServiceRole.entities.PriceHistory.list("-date", 5000);
    const existingSet = new Set(existing.map(r => `${r.symbol}|${r.date}`));

    const results = [];

    for (const symbol of symbols) {
      try {
        const candles = await fetchYahooHistory(symbol);
        let inserted = 0;
        let skipped = 0;

        // Build list of new records to insert
        const toInsert = [];
        for (const candle of candles) {
          const key = `${symbol}|${candle.date}`;
          if (existingSet.has(key)) { skipped++; continue; }
          toInsert.push({ symbol, date: candle.date, open: candle.open, high: candle.high, low: candle.low, close: candle.close, volume: candle.volume });
          existingSet.add(key);
        }

        // Insert in batches of 10 with 500ms delay between batches
        const BATCH_SIZE = 10;
        for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
          const batch = toInsert.slice(i, i + BATCH_SIZE);
          await insertWithRetry(base44, batch);
          inserted += batch.length;
          if (i + BATCH_SIZE < toInsert.length) await delay(500);
        }

        results.push({ symbol, inserted, skipped, total: candles.length });
        console.log(`${symbol}: ${inserted} inserted, ${skipped} skipped`);

        // 1 second between symbols to avoid write bursts
        await delay(1000);
      } catch (err) {
        console.error(`Failed for ${symbol}:`, err.message);
        results.push({ symbol, error: err.message });
      }
    }

    return Response.json({ success: true, symbols: symbols.length, results });
  } catch (error) {
    console.error("historicalLoader error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});