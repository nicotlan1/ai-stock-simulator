import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const STOCK_LISTS = {
  conservative:     ["AAPL", "MSFT", "GOOGL", "AMZN", "JPM", "JNJ", "V", "PG"],
  moderate:         ["AAPL", "MSFT", "NVDA", "TSLA", "AMZN", "GOOGL", "META", "AMD"],
  aggressive:       ["NVDA", "TSLA", "AMD", "COIN", "PLTR", "MSTR", "SMCI", "META", "AMZN", "MSFT"],
  ultra_aggressive: ["NVDA", "TSLA", "COIN", "PLTR", "MSTR", "SMCI", "AMD", "RIVN", "SOUN", "RKLB"]
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchYahooHistory(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=3mo`;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "application/json",
          "Accept-Language": "en-US,en;q=0.9"
        }
      });
      if (res.status === 429 || res.status === 503) {
        await delay(2000 * attempt);
        continue;
      }
      if (!res.ok) throw new Error(`Yahoo ${res.status} for ${symbol}`);
      const json = await res.json();
      const result = json?.chart?.result?.[0];
      if (!result) throw new Error(`No data from Yahoo for ${symbol}`);
      const timestamps = result.timestamp || [];
      const q = result.indicators?.quote?.[0] || {};
      return timestamps.map((ts, i) => ({
        date:   new Date(ts * 1000).toISOString().split("T")[0],
        open:   q.open?.[i]   ?? null,
        high:   q.high?.[i]   ?? null,
        low:    q.low?.[i]    ?? null,
        close:  q.close?.[i]  ?? null,
        volume: q.volume?.[i] ?? null
      })).filter(d => d.close !== null);
    } catch (err) {
      if (attempt === 3) throw err;
      await delay(1000 * attempt);
    }
  }
  return [];
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const configs = await base44.asServiceRole.entities.UserConfig.list();
    const config = configs[0];
    if (!config) return Response.json({ error: "No config found" }, { status: 404 });

    const riskLevel = config.risk_level || "moderate";
    const symbols = STOCK_LISTS[riskLevel] || STOCK_LISTS.moderate;

    const existing = await base44.asServiceRole.entities.PriceHistory.list();
    const existingSet = new Set(existing.map(r => `${r.symbol}|${r.date}`));

    const results = [];

    for (const symbol of symbols) {
      try {
        const candles = await fetchYahooHistory(symbol);
        let inserted = 0;
        let skipped = 0;

        for (const candle of candles) {
          const key = `${symbol}|${candle.date}`;
          if (existingSet.has(key)) { skipped++; continue; }

          // FIX: insertar de una en una con delay entre cada registro
          let success = false;
          for (let attempt = 1; attempt <= 3; attempt++) {
            try {
              await base44.asServiceRole.entities.PriceHistory.create({
                symbol,
                date:   candle.date,
                open:   candle.open,
                high:   candle.high,
                low:    candle.low,
                close:  candle.close,
                volume: candle.volume
              });
              existingSet.add(key);
              inserted++;
              success = true;
              break;
            } catch (err) {
              if (err.message?.includes("429") || err.status === 429) {
                // Rate limit — esperar más tiempo en cada intento
                await delay(3000 * attempt);
              } else {
                throw err;
              }
            }
          }

          if (!success) {
            console.warn(`Skipping ${symbol}|${candle.date} after 3 failed attempts`);
          }

          // FIX: 200ms entre cada inserción individual
          await delay(200);
        }

        results.push({ symbol, inserted, skipped, total: candles.length });
        console.log(`${symbol}: ${inserted} inserted, ${skipped} skipped`);

        // 2 segundos entre cada acción completa
        await delay(2000);

      } catch (err) {
        console.error(`Failed for ${symbol}:`, err.message);
        results.push({ symbol, error: err.message });
      }
    }

    const loadedSymbols = results
      .filter(r => !r.error)
      .map(r => r.symbol)
      .join(",");

    await base44.asServiceRole.entities.UserConfig.update(config.id, {
      history_loaded_symbols: loadedSymbols
    });

    return Response.json({ success: true, symbols: symbols.length, results });

  } catch (error) {
    console.error("historicalLoader error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});