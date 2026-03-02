import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const API_KEY = Deno.env.get("API_Finnhub");
const BASE = "https://finnhub.io/api/v1";

async function finnhubGet(path) {
  const res = await fetch(`${BASE}${path}&token=${API_KEY}`);
  if (!res.ok) throw new Error(`Finnhub ${res.status}: ${path}`);
  return res.json();
}

async function getQuote(symbol) {
  const data = await finnhubGet(`/quote?symbol=${symbol}`);
  return { price: data.c, change: data.d, changePct: data.dp, open: data.o, high: data.h, low: data.l };
}

function isNearMarketClose() {
  const now = new Date();
  const eastern = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const day = eastern.getDay();
  const time = eastern.getHours() * 60 + eastern.getMinutes();
  if (day === 0 || day === 6) return false;
  return time >= 955 && time <= 965; // 15:55–16:05 EST
}

function isMarketOpen() {
  const now = new Date();
  const eastern = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const day = eastern.getDay();
  const time = eastern.getHours() * 60 + eastern.getMinutes();
  if (day === 0 || day === 6) return false;
  return time >= 570 && time < 960;
}

function isAfterMarketClose() {
  const now = new Date();
  const eastern = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const day = eastern.getDay();
  const time = eastern.getHours() * 60 + eastern.getMinutes();
  if (day === 0 || day === 6) return false;
  return time >= 960 && time < 1320; // 4pm–10pm EST
}

function todayEST() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" }); // YYYY-MM-DD
}

const STOP_LOSS = {
  conservative:     0.04,
  moderate:         0.08,
  aggressive:       0.12,
  ultra_aggressive: 0.18
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    if (!isMarketOpen()) {
      return Response.json({ skipped: true, reason: "Market closed" });
    }

    const [configs, wallets, holdings] = await Promise.all([
      base44.asServiceRole.entities.UserConfig.list(),
      base44.asServiceRole.entities.Wallet.list(),
      base44.asServiceRole.entities.Holding.list()
    ]);

    if (!holdings.length) {
      return Response.json({ skipped: true, reason: "No holdings" });
    }

    const config = configs[0] || {};
    const wallet = wallets[0];
    const riskLevel = config.risk_level || "moderate";
    const stopLossPct = STOP_LOSS[riskLevel] || 0.08;

    // FIX: cargar IDs una sola vez antes del loop
    // para proteger contra race condition con aiEngine
    const activeIds = new Set(
      (await base44.asServiceRole.entities.Holding.list()).map(h => h.id)
    );

    const updated = [];
    const stopped = [];
    const dailyCloseQuotes = {}; // symbol -> quote, for near-close saves

    const nearClose = isNearMarketClose();
    const today = todayEST();
    let existingClosedSymbols = new Set();

    if (nearClose) {
      const existing = await base44.asServiceRole.entities.PriceHistory.filter({ date: today }, "-date", 200);
      existingClosedSymbols = new Set(existing.map(r => r.symbol));
    }

    for (const holding of holdings) {
      try {
        if (!activeIds.has(holding.id)) continue;

        const quote = await getQuote(holding.symbol);
        const currentPrice = quote.price;
        if (!currentPrice) continue;

        const lossPct = (currentPrice - holding.avg_buy_price) / holding.avg_buy_price;

        if (lossPct <= -stopLossPct) {
          const totalValue = currentPrice * holding.shares;
          const realizedPnl = (currentPrice - holding.avg_buy_price) * holding.shares;

          await Promise.all([
            base44.asServiceRole.entities.Transaction.create({
              type: "sell",
              symbol: holding.symbol,
              company_name: holding.company_name || holding.symbol,
              shares: holding.shares,
              price: currentPrice,
              total_amount: totalValue,
              realized_pnl: realizedPnl,
              ai_reasoning: `STOP-LOSS activado automáticamente. Precio $${currentPrice.toFixed(2)} representa una caída de ${(lossPct * 100).toFixed(2)}% desde precio de compra $${holding.avg_buy_price.toFixed(2)}. Límite: -${(stopLossPct * 100).toFixed(0)}%.`,
              score_technical: 0,
              score_fundamental: 0,
              score_sentiment: 0,
              score_final: 0,
              executed_at: new Date().toISOString()
            }),
            base44.asServiceRole.entities.Holding.delete(holding.id),
            base44.asServiceRole.entities.Alert.create({
              type: "stop_loss",
              symbol: holding.symbol,
              message: `⛔ Stop-loss en ${holding.symbol}: vendido a $${currentPrice.toFixed(2)} (${(lossPct * 100).toFixed(2)}%). P&L: $${realizedPnl >= 0 ? "+" : ""}${realizedPnl.toFixed(2)}`,
              is_read: false
            })
          ]);

          if (wallet) {
            const fw = (await base44.asServiceRole.entities.Wallet.list())[0];
            await base44.asServiceRole.entities.Wallet.update(wallet.id, {
              liquid_cash: (fw.liquid_cash || 0) + totalValue,
              ai_capital: Math.max(0, (fw.ai_capital || 0) + realizedPnl)
            });
          }

          stopped.push({ symbol: holding.symbol, pnl: realizedPnl });

        } else {
          await base44.asServiceRole.entities.Holding.update(holding.id, {
            current_price: currentPrice,
            current_value: currentPrice * holding.shares,
            unrealized_pnl: (currentPrice - holding.avg_buy_price) * holding.shares,
            unrealized_pnl_pct: lossPct * 100
          });
          updated.push(holding.symbol);

          // Save quote for daily close if near market close
          if (nearClose) {
            dailyCloseQuotes[holding.symbol] = quote;
          }
        }

      } catch (err) {
        console.error(`Price update failed for ${holding.symbol}:`, err.message);
      }
    }

    // Near market close: persist today's OHLC to PriceHistory
    let dailyCloses = 0;
    if (nearClose && Object.keys(dailyCloseQuotes).length > 0) {
      for (const [symbol, quote] of Object.entries(dailyCloseQuotes)) {
        if (existingClosedSymbols.has(symbol)) continue;
        try {
          await base44.asServiceRole.entities.PriceHistory.create({
            symbol,
            date: today,
            open: quote.open ?? null,
            high: quote.high ?? null,
            low: quote.low ?? null,
            close: quote.price,
            volume: null
          });
          dailyCloses++;
          await new Promise(resolve => setTimeout(resolve, 300));
        } catch (err) {
          console.error(`PriceHistory daily close failed for ${symbol}:`, err.message);
        }
      }
    }

    return Response.json({
      success: true,
      updated: updated.length,
      stopLosses: stopped.length,
      stop_losses: stopped,
      dailyCloses
    });

  } catch (error) {
    console.error("priceUpdater error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});