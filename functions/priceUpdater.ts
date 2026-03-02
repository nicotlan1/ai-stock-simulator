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
  return { price: data.c, change: data.d, changePct: data.dp };
}

function isMarketOpen() {
  const now = new Date();
  const eastern = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const day = eastern.getDay();
  const time = eastern.getHours() * 60 + eastern.getMinutes();
  if (day === 0 || day === 6) return false;
  return time >= 570 && time < 960;
}

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

    const STOP_LOSS = {
      conservative: 0.04,
      moderate: 0.08,
      aggressive: 0.12,
      ultra_aggressive: 0.18
    };
    const stopLossPct = STOP_LOSS[riskLevel] || 0.08;

    const updated = [];
    const stopped = [];

    for (const holding of holdings) {
      try {
        const quote = await getQuote(holding.symbol);
        const currentPrice = quote.price;
        if (!currentPrice) continue;

        const lossPct = (currentPrice - holding.avg_buy_price) / holding.avg_buy_price;

        if (lossPct <= -stopLossPct) {
          // Stop-loss triggered
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
            await base44.asServiceRole.entities.Wallet.update(wallet.id, {
              liquid_cash: (wallet.liquid_cash || 0) + totalValue
            });
          }

          stopped.push({ symbol: holding.symbol, pnl: realizedPnl });
        } else {
          // Normal price update
          await base44.asServiceRole.entities.Holding.update(holding.id, {
            current_price: currentPrice,
            current_value: currentPrice * holding.shares,
            unrealized_pnl: (currentPrice - holding.avg_buy_price) * holding.shares,
            unrealized_pnl_pct: lossPct * 100
          });
          updated.push(holding.symbol);
        }
      } catch (err) {
        console.error(`Price update failed for ${holding.symbol}:`, err.message);
      }
    }

    return Response.json({ success: true, updated: updated.length, stopped: stopped.length, stop_losses: stopped });
  } catch (error) {
    console.error("priceUpdater error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});