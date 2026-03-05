import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const API_KEY = Deno.env.get("API_Finnhub");
const BASE = "https://finnhub.io/api/v1";

// ─── Finnhub helpers ──────────────────────────────────────────────────────────

async function finnhubGet(path) {
  const url = `${BASE}${path}&token=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Finnhub ${res.status}: ${path}`);
  return res.json();
}

function isMarketOpen() {
  const now = new Date();
  const eastern = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const day = eastern.getDay();
  const time = eastern.getHours() * 60 + eastern.getMinutes();
  if (day === 0 || day === 6) return false;
  return time >= 570 && time < 960;
}

async function getCandles(symbol, base44Client) {
  if (base44Client) {
    try {
      const rows = await base44Client.asServiceRole.entities.PriceHistory.filter(
        { symbol }, "-date", 130
      );
      if (rows && rows.length >= 35) {
        const sorted = rows.slice().reverse();
        console.log(`Using PriceHistory for ${symbol}: ${sorted.length} points`);
        return {
          s: "ok",
          c: sorted.map(r => r.close),
          o: sorted.map(r => r.open),
          h: sorted.map(r => r.high),
          l: sorted.map(r => r.low),
          t: sorted.map(r => Math.floor(new Date(r.date).getTime() / 1000))
        };
      }
    } catch (err) {
      console.warn(`PriceHistory error for ${symbol}:`, err.message);
    }
  }
  console.log(`Fallback to Finnhub for ${symbol}`);
  const to = Math.floor(Date.now() / 1000);
  const from = to - 35 * 24 * 60 * 60;
  const data = await finnhubGet(`/stock/candle?symbol=${symbol}&resolution=D&from=${from}&to=${to}`);
  if (data.s !== "ok" || !data.c || data.c.length < 14) return null;
  return data;
}

async function getNews(symbol) {
  const today = new Date();
  const from = new Date(today - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const to = today.toISOString().split("T")[0];
  const data = await finnhubGet(`/company-news?symbol=${symbol}&from=${from}&to=${to}`);
  return (data || []).slice(0, 5);
}

async function getQuote(symbol) {
  const data = await finnhubGet(`/quote?symbol=${symbol}`);
  return { price: data.c, change: data.d, changePct: data.dp, prevClose: data.pc };
}

// ─── Technical Analysis ───────────────────────────────────────────────────────

function calcRSI(closes, period = 14) {
  if (closes.length < period + 1) return null;
  let avgGain = 0, avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) avgGain += diff;
    else avgLoss += Math.abs(diff);
  }
  avgGain /= period;
  avgLoss /= period;
  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? Math.abs(diff) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

function calcEMASeries(data, period) {
  if (data.length < period) return [];
  const k = 2 / (period + 1);
  const result = [];
  let ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
  result.push(ema);
  for (let i = period; i < data.length; i++) {
    ema = data[i] * k + ema * (1 - k);
    result.push(ema);
  }
  return result;
}

function calcMACD(closes) {
  if (closes.length < 35) return null;
  const ema12 = calcEMASeries(closes, 12);
  const ema26 = calcEMASeries(closes, 26);
  const sharedLen = Math.min(ema12.length, ema26.length);
  const macdLine = Array.from({ length: sharedLen }, (_, i) =>
    ema12[ema12.length - sharedLen + i] - ema26[ema26.length - sharedLen + i]
  );
  if (macdLine.length < 9) return null;
  const signalLine = calcEMASeries(macdLine, 9);
  const macdCurrent = macdLine[macdLine.length - 1];
  const macdPrev = macdLine[macdLine.length - 2];
  const signalCurrent = signalLine[signalLine.length - 1];
  const signalPrev = signalLine[signalLine.length - 2];
  const crossingUp = macdPrev <= signalPrev && macdCurrent > signalCurrent;
  const crossingDown = macdPrev >= signalPrev && macdCurrent < signalCurrent;
  return { macdCurrent, macdPrev, signalCurrent, signalPrev, crossingUp, crossingDown };
}

function scoreTechnical(rsi, macd, riskLevel) {
  if (rsi === null) return 50;
  const thresholds = {
    conservative:     { rsiBuy: 35, rsiSell: 65 },
    moderate:         { rsiBuy: 40, rsiSell: 60 },
    aggressive:       { rsiBuy: 45, rsiSell: 55 },
    ultra_aggressive: { rsiBuy: 48, rsiSell: 58 }
  };
  const t = thresholds[riskLevel] || thresholds.moderate;
  let score = 50;
  if (rsi < t.rsiBuy) score += 25 * ((t.rsiBuy - rsi) / t.rsiBuy);
  else if (rsi > t.rsiSell) score -= 25 * ((rsi - t.rsiSell) / (100 - t.rsiSell));
  if (macd) {
    if (macd.crossingUp) score += 15;
    else if (macd.crossingDown) score -= 15;
  }
  return Math.max(0, Math.min(100, score));
}

function scoreMomentum(closes) {
  if (!closes || closes.length < 6) return 50;
  const current = closes[closes.length - 1];
  const fiveDaysAgo = closes[closes.length - 6];
  if (!fiveDaysAgo) return 50;
  const changePct = ((current - fiveDaysAgo) / fiveDaysAgo) * 100;
  if (changePct > 5) return 85;
  if (changePct > 2) return 65;
  if (changePct > -2) return 50;
  if (changePct > -5) return 35;
  return 15;
}

async function scoreSentiment(base44, symbol, news) {
  if (!news || news.length === 0) return { score: 50, summary: "" };
  const headlines = news.map(n => n.headline).join("\n");
  const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt: `Analyze the sentiment of these financial news headlines for ${symbol}. 
Return a single sentiment score from 0 to 100 where:
- 0-20 = very negative (fraud, crash, investigation, major losses)
- 20-40 = negative (misses, downgrades, declining revenue)
- 40-60 = neutral (mixed or unclear news)
- 60-80 = positive (growth, partnerships, upgrades, beats)
- 80-100 = very positive (record results, breakthroughs, major wins)
Headlines:
${headlines}
Respond ONLY with a JSON object: {"score": <number>, "summary": "<one sentence>"}`,
    response_json_schema: {
      type: "object",
      properties: {
        score: { type: "number" },
        summary: { type: "string" }
      }
    }
  });
  return { score: result.score ?? 50, summary: result.summary ?? "" };
}

// ─── Risk profile parameters (fallback hardcoded defaults) ────────────────────

const DEFAULT_RISK_PARAMS = {
  conservative:     { maxPositionPct: 0.15, maxPositions: 7,  stopLossPct: 0.04, analysisMinutes: 60, buyThreshold: 68, sellThreshold: 32 },
  moderate:         { maxPositionPct: 0.25, maxPositions: 5,  stopLossPct: 0.08, analysisMinutes: 30, buyThreshold: 65, sellThreshold: 35 },
  aggressive:       { maxPositionPct: 0.35, maxPositions: 3,  stopLossPct: 0.12, analysisMinutes: 20, buyThreshold: 62, sellThreshold: 38 },
  ultra_aggressive: { maxPositionPct: 0.50, maxPositions: 2,  stopLossPct: 0.18, analysisMinutes: 15, buyThreshold: 60, sellThreshold: 40 }
};

const DEFAULT_STOCK_LISTS = {
  conservative:     ["AAPL", "MSFT", "GOOGL", "AMZN", "JPM", "JNJ", "V", "PG"],
  moderate:         ["AAPL", "MSFT", "NVDA", "TSLA", "AMZN", "GOOGL", "META", "AMD"],
  aggressive:       ["NVDA", "TSLA", "AMD", "COIN", "PLTR", "MSTR", "SMCI", "META", "AMZN", "MSFT"],
  ultra_aggressive: ["NVDA", "TSLA", "COIN", "PLTR", "MSTR", "SMCI", "AMD", "RIVN", "SOUN", "RKLB"]
};

function buildParamsFromStrategy(strategy, riskLevel) {
  const defaults = DEFAULT_RISK_PARAMS[riskLevel] || DEFAULT_RISK_PARAMS.moderate;
  if (!strategy) return defaults;
  return {
    maxPositionPct:   (strategy.max_position_pct   != null ? strategy.max_position_pct / 100   : defaults.maxPositionPct),
    maxPositions:     (strategy.max_positions       != null ? strategy.max_positions             : defaults.maxPositions),
    stopLossPct:      (strategy.stop_loss_pct       != null ? strategy.stop_loss_pct / 100       : defaults.stopLossPct),
    analysisMinutes:  (strategy.analysis_frequency_hours != null ? strategy.analysis_frequency_hours * 60 : defaults.analysisMinutes),
    buyThreshold:     (strategy.rsi_buy_threshold   != null ? strategy.rsi_buy_threshold         : defaults.buyThreshold),
    sellThreshold:    (strategy.rsi_sell_threshold  != null ? strategy.rsi_sell_threshold        : defaults.sellThreshold),
  };
}

// ─── Initial deployment ───────────────────────────────────────────────────────

async function deployCapital(base44, config, wallet, params, stockList, riskLevel, mode, userEmail) {
  const totalAICapital = wallet.ai_capital || 0;
  const liquidCash = wallet.liquid_cash || 0;
  const reserveFloor = totalAICapital * 0.05;
  const investableCash = Math.max(0, liquidCash - reserveFloor);
  if (investableCash < 1) return [];

  const decisions = [];
  const allHoldingsNow = await base44.asServiceRole.entities.Holding.filter({}, null, 500);
  const currentHoldings = allHoldingsNow.filter(h => h.user_id === userEmail || h.created_by === userEmail);
  const currentPositions = currentHoldings.length;
  const ownedSymbols = new Set(currentHoldings.map(h => h.symbol));
  const candidates = stockList.filter(s => !ownedSymbols.has(s));

  const scored = [];
  for (const symbol of candidates) {
    try {
      const [candleData, news, quote] = await Promise.all([
        getCandles(symbol, base44),
        getNews(symbol),
        getQuote(symbol)
      ]);
      if (!candleData || !quote.price) continue;
      const closes = candleData.c;
      const rsi = calcRSI(closes);
      const macd = calcMACD(closes);
      const techScore = scoreTechnical(rsi, macd, riskLevel);
      const momentumScore = scoreMomentum(closes);
      const sentimentResult = await scoreSentiment(base44, symbol, news);
      const finalScore = techScore * 0.40 + momentumScore * 0.35 + sentimentResult.score * 0.25;
      scored.push({ symbol, quote, closes, rsi, techScore, momentumScore, sentimentScore: sentimentResult.score, sentimentSummary: sentimentResult.summary, finalScore });
    } catch (err) {
      console.error(`Scoring failed for ${symbol}:`, err.message);
    }
  }

  scored.sort((a, b) => b.finalScore - a.finalScore);
  const slots = params.maxPositions - currentPositions;
  const selected = scored.slice(0, slots);
  const totalScore = selected.reduce((s, c) => s + c.finalScore, 0);

  // Cache wallet balance locally — one update at the end
  let cachedLiquidCash = liquidCash;

  for (const c of selected) {
    const proportion = totalScore > 0 ? c.finalScore / totalScore : 1 / selected.length;
    const amountToInvest = Math.min(investableCash * proportion, cachedLiquidCash - reserveFloor, totalAICapital * params.maxPositionPct);
    if (amountToInvest < 1) continue;

    const shares = amountToInvest / c.quote.price;
    const totalCost = shares * c.quote.price;
    const modeLabel = mode === "initial" ? "despliegue inicial" : "nuevos fondos detectados";

    await Promise.all([
      base44.asServiceRole.entities.Transaction.create({
        type: "buy", symbol: c.symbol, company_name: c.symbol, shares,
        price: c.quote.price, total_amount: totalCost,
        ai_reasoning: `Compra por ${modeLabel}. RSI: ${c.rsi?.toFixed(1) ?? "N/A"}. Sentimiento: ${c.sentimentSummary}. Puntajes — Técnico: ${c.techScore.toFixed(0)}/100, Momentum: ${c.momentumScore.toFixed(0)}/100, Sentimiento: ${c.sentimentScore.toFixed(0)}/100. Puntaje final: ${c.finalScore.toFixed(1)}. Invierto $${totalCost.toFixed(2)} (${(proportion * 100).toFixed(0)}% del capital disponible).`,
        score_technical: Math.round(c.techScore), score_fundamental: 0,
        score_sentiment: Math.round(c.sentimentScore), score_final: Math.round(c.finalScore),
        executed_at: new Date().toISOString(), user_id: userEmail
      }),
      base44.asServiceRole.entities.Holding.create({
        symbol: c.symbol, company_name: c.symbol, shares,
        avg_buy_price: c.quote.price, current_price: c.quote.price,
        current_value: totalCost, unrealized_pnl: 0, unrealized_pnl_pct: 0,
        user_id: userEmail
      }),
      base44.asServiceRole.entities.Alert.create({
        type: "buy", symbol: c.symbol,
        message: `📥 ${mode === "initial" ? "Despliegue inicial" : "Nuevos fondos"}: ${c.symbol} a $${c.quote.price.toFixed(2)} — ${shares.toFixed(4)} acciones ($${totalCost.toFixed(2)}). Score: ${c.finalScore.toFixed(0)}/100`,
        is_read: false, user_id: userEmail
      })
    ]);

    cachedLiquidCash -= totalCost;
    decisions.push({ action: "buy", symbol: c.symbol, score: c.finalScore, amount: totalCost });
  }

  // Single wallet update at the end
  if (decisions.length > 0) {
    await base44.asServiceRole.entities.Wallet.update(wallet.id, {
      liquid_cash: Math.max(0, cachedLiquidCash)
    });
  }

  return decisions;
}

// ─── Core AI cycle ────────────────────────────────────────────────────────────

async function runAICycleForUser(base44, userEmail, sharedData) {
  // 1. Use pre-loaded shared data (loaded once for all users in entry point)
  const configs  = sharedData.allConfigs.filter(c => c.created_by === userEmail);
  const wallets  = sharedData.allWallets.filter(w => w.created_by === userEmail);
  const holdings = sharedData.allHoldings.filter(h => h.user_id === userEmail || h.created_by === userEmail);

  if (!configs.length || !wallets.length) {
    return { skipped: true, reason: "No config or wallet found" };
  }

  const config = configs[0];
  const wallet = wallets[0];
  const riskLevel = config.risk_level || "moderate";
  const params = RISK_PARAMS[riskLevel] || RISK_PARAMS.moderate;
  const stockList = STOCK_LISTS[riskLevel] || STOCK_LISTS.moderate;

  // 2. Market context — single record, already fetched
  const spyChangeOrDefault = sharedData.spyChange;
  const marketMode = sharedData.marketMode;
  const adjustedBuyThreshold = marketMode === "bearish"
    ? params.buyThreshold + 10
    : marketMode === "bullish"
    ? params.buyThreshold - 5
    : params.buyThreshold;
  const adjustedSellThreshold = marketMode === "bearish"
    ? params.sellThreshold + 10
    : params.sellThreshold;
  const marketContext = `Contexto de mercado: SPY ${spyChangeOrDefault > 0 ? '+' : ''}${spyChangeOrDefault.toFixed(2)}% (modo ${marketMode}).`;

  // 3. Check if market is open
  if (!isMarketOpen()) {
    return { skipped: true, reason: "Market is closed", initial_pending: config.initial_investment_pending };
  }

  // 4a. INITIAL DEPLOYMENT
  if (config.initial_investment_pending && (wallet.liquid_cash || 0) > 0) {
    const decisions = await deployCapital(base44, config, wallet, params, stockList, riskLevel, "initial", userEmail);
    await base44.asServiceRole.entities.UserConfig.update(config.id, {
      initial_investment_pending: false,
      last_ai_run: new Date().toISOString()
    });
    if (decisions.length > 0) {
      await base44.asServiceRole.entities.Alert.create({
        type: "info",
        message: `🚀 Capital inicial desplegado. La IA compró ${decisions.length} posición(es): ${decisions.map(d => d.symbol).join(", ")}.`,
        is_read: false, user_id: userEmail
      });
    }
    return { success: true, mode: "initial_deployment", decisions };
  }

  // 4b. Timing gate
  const lastRun = config.last_ai_run ? new Date(config.last_ai_run) : null;
  const minutesSinceLastRun = lastRun ? (Date.now() - lastRun.getTime()) / 60000 : Infinity;
  if (minutesSinceLastRun < params.analysisMinutes) {
    return { skipped: true, reason: `Only ${minutesSinceLastRun.toFixed(1)} min since last run, need ${params.analysisMinutes}` };
  }

  console.log(`[AI CYCLE START] User: ${userEmail}, Minutes since last run: ${minutesSinceLastRun.toFixed(1)}, Risk: ${riskLevel}, Market: ${marketMode}`);

  // 5. Wallet cache — track balance locally, one DB write at the end
  let cachedLiquidCash = wallet.liquid_cash || 0;
  let cachedAICapital = wallet.ai_capital || 0;
  const reserveFloor = cachedAICapital * 0.05;

  const decisions = [];

  // 6. STOP-LOSS CHECK ───────────────────────────────────────────────────────
  const activeHoldingIds = new Set(holdings.map(h => h.id));
  for (const holding of holdings) {
    try {
      if (!activeHoldingIds.has(holding.id)) continue;
      const quote = await getQuote(holding.symbol);
      const currentPrice = quote.price;
      const lossPct = (currentPrice - holding.avg_buy_price) / holding.avg_buy_price;

      if (lossPct <= -params.stopLossPct) {
        const totalValue = currentPrice * holding.shares;
        const realizedPnl = (currentPrice - holding.avg_buy_price) * holding.shares;

        await Promise.all([
          base44.asServiceRole.entities.Transaction.create({
            type: "sell", symbol: holding.symbol,
            company_name: holding.company_name || holding.symbol,
            shares: holding.shares, price: currentPrice,
            total_amount: totalValue, realized_pnl: realizedPnl,
            ai_reasoning: `STOP-LOSS activado. Precio actual $${currentPrice.toFixed(2)} representa una caída de ${(lossPct * 100).toFixed(2)}% desde precio promedio $${holding.avg_buy_price.toFixed(2)}. Límite de riesgo: -${(params.stopLossPct * 100).toFixed(0)}%.`,
            score_technical: 0, score_fundamental: 0, score_sentiment: 0, score_final: 0,
            executed_at: new Date().toISOString(), user_id: userEmail
          }),
          base44.asServiceRole.entities.Holding.delete(holding.id),
          base44.asServiceRole.entities.Alert.create({
            type: "stop_loss", symbol: holding.symbol,
            message: `⛔ Stop-loss en ${holding.symbol}: vendido a $${currentPrice.toFixed(2)} (${(lossPct * 100).toFixed(2)}%). P&L: $${realizedPnl.toFixed(2)}`,
            is_read: false, user_id: userEmail
          })
        ]);

        activeHoldingIds.delete(holding.id);
        cachedLiquidCash += totalValue;
        cachedAICapital = Math.max(0, cachedAICapital + realizedPnl);
        decisions.push({ action: "stop_loss", symbol: holding.symbol, price: currentPrice, pnl: realizedPnl });
      } else {
        await base44.asServiceRole.entities.Holding.update(holding.id, {
          current_price: currentPrice,
          current_value: currentPrice * holding.shares,
          unrealized_pnl: (currentPrice - holding.avg_buy_price) * holding.shares,
          unrealized_pnl_pct: lossPct * 100
        });
      }
    } catch (err) {
      console.error(`Stop-loss check failed for ${holding.symbol}:`, err.message);
    }
  }

  // 7. Reload active holdings after stop-losses
  const activeHoldings = holdings.filter(h => activeHoldingIds.has(h.id));

  // 8. SELL ANALYSIS ─────────────────────────────────────────────────────────
  console.log(`[SELL ANALYSIS] Checking ${activeHoldings.length} holdings for sell signals`);
  for (const holding of activeHoldings) {
    try {
      const [candleData, news, quote] = await Promise.all([
        getCandles(holding.symbol, base44),
        getNews(holding.symbol),
        getQuote(holding.symbol)
      ]);
      const closes = candleData?.c || [];
      const rsi = calcRSI(closes);
      const macd = calcMACD(closes);
      const techScore = scoreTechnical(rsi, macd, riskLevel);
      const momentumScore = scoreMomentum(closes);
      const sentimentResult = await scoreSentiment(base44, holding.symbol, news);
      const finalScore = techScore * 0.40 + momentumScore * 0.35 + sentimentResult.score * 0.25;

      if (finalScore < adjustedSellThreshold) {
        const currentPrice = quote.price;
        const totalValue = currentPrice * holding.shares;
        const realizedPnl = (currentPrice - holding.avg_buy_price) * holding.shares;

        await Promise.all([
          base44.asServiceRole.entities.Transaction.create({
            type: "sell", symbol: holding.symbol,
            company_name: holding.company_name || holding.symbol,
            shares: holding.shares, price: currentPrice,
            total_amount: totalValue, realized_pnl: realizedPnl,
            ai_reasoning: `Señal de venta. RSI: ${rsi?.toFixed(1) ?? "N/A"}. Momentum: ${momentumScore < 50 ? "negativo" : "neutro"}. Sentimiento: ${sentimentResult.summary}. Puntajes — Técnico: ${techScore.toFixed(0)}/100, Momentum: ${momentumScore.toFixed(0)}/100, Sentimiento: ${sentimentResult.score.toFixed(0)}/100. Score final ${finalScore.toFixed(1)} bajo umbral (${adjustedSellThreshold}). ${marketContext}`,
            score_technical: Math.round(techScore), score_fundamental: 0,
            score_sentiment: Math.round(sentimentResult.score), score_final: Math.round(finalScore),
            executed_at: new Date().toISOString(), user_id: userEmail
          }),
          base44.asServiceRole.entities.Holding.delete(holding.id),
          base44.asServiceRole.entities.Alert.create({
            type: "sell", symbol: holding.symbol,
            message: `📤 Venta: ${holding.symbol} a $${currentPrice.toFixed(2)}. P&L: $${realizedPnl >= 0 ? "+" : ""}${realizedPnl.toFixed(2)}. Score: ${finalScore.toFixed(0)}/100`,
            is_read: false, user_id: userEmail
          })
        ]);

        cachedLiquidCash += totalValue;
        cachedAICapital = Math.max(0, cachedAICapital + realizedPnl);
        decisions.push({ action: "sell", symbol: holding.symbol, score: finalScore, pnl: realizedPnl });
      }
    } catch (err) {
      console.error(`Sell analysis failed for ${holding.symbol}:`, err.message);
    }
  }

  // 9. BUY ANALYSIS ──────────────────────────────────────────────────────────
  const soldSymbols = new Set(decisions.filter(d => d.action === "sell" || d.action === "stop_loss").map(d => d.symbol));
  const remainingHoldings = activeHoldings.filter(h => !soldSymbols.has(h.symbol));
  const currentPositions = remainingHoldings.length;
  const freshInvestableCash = Math.max(0, cachedLiquidCash - reserveFloor);

  console.log(`[BUY ANALYSIS] Positions: ${currentPositions}/${params.maxPositions}, Investable cash: $${freshInvestableCash.toFixed(2)}, Market: ${marketMode}`);

  if (currentPositions < params.maxPositions && freshInvestableCash > 10) {
    const ownedSymbols = new Set(remainingHoldings.map(h => h.symbol));
    const candidates = stockList.filter(s => !ownedSymbols.has(s));

    for (const symbol of candidates) {
      if (currentPositions + decisions.filter(d => d.action === "buy").length >= params.maxPositions) break;

      try {
        const [candleData, news, quote] = await Promise.all([
          getCandles(symbol, base44),
          getNews(symbol),
          getQuote(symbol)
        ]);
        if (!candleData || !quote.price) continue;

        const closes = candleData.c;
        const rsi = calcRSI(closes);
        const macd = calcMACD(closes);
        const techScore = scoreTechnical(rsi, macd, riskLevel);
        const momentumScore = scoreMomentum(closes);
        const sentimentResult = await scoreSentiment(base44, symbol, news);
        const finalScore = techScore * 0.40 + momentumScore * 0.35 + sentimentResult.score * 0.25;

        if (finalScore >= adjustedBuyThreshold) {
          const positionSize = cachedAICapital * params.maxPositionPct;
          const amountToInvest = Math.min(positionSize, freshInvestableCash);
          if (amountToInvest < 1) continue;

          const shares = amountToInvest / quote.price;
          const totalCost = shares * quote.price;

          await Promise.all([
            base44.asServiceRole.entities.Transaction.create({
              type: "buy", symbol, company_name: symbol, shares,
              price: quote.price, total_amount: totalCost,
              ai_reasoning: `Señal de compra en ${symbol}. RSI: ${rsi?.toFixed(1) ?? "N/A"}. Momentum: ${momentumScore > 60 ? "positivo" : "neutro"}. Sentimiento: ${sentimentResult.summary}. Puntajes — Técnico: ${techScore.toFixed(0)}/100, Momentum: ${momentumScore.toFixed(0)}/100, Sentimiento: ${sentimentResult.score.toFixed(0)}/100. Score final ${finalScore.toFixed(1)} superó umbral (${adjustedBuyThreshold}). Invierto $${totalCost.toFixed(2)} (${(params.maxPositionPct * 100).toFixed(0)}% del portafolio). ${marketContext}`,
              score_technical: Math.round(techScore), score_fundamental: 0,
              score_sentiment: Math.round(sentimentResult.score), score_final: Math.round(finalScore),
              executed_at: new Date().toISOString(), user_id: userEmail
            }),
            base44.asServiceRole.entities.Holding.create({
              symbol, company_name: symbol, shares,
              avg_buy_price: quote.price, current_price: quote.price,
              current_value: totalCost, unrealized_pnl: 0, unrealized_pnl_pct: 0,
              user_id: userEmail
            }),
            base44.asServiceRole.entities.Alert.create({
              type: "buy", symbol,
              message: `📥 Compra: ${symbol} a $${quote.price.toFixed(2)} — ${shares.toFixed(4)} acciones ($${totalCost.toFixed(2)}). Score: ${finalScore.toFixed(0)}/100`,
              is_read: false, user_id: userEmail
            })
          ]);

          cachedLiquidCash -= totalCost;
          decisions.push({ action: "buy", symbol, score: finalScore, amount: totalCost });
        }
      } catch (err) {
        console.error(`Buy analysis failed for ${symbol}:`, err.message);
      }
    }
  }

  // 10. Single wallet update for all changes this cycle
  await base44.asServiceRole.entities.Wallet.update(wallet.id, {
    liquid_cash: Math.max(0, cachedLiquidCash),
    ai_capital: Math.max(0, cachedAICapital)
  });

  // 11. Update last_ai_run timestamp
  const nowISO = new Date().toISOString();
  await base44.asServiceRole.entities.UserConfig.update(config.id, { last_ai_run: nowISO });
  console.log(`[UPDATE COMPLETE] last_ai_run updated to ${nowISO}`);

  // 12. Performance snapshot
  const finalHoldings = (await base44.asServiceRole.entities.Holding.filter({ user_id: userEmail }, null, 500));
  const investedValue = finalHoldings.reduce((s, h) => s + (h.current_value || 0), 0);
  const totalPortfolio = cachedLiquidCash + investedValue;
  const initialCapital = config.initial_capital || totalPortfolio;

  console.log(`[SNAPSHOT] Portfolio: $${totalPortfolio.toFixed(2)}, PnL: $${(totalPortfolio - initialCapital).toFixed(2)}`);
  await base44.asServiceRole.entities.PerformanceSnapshot.create({
    timestamp: nowISO,
    total_portfolio_value: totalPortfolio,
    available_cash: cachedLiquidCash,
    invested_capital: investedValue,
    total_pnl: totalPortfolio - initialCapital,
    total_pnl_pct: ((totalPortfolio - initialCapital) / initialCapital) * 100,
    user_id: userEmail
  });

  console.log(`[AI CYCLE END] User: ${userEmail} — ${decisions.length} decisions`);
  return { success: true, decisions, positions: finalHoldings.length };
}

// ─── Price updater ────────────────────────────────────────────────────────────

async function updatePrices(base44) {
  const [allHoldings, allConfigs, allWallets] = await Promise.all([
    base44.asServiceRole.entities.Holding.filter({}, null, 500),
    base44.asServiceRole.entities.UserConfig.filter({}, null, 500),
    base44.asServiceRole.entities.Wallet.filter({}, null, 500)
  ]);
  if (!allHoldings.length) return { updated: 0, stopLosses: 0 };

  const userEmails = [...new Set(allHoldings.map(h => h.user_id || h.created_by).filter(Boolean))];
  const configByUser = {};
  const walletByUser = {};
  const walletCacheByUser = {};

  for (const email of userEmails) {
    configByUser[email] = allConfigs.find(c => c.created_by === email);
    const w = allWallets.find(w => w.created_by === email);
    walletByUser[email] = w;
    if (w) walletCacheByUser[email] = { liquid_cash: w.liquid_cash || 0, ai_capital: w.ai_capital || 0 };
  }

  let updated = 0, stopLosses = 0;
  const activePriceHoldingIds = new Set(allHoldings.map(h => h.id));

  for (const holding of allHoldings) {
    const userEmail = holding.user_id || holding.created_by;
    const config = configByUser[userEmail];
    const wallet = walletByUser[userEmail];
    const riskLevel = config?.risk_level || "moderate";
    const params = RISK_PARAMS[riskLevel] || RISK_PARAMS.moderate;

    try {
      if (!activePriceHoldingIds.has(holding.id)) continue;
      const quote = await getQuote(holding.symbol);
      if (!quote.price) continue;
      const currentPrice = quote.price;
      const lossPct = (currentPrice - holding.avg_buy_price) / holding.avg_buy_price;

      if (lossPct <= -params.stopLossPct) {
        const totalValue = currentPrice * holding.shares;
        const realizedPnl = (currentPrice - holding.avg_buy_price) * holding.shares;

        await Promise.all([
          base44.asServiceRole.entities.Transaction.create({
            type: "sell", symbol: holding.symbol,
            company_name: holding.company_name || holding.symbol,
            shares: holding.shares, price: currentPrice,
            total_amount: totalValue, realized_pnl: realizedPnl,
            ai_reasoning: `STOP-LOSS activado (actualización de precios). Precio $${currentPrice.toFixed(2)} representa ${(lossPct * 100).toFixed(2)}% desde $${holding.avg_buy_price.toFixed(2)}. Límite: -${(params.stopLossPct * 100).toFixed(0)}%.`,
            score_technical: 0, score_fundamental: 0, score_sentiment: 0, score_final: 0,
            executed_at: new Date().toISOString(), user_id: userEmail
          }),
          base44.asServiceRole.entities.Holding.delete(holding.id),
          base44.asServiceRole.entities.Alert.create({
            type: "stop_loss", symbol: holding.symbol,
            message: `⛔ Stop-loss en ${holding.symbol}: vendido a $${currentPrice.toFixed(2)} (${(lossPct * 100).toFixed(2)}%). P&L: $${realizedPnl.toFixed(2)}`,
            is_read: false, user_id: userEmail
          })
        ]);

        activePriceHoldingIds.delete(holding.id);
        if (walletCacheByUser[userEmail]) {
          walletCacheByUser[userEmail].liquid_cash += totalValue;
          walletCacheByUser[userEmail].ai_capital = Math.max(0, walletCacheByUser[userEmail].ai_capital + realizedPnl);
        }
        stopLosses++;
      } else {
        await base44.asServiceRole.entities.Holding.update(holding.id, {
          current_price: currentPrice,
          current_value: currentPrice * holding.shares,
          unrealized_pnl: (currentPrice - holding.avg_buy_price) * holding.shares,
          unrealized_pnl_pct: lossPct * 100
        });
        updated++;
      }
    } catch (err) {
      console.error(`Price update failed for ${holding.symbol}:`, err.message);
    }
  }

  // Single wallet update per user at the end
  for (const email of userEmails) {
    const wallet = walletByUser[email];
    const cache = walletCacheByUser[email];
    if (wallet && cache) {
      await base44.asServiceRole.entities.Wallet.update(wallet.id, {
        liquid_cash: Math.max(0, cache.liquid_cash),
        ai_capital: Math.max(0, cache.ai_capital)
      });
    }
  }

  return { updated, stopLosses };
}

// ─── Entry point ──────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    if (body.action === "updatePrices") {
      const result = await updatePrices(base44);
      return Response.json(result);
    }

    // Load shared data ONCE for all users
    const [allConfigs, allWallets, allHoldings] = await Promise.all([
      base44.asServiceRole.entities.UserConfig.filter({}, null, 500),
      base44.asServiceRole.entities.Wallet.filter({}, null, 500),
      base44.asServiceRole.entities.Holding.filter({}, null, 500)
    ]);

    // Load SPY context ONCE
    let spyChange = 0;
    let marketMode = "neutral";
    try {
      const spyRecords = await base44.asServiceRole.entities.SP500History.filter({}, "-timestamp", 1);
      spyChange = spyRecords[0]?.spy_change_pct ?? 0;
      if (spyChange < -2) marketMode = "bearish";
      else if (spyChange > 2) marketMode = "bullish";
    } catch (e) {
      console.warn("SP500History unavailable, using neutral market");
    }

    console.log(`[ENGINE START] Market mode: ${marketMode} (SPY ${spyChange > 0 ? '+' : ''}${spyChange.toFixed(2)}%)`);

    const sharedData = { allConfigs, allWallets, allHoldings, spyChange, marketMode };

    // Find users that have both config and wallet
    const userEmails = [...new Set(
      allConfigs
        .filter(c => c.created_by && allWallets.some(w => w.created_by === c.created_by))
        .map(c => c.created_by)
    )];

    if (!userEmails.length) {
      return Response.json({ skipped: true, reason: "No users with config + wallet" });
    }

    console.log(`[ENGINE START] Processing ${userEmails.length} user(s)`);

    const results = [];
    for (const email of userEmails) {
      try {
        const result = await runAICycleForUser(base44, email, sharedData);
        results.push({ user: email, ...result });
      } catch (err) {
        console.error(`AI cycle failed for ${email}:`, err.message);
        results.push({ user: email, error: err.message });
      }
    }

    return Response.json({ success: true, users: results.length, results });
  } catch (error) {
    console.error("AI Engine error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});