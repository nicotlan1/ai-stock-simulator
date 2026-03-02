import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const API_KEY = Deno.env.get("API_Finnhub");
const BASE = "https://finnhub.io/api/v1";

async function finnhubGet(path) {
  const url = `${BASE}${path}&token=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Finnhub error ${res.status}: ${path}`);
  return res.json();
}

// NYSE market hours: Mon-Fri 9:30-16:00 Eastern
function isMarketOpen() {
  const now = new Date();
  const eastern = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const day = eastern.getDay(); // 0=Sun, 6=Sat
  const hours = eastern.getHours();
  const minutes = eastern.getMinutes();
  const time = hours * 60 + minutes;
  if (day === 0 || day === 6) return false;
  return time >= 570 && time < 960; // 9:30=570, 16:00=960
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { action, symbol, symbols } = body;

    if (action === "quote") {
      // Single stock quote: price, change, changePct
      const data = await finnhubGet(`/quote?symbol=${symbol}`);
      return Response.json({
        symbol,
        price: data.c,
        change: data.d,
        changePct: data.dp,
        high: data.h,
        low: data.l,
        open: data.o,
        prevClose: data.pc
      });
    }

    if (action === "quotes") {
      if (!symbols || symbols.length === 0) {
        return Response.json({ error: "symbols array required" }, { status: 400 });
      }
      const results = await Promise.allSettled(
        symbols.map(async (sym) => {
          const data = await finnhubGet(`/quote?symbol=${sym}`);
          return { symbol: sym, price: data.c, change: data.d, changePct: data.dp, prevClose: data.pc };
        })
      );
      const quotes = results.filter(r => r.status === "fulfilled").map(r => r.value);
      return Response.json({ quotes });
    }

    if (action === "candles") {
      // 45-day price history (daily candles) — guarantees enough trading days
      const to = Math.floor(Date.now() / 1000);
      const from = to - 45 * 24 * 60 * 60;
      const data = await finnhubGet(`/stock/candle?symbol=${symbol}&resolution=D&from=${from}&to=${to}`);
      if (data.s !== "ok") return Response.json({ candles: [] });
      const candles = (data.t || []).map((t, i) => ({
        time: t,
        open: data.o[i],
        high: data.h[i],
        low: data.l[i],
        close: data.c[i],
        volume: data.v[i]
      }));
      return Response.json({ candles });
    }

    if (action === "news") {
      // Latest company news
      const today = new Date();
      const from = new Date(today - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      const to = today.toISOString().split("T")[0];
      const data = await finnhubGet(`/company-news?symbol=${symbol}&from=${from}&to=${to}`);
      return Response.json({ news: (data || []).slice(0, 10) });
    }

    if (action === "market_status") {
      const open = isMarketOpen();
      return Response.json({ open, timestamp: Date.now() });
    }

    if (action === "spy") {
      const data = await finnhubGet(`/quote?symbol=SPY`);
      return Response.json({
        symbol: "SPY",
        price: data.c,
        change: data.d,
        changePct: data.dp
      });
    }

    if (action === "indices") {
      // Fetch SPY (S&P500), QQQ (NASDAQ), DIA (Dow Jones)
      const [spy, qqq, dia] = await Promise.all([
        finnhubGet(`/quote?symbol=SPY`),
        finnhubGet(`/quote?symbol=QQQ`),
        finnhubGet(`/quote?symbol=DIA`)
      ]);
      return Response.json({
        indices: [
          { symbol: "SPY", name: "S&P 500",    price: spy.c, change: spy.d, changePct: spy.dp, prevClose: spy.pc },
          { symbol: "QQQ", name: "NASDAQ",     price: qqq.c, change: qqq.d, changePct: qqq.dp, prevClose: qqq.pc },
          { symbol: "DIA", name: "Dow Jones",  price: dia.c, change: dia.d, changePct: dia.dp, prevClose: dia.pc }
        ]
      });
    }

    if (action === "candles_range") {
      // Candles for different ranges — all use daily resolution (free plan)
      const rangeMap = {
        "1D":  { resolution: "D", days: 2  },
        "5D":  { resolution: "D", days: 5  },
        "1M":  { resolution: "D", days: 30 },
        "3M":  { resolution: "D", days: 90 }
      };
      const { resolution, days } = rangeMap[body.range] || rangeMap["1M"];
      const to = Math.floor(Date.now() / 1000);
      const from = to - days * 24 * 60 * 60;
      const data = await finnhubGet(`/stock/candle?symbol=${symbol}&resolution=${resolution}&from=${from}&to=${to}`);
      if (data.s !== "ok") return Response.json({ candles: [] });
      const candles = (data.t || []).map((t, i) => ({
        time: t,
        open: data.o[i],
        high: data.h[i],
        low: data.l[i],
        close: data.c[i],
        volume: data.v[i]
      }));
      return Response.json({ candles });
    }

    if (action === "market_news") {
      const category = body.category || "general";
      const data = await finnhubGet(`/news?category=${category}`);
      return Response.json({ news: (data || []).slice(0, 10) });
    }

    if (action === "profile") {
      const data = await finnhubGet(`/stock/profile2?symbol=${symbol}`);
      return Response.json({ name: data.name, logo: data.logo, exchange: data.exchange, industry: data.finnhubIndustry });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});