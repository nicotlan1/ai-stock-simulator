import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const API_KEY = Deno.env.get("API_Finnhub");
const BASE = "https://finnhub.io/api/v1";

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

    // FIX: no guardar snapshots fuera de horario de mercado
    if (!isMarketOpen()) {
      return Response.json({ skipped: true, reason: "Market closed" });
    }

    const res = await fetch(`${BASE}/quote?symbol=SPY&token=${API_KEY}`);
    if (!res.ok) throw new Error(`Finnhub ${res.status}`);
    const data = await res.json();

    if (!data.c) {
      return Response.json({ skipped: true, reason: "No SPY price" });
    }

    // FIX: guardar todos los campos disponibles de la respuesta
    await base44.asServiceRole.entities.SP500History.create({
      timestamp: new Date().toISOString(),
      spy_price: data.c,
      spy_change: data.d || 0,
      spy_change_pct: data.dp || 0,
      spy_prev_close: data.pc || 0
    });

    return Response.json({
      success: true,
      spy_price: data.c,
      spy_change_pct: data.dp
    });

  } catch (error) {
    console.error("sp500Snapshot error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});