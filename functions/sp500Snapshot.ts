import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const API_KEY = Deno.env.get("API_Finnhub");
const BASE = "https://finnhub.io/api/v1";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const res = await fetch(`${BASE}/quote?symbol=SPY&token=${API_KEY}`);
    if (!res.ok) throw new Error(`Finnhub ${res.status}`);
    const data = await res.json();

    if (!data.c) {
      return Response.json({ skipped: true, reason: "No SPY price" });
    }

    await base44.asServiceRole.entities.SP500History.create({
      timestamp: new Date().toISOString(),
      spy_price: data.c,
      spy_change_pct: data.dp || 0
    });

    return Response.json({ success: true, spy_price: data.c });
  } catch (error) {
    console.error("sp500Snapshot error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});