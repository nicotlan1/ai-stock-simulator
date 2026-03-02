import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip
} from "recharts";
import { callFinnhub } from "@/components/shared/useFinnhub";
import { Bot, TrendingUp, TrendingDown } from "lucide-react";

const RANGES = ["1D", "5D", "1M", "3M"];

function fmt2(n) {
  return (n ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function calcRSI(candles, period = 14) {
  if (!candles || candles.length < period + 1) return null;
  const closes = candles.map(c => c.close);
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff; else losses -= diff;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + Math.max(diff, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-diff, 0)) / period;
  }
  if (avgLoss === 0) return 100;
  return 100 - (100 / (1 + avgGain / avgLoss));
}

function CandlestickTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className="bg-[#0f1629] border border-[#1a2240] rounded-xl p-3 text-xs font-mono">
      <p className="text-slate-400 mb-2">{new Date(d.time * 1000).toLocaleDateString("es-MX")}</p>
      <p className="text-white">O: ${fmt2(d.open)}</p>
      <p className="text-[#00ff88]">H: ${fmt2(d.high)}</p>
      <p className="text-[#ff4757]">L: ${fmt2(d.low)}</p>
      <p className="text-white">C: ${fmt2(d.close)}</p>
      <p className="text-slate-400 mt-1">Vol: {(d.volume / 1000).toFixed(0)}K</p>
    </div>
  );
}

export default function StockChart({ symbol, quote, aiHolding }) {
  const [range, setRange] = useState("1M");
  const [candles, setCandles] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCandles = useCallback(async () => {
    if (!symbol) return;
    setLoading(true);
    try {
      const data = await callFinnhub("candles_range", { symbol, range });
      setCandles(data.candles || []);
    } catch {
      setCandles([]);
    } finally {
      setLoading(false);
    }
  }, [symbol, range]);

  useEffect(() => { fetchCandles(); }, [fetchCandles]);

  const rsi = calcRSI(candles);
  const rsiColor = rsi == null ? "#64748b" : rsi < 30 ? "#00ff88" : rsi > 70 ? "#ff4757" : "#fbbf24";

  const up = (quote?.changePct ?? 0) >= 0;
  const priceColor = up ? "#00ff88" : "#ff4757";

  // Build chart data — use OHLC bars
  const chartData = candles.map(c => ({
    ...c,
    barColor: c.close >= c.open ? "#00ff88" : "#ff4757",
    high_low: [c.low, c.high],
    bar: [Math.min(c.open, c.close), Math.max(c.open, c.close)],
    closeVal: c.close
  }));

  const lastCandle = candles[candles.length - 1];

  return (
    <div>
      {/* Range selector */}
      <div className="flex gap-2 mb-4">
        {RANGES.map(r => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
              range === r
                ? "bg-[#00ff88]/10 border border-[#00ff88]/30 text-[#00ff88]"
                : "border border-[#1a2240] text-slate-500 hover:text-slate-300"
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="card-terminal p-4 mb-4">
        {loading ? (
          <div className="h-[240px] flex items-center justify-center text-slate-600 font-mono text-sm animate-pulse">
            Cargando gráfica...
          </div>
        ) : chartData.length < 2 ? (
          <div className="h-[240px] flex items-center justify-center text-slate-600 font-mono text-sm">
            Sin datos para este rango
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={chartData}>
              <XAxis
                dataKey="time"
                tickFormatter={t => {
                  const d = new Date(t * 1000);
                  return range === "1D" ? d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })
                    : d.toLocaleDateString("es-MX", { month: "short", day: "numeric" });
                }}
                tick={{ fill: "#475569", fontSize: 9, fontFamily: "JetBrains Mono" }}
                axisLine={false} tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tickFormatter={v => `$${v.toFixed(0)}`}
                tick={{ fill: "#475569", fontSize: 9, fontFamily: "JetBrains Mono" }}
                axisLine={false} tickLine={false} width={52}
                domain={["auto", "auto"]}
              />
              <Tooltip content={<CandlestickTooltip />} />
              <Line
                type="monotone"
                dataKey="closeVal"
                stroke={up ? "#00ff88" : "#ff4757"}
                strokeWidth={1.5}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Stats row */}
      {quote && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
          {[
            { label: "Precio", value: `$${fmt2(quote.price)}`, color: priceColor },
            { label: "Variación", value: `${up ? "+" : ""}${(quote.changePct ?? 0).toFixed(2)}%`, color: priceColor },
            { label: "Máx del día", value: `$${fmt2(lastCandle?.high ?? quote.high)}`, color: "#00ff88" },
            { label: "Mín del día", value: `$${fmt2(lastCandle?.low ?? quote.low)}`, color: "#ff4757" },
          ].map(s => (
            <div key={s.label} className="card-terminal p-3 text-center">
              <p className="text-xs text-slate-500 font-mono mb-1">{s.label}</p>
              <p className="text-sm font-mono font-bold" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {/* RSI */}
        <div className="card-terminal p-3">
          <p className="text-xs text-slate-500 font-mono mb-1">RSI (14)</p>
          {rsi != null ? (
            <div className="flex items-center gap-2">
              <p className="text-lg font-mono font-bold" style={{ color: rsiColor }}>{rsi.toFixed(1)}</p>
              <p className="text-xs font-mono" style={{ color: rsiColor }}>
                {rsi < 30 ? "Sobrevendido" : rsi > 70 ? "Sobrecomprado" : "Neutral"}
              </p>
            </div>
          ) : (
            <p className="text-slate-600 text-sm font-mono">Sin datos</p>
          )}
        </div>

        {/* Volumen */}
        <div className="card-terminal p-3">
          <p className="text-xs text-slate-500 font-mono mb-1">Volumen del día</p>
          <p className="text-lg font-mono font-bold text-white">
            {lastCandle?.volume ? `${(lastCandle.volume / 1_000_000).toFixed(2)}M` : "—"}
          </p>
        </div>
      </div>

      {/* AI badge */}
      {aiHolding && (
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="mt-3 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#00ff88]/5 border border-[#00ff88]/20"
        >
          <Bot className="w-4 h-4 text-[#00ff88]" />
          <span className="text-sm font-mono text-[#00ff88]">
            IA invertida aquí — ${fmt2(aiHolding.current_value || aiHolding.avg_buy_price * aiHolding.shares)}
          </span>
        </motion.div>
      )}
    </div>
  );
}