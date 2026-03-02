import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { callFinnhub } from "@/components/shared/useFinnhub";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";
import { Bot, TrendingUp, TrendingDown } from "lucide-react";

function fmt2(n) {
  return (n ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0f1629] border border-[#1a2240] rounded-xl p-3 text-xs font-mono">
      <p className="text-slate-400 mb-1">{label}</p>
      <p className="text-[#00ff88] font-bold">${fmt2(payload[0]?.value)}</p>
    </div>
  );
}

export default function StockChart({ symbol, quote: quoteProp, aiHolding }) {
  const [quote, setQuote]           = useState(quoteProp || null);
  const [history, setHistory]       = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [loading, setLoading]       = useState(!quoteProp);

  // Cargar quote
  useEffect(() => {
    if (quoteProp) { setQuote(quoteProp); setLoading(false); return; }
    if (!symbol) return;
    setLoading(true);
    callFinnhub("quote", { symbol })
      .then(data => setQuote(data))
      .catch(() => setQuote(null))
      .finally(() => setLoading(false));
  }, [symbol, quoteProp]);

  // Cargar historial desde PriceHistory
  useEffect(() => {
    if (!symbol) return;
    setHistoryLoading(true);
    base44.entities.PriceHistory.list()
      .then(all => {
        const filtered = (all || [])
          .filter(r => r.symbol === symbol && r.close != null)
          .sort((a, b) => new Date(a.date) - new Date(b.date))
          .slice(-63);
        setHistory(filtered.map(r => ({
          date:  r.date,
          close: r.close
        })));
      })
      .catch(() => setHistory([]))
      .finally(() => setHistoryLoading(false));
  }, [symbol]);

  const up = (quote?.changePct ?? 0) >= 0;
  const priceColor = up ? "#00ff88" : "#ff4757";
  const Icon = up ? TrendingUp : TrendingDown;

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[240px] text-slate-600 font-mono text-sm animate-pulse">
        Cargando cotización...
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[240px] text-slate-600 font-mono text-sm">
        No se pudo obtener la cotización
      </div>
    );
  }

  return (
    <div>
      {/* Gráfica histórica con PriceHistory */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="card-terminal p-5 mb-4">
        <p className="text-xs font-mono text-slate-500 mb-3 uppercase tracking-widest">
          {symbol} · Histórico 3 meses
        </p>
        {historyLoading ? (
          <div className="h-[180px] flex items-center justify-center text-slate-600 font-mono text-sm animate-pulse">
            Cargando historial...
          </div>
        ) : history.length < 2 ? (
          <div className="h-[180px] flex items-center justify-center text-slate-600 font-mono text-sm">
            Sin historial disponible para {symbol}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={history}>
              <XAxis dataKey="date"
                tick={{ fill: "#475569", fontSize: 9, fontFamily: "JetBrains Mono" }}
                axisLine={false} tickLine={false}
                tickFormatter={d => d?.slice(5)} // muestra MM-DD
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: "#475569", fontSize: 9, fontFamily: "JetBrains Mono" }}
                axisLine={false} tickLine={false}
                tickFormatter={v => `$${v.toFixed(0)}`}
                width={50}
                domain={["auto", "auto"]}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone" dataKey="close"
                stroke={priceColor} strokeWidth={2}
                dot={false} name="Cierre"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </motion.div>

      {/* Ticker del día */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="card-terminal p-6 mb-4">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-mono text-slate-500 uppercase tracking-widest">{symbol} · Precio del día</span>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-bold"
            style={{ background: `${priceColor}15`, color: priceColor, border: `1px solid ${priceColor}30` }}>
            <Icon className="w-3.5 h-3.5" />
            {up ? "Alza" : "Baja"}
          </div>
        </div>

        <div className="flex items-end gap-4 mb-6">
          <p className="text-5xl font-mono font-bold" style={{ color: priceColor }}>
            ${fmt2(quote.price)}
          </p>
          <div className="mb-1.5 flex flex-col items-start">
            <span className="text-lg font-mono font-semibold" style={{ color: priceColor }}>
              {up ? "+" : ""}{fmt2(quote.change)}
            </span>
            <span className="text-sm font-mono" style={{ color: priceColor }}>
              {up ? "+" : ""}{(quote.changePct ?? 0).toFixed(2)}%
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#0a0e1a] rounded-xl p-3 text-center border border-[#1a2240]">
            <p className="text-xs text-slate-500 font-mono mb-1">Máx del día</p>
            <p className="text-sm font-mono font-bold text-[#00ff88]">${fmt2(quote.high)}</p>
          </div>
          <div className="bg-[#0a0e1a] rounded-xl p-3 text-center border border-[#1a2240]">
            <p className="text-xs text-slate-500 font-mono mb-1">Mín del día</p>
            <p className="text-sm font-mono font-bold text-[#ff4757]">${fmt2(quote.low)}</p>
          </div>
          <div className="bg-[#0a0e1a] rounded-xl p-3 text-center border border-[#1a2240]">
            <p className="text-xs text-slate-500 font-mono mb-1">Cierre ant.</p>
            <p className="text-sm font-mono font-bold text-slate-400">${fmt2(quote.prevClose)}</p>
          </div>
        </div>

        {quote.low != null && quote.high != null && quote.high > quote.low && (
          <div className="mt-4">
            <div className="flex justify-between text-xs font-mono text-slate-600 mb-1">
              <span>Rango del día</span>
              <span>{(((quote.price - quote.low) / (quote.high - quote.low)) * 100).toFixed(0)}%</span>
            </div>
            <div className="h-1.5 bg-[#1a2240] rounded-full overflow-hidden">
              <div className="h-full rounded-full"
                style={{
                  width: `${((quote.price - quote.low) / (quote.high - quote.low)) * 100}%`,
                  background: `linear-gradient(to right, #ff4757, ${priceColor})`
                }} />
            </div>
            <div className="flex justify-between text-xs font-mono text-slate-600 mt-1">
              <span>${fmt2(quote.low)}</span>
              <span>${fmt2(quote.high)}</span>
            </div>
          </div>
        )}
      </motion.div>

      {aiHolding && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#00ff88]/5 border border-[#00ff88]/20">
          <Bot className="w-4 h-4 text-[#00ff88]" />
          <span className="text-sm font-mono text-[#00ff88]">
            IA invertida aquí — ${fmt2(aiHolding.current_value || aiHolding.avg_buy_price * aiHolding.shares)}
          </span>
        </motion.div>
      )}
    </div>
  );
}