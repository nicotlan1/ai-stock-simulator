import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend
} from "recharts";
import PageHeader from "@/components/shared/PageHeader";

const RANGES = ["HOY", "1 SEM", "1 MES", "TODO"];

function fmt2(n) { return (n ?? 0).toFixed(2); }

function CustomTooltip({ active, payload, label, transactions }) {
  if (!active || !payload?.length) return null;
  const tx = transactions?.filter(t => {
    const d = new Date(t.executed_at || t.created_date).toLocaleDateString("en-US");
    return d === label;
  });
  return (
    <div className="bg-[#0f1629] border border-[#1a2240] rounded-xl p-3 text-xs font-mono min-w-[180px]">
      <p className="text-slate-400 mb-2">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: {p.value != null ? `${p.value.toFixed(1)}` : "—"}
        </p>
      ))}
      {tx?.length > 0 && (
        <div className="mt-2 border-t border-[#1a2240] pt-2 space-y-1">
          {tx.map((t, i) => (
            <p key={i} className={t.type === "buy" ? "text-[#00ff88]" : "text-[#ff4757]"}>
              {t.type === "buy" ? "📥" : "📤"} {t.symbol} —{" "}
              {t.type === "sell" && t.realized_pnl != null
                ? `P&L: $${fmt2(t.realized_pnl)}`
                : `$${fmt2(t.total_amount)}`}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Performance() {
  const [snapshots, setSnapshots]     = useState([]);
  const [spy, setSpy]                 = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [config, setConfig]           = useState(null);
  const [range, setRange]             = useState("1 MES");
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    async function load() {
      // FIX: .list() sin parámetros posicionales incorrectos
      const [snaps, txs, configs, spyRecs] = await Promise.all([
        base44.entities.PerformanceSnapshot.list(),
        base44.entities.Transaction.list(),
        base44.entities.UserConfig.list(),
        base44.entities.SP500History.list()
      ]);

      setSnapshots(
        (snaps || []).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
      );
      setTransactions(
        (txs || []).sort((a, b) => new Date(b.executed_at) - new Date(a.executed_at)).slice(0, 200)
      );
      setConfig((configs || [])[0] || null);
      setSpy(
        (spyRecs || []).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
      );
      setLoading(false);
    }
    load();
  }, []);

  const now = Date.now();
  const rangeCutoff = {
    "HOY":   now - 86400000,
    "1 SEM": now - 7  * 86400000,
    "1 MES": now - 30 * 86400000,
    "TODO":  0
  }[range];

  // Build chart data by day
  const filteredSnaps = snapshots.filter(s =>
    s.timestamp && new Date(s.timestamp).getTime() >= rangeCutoff
  );

  const byDay = {};
  filteredSnaps.forEach(s => {
    const d = new Date(s.timestamp).toLocaleDateString("en-US");
    if (!byDay[d] || new Date(s.timestamp) > new Date(byDay[d].ts)) {
      byDay[d] = { ts: s.timestamp, value: s.total_portfolio_value };
    }
  });

  const spyByDay = {};
  // FIX: guard para timestamps null
  spy
    .filter(s => s.timestamp && new Date(s.timestamp).getTime() >= rangeCutoff)
    .forEach(s => {
      const d = new Date(s.timestamp).toLocaleDateString("en-US");
      spyByDay[d] = s.spy_price;
    });

  const days = Object.keys(byDay).sort((a, b) => new Date(a) - new Date(b));

  // FIX: normalizar a base 100 para comparación correcta en misma escala
  const basePortfolio = days.length > 0 ? (byDay[days[0]].value || 1) : 1;
  const baseSpy       = days.length > 0 && spyByDay[days[0]] ? spyByDay[days[0]] : 1;
  const goalAmount    = config?.goal_amount || null;

  const chartData = days.map(d => ({
    date:      d,
    portfolio: byDay[d].value      != null ? (byDay[d].value      / basePortfolio) * 100 : null,
    spy:       spyByDay[d]         != null ? (spyByDay[d]         / baseSpy)       * 100 : null,
    goal:      goalAmount          != null ? (goalAmount           / basePortfolio) * 100 : null
  }));

  // KPIs — calcular desde valores reales, no normalizados
  const firstVal  = days.length > 0 ? byDay[days[0]].value : null;
  const lastVal   = days.length > 0 ? byDay[days[days.length - 1]].value : null;
  const myReturn  = firstVal && lastVal ? ((lastVal - firstVal) / firstVal) * 100 : 0;

  const firstSpy  = days.length > 0 ? spyByDay[days[0]] : null;
  const lastSpy   = days.length > 0 ? spyByDay[days[days.length - 1]] : null;
  const spyReturn = firstSpy && lastSpy ? ((lastSpy - firstSpy) / firstSpy) * 100 : 0;

  const diff = myReturn - spyReturn;

  return (
    <div>
      <PageHeader title="Rendimiento" subtitle="Evolución de tu portafolio vs el mercado" />

      {/* Range filters */}
      <div className="flex gap-2 mb-6">
        {RANGES.map(r => (
          <button key={r} onClick={() => setRange(r)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
              range === r
                ? "bg-[#00ff88]/10 border border-[#00ff88]/30 text-[#00ff88]"
                : "border border-[#1a2240] text-slate-500 hover:text-slate-300"
            }`}>
            {r}
          </button>
        ))}
      </div>

      {/* Chart */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="card-terminal p-5 mb-4">
        <p className="text-xs text-slate-500 font-mono mb-3">Base 100 — comparación relativa desde inicio del período</p>
        {loading || chartData.length < 2 ? (
          <div className="h-[280px] flex items-center justify-center text-slate-600 text-sm font-mono">
            {loading ? "Cargando..." : "Sin suficientes datos para este rango."}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData}>
              <XAxis dataKey="date"
                tick={{ fill: "#475569", fontSize: 10, fontFamily: "JetBrains Mono" }}
                axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fill: "#475569", fontSize: 10, fontFamily: "JetBrains Mono" }}
                axisLine={false} tickLine={false}
                // FIX: mostrar como índice base 100
                tickFormatter={v => `${v.toFixed(0)}`}
                width={45} />
              <Tooltip content={<CustomTooltip transactions={transactions} />} />
              <Legend wrapperStyle={{ fontSize: "11px", fontFamily: "JetBrains Mono", color: "#64748b" }} />
              <Line type="monotone" dataKey="portfolio" name="Mi Portafolio"
                stroke="#00ff88" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="spy" name="S&P 500 (SPY)"
                stroke="#64748b" strokeWidth={1.5} dot={false} />
              {goalAmount && (
                <Line type="monotone" dataKey="goal" name="Mi Meta"
                  stroke="#3b82f6" strokeWidth={1.5} dot={false} strokeDasharray="6 3" />
              )}
            </LineChart>
          </ResponsiveContainer>
        )}
      </motion.div>

      {/* KPI row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          {
            label: "Mi Retorno",
            value: `${myReturn >= 0 ? "+" : ""}${myReturn.toFixed(2)}%`,
            color: myReturn >= 0 ? "#00ff88" : "#ff4757"
          },
          {
            label: "S&P 500",
            value: `${spyReturn >= 0 ? "+" : ""}${spyReturn.toFixed(2)}%`,
            color: "#64748b"
          },
          {
            label: "Alfa vs Mercado",
            value: `${diff >= 0 ? "+" : ""}${diff.toFixed(2)}%`,
            color: diff >= 0 ? "#00ff88" : "#ff4757"
          }
        ].map(({ label, value, color }) => (
          <motion.div key={label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="card-terminal p-4 text-center">
            <p className="text-xs text-slate-500 font-mono mb-1">{label}</p>
            <p className="text-xl font-mono font-bold" style={{ color }}>{value}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}