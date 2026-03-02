import React from "react";
import { motion } from "framer-motion";
import { ResponsiveContainer, LineChart, Line, Tooltip, XAxis, YAxis } from "recharts";

function CustomTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#0f1629] border border-[#1a2240] rounded-lg px-3 py-2 text-xs font-mono">
        <p className="text-[#00ff88]">${payload[0].value?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        <p className="text-slate-500">{payload[0].payload?.time}</p>
      </div>
    );
  }
  return null;
}

export default function PortfolioChart({ snapshots }) {
  const today = new Date().toDateString();
  const data = (snapshots || [])
    .filter(s => new Date(s.timestamp).toDateString() === today)
    .map(s => ({
      time: new Date(s.timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZone: "America/New_York" }),
      value: s.total_portfolio_value
    }));

  const hasData = data.length >= 2;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
      className="card-terminal p-5 mb-4"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-200">Evolución del Portafolio Hoy</h3>
        <span className="text-[10px] font-mono text-slate-500">{data.length} punto(s)</span>
      </div>

      {hasData ? (
        <ResponsiveContainer width="100%" height={140}>
          <LineChart data={data}>
            <XAxis dataKey="time" tick={{ fill: "#475569", fontSize: 10, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
            <YAxis domain={["auto", "auto"]} tick={{ fill: "#475569", fontSize: 10, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} width={70}
              tickFormatter={v => `$${(v/1000).toFixed(1)}k`} />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="value" stroke="#00ff88" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-[140px] flex items-center justify-center text-slate-600 text-sm font-mono">
          No hay datos de hoy todavía. Los snapshots se generan con cada ciclo de la IA.
        </div>
      )}
    </motion.div>
  );
}