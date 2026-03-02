import React from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown } from "lucide-react";

function fmt(n) {
  return (n ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function IndexCard({ idx, compact = false }) {
  if (!idx) return null;
  const up = (idx.changePct ?? 0) >= 0;
  const color = up ? "#00ff88" : "#ff4757";
  const Icon = up ? TrendingUp : TrendingDown;

  if (compact) {
    return (
      <div className="card-terminal p-3 flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono text-slate-400">{idx.name}</span>
          <Icon className="w-3 h-3" style={{ color }} />
        </div>
        <span className="text-base font-mono font-bold text-white">${fmt(idx.price)}</span>
        <span className="text-xs font-mono font-bold" style={{ color }}>
          {up ? "+" : ""}{(idx.changePct ?? 0).toFixed(2)}%
        </span>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-terminal p-5 flex flex-col gap-3"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-mono text-slate-500 mb-0.5">{idx.symbol}</p>
          <p className="text-sm font-semibold text-slate-200">{idx.name}</p>
        </div>
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${color}15` }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
      </div>
      <div>
        <p className="text-2xl font-mono font-bold text-white">${fmt(idx.price)}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-sm font-mono font-bold" style={{ color }}>
            {up ? "+" : ""}{fmt(idx.change)}
          </span>
          <span className="text-sm font-mono" style={{ color }}>
            ({up ? "+" : ""}{(idx.changePct ?? 0).toFixed(2)}%)
          </span>
        </div>
      </div>
    </motion.div>
  );
}

export default function IndexCards({ indices, loading, compact = false }) {
  if (loading) {
    return (
      <div className={`grid grid-cols-3 gap-4`}>
        {[0, 1, 2].map(i => (
          <div key={i} className="card-terminal p-5 animate-pulse">
            <div className="h-4 bg-[#1a2240] rounded mb-3 w-1/2" />
            <div className="h-7 bg-[#1a2240] rounded mb-2 w-3/4" />
            <div className="h-4 bg-[#1a2240] rounded w-1/3" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-4">
      {(indices || []).map((idx, i) => (
        <IndexCard key={idx.symbol} idx={idx} compact={compact} />
      ))}
    </div>
  );
}