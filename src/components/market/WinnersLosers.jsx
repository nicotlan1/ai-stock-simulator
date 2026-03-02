import React from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown } from "lucide-react";

function fmt2(n) {
  return (n ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function StockRow({ q, maxAbs, isWinner }) {
  const color = isWinner ? "#00ff88" : "#ff4757";
  const pct = Math.abs(q.changePct ?? 0);
  const barWidth = maxAbs > 0 ? (pct / maxAbs) * 100 : 0;

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-[#1a2240] last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <div>
            <span className="text-sm font-mono font-bold text-white">{q.symbol}</span>
            {q.companyName && (
              <span className="text-xs text-slate-500 ml-2 truncate">{q.companyName}</span>
            )}
          </div>
          <div className="text-right flex-shrink-0 ml-2">
            <span className="text-sm font-mono text-slate-300">${fmt2(q.price)}</span>
            <span className="text-xs font-mono font-bold ml-2" style={{ color }}>
              {isWinner ? "+" : ""}{(q.changePct ?? 0).toFixed(2)}%
            </span>
          </div>
        </div>
        <div className="h-1.5 rounded-full bg-[#1a2240] overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${barWidth}%` }}
            transition={{ duration: 0.6 }}
            className="h-full rounded-full"
            style={{ background: color }}
          />
        </div>
      </div>
    </div>
  );
}

export default function WinnersLosers({ quotes, stocks, loading }) {
  const rows = stocks
    .map(sym => quotes[sym])
    .filter(Boolean)
    .filter(q => q.changePct != null);

  const sorted = [...rows].sort((a, b) => (b.changePct ?? 0) - (a.changePct ?? 0));
  const winners = sorted.slice(0, 3);
  const losers = [...sorted].reverse().slice(0, 3);

  const maxWin = winners.length > 0 ? Math.abs(winners[0].changePct ?? 0) : 1;
  const maxLose = losers.length > 0 ? Math.abs(losers[0].changePct ?? 0) : 1;

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[0, 1].map(i => (
          <div key={i} className="card-terminal p-5 animate-pulse space-y-3">
            {[0, 1, 2].map(j => <div key={j} className="h-10 bg-[#1a2240] rounded" />)}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* Winners */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="card-terminal p-5">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-[#00ff88]" />
          <span className="text-sm font-semibold text-slate-200">Top Ganadoras</span>
        </div>
        {winners.length === 0 ? (
          <p className="text-slate-600 text-sm py-4 text-center font-mono">Sin datos</p>
        ) : (
          winners.map(q => <StockRow key={q.symbol} q={q} maxAbs={maxWin} isWinner={true} />)
        )}
      </motion.div>

      {/* Losers */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="card-terminal p-5">
        <div className="flex items-center gap-2 mb-3">
          <TrendingDown className="w-4 h-4 text-[#ff4757]" />
          <span className="text-sm font-semibold text-slate-200">Top Perdedoras</span>
        </div>
        {losers.length === 0 ? (
          <p className="text-slate-600 text-sm py-4 text-center font-mono">Sin datos</p>
        ) : (
          losers.map(q => <StockRow key={q.symbol} q={q} maxAbs={maxLose} isWinner={false} />)
        )}
      </motion.div>
    </div>
  );
}