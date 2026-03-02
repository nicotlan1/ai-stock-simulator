import React from "react";
import { motion } from "framer-motion";
import { Bot, Clock } from "lucide-react";
import { useMarketStatus } from "@/components/shared/useFinnhub";

function fmt(n) {
  return (n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function PositionsTable({ holdings, quotes }) {
  const { open } = useMarketStatus();

  if (!holdings || holdings.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25 }}
        className="card-terminal p-6 mb-4"
      >
        <h3 className="text-sm font-semibold text-slate-200 mb-4">Posiciones Abiertas</h3>
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <Bot className="w-10 h-10 text-[#00ff88]/40 mb-3" />
          <p className="text-slate-400 text-sm">🤖 La IA está analizando el mercado.</p>
          <p className="text-slate-600 text-xs mt-1">Las posiciones aparecerán aquí cuando la IA ejecute compras.</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.25 }}
      className="card-terminal p-5 mb-4"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-200">Posiciones Abiertas</h3>
        <div className="flex items-center gap-1.5">
          {!open && (
            <span className="flex items-center gap-1 text-[10px] font-mono text-[#ff4757] bg-[#ff4757]/10 px-2 py-0.5 rounded border border-[#ff4757]/20">
              <Clock className="w-3 h-3" /> CIERRE
            </span>
          )}
          <span className="text-xs text-slate-500 font-mono">{holdings.length} posición(es)</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[#1a2240]">
              <th className="text-left text-slate-500 font-mono pb-2 pr-4">SÍMBOLO</th>
              <th className="text-right text-slate-500 font-mono pb-2 px-4 hidden md:table-cell">ACCIONES</th>
              <th className="text-right text-slate-500 font-mono pb-2 px-4">PRECIO ACTUAL</th>
              <th className="text-right text-slate-500 font-mono pb-2 px-4 hidden sm:table-cell">VALOR</th>
              <th className="text-right text-slate-500 font-mono pb-2 pl-4">P&L</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1a2240]">
            {holdings.map((h) => {
              const liveQuote = quotes?.[h.symbol];
              const currentPrice = liveQuote?.price || h.current_price || h.avg_buy_price;
              const currentValue = currentPrice * h.shares;
              const pnl = (currentPrice - h.avg_buy_price) * h.shares;
              const pnlPct = ((currentPrice - h.avg_buy_price) / h.avg_buy_price) * 100;
              const isPos = pnl >= 0;

              return (
                <tr key={h.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-md bg-white/5 flex items-center justify-center flex-shrink-0">
                        <span className="text-[9px] font-mono font-bold text-slate-300">{h.symbol.slice(0, 2)}</span>
                      </div>
                      <div>
                        <p className="font-mono font-bold text-slate-100">{h.symbol}</p>
                        <p className="text-[10px] text-slate-500 truncate max-w-[120px]">{h.company_name || h.symbol}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-slate-300 hidden md:table-cell">
                    {h.shares.toFixed(4)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-white">
                    ${fmt(currentPrice)}
                    {!open && <span className="ml-1 text-[9px] text-[#ff4757] font-mono">CIERRE</span>}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-slate-200 hidden sm:table-cell">
                    ${fmt(currentValue)}
                  </td>
                  <td className="py-3 pl-4 text-right">
                    <p className={`font-mono font-bold ${isPos ? "text-[#00ff88]" : "text-[#ff4757]"}`}>
                      {isPos ? "+" : ""}${fmt(pnl)}
                    </p>
                    <p className={`text-[10px] font-mono ${isPos ? "text-[#00ff88]/70" : "text-[#ff4757]/70"}`}>
                      {isPos ? "+" : ""}{pnlPct.toFixed(2)}%
                    </p>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}