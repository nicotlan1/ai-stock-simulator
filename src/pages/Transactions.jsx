import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import PageHeader from "@/components/shared/PageHeader";
import { TrendingUp, TrendingDown, Trophy, X } from "lucide-react";

function fmt(n) { return (n ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterSymbol, setFilterSymbol] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  useEffect(() => {
    base44.entities.Transaction.list("-executed_at", 200).then(txs => {
      setTransactions(txs || []);
      setLoading(false);
    });
  }, []);

  const filtered = transactions.filter(tx => {
    if (filterSymbol && !tx.symbol.toUpperCase().includes(filterSymbol.toUpperCase())) return false;
    if (filterType !== "all" && tx.type !== filterType) return false;
    if (filterFrom && new Date(tx.executed_at || tx.created_date) < new Date(filterFrom)) return false;
    if (filterTo && new Date(tx.executed_at || tx.created_date) > new Date(filterTo + "T23:59:59")) return false;
    return true;
  });

  // Stats (on full transactions)
  const sells = transactions.filter(t => t.type === "sell" && t.realized_pnl != null);
  const winners = sells.filter(t => t.realized_pnl > 0);
  const losers = sells.filter(t => t.realized_pnl <= 0);
  const winRate = sells.length > 0 ? (winners.length / sells.length) * 100 : 0;
  const bestTrade = sells.length > 0 ? Math.max(...sells.map(t => t.realized_pnl)) : null;
  const worstTrade = sells.length > 0 ? Math.min(...sells.map(t => t.realized_pnl)) : null;

  return (
    <div>
      <PageHeader title="Transacciones" subtitle="Historial completo de operaciones" />

      {/* Stats */}
      {!loading && sells.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Ganadoras", value: winners.length, color: "#00ff88" },
            { label: "Perdedoras", value: losers.length, color: "#ff4757" },
            { label: "Mejor Trade", value: bestTrade != null ? `+$${fmt(bestTrade)}` : "—", color: "#00ff88" },
            { label: "% Éxito", value: `${winRate.toFixed(1)}%`, color: winRate >= 50 ? "#00ff88" : "#ff4757" }
          ].map(s => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="card-terminal p-4 text-center">
              <p className="text-xs text-slate-500 font-mono mb-1">{s.label}</p>
              <p className="text-xl font-mono font-bold" style={{ color: s.color }}>{s.value}</p>
            </motion.div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="text"
          placeholder="Símbolo..."
          value={filterSymbol}
          onChange={e => setFilterSymbol(e.target.value)}
          className="bg-[#0f1629] border border-[#1a2240] rounded-lg px-3 py-2 text-xs font-mono text-slate-300 placeholder-slate-600 outline-none w-28"
        />
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="bg-[#0f1629] border border-[#1a2240] rounded-lg px-3 py-2 text-xs font-mono text-slate-300 outline-none"
        >
          <option value="all">Todos</option>
          <option value="buy">Compra</option>
          <option value="sell">Venta</option>
        </select>
        <input
          type="date"
          value={filterFrom}
          onChange={e => setFilterFrom(e.target.value)}
          className="bg-[#0f1629] border border-[#1a2240] rounded-lg px-3 py-2 text-xs font-mono text-slate-300 outline-none"
        />
        <input
          type="date"
          value={filterTo}
          onChange={e => setFilterTo(e.target.value)}
          className="bg-[#0f1629] border border-[#1a2240] rounded-lg px-3 py-2 text-xs font-mono text-slate-300 outline-none"
        />
        {(filterSymbol || filterType !== "all" || filterFrom || filterTo) && (
          <button
            onClick={() => { setFilterSymbol(""); setFilterType("all"); setFilterFrom(""); setFilterTo(""); }}
            className="flex items-center gap-1 px-3 py-2 rounded-lg border border-[#1a2240] text-slate-500 hover:text-slate-300 text-xs font-mono"
          >
            <X className="w-3 h-3" /> Limpiar
          </button>
        )}
      </div>

      {/* Table */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card-terminal overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-slate-500 font-mono text-sm animate-pulse">Cargando...</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-slate-600 font-mono text-sm">Sin transacciones para los filtros seleccionados.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#1a2240]">
                  {["FECHA", "TIPO", "SÍMBOLO", "ACCIONES", "PRECIO", "TOTAL", "P&L"].map(h => (
                    <th key={h} className="text-left text-slate-500 font-mono px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a2240]">
                {filtered.map(tx => {
                  const isBuy = tx.type === "buy";
                  const date = new Date(tx.executed_at || tx.created_date);
                  return (
                    <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3 font-mono text-slate-400 whitespace-nowrap">
                        {date.toLocaleDateString("es-MX")} {date.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`flex items-center gap-1 w-fit px-2 py-0.5 rounded text-[10px] font-mono font-bold ${isBuy ? "bg-[#00ff88]/10 text-[#00ff88]" : "bg-[#ff4757]/10 text-[#ff4757]"}`}>
                          {isBuy ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {isBuy ? "COMPRA" : "VENTA"}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-white">{tx.symbol}</td>
                      <td className="px-4 py-3 font-mono text-slate-300">{tx.shares?.toFixed(4)}</td>
                      <td className="px-4 py-3 font-mono text-slate-300">${fmt(tx.price)}</td>
                      <td className="px-4 py-3 font-mono text-white">${fmt(tx.total_amount)}</td>
                      <td className="px-4 py-3 font-mono">
                        {tx.realized_pnl != null ? (
                          <span className={tx.realized_pnl >= 0 ? "text-[#00ff88]" : "text-[#ff4757]"}>
                            {tx.realized_pnl >= 0 ? "+" : ""}${fmt(tx.realized_pnl)}
                          </span>
                        ) : <span className="text-slate-600">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
}