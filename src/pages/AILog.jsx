import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import PageHeader from "@/components/shared/PageHeader";
import { Bot, ChevronDown, ChevronRight, ShoppingCart, TrendingDown, AlertTriangle } from "lucide-react";

function ScoreBar({ label, value, color }) {
  return (
    <div className="mb-2">
      <div className="flex justify-between text-xs font-mono mb-1">
        <span className="text-slate-400">{label}</span>
        <span style={{ color }}>{value ?? 0}/100</span>
      </div>
      <div className="h-1.5 rounded-full bg-[#1a2240] overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value ?? 0}%` }}
          transition={{ duration: 0.6 }}
          className="h-full rounded-full"
          style={{ background: color }}
        />
      </div>
    </div>
  );
}

function DecisionCard({ tx }) {
  const [open, setOpen] = useState(false);

  const isBuy = tx.type === "buy";
  const isStop = tx.ai_reasoning?.toLowerCase().includes("stop-loss");
  const icon = isStop ? AlertTriangle : isBuy ? ShoppingCart : TrendingDown;
  const Icon = icon;
  const color = isBuy ? "#00ff88" : "#ff4757";
  const label = isStop ? "STOP" : isBuy ? "COMPRA" : "VENTA";
  const date = new Date(tx.executed_at || tx.created_date);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-terminal overflow-hidden mb-3"
    >
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors text-left"
      >
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}15` }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded" style={{ background: `${color}15`, color }}>{label}</span>
            <span className="text-sm font-mono font-bold text-white">{tx.symbol}</span>
            {tx.realized_pnl != null && (
              <span className={`text-xs font-mono ${tx.realized_pnl >= 0 ? "text-[#00ff88]" : "text-[#ff4757]"}`}>
                {tx.realized_pnl >= 0 ? "+" : ""}${tx.realized_pnl.toFixed(2)}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 truncate">{tx.ai_reasoning?.split(".")[0]}</p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-[10px] font-mono text-slate-600">{date.toLocaleDateString("es-MX")}</span>
          {open ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-[#1a2240] pt-3 space-y-4">
              {/* Details row */}
              <div className="flex flex-wrap gap-4 text-xs font-mono">
                <span className="text-slate-400">Acciones: <span className="text-white">{tx.shares?.toFixed(4)}</span></span>
                <span className="text-slate-400">Precio: <span className="text-white">${tx.price?.toFixed(2)}</span></span>
                <span className="text-slate-400">Total: <span className="text-white">${tx.total_amount?.toFixed(2)}</span></span>
                <span className="text-slate-400">Hora: <span className="text-white">{date.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}</span></span>
              </div>

              {/* Full reasoning */}
              {tx.ai_reasoning && (
                <p className="text-xs text-slate-400 leading-relaxed bg-[#1a2240]/50 rounded-lg p-3">{tx.ai_reasoning}</p>
              )}

              {/* Score bars */}
              {(tx.score_technical != null || tx.score_sentiment != null || tx.score_final != null) && (
                <div className="space-y-1">
                  <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-2">Puntajes de Análisis</p>
                  <ScoreBar label="Técnico" value={tx.score_technical} color="#3b82f6" />
                  <ScoreBar label="Sentimiento" value={tx.score_sentiment} color="#a78bfa" />
                  <ScoreBar label="Puntaje Final" value={tx.score_final} color="#00ff88" />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function AILog() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Transaction.list("-executed_at", 100).then(txs => {
      setTransactions(txs || []);
      setLoading(false);
    });
  }, []);

  return (
    <div>
      <PageHeader title="Decisiones IA" subtitle="Registro completo de cada operación" />

      {loading ? (
        <div className="flex justify-center py-20 text-slate-500 font-mono text-sm animate-pulse">Cargando...</div>
      ) : transactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Bot className="w-12 h-12 text-[#00ff88]/30 mb-4" />
          <p className="text-slate-400">🤖 La IA está analizando el mercado...</p>
          <p className="text-slate-600 text-sm mt-1">Las decisiones aparecerán aquí cuando la IA opere.</p>
        </div>
      ) : (
        <div>
          {transactions.map(tx => <DecisionCard key={tx.id} tx={tx} />)}
        </div>
      )}
    </div>
  );
}