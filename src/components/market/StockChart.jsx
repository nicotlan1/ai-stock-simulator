import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { callFinnhub } from "@/components/shared/useFinnhub";
import { Bot, TrendingUp, TrendingDown, BarChart2 } from "lucide-react";

function fmt2(n) {
  return (n ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function StockChart({ symbol, quote: quoteProp, aiHolding }) {
  const [quote, setQuote] = useState(quoteProp || null);
  const [loading, setLoading] = useState(!quoteProp);

  useEffect(() => {
    if (quoteProp) { setQuote(quoteProp); setLoading(false); return; }
    if (!symbol) return;
    setLoading(true);
    callFinnhub("quote", { symbol })
      .then(data => setQuote(data))
      .catch(() => setQuote(null))
      .finally(() => setLoading(false));
  }, [symbol, quoteProp]);

  const up = (quote?.changePct ?? 0) >= 0;
  const priceColor = up ? "#00ff88" : "#ff4757";

  return (
    <div>
      {/* Aviso plan gratuito */}
      <div className="card-terminal p-4 mb-4 flex flex-col items-center justify-center gap-2 min-h-[200px]">
        <BarChart2 className="w-8 h-8 text-slate-600" />
        <p className="text-slate-500 font-mono text-sm text-center">
          Historial no disponible en plan gratuito
        </p>
        <p className="text-slate-600 font-mono text-xs text-center">
          Solo se muestra el precio actual del día
        </p>
      </div>

      {/* Stats del día */}
      {loading ? (
        <div className="card-terminal p-4 h-[80px] flex items-center justify-center text-slate-600 font-mono text-sm animate-pulse">
          Cargando cotización...
        </div>
      ) : quote ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
          {[
            { label: "Precio", value: `$${fmt2(quote.price)}`, color: priceColor },
            { label: "Cambio $", value: `${up ? "+" : ""}$${fmt2(quote.change)}`, color: priceColor },
            { label: "Cambio %", value: `${up ? "+" : ""}${(quote.changePct ?? 0).toFixed(2)}%`, color: priceColor },
            { label: "Cierre anterior", value: `$${fmt2(quote.prevClose)}`, color: "#64748b" },
          ].map(s => (
            <div key={s.label} className="card-terminal p-3 text-center">
              <p className="text-xs text-slate-500 font-mono mb-1">{s.label}</p>
              <p className="text-sm font-mono font-bold" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="card-terminal p-4 text-center text-slate-600 font-mono text-sm">
          No se pudo obtener la cotización
        </div>
      )}

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