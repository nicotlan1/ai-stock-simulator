import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { callFinnhub } from "@/components/shared/useFinnhub";
import IndexCards from "@/components/market/IndexCards";
import { ArrowRight, TrendingUp, TrendingDown } from "lucide-react";

function fmt2(n) {
  return (n ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function MarketSummaryBar({ stocks }) {
  const [indices, setIndices] = useState([]);
  const [quotes, setQuotes] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [idxResult, qResult] = await Promise.allSettled([
        callFinnhub("indices"),
        stocks?.length ? callFinnhub("quotes", { symbols: stocks }) : Promise.resolve({ quotes: [] })
      ]);
      if (idxResult.status === "fulfilled") setIndices(idxResult.value?.indices || []);
      if (qResult.status === "fulfilled") {
        const map = {};
        (qResult.value?.quotes || []).forEach(q => { map[q.symbol] = q; });
        setQuotes(map);
      }
      setLoading(false);
    };
    load();
  }, []);

  const rows = (stocks || []).map(sym => quotes[sym]).filter(Boolean).filter(q => q.changePct != null);
  const sorted = [...rows].sort((a, b) => (b.changePct ?? 0) - (a.changePct ?? 0));
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];

  return (
    <div className="card-terminal p-5 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-slate-200">🌐 Resumen del Mercado</h2>
        <Link
          to={createPageUrl("Market")}
          className="flex items-center gap-1 text-xs font-mono text-[#00ff88] hover:text-[#00cc6a] transition-colors"
        >
          Ver mercado completo <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      <IndexCards indices={indices} loading={loading} compact />

      {!loading && (best || worst) && (
        <div className="flex flex-wrap gap-3 mt-4">
          {best && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#00ff88]/5 border border-[#00ff88]/20">
              <TrendingUp className="w-3.5 h-3.5 text-[#00ff88]" />
              <span className="text-xs font-mono text-slate-400">Mejor:</span>
              <span className="text-xs font-mono font-bold text-white">{best.symbol}</span>
              <span className="text-xs font-mono text-[#00ff88]">+{(best.changePct ?? 0).toFixed(2)}%</span>
            </div>
          )}
          {worst && worst.symbol !== best?.symbol && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#ff4757]/5 border border-[#ff4757]/20">
              <TrendingDown className="w-3.5 h-3.5 text-[#ff4757]" />
              <span className="text-xs font-mono text-slate-400">Peor:</span>
              <span className="text-xs font-mono font-bold text-white">{worst.symbol}</span>
              <span className="text-xs font-mono text-[#ff4757]">{(worst.changePct ?? 0).toFixed(2)}%</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}