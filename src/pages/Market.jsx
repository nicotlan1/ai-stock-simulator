import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { callFinnhub, useMarketStatus, useQuotes, getStocksForRisk, STOCK_LISTS } from "@/components/shared/useFinnhub";
import PageHeader from "@/components/shared/PageHeader";
import IndexCards from "@/components/market/IndexCards";
import WinnersLosers from "@/components/market/WinnersLosers";
import StockChart from "@/components/market/StockChart";
import MarketNews from "@/components/market/MarketNews";

export default function Market() {
  const [indices, setIndices] = useState([]);
  const [indicesLoading, setIndicesLoading] = useState(true);
  const [config, setConfig] = useState(null);
  const [holdings, setHoldings] = useState([]);
  const [selectedSymbol, setSelectedSymbol] = useState(null);

  const { open: marketOpen } = useMarketStatus();

  // Load config + holdings
  useEffect(() => {
    Promise.all([
      base44.entities.UserConfig.list("-created_date", 1),
      base44.entities.Holding.list()
    ]).then(([configs, hs]) => {
      setConfig(configs[0] || null);
      setHoldings(hs || []);
    });
  }, []);

  const stocks = config ? getStocksForRisk(config.risk_level) : STOCK_LISTS.moderate;

  // Load indices
  const loadIndices = useCallback(async () => {
    setIndicesLoading(true);
    const data = await callFinnhub("indices");
    setIndices(data.indices || []);
    setIndicesLoading(false);
  }, []);

  useEffect(() => { loadIndices(); }, [loadIndices]);

  useEffect(() => {
    if (!marketOpen) return;
    const id = setInterval(loadIndices, 60000);
    return () => clearInterval(id);
  }, [marketOpen, loadIndices]);

  // Quotes for all stocks
  const { quotes, loading: quotesLoading } = useQuotes(stocks);

  // Default selected symbol
  useEffect(() => {
    if (!selectedSymbol && stocks.length > 0) setSelectedSymbol(stocks[0]);
  }, [stocks]);

  const selectedQuote = quotes[selectedSymbol];
  const aiHolding = holdings.find(h => h.symbol === selectedSymbol) || null;

  return (
    <div>
      <PageHeader
        title="🌐 Mercado"
        subtitle="Estado actual del mercado en tiempo real"
      />

      {/* BLOQUE 1 — Índices */}
      <section className="mb-6">
        <p className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-3">Índices Principales</p>
        <IndexCards indices={indices} loading={indicesLoading} />
      </section>

      {/* BLOQUE 2 — Ganadoras y Perdedoras */}
      <section className="mb-6">
        <p className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-3">Ganadoras y Perdedoras del Día</p>
        <WinnersLosers quotes={quotes} stocks={stocks} loading={quotesLoading} />
      </section>

      {/* BLOQUE 3 — Gráfica */}
      <section className="mb-6">
        <p className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-3">Análisis de Acción</p>
        <div className="card-terminal p-5">
          {/* Stock selector */}
          <div className="flex flex-wrap gap-2 mb-5">
            {stocks.map(sym => (
              <button
                key={sym}
                onClick={() => setSelectedSymbol(sym)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                  selectedSymbol === sym
                    ? "bg-[#00ff88]/10 border border-[#00ff88]/30 text-[#00ff88]"
                    : "border border-[#1a2240] text-slate-500 hover:text-slate-300"
                }`}
              >
                {sym}
              </button>
            ))}
          </div>
          {selectedSymbol && (
            <StockChart
              symbol={selectedSymbol}
              quote={selectedQuote}
              aiHolding={aiHolding}
            />
          )}
        </div>
      </section>

      {/* BLOQUE 4 — Noticias */}
      <section>
        <p className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-3">Noticias del Mercado</p>
        <MarketNews stocks={stocks} selectedSymbol={null} />
      </section>
    </div>
  );
}