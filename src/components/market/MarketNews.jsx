import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { callFinnhub } from "@/components/shared/useFinnhub";
import { ExternalLink, Newspaper } from "lucide-react";

function timeAgo(ts) {
  const diff = Math.floor((Date.now() / 1000 - ts));
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

const SENTIMENT_LABEL = {
  positive: { label: "Positivo", color: "#00ff88" },
  negative: { label: "Negativo", color: "#ff4757" },
  neutral:  { label: "Neutro",   color: "#64748b" }
};

function NewsItem({ item }) {
  const sentiment = item.sentiment ? SENTIMENT_LABEL[item.sentiment] : null;
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block py-3.5 border-b border-[#1a2240] last:border-0 hover:bg-white/[0.02] transition-colors -mx-4 px-4 group"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-slate-200 leading-relaxed group-hover:text-white transition-colors flex-1">
          {item.headline}
        </p>
        <ExternalLink className="w-3.5 h-3.5 text-slate-600 flex-shrink-0 mt-1 group-hover:text-slate-400" />
      </div>
      <div className="flex items-center gap-3 mt-1.5">
        <span className="text-xs text-slate-500">{item.source}</span>
        <span className="text-xs text-slate-600">·</span>
        <span className="text-xs text-slate-600 font-mono">{timeAgo(item.datetime)}</span>
        {sentiment && (
          <>
            <span className="text-xs text-slate-600">·</span>
            <span className="text-xs font-mono font-bold" style={{ color: sentiment.color }}>
              {sentiment.label}
            </span>
          </>
        )}
      </div>
    </a>
  );
}

export default function MarketNews({ stocks, selectedSymbol }) {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterSymbol, setFilterSymbol] = useState("all");

  useEffect(() => {
    const loadNews = async () => {
      setLoading(true);
      if (filterSymbol === "all") {
        const data = await callFinnhub("market_news");
        setNews(data.news || []);
      } else {
        const data = await callFinnhub("news", { symbol: filterSymbol });
        setNews(data.news || []);
      }
      setLoading(false);
    };
    loadNews();
  }, [filterSymbol]);

  // Sync with selectedSymbol from parent
  useEffect(() => {
    if (selectedSymbol) setFilterSymbol(selectedSymbol);
  }, [selectedSymbol]);

  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="card-terminal p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Newspaper className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-semibold text-slate-200">Noticias del Mercado</span>
        </div>
        <select
          value={filterSymbol}
          onChange={e => setFilterSymbol(e.target.value)}
          className="bg-[#0b1022] border border-[#1a2240] rounded-lg px-2 py-1.5 text-xs font-mono text-slate-300 outline-none"
        >
          <option value="all">Todas</option>
          {stocks.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse space-y-2 py-3 border-b border-[#1a2240]">
              <div className="h-4 bg-[#1a2240] rounded w-full" />
              <div className="h-3 bg-[#1a2240] rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : news.length === 0 ? (
        <p className="text-slate-600 text-sm font-mono py-6 text-center">Sin noticias disponibles</p>
      ) : (
        news.map((item, i) => <NewsItem key={i} item={item} />)
      )}
    </motion.div>
  );
}