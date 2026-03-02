import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";

export const STOCK_LISTS = {
  conservative:     ["AAPL", "MSFT", "GOOGL", "AMZN", "JPM", "JNJ", "V", "PG"],
  moderate:         ["AAPL", "MSFT", "NVDA", "TSLA", "AMZN", "GOOGL", "META", "AMD"],
  aggressive:       ["NVDA", "TSLA", "AMD", "COIN", "PLTR", "MSTR", "SMCI", "META", "AMZN", "MSFT"],
  ultra_aggressive: ["NVDA", "TSLA", "COIN", "PLTR", "MSTR", "SMCI", "AMD", "RIVN", "SOUN", "RKLB"]
};

export function getStocksForRisk(riskLevel) {
  return STOCK_LISTS[riskLevel] || STOCK_LISTS.moderate;
}

export async function callFinnhub(action, params = {}) {
  const response = await base44.functions.invoke("finnhub", { action, ...params });
  return response.data;
}

// FIX: market_status y spy independientes — SPY no bloquea el status
export function useMarketStatus() {
  const [status, setStatus] = useState({ open: null, spy: null, loading: true, error: false });

  const fetchData = useCallback(async () => {
    try {
      const [marketResult, spyResult] = await Promise.allSettled([
        callFinnhub("market_status"),
        callFinnhub("spy")
      ]);

      const market = marketResult.status === "fulfilled" ? marketResult.value : null;
      const spy    = spyResult.status    === "fulfilled" ? spyResult.value    : null;

      setStatus({
        open:    market?.open ?? false,
        spy:     spy || null,
        loading: false,
        error:   marketResult.status === "rejected"
      });
    } catch {
      setStatus(prev => ({ ...prev, loading: false, error: true }));
    }
  }, []);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 60000);
    return () => clearInterval(id);
  }, [fetchData]);

  return status;
}

export function useQuotes(symbols) {
  const [quotes, setQuotes]   = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  const key = (symbols || []).join(",");

  const fetchData = useCallback(async () => {
    if (!symbols || symbols.length === 0) return;
    try {
      const data = await callFinnhub("quotes", { symbols });
      const map = {};
      (data.quotes || []).forEach(q => { map[q.symbol] = q; });
      setQuotes(map);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [key]);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 60000);
    return () => clearInterval(id);
  }, [fetchData]);

  return { quotes, loading, error, refetch: fetchData };
}