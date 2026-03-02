import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useMarketStatus, useQuotes } from "@/components/shared/useFinnhub";

import DashboardHeader from "@/components/dashboard/DashboardHeader";
import KPICards from "@/components/dashboard/KPICards";
import PositionsTable from "@/components/dashboard/PositionsTable";
import PortfolioChart from "@/components/dashboard/PortfolioChart";
import RecentAlerts from "@/components/dashboard/RecentAlerts";
import ActionPanel from "@/components/wallet/ActionPanel";
import MarketSummaryBar from "@/components/dashboard/MarketSummaryBar";
import { getStocksForRisk } from "@/components/shared/useFinnhub";

export default function Dashboard() {
  const [config, setConfig]       = useState(null);
  const [wallet, setWallet]       = useState(null);
  const [holdings, setHoldings]   = useState([]);
  const [snapshots, setSnapshots] = useState([]);
  const [alerts, setAlerts]       = useState([]);
  const [activeAction, setActiveAction] = useState(null);
  const [loading, setLoading]     = useState(true);

  const { open: marketOpen } = useMarketStatus();

  // FIX: .list() sin parámetros posicionales incorrectos
  // Ordenar y limitar en JS después
  const loadData = useCallback(async () => {
    const [configs, wallets, holdingsList, snapshotList, alertList] = await Promise.all([
      base44.entities.UserConfig.list(),
      base44.entities.Wallet.list(),
      base44.entities.Holding.list(),
      base44.entities.PerformanceSnapshot.list(),
      base44.entities.Alert.list()
    ]);

    setConfig(configs[0] || null);
    setWallet(wallets[0] || null);
    setHoldings(holdingsList || []);

    // FIX: ordenar y limitar snapshots en JS
    setSnapshots(
      (snapshotList || [])
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
        .slice(-50)
    );

    // FIX: ordenar alertas por fecha y tomar las 5 más recientes
    setAlerts(
      (alertList || [])
        .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
        .slice(0, 5)
    );

    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Refresh every 60s when market is open
  useEffect(() => {
    if (!marketOpen) return;
    const id = setInterval(loadData, 60000);
    return () => clearInterval(id);
  }, [marketOpen, loadData]);

  // Live quotes for held symbols
  const symbols = holdings.map(h => h.symbol);
  const { quotes } = useQuotes(symbols.length > 0 ? symbols : null);

  // FIX: lógica de wallet corregida con campos correctos del schema
  const handleWalletAction = async (action, amount) => {
    if (!wallet) return;
    const updates = {};

    if (action === "deposit") {
      // Depositar agrega a wallet_balance y aumenta net worth
      updates.wallet_balance  = (wallet.wallet_balance  || 0) + amount;
      updates.total_net_worth = (wallet.total_net_worth || 0) + amount;

    } else if (action === "send_to_ai") {
      // Enviar a IA mueve de wallet_balance a ai_capital + liquid_cash
      if (amount > (wallet.wallet_balance || 0)) return;
      updates.wallet_balance = (wallet.wallet_balance || 0) - amount;
      updates.ai_capital     = (wallet.ai_capital     || 0) + amount;
      updates.liquid_cash    = (wallet.liquid_cash    || 0) + amount;
      // Marcar pending para que aiEngine invierta en el próximo ciclo
      if (config) {
        await base44.entities.UserConfig.update(config.id, {
          initial_investment_pending: true
        });
      }

    } else if (action === "withdraw_from_ai") {
      // Retirar solo permite sacar del liquid_cash (posiciones ya cerradas)
      if (amount > (wallet.liquid_cash || 0)) return;
      updates.wallet_balance = (wallet.wallet_balance || 0) + amount;
      updates.liquid_cash    = (wallet.liquid_cash    || 0) - amount;
      updates.ai_capital     = Math.max(0, (wallet.ai_capital || 0) - amount);
    }

    await base44.entities.Wallet.update(wallet.id, updates);

    // FIX: resulting_balance usa wallet_balance correcto
    await base44.entities.WalletMovement.create({
      type:              action,
      amount,
      resulting_balance: updates.wallet_balance ?? wallet.wallet_balance ?? 0
    });

    setActiveAction(null);
    loadData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-slate-500 font-mono text-sm animate-pulse">Cargando datos...</div>
      </div>
    );
  }

  return (
    <div>
      <DashboardHeader config={config} />
      <KPICards
        wallet={wallet}
        config={config}
        holdings={holdings}
        onDeposit={() => setActiveAction("deposit")}
        onSendToAI={() => setActiveAction("send_to_ai")}
      />
      <PositionsTable holdings={holdings} quotes={quotes} />
      <MarketSummaryBar stocks={config ? getStocksForRisk(config.risk_level) : []} />
      <PortfolioChart snapshots={snapshots} />
      <RecentAlerts alerts={alerts} />

      {activeAction && (
        <ActionPanel
          action={activeAction}
          wallet={wallet}
          onConfirm={handleWalletAction}
          onClose={() => setActiveAction(null)}
        />
      )}
    </div>
  );
}