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
  const [config, setConfig] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [holdings, setHoldings] = useState([]);
  const [snapshots, setSnapshots] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [activeAction, setActiveAction] = useState(null);
  const [loading, setLoading] = useState(true);

  const { open: marketOpen } = useMarketStatus();

  // Load all data
  const loadData = useCallback(async () => {
    const [configs, wallets, holdingsList, snapshotList, alertList] = await Promise.all([
      base44.entities.UserConfig.list("-created_date", 1),
      base44.entities.Wallet.list("-created_date", 1),
      base44.entities.Holding.list(),
      base44.entities.PerformanceSnapshot.list("-timestamp", 50),
      base44.entities.Alert.list("-created_date", 5)
    ]);
    setConfig(configs[0] || null);
    setWallet(wallets[0] || null);
    setHoldings(holdingsList || []);
    setSnapshots(snapshotList || []);
    setAlerts(alertList || []);
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

  // Wallet action handler
  const handleWalletAction = async (action, amount) => {
    if (!wallet) return;
    const updates = {};
    let movementType = action;

    if (action === "deposit") {
      updates.free_balance = (wallet.free_balance || 0) + amount;
    } else if (action === "send_to_ai") {
      if (amount > wallet.free_balance) return;
      updates.free_balance = (wallet.free_balance || 0) - amount;
      updates.ai_capital = (wallet.ai_capital || 0) + amount;
      updates.liquid_cash = (wallet.liquid_cash || 0) + amount;
    } else if (action === "withdraw_from_ai") {
      if (amount > wallet.liquid_cash) return;
      updates.free_balance = (wallet.free_balance || 0) + amount;
      updates.liquid_cash = (wallet.liquid_cash || 0) - amount;
      updates.ai_capital = Math.max(0, (wallet.ai_capital || 0) - amount);
    }

    await base44.entities.Wallet.update(wallet.id, updates);
    await base44.entities.WalletMovement.create({
      type: movementType,
      amount,
      resulting_balance: updates.free_balance ?? wallet.free_balance
    });

    // If sending to AI for the first time, mark initial_investment_pending
    if (action === "send_to_ai" && config && config.initial_investment_pending) {
      // Already pending, AI engine will pick it up on next run
    }

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