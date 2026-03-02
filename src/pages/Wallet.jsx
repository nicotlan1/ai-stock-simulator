import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import ActionPanel from "@/components/wallet/ActionPanel";
import {
  WalletIcon, Send, ArrowDownLeft, PlusCircle,
  TrendingUp, ArrowDownRight, ArrowUpRight, RefreshCw, Banknote
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

function fmt(n) {
  return Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function MetricCard({ label, value, icon: Icon, color, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="card-terminal p-5 relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-28 h-28 rounded-full opacity-5 pointer-events-none"
        style={{ background: color, transform: "translate(30%,-30%)" }} />
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${color}15` }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        <span className="text-xs text-slate-500 uppercase tracking-wider font-mono">{label}</span>
      </div>
      <p className="text-2xl font-mono font-bold text-white">${fmt(value)}</p>
    </motion.div>
  );
}

const TX_CONFIG = {
  deposit:          { label: "Depósito",      color: "#00ff88", sign: "+", Icon: ArrowDownRight },
  send_to_ai:       { label: "Enviado a IA",  color: "#3b82f6", sign: "−", Icon: Send },
  withdraw_from_ai: { label: "Retiro de IA",  color: "#fbbf24", sign: "+", Icon: ArrowDownLeft },
  withdraw:         { label: "Retiro",        color: "#ff4757", sign: "−", Icon: ArrowUpRight }
};

export default function Wallet() {
  const [wallet, setWallet]             = useState(null);
  const [movements, setMovements]       = useState([]);
  const [activeAction, setActiveAction] = useState(null);
  const [loading, setLoading]           = useState(true);

  const loadData = useCallback(async () => {
    const [wallets, movs] = await Promise.all([
      base44.entities.Wallet.list(),
      base44.entities.WalletMovement.list()
    ]);
    setWallet(wallets[0] || null);
    setMovements(
      (movs || [])
        .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
        .slice(0, 50)
    );
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const totalWithdrawn = movements
    .filter(m => m.type === "withdraw")
    .reduce((acc, m) => acc + (m.amount || 0), 0);

  // FIX: campos correctos del schema
  const netWorth = wallet?.net_worth ||
    ((wallet?.free_balance || 0) + (wallet?.ai_capital || 0));

  const handleConfirm = async (action, amount) => {
    if (!wallet) return;
    const updates = {};
    let resulting = 0;

    if (action === "deposit") {
      updates.free_balance = (wallet.free_balance || 0) + amount;
      updates.net_worth    = (wallet.net_worth    || 0) + amount;
      resulting = updates.free_balance;

    } else if (action === "send_to_ai") {
      if (amount > (wallet.free_balance || 0)) return;
      updates.free_balance = (wallet.free_balance || 0) - amount;
      updates.ai_capital   = (wallet.ai_capital   || 0) + amount;
      updates.liquid_cash  = (wallet.liquid_cash  || 0) + amount;
      resulting = updates.free_balance;

    } else if (action === "withdraw_from_ai") {
      if (amount > (wallet.liquid_cash || 0)) return;
      updates.free_balance = (wallet.free_balance || 0) + amount;
      updates.liquid_cash  = (wallet.liquid_cash  || 0) - amount;
      updates.ai_capital   = Math.max(0, (wallet.ai_capital || 0) - amount);
      resulting = updates.free_balance;
    }

    await Promise.all([
      base44.entities.Wallet.update(wallet.id, updates),
      base44.entities.WalletMovement.create({
        type:              action,
        amount,
        resulting_balance: resulting,
        notes:             ""
      })
    ]);

    setActiveAction(null);
    await loadData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="w-5 h-5 text-[#00ff88] animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Billetera Virtual" subtitle="Controla tu capital simulado" />

      {/* FIX: free_balance en lugar de wallet_balance */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard label="Saldo Libre"         value={wallet?.free_balance} icon={WalletIcon}  color="#00ff88" delay={0}    />
        <MetricCard label="Capital en la IA"    value={wallet?.ai_capital}   icon={TrendingUp}  color="#3b82f6" delay={0.05} />
        <MetricCard label="Ganancias Retiradas" value={totalWithdrawn}       icon={Banknote}    color="#fbbf24" delay={0.1}  />
        <MetricCard label="Patrimonio Neto"     value={netWorth}             icon={PlusCircle}  color="#a78bfa" delay={0.15} />
      </div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }} className="mb-6">
        <h3 className="text-sm font-semibold text-slate-300 mb-3 font-mono uppercase tracking-wider">Acciones</h3>
        <div className="grid grid-cols-3 gap-3">
          {[
            { key: "deposit",          label: "Depositar",     color: "#00ff88", Icon: ArrowDownRight },
            { key: "send_to_ai",       label: "Enviar a IA",   color: "#3b82f6", Icon: Send },
            { key: "withdraw_from_ai", label: "Retirar de IA", color: "#fbbf24", Icon: ArrowDownLeft }
          ].map(({ key, label, color, Icon }) => (
            <button key={key} onClick={() => setActiveAction(key)}
              className="card-terminal p-4 flex flex-col items-center gap-2 hover:border-slate-600 transition-all group">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}12` }}>
                <Icon className="w-5 h-5" style={{ color }} />
              </div>
              <span className="text-xs text-slate-400 group-hover:text-slate-200 transition-colors">{label}</span>
            </button>
          ))}
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25 }} className="card-terminal overflow-hidden">
        <div className="p-5 border-b border-[#1a2240]">
          <h3 className="text-sm font-semibold text-slate-200 font-mono uppercase tracking-wider">Historial de Movimientos</h3>
        </div>
        {movements.length === 0 ? (
          <div className="p-10 text-center text-slate-500 text-sm">Sin movimientos aún</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1a2240]">
                  {["Fecha", "Tipo", "Monto", "Saldo Resultante"].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs text-slate-500 font-mono uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {movements.map((m, i) => {
                  const tx = TX_CONFIG[m.type] || TX_CONFIG.deposit;
                  const TxIcon = tx.Icon;
                  return (
                    <tr key={m.id || i} className="border-b border-[#1a2240] last:border-0 hover:bg-[#ffffff04] transition-colors">
                      <td className="px-5 py-4 text-xs text-slate-400 font-mono whitespace-nowrap">
                        {m.created_date
                          ? format(new Date(m.created_date), "dd MMM yyyy, HH:mm", { locale: es })
                          : "—"}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ background: `${tx.color}15` }}>
                            <TxIcon className="w-3.5 h-3.5" style={{ color: tx.color }} />
                          </div>
                          <span className="text-sm text-slate-300">{tx.label}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm font-mono font-bold whitespace-nowrap" style={{ color: tx.color }}>
                        {tx.sign}${fmt(m.amount)}
                      </td>
                      <td className="px-5 py-4 text-sm font-mono text-slate-300 whitespace-nowrap">
                        {m.resulting_balance != null ? `$${fmt(m.resulting_balance)}` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {activeAction && (
        <ActionPanel
          action={activeAction}
          wallet={wallet}
          onConfirm={handleConfirm}
          onClose={() => setActiveAction(null)}
        />
      )}
    </div>
  );
}