import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import PageHeader from "@/components/shared/PageHeader";
import {
  Wallet as WalletIcon,
  ArrowUpRight,
  ArrowDownRight,
  Send,
  Download,
  Lock,
  Unlock,
  DollarSign
} from "lucide-react";

function BalanceCard({ label, value, subtitle, icon: Icon, color, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="card-terminal p-6 relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-5" style={{ background: color, transform: "translate(30%, -30%)" }} />
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}15` }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        <span className="text-xs text-slate-500 uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-3xl font-mono font-bold text-white mb-1">{value}</p>
      {subtitle && <p className="text-xs text-slate-500 font-mono">{subtitle}</p>}
    </motion.div>
  );
}

function ActionButton({ label, icon: Icon, color, onClick }) {
  return (
    <button
      onClick={onClick}
      className="card-terminal p-4 flex flex-col items-center gap-2 hover:border-slate-600 transition-all group"
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors"
        style={{ background: `${color}10` }}>
        <Icon className="w-5 h-5 transition-colors" style={{ color }} />
      </div>
      <span className="text-xs text-slate-400 group-hover:text-slate-200 transition-colors">{label}</span>
    </button>
  );
}

export default function Wallet() {
  const [config, setConfig] = useState({ initialCapital: 10000 });

  useEffect(() => {
    const saved = localStorage.getItem("ai_stock_config");
    if (saved) setConfig(JSON.parse(saved));
  }, []);

  const recentTx = [
    { type: "deposit", label: "Depósito inicial", amount: config.initialCapital, date: "Hoy" },
  ];

  return (
    <div>
      <PageHeader title="Billetera" subtitle="Controla tu capital virtual" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <BalanceCard
          label="Balance Total"
          value={`$${config.initialCapital.toLocaleString()}`}
          subtitle="100% disponible"
          icon={WalletIcon}
          color="#00ff88"
          delay={0}
        />
        <BalanceCard
          label="Asignado a IA"
          value="$0.00"
          subtitle="0% del balance"
          icon={Send}
          color="#3b82f6"
          delay={0.05}
        />
        <BalanceCard
          label="Reserva Personal"
          value={`$${config.initialCapital.toLocaleString()}`}
          subtitle="Sin comprometer"
          icon={Lock}
          color="#fbbf24"
          delay={0.1}
        />
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="mb-6"
      >
        <h3 className="text-sm font-semibold text-slate-300 mb-3">Acciones Rápidas</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <ActionButton label="Asignar a IA" icon={Send} color="#00ff88" />
          <ActionButton label="Retirar de IA" icon={Download} color="#ff4757" />
          <ActionButton label="Depositar" icon={ArrowDownRight} color="#3b82f6" />
          <ActionButton label="Retirar" icon={ArrowUpRight} color="#fbbf24" />
        </div>
      </motion.div>

      {/* Recent */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="card-terminal p-5"
      >
        <h3 className="text-sm font-semibold text-slate-200 mb-4">Movimientos Recientes</h3>
        {recentTx.map((tx, i) => (
          <div key={i} className="flex items-center justify-between py-3 border-b border-[#1a2240] last:border-0">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                tx.type === "deposit" ? "bg-[#00ff88]/10" : "bg-[#ff4757]/10"
              }`}>
                {tx.type === "deposit"
                  ? <ArrowDownRight className="w-4 h-4 text-[#00ff88]" />
                  : <ArrowUpRight className="w-4 h-4 text-[#ff4757]" />
                }
              </div>
              <div>
                <p className="text-sm text-slate-200">{tx.label}</p>
                <p className="text-[10px] text-slate-500 font-mono">{tx.date}</p>
              </div>
            </div>
            <span className={`text-sm font-mono font-bold ${
              tx.type === "deposit" ? "text-[#00ff88]" : "text-[#ff4757]"
            }`}>
              {tx.type === "deposit" ? "+" : "-"}${tx.amount.toLocaleString()}
            </span>
          </div>
        ))}
      </motion.div>
    </div>
  );
}