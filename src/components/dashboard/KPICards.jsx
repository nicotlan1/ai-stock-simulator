import React from "react";
import { motion } from "framer-motion";
import { DollarSign, TrendingUp, TrendingDown, Briefcase, Target, Wallet } from "lucide-react";

function fmt(n) {
  return (n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function KPICard({ label, children, delay, icon: Icon, iconColor }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="card-terminal p-5"
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-slate-500 font-mono uppercase tracking-wide">{label}</p>
        <Icon className="w-4 h-4" style={{ color: iconColor || "#475569" }} />
      </div>
      {children}
    </motion.div>
  );
}

export default function KPICards({ wallet, config, holdings, onDeposit, onSendToAI }) {
  const portfolioValue = (holdings || []).reduce((s, h) => s + (h.current_value || 0), 0);
  const liquidCash = wallet?.liquid_cash || 0;
  const currentAIValue = portfolioValue + liquidCash;
  const initialCapital = config?.initial_capital || 0;
  
  const totalPnl = currentAIValue - initialCapital;
  const totalPnlPct = initialCapital > 0 ? (totalPnl / initialCapital) * 100 : 0;
  
  const goalAmount = config?.goal_amount || 0;
  const progressPct = (goalAmount > 0 && goalAmount > initialCapital)
    ? Math.min(100, Math.max(0,
        ((currentAIValue - initialCapital) / (goalAmount - initialCapital)) * 100
      ))
    : 0;
  
  const freeBalance = wallet?.free_balance || 0;
  const invested = wallet?.ai_capital || 0;
  const netWorth = freeBalance + currentAIValue;

  const isPositive = totalPnl >= 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 mb-6">
      {/* 1. Patrimonio neto */}
      <KPICard label="Patrimonio Neto" icon={DollarSign} iconColor="#00ff88" delay={0}>
        <p className="text-2xl font-mono font-bold text-white">${fmt(netWorth)}</p>
        <p className="text-xs text-slate-500 mt-1 font-mono">billetera + portafolio</p>
      </KPICard>

      {/* 2. P&L total */}
      <KPICard label="Ganancia / Pérdida" icon={isPositive ? TrendingUp : TrendingDown} iconColor={isPositive ? "#00ff88" : "#ff4757"} delay={0.05}>
        <p className={`text-2xl font-mono font-bold ${isPositive ? "text-[#00ff88]" : "text-[#ff4757]"}`}>
          {isPositive ? "+" : ""}${fmt(totalPnl)}
        </p>
        <p className={`text-xs mt-1 font-mono ${isPositive ? "text-[#00ff88]/70" : "text-[#ff4757]/70"}`}>
          {isPositive ? "+" : ""}{totalPnlPct.toFixed(2)}%
        </p>
      </KPICard>

      {/* 3. Saldo libre */}
      <KPICard label="Saldo Libre" icon={Wallet} iconColor="#3b82f6" delay={0.1}>
        <p className="text-2xl font-mono font-bold text-white">${fmt(freeBalance)}</p>
        <div className="flex gap-2 mt-3">
          <button
            onClick={onDeposit}
            className="flex-1 py-1.5 rounded-lg bg-[#00ff88]/10 border border-[#00ff88]/20 text-[#00ff88] text-xs font-mono hover:bg-[#00ff88]/20 transition-colors"
          >
            Depositar
          </button>
          <button
            onClick={onSendToAI}
            className="flex-1 py-1.5 rounded-lg bg-[#3b82f6]/10 border border-[#3b82f6]/20 text-[#3b82f6] text-xs font-mono hover:bg-[#3b82f6]/20 transition-colors"
          >
            Enviar a IA
          </button>
        </div>
      </KPICard>

      {/* 4. Capital invertido */}
      <KPICard label="Capital Invertido" icon={Briefcase} iconColor="#fbbf24" delay={0.15}>
        <p className="text-2xl font-mono font-bold text-white">${fmt(invested)}</p>
        <p className="text-xs text-slate-500 mt-1 font-mono">
          {portfolioValue > 0 ? `Valor actual: $${fmt(portfolioValue)}` : "Sin posiciones abiertas"}
        </p>
      </KPICard>

      {/* 5. Progreso meta */}
      <KPICard label="Progreso Meta" icon={Target} iconColor="#a78bfa" delay={0.2}>
        <p className="text-2xl font-mono font-bold text-white">{progressPct.toFixed(1)}%</p>
        <div className="mt-2 h-1.5 rounded-full bg-[#1a2240] overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 1, delay: 0.5 }}
            className="h-full rounded-full bg-gradient-to-r from-[#a78bfa] to-[#7c3aed]"
          />
        </div>
        <p className="text-[10px] text-slate-500 mt-1 font-mono">
          ${fmt(currentAIValue)} / ${fmt(goalAmount)}
        </p>
      </KPICard>
    </div>
  );
}