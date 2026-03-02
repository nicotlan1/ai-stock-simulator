import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import PageHeader from "@/components/shared/PageHeader";
import { base44 } from "@/api/base44Client";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  Bot,
  Briefcase,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Clock
} from "lucide-react";

function StatCard({ label, value, change, positive, icon: Icon, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="card-terminal p-5 relative overflow-hidden"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center">
          <Icon className="w-4 h-4 text-slate-400" />
        </div>
        {change !== undefined && (
          <span
            className={`text-xs font-mono flex items-center gap-1 ${
              positive ? "text-[#00ff88]" : "text-[#ff4757]"
            }`}
          >
            {positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {change}
          </span>
        )}
      </div>
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className="text-xl font-mono font-bold text-white">{value}</p>
    </motion.div>
  );
}

function QuickPortfolio({ delay }) {
  const holdings = [
    { symbol: "AAPL", name: "Apple Inc.", shares: 15, price: 189.84, change: +2.34 },
    { symbol: "NVDA", name: "NVIDIA Corp.", shares: 8, price: 721.28, change: +15.67 },
    { symbol: "MSFT", name: "Microsoft Corp.", shares: 10, price: 415.56, change: -3.21 },
    { symbol: "TSLA", name: "Tesla Inc.", shares: 12, price: 248.42, change: +8.92 },
    { symbol: "AMZN", name: "Amazon.com", shares: 6, price: 178.25, change: -1.45 },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="card-terminal p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-200">Portafolio Activo</h3>
        <Briefcase className="w-4 h-4 text-slate-500" />
      </div>
      <div className="space-y-3">
        {holdings.map((h) => (
          <div key={h.symbol} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                <span className="text-[10px] font-mono font-bold text-slate-300">{h.symbol.slice(0, 2)}</span>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-200">{h.symbol}</p>
                <p className="text-[10px] text-slate-500">{h.shares} acciones</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-mono text-white">${h.price.toFixed(2)}</p>
              <p className={`text-[10px] font-mono ${h.change >= 0 ? "text-[#00ff88]" : "text-[#ff4757]"}`}>
                {h.change >= 0 ? "+" : ""}{h.change.toFixed(2)}%
              </p>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function RecentDecisions({ delay }) {
  const decisions = [
    { action: "COMPRA", symbol: "NVDA", reason: "Momentum alcista fuerte, RSI favorable", time: "Hace 2h" },
    { action: "VENTA", symbol: "META", reason: "Toma de ganancias, +12.5% alcanzado", time: "Hace 5h" },
    { action: "COMPRA", symbol: "TSLA", reason: "Soporte técnico confirmado en $240", time: "Hace 8h" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="card-terminal p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-200">Últimas Decisiones IA</h3>
        <Bot className="w-4 h-4 text-[#00ff88]" />
      </div>
      <div className="space-y-3">
        {decisions.map((d, i) => (
          <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.02]">
            <div className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
              d.action === "COMPRA" ? "bg-[#00ff88]/10 text-[#00ff88]" : "bg-[#ff4757]/10 text-[#ff4757]"
            }`}>
              {d.action}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-200 font-medium">{d.symbol}</p>
              <p className="text-xs text-slate-500 truncate">{d.reason}</p>
            </div>
            <span className="text-[10px] text-slate-600 font-mono whitespace-nowrap">{d.time}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function MarketClosedBanner() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#fbbf24]/10 border border-[#fbbf24]/20 mb-5"
    >
      <Clock className="w-4 h-4 text-[#fbbf24] flex-shrink-0" />
      <p className="text-sm text-[#fbbf24] font-mono">
        ⏳ Mercado cerrado. La IA desplegará tu capital el próximo día hábil a las 9:31am EST.
      </p>
    </motion.div>
  );
}

export default function Dashboard() {
  const [config, setConfig] = useState({ initialCapital: 10000, goal: 50000 });
  const [showMarketClosed, setShowMarketClosed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("ai_stock_config");
    if (saved) setConfig(JSON.parse(saved));
  }, []);

  // Check if initial investment is pending + market is closed → show banner
  useEffect(() => {
    async function checkPending() {
      try {
        const result = await base44.functions.invoke("aiEngine", {});
        if (result?.data?.skipped && result?.data?.reason === "Market is closed" && result?.data?.initial_pending) {
          setShowMarketClosed(true);
        }
      } catch {}
    }
    checkPending();
  }, []);

  return (
    <div>
      {showMarketClosed && <MarketClosedBanner />}
      <PageHeader
        title="Dashboard"
        subtitle="Vista general de tu simulación"
        rightContent={
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#00ff88]/10 border border-[#00ff88]/20">
            <span className="w-2 h-2 rounded-full bg-[#00ff88] pulse-dot" />
            <span className="text-xs font-mono text-[#00ff88]">IA ACTIVA</span>
          </div>
        }
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Capital Total"
          value={`$${config.initialCapital.toLocaleString()}`}
          change="+0.00%"
          positive
          icon={DollarSign}
          delay={0}
        />
        <StatCard
          label="En Inversiones"
          value="$0.00"
          icon={Briefcase}
          delay={0.05}
        />
        <StatCard
          label="Ganancia / Pérdida"
          value="$0.00"
          change="0.00%"
          positive
          icon={TrendingUp}
          delay={0.1}
        />
        <StatCard
          label="Meta"
          value={`$${config.goal.toLocaleString()}`}
          icon={Target}
          delay={0.15}
        />
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <QuickPortfolio delay={0.2} />
        <RecentDecisions delay={0.25} />
      </div>

      {/* Progress bar */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="card-terminal p-5 mt-4"
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-200">Progreso hacia la Meta</h3>
          <span className="text-xs font-mono text-slate-500">
            0.0% completado
          </span>
        </div>
        <div className="h-2 rounded-full bg-[#1a2240] overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(config.initialCapital / config.goal) * 100}%` }}
            transition={{ duration: 1, delay: 0.5 }}
            className="h-full rounded-full bg-gradient-to-r from-[#00ff88] to-[#00cc6a]"
          />
        </div>
        <div className="flex justify-between mt-2 text-xs font-mono text-slate-500">
          <span>${config.initialCapital.toLocaleString()}</span>
          <span>${config.goal.toLocaleString()}</span>
        </div>
      </motion.div>
    </div>
  );
}