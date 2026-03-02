import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPageUrl } from "@/utils";
import {
  Activity,
  Wallet,
  Target,
  Zap,
  ArrowRight,
  ArrowLeft,
  DollarSign,
  TrendingUp,
  Shield,
  Flame
} from "lucide-react";

const RISK_PROFILES = [
  {
    id: "conservative",
    name: "Conservador",
    icon: Shield,
    color: "#3b82f6",
    description: "Baja volatilidad, rendimientos estables"
  },
  {
    id: "moderate",
    name: "Moderado",
    icon: TrendingUp,
    color: "#fbbf24",
    description: "Balance entre riesgo y retorno"
  },
  {
    id: "aggressive",
    name: "Agresivo",
    icon: Flame,
    color: "#ff4757",
    description: "Alta volatilidad, máximo potencial"
  }
];

export default function Setup() {
  const [step, setStep] = useState(0);
  const [config, setConfig] = useState({
    initialCapital: 10000,
    goal: 50000,
    riskProfile: "moderate"
  });

  const handleFinish = () => {
    localStorage.setItem("ai_stock_setup_done", "true");
    localStorage.setItem("ai_stock_config", JSON.stringify(config));
    window.location.href = createPageUrl("Dashboard");
  };

  const steps = [
    // Step 0 — Welcome
    <motion.div
      key="welcome"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
      className="text-center max-w-lg mx-auto"
    >
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#00ff88] to-[#00cc6a] flex items-center justify-center mx-auto mb-8">
        <Activity className="w-10 h-10 text-[#0a0e1a]" strokeWidth={2.5} />
      </div>
      <h1 className="text-3xl md:text-4xl font-bold text-white mb-3 tracking-tight">
        AI Stock Simulator
      </h1>
      <p className="text-slate-400 text-base mb-10 leading-relaxed">
        Una IA autónoma invierte dinero ficticio en la bolsa real.
        Observa cada decisión, aprende y simula rendimientos reales.
      </p>
      <button
        onClick={() => setStep(1)}
        className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#00ff88] text-[#0a0e1a] font-semibold rounded-xl hover:bg-[#00cc6a] transition-colors"
      >
        Comenzar <ArrowRight className="w-4 h-4" />
      </button>
    </motion.div>,

    // Step 1 — Capital
    <motion.div
      key="capital"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
      className="max-w-md mx-auto w-full"
    >
      <div className="w-14 h-14 rounded-xl bg-[#00ff88]/10 flex items-center justify-center mx-auto mb-6">
        <Wallet className="w-7 h-7 text-[#00ff88]" />
      </div>
      <h2 className="text-2xl font-bold text-white text-center mb-2">Capital Inicial</h2>
      <p className="text-slate-400 text-sm text-center mb-8">
        ¿Con cuánto dinero ficticio quieres comenzar?
      </p>
      <div className="card-terminal p-6">
        <div className="flex items-center gap-3 mb-4">
          <DollarSign className="w-5 h-5 text-[#00ff88]" />
          <input
            type="number"
            value={config.initialCapital}
            onChange={(e) => setConfig({ ...config, initialCapital: Number(e.target.value) })}
            className="flex-1 bg-transparent text-3xl font-mono font-bold text-white outline-none"
            min={1000}
            step={1000}
          />
        </div>
        <input
          type="range"
          min={1000}
          max={1000000}
          step={1000}
          value={config.initialCapital}
          onChange={(e) => setConfig({ ...config, initialCapital: Number(e.target.value) })}
          className="w-full accent-[#00ff88] h-1"
        />
        <div className="flex justify-between text-xs text-slate-500 font-mono mt-2">
          <span>$1,000</span>
          <span>$1,000,000</span>
        </div>
      </div>
    </motion.div>,

    // Step 2 — Goal
    <motion.div
      key="goal"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
      className="max-w-md mx-auto w-full"
    >
      <div className="w-14 h-14 rounded-xl bg-[#fbbf24]/10 flex items-center justify-center mx-auto mb-6">
        <Target className="w-7 h-7 text-[#fbbf24]" />
      </div>
      <h2 className="text-2xl font-bold text-white text-center mb-2">Meta de Capital</h2>
      <p className="text-slate-400 text-sm text-center mb-8">
        ¿A cuánto quieres que la IA multiplique tu inversión?
      </p>
      <div className="card-terminal p-6">
        <div className="flex items-center gap-3 mb-4">
          <DollarSign className="w-5 h-5 text-[#fbbf24]" />
          <input
            type="number"
            value={config.goal}
            onChange={(e) => setConfig({ ...config, goal: Number(e.target.value) })}
            className="flex-1 bg-transparent text-3xl font-mono font-bold text-white outline-none"
            min={config.initialCapital + 1000}
            step={1000}
          />
        </div>
        <input
          type="range"
          min={config.initialCapital + 1000}
          max={10000000}
          step={1000}
          value={config.goal}
          onChange={(e) => setConfig({ ...config, goal: Number(e.target.value) })}
          className="w-full accent-[#fbbf24] h-1"
        />
        <div className="flex justify-between text-xs text-slate-500 font-mono mt-2">
          <span>${(config.initialCapital + 1000).toLocaleString()}</span>
          <span>$10,000,000</span>
        </div>
        <div className="mt-4 p-3 rounded-lg bg-[#fbbf24]/5 border border-[#fbbf24]/20">
          <p className="text-xs text-[#fbbf24] font-mono">
            MULTIPLICADOR: {(config.goal / config.initialCapital).toFixed(1)}x
          </p>
        </div>
      </div>
    </motion.div>,

    // Step 3 — Risk
    <motion.div
      key="risk"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
      className="max-w-md mx-auto w-full"
    >
      <div className="w-14 h-14 rounded-xl bg-[#3b82f6]/10 flex items-center justify-center mx-auto mb-6">
        <Zap className="w-7 h-7 text-[#3b82f6]" />
      </div>
      <h2 className="text-2xl font-bold text-white text-center mb-2">Perfil de Riesgo</h2>
      <p className="text-slate-400 text-sm text-center mb-8">
        ¿Qué tan agresiva quieres que sea la IA?
      </p>
      <div className="space-y-3">
        {RISK_PROFILES.map((profile) => {
          const Icon = profile.icon;
          const isSelected = config.riskProfile === profile.id;
          return (
            <button
              key={profile.id}
              onClick={() => setConfig({ ...config, riskProfile: profile.id })}
              className={`
                w-full card-terminal p-4 flex items-center gap-4 text-left transition-all
                ${isSelected ? "border-[" + profile.color + "]" : ""}
              `}
              style={isSelected ? { borderColor: profile.color, background: `${profile.color}08` } : {}}
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: `${profile.color}15` }}
              >
                <Icon className="w-5 h-5" style={{ color: profile.color }} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-white">{profile.name}</p>
                <p className="text-xs text-slate-400">{profile.description}</p>
              </div>
              <div
                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors`}
                style={{ borderColor: isSelected ? profile.color : "#334155" }}
              >
                {isSelected && (
                  <div className="w-2 h-2 rounded-full" style={{ background: profile.color }} />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </motion.div>
  ];

  return (
    <div className="min-h-screen bg-[#0a0e1a] flex flex-col items-center justify-center p-6">
      {/* Progress */}
      {step > 0 && (
        <div className="flex items-center gap-2 mb-10">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1 rounded-full transition-all duration-300 ${
                s <= step ? "w-10 bg-[#00ff88]" : "w-6 bg-[#1a2240]"
              }`}
            />
          ))}
        </div>
      )}

      {/* Content */}
      <AnimatePresence mode="wait">
        {steps[step]}
      </AnimatePresence>

      {/* Navigation */}
      {step > 0 && (
        <div className="flex items-center gap-3 mt-10">
          <button
            onClick={() => setStep(step - 1)}
            className="flex items-center gap-2 px-5 py-2.5 text-sm text-slate-400 hover:text-white rounded-lg border border-[#1a2240] hover:border-[#243056] transition-all"
          >
            <ArrowLeft className="w-4 h-4" /> Atrás
          </button>
          {step < 3 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="flex items-center gap-2 px-6 py-2.5 text-sm bg-[#00ff88] text-[#0a0e1a] font-semibold rounded-lg hover:bg-[#00cc6a] transition-colors"
            >
              Siguiente <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleFinish}
              className="flex items-center gap-2 px-6 py-2.5 text-sm bg-[#00ff88] text-[#0a0e1a] font-semibold rounded-lg hover:bg-[#00cc6a] transition-colors"
            >
              Iniciar Simulación <Zap className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}