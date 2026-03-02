import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPageUrl } from "@/utils";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import {
  Activity, Wallet, Target, ArrowRight, ArrowLeft,
  DollarSign, TrendingUp, Shield, Flame, AlertTriangle,
  Zap, Clock, CheckCircle
} from "lucide-react";

function calcRiskProfile(monthlyReturnPct) {
  if (monthlyReturnPct < 5)  return { level: "conservative",   name: "Conservador",    prob: 65, color: "#3b82f6", icon: Shield,        desc: "La IA operará con posiciones pequeñas, stop-loss ajustado y priorizará preservar el capital." };
  if (monthlyReturnPct < 15) return { level: "moderate",       name: "Moderado",       prob: 35, color: "#fbbf24", icon: TrendingUp,    desc: "La IA balanceará riesgo y retorno, abriendo posiciones medianas con análisis técnico y fundamental." };
  if (monthlyReturnPct < 30) return { level: "aggressive",     name: "Agresivo",       prob: 12, color: "#ff4757", icon: Flame,         desc: "La IA tomará posiciones más grandes y frecuentes buscando rendimientos altos con mayor volatilidad." };
  return                      { level: "ultra_aggressive",     name: "Ultra Agresivo", prob: 3,  color: "#ff0000", icon: AlertTriangle, desc: "La IA operará con máximo riesgo. Es posible perder gran parte del capital invertido." };
}

function fmt(n) {
  return Number(n).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function Setup() {
  const [step, setStep]     = useState(0);
  const [saving, setSaving] = useState(false);
  const [totalCapital, setTotalCapital]   = useState("");
  const [aiCapital, setAiCapital]         = useState("");
  const [goalAmount, setGoalAmount]       = useState("");
  const [deadlineValue, setDeadlineValue] = useState("");
  const [deadlineUnit, setDeadlineUnit]   = useState("months");

  const totalNum   = parseFloat(totalCapital)  || 0;
  const aiNum      = parseFloat(aiCapital)     || 0;
  const goalNum    = parseFloat(goalAmount)    || 0;
  const reserveNum = totalNum - aiNum;

  const deadlineNum    = parseFloat(deadlineValue) || 0;
  const deadlineMonths = deadlineUnit === "days" ? deadlineNum / 30 : deadlineNum;

  const requiredMonthlyReturn = deadlineMonths > 0 && aiNum > 0 && goalNum > aiNum
    ? (Math.pow(goalNum / aiNum, 1 / deadlineMonths) - 1) * 100
    : 0;

  const riskProfile = calcRiskProfile(requiredMonthlyReturn);

  const canGoStep1 = totalNum >= 100;
  const canGoStep2 = aiNum >= 1 && aiNum <= totalNum;
  const canGoStep3 = goalNum >= aiNum * 1.1 && deadlineNum >= 1;

  const handleConfirm = async () => {
    setSaving(true);
    try {
      const today = new Date().toISOString().split("T")[0];

      await base44.entities.UserConfig.create({
        goal_amount:                goalNum,
        initial_capital:            aiNum,
        deadline_months:            deadlineMonths,
        required_monthly_return:    requiredMonthlyReturn,
        risk_level:                 riskProfile.level,
        estimated_probability:      riskProfile.prob,
        start_date:                 today,
        initial_investment_pending: true
      });

      await base44.entities.Wallet.create({
        free_balance: reserveNum,
        ai_capital:   aiNum,
        liquid_cash:  aiNum,
        net_worth:    totalNum
      });

      await base44.entities.WalletMovement.create({
        type:              "deposit",
        amount:            totalNum,
        resulting_balance: totalNum,
        notes:             "Depósito inicial de capital ficticio"
      });

      if (aiNum > 0) {
        await base44.entities.WalletMovement.create({
          type:              "send_to_ai",
          amount:            aiNum,
          resulting_balance: reserveNum,
          notes:             "Capital enviado a la IA al iniciar simulación"
        });
      }

      window.location.href = createPageUrl("Dashboard");
    } catch (err) {
      console.error("Setup error:", err.message);
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0e1a] flex flex-col items-center justify-center p-6">
      <div className="flex items-center gap-3 mb-10">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#00ff88] to-[#00cc6a] flex items-center justify-center">
          <Activity className="w-5 h-5 text-[#0a0e1a]" strokeWidth={3} />
        </div>
        <span className="text-sm font-bold text-slate-100 tracking-wide">AI STOCK SIMULATOR</span>
      </div>

      {step > 0 && (
        <div className="flex items-center gap-2 mb-10">
          {[1, 2, 3].map((s) => (
            <div key={s} className={`h-1 rounded-full transition-all duration-300 ${
              s <= step ? "w-12 bg-[#00ff88]" : "w-7 bg-[#1a2240]"
            }`} />
          ))}
          <span className="text-xs text-slate-500 font-mono ml-2">PASO {step} / 3</span>
        </div>
      )}

      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div key="welcome"
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }}
            className="text-center max-w-lg mx-auto"
          >
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#00ff88] to-[#00cc6a] flex items-center justify-center mx-auto mb-8">
              <Activity className="w-10 h-10 text-[#0a0e1a]" strokeWidth={2.5} />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-3 tracking-tight">AI Stock Simulator</h1>
            <p className="text-slate-400 text-base mb-10 leading-relaxed">
              Una IA autónoma invierte dinero ficticio en la bolsa real.<br />
              Observa cada decisión, aprende y simula rendimientos reales.
            </p>
            <button onClick={() => setStep(1)}
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#00ff88] text-[#0a0e1a] font-semibold rounded-xl hover:bg-[#00cc6a] transition-colors">
              Comenzar <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {step === 1 && (
          <motion.div key="step1"
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }}
            className="max-w-md mx-auto w-full"
          >
            <div className="w-14 h-14 rounded-xl bg-[#00ff88]/10 flex items-center justify-center mx-auto mb-6">
              <Wallet className="w-7 h-7 text-[#00ff88]" />
            </div>
            <h2 className="text-2xl font-bold text-white text-center mb-1">Carga tu Billetera</h2>
            <p className="text-slate-400 text-sm text-center mb-8">¿Con cuánto dinero ficticio quieres empezar?</p>
            <div className="card-terminal p-6 space-y-4">
              <div className="flex items-center gap-3 border border-[#1a2240] rounded-xl px-4 py-3 focus-within:border-[#00ff88]/50 transition-colors">
                <DollarSign className="w-5 h-5 text-[#00ff88] flex-shrink-0" />
                <input type="number" placeholder="10,000" value={totalCapital}
                  onChange={(e) => setTotalCapital(e.target.value)}
                  className="flex-1 bg-transparent text-3xl font-mono font-bold text-white outline-none placeholder-slate-600"
                  min={100} />
              </div>
              {totalNum > 0 && totalNum < 100 && <p className="text-xs text-[#ff4757]">Mínimo $100</p>}
              <p className="text-xs text-slate-500 text-center">💡 Es dinero simulado, no real.</p>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div key="step2"
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }}
            className="max-w-md mx-auto w-full"
          >
            <div className="w-14 h-14 rounded-xl bg-[#fbbf24]/10 flex items-center justify-center mx-auto mb-6">
              <TrendingUp className="w-7 h-7 text-[#fbbf24]" />
            </div>
            <h2 className="text-2xl font-bold text-white text-center mb-1">Define cuánto invertir</h2>
            <p className="text-slate-400 text-sm text-center mb-8">¿Cuánto de ese dinero le entregas a la IA para invertir?</p>
            <div className="card-terminal p-6 space-y-4">
              <div className="flex items-center gap-3 border border-[#1a2240] rounded-xl px-4 py-3 focus-within:border-[#fbbf24]/50 transition-colors">
                <DollarSign className="w-5 h-5 text-[#fbbf24] flex-shrink-0" />
                <input type="number" placeholder={`Max $${fmt(totalNum)}`} value={aiCapital}
                  onChange={(e) => setAiCapital(e.target.value)}
                  className="flex-1 bg-transparent text-3xl font-mono font-bold text-white outline-none placeholder-slate-600"
                  min={1} max={totalNum} />
              </div>
              {aiNum > totalNum && <p className="text-xs text-[#ff4757]">No puede superar tu capital total de ${fmt(totalNum)}</p>}
              {aiNum > 0 && aiNum <= totalNum && (
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="rounded-lg bg-[#fbbf24]/5 border border-[#fbbf24]/20 p-3 text-center">
                    <p className="text-xs text-slate-500 mb-1">Invertido (IA)</p>
                    <p className="text-lg font-mono font-bold text-[#fbbf24]">${fmt(aiNum)}</p>
                  </div>
                  <div className="rounded-lg bg-[#00ff88]/5 border border-[#00ff88]/20 p-3 text-center">
                    <p className="text-xs text-slate-500 mb-1">En billetera</p>
                    <p className="text-lg font-mono font-bold text-[#00ff88]">${fmt(reserveNum)}</p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div key="step3"
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }}
            className="max-w-md mx-auto w-full"
          >
            <div className="w-14 h-14 rounded-xl bg-[#3b82f6]/10 flex items-center justify-center mx-auto mb-6">
              <Target className="w-7 h-7 text-[#3b82f6]" />
            </div>
            <h2 className="text-2xl font-bold text-white text-center mb-1">Define tu Objetivo</h2>
            <p className="text-slate-400 text-sm text-center mb-8">¿A cuánto quieres que llegue tu inversión y en cuánto tiempo?</p>
            <div className="card-terminal p-6 space-y-5">
              <div>
                <label className="text-xs text-slate-400 mb-2 block font-mono">META EN DÓLARES</label>
                <div className="flex items-center gap-3 border border-[#1a2240] rounded-xl px-4 py-3 focus-within:border-[#3b82f6]/50 transition-colors">
                  <DollarSign className="w-5 h-5 text-[#3b82f6] flex-shrink-0" />
                  <input type="number" placeholder={`Mín. $${fmt(aiNum * 1.1)}`} value={goalAmount}
                    onChange={(e) => setGoalAmount(e.target.value)}
                    className="flex-1 bg-transparent text-2xl font-mono font-bold text-white outline-none placeholder-slate-600" />
                </div>
                {goalNum > 0 && goalNum < aiNum * 1.1 && (
                  <p className="text-xs text-[#ff4757] mt-1">Debe ser al menos 10% más que tu inversión (${fmt(aiNum * 1.1)})</p>
                )}
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-2 block font-mono">PLAZO</label>
                <div className="flex gap-3">
                  <div className="flex items-center gap-2 border border-[#1a2240] rounded-xl px-4 py-3 flex-1 focus-within:border-[#3b82f6]/50 transition-colors">
                    <Clock className="w-4 h-4 text-[#3b82f6] flex-shrink-0" />
                    <input type="number" placeholder="12" value={deadlineValue}
                      onChange={(e) => setDeadlineValue(e.target.value)}
                      className="flex-1 bg-transparent text-xl font-mono font-bold text-white outline-none placeholder-slate-600 w-16"
                      min={1} />
                  </div>
                  <div className="flex border border-[#1a2240] rounded-xl overflow-hidden">
                    {["days", "months"].map((u) => (
                      <button key={u} onClick={() => setDeadlineUnit(u)}
                        className={`px-4 py-3 text-sm font-mono transition-colors ${
                          deadlineUnit === u ? "bg-[#3b82f6] text-white" : "text-slate-400 hover:text-white"
                        }`}>
                        {u === "days" ? "Días" : "Meses"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              {canGoStep3 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl p-4 border"
                  style={{ borderColor: `${riskProfile.color}40`, background: `${riskProfile.color}08` }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    {React.createElement(riskProfile.icon, { className: "w-5 h-5", style: { color: riskProfile.color } })}
                    <span className="font-bold text-sm" style={{ color: riskProfile.color }}>{riskProfile.name}</span>
                    <span className="ml-auto text-xs text-slate-400 font-mono">~{riskProfile.prob}% prob.</span>
                  </div>
                  <div className="flex justify-between text-xs font-mono mb-3">
                    <span className="text-slate-400">Retorno mensual necesario</span>
                    <span className="font-bold" style={{ color: riskProfile.color }}>{requiredMonthlyReturn.toFixed(1)}%</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{riskProfile.desc}</p>
                  {riskProfile.level === "ultra_aggressive" && (
                    <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                      <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-red-400 leading-relaxed">La IA operará con máximo riesgo. Es posible perder gran parte del capital invertido.</p>
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {step > 0 && (
        <div className="flex items-center gap-3 mt-8">
          <button onClick={() => setStep(step - 1)}
            className="flex items-center gap-2 px-5 py-2.5 text-sm text-slate-400 hover:text-white rounded-lg border border-[#1a2240] hover:border-[#243056] transition-all">
            <ArrowLeft className="w-4 h-4" /> Atrás
          </button>
          {step === 1 && (
            <button disabled={!canGoStep1} onClick={() => setStep(2)}
              className="flex items-center gap-2 px-6 py-2.5 text-sm bg-[#00ff88] text-[#0a0e1a] font-semibold rounded-lg hover:bg-[#00cc6a] transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
              Siguiente <ArrowRight className="w-4 h-4" />
            </button>
          )}
          {step === 2 && (
            <button disabled={!canGoStep2} onClick={() => setStep(3)}
              className="flex items-center gap-2 px-6 py-2.5 text-sm bg-[#00ff88] text-[#0a0e1a] font-semibold rounded-lg hover:bg-[#00cc6a] transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
              Siguiente <ArrowRight className="w-4 h-4" />
            </button>
          )}
          {step === 3 && (
            <button disabled={!canGoStep3 || saving} onClick={handleConfirm}
              className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              style={canGoStep3 ? { background: riskProfile.color, color: "#0a0e1a" } : { background: "#1a2240", color: "#475569" }}>
              {saving
                ? <><Zap className="w-4 h-4 animate-pulse" /> Guardando...</>
                : <><CheckCircle className="w-4 h-4" /> Confirmar y Comenzar</>
              }
            </button>
          )}
        </div>
      )}
    </div>
  );
}