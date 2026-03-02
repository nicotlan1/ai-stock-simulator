import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, DollarSign, Target, Zap, CheckCircle, AlertTriangle, TrendingUp, Shield, Flame } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { calcRiskProfile, calcRequiredMonthlyReturn } from "@/lib/riskCalculator";

function fmt(n) {
  return (n || 0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtPrecise(n) {
  return (n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function SendToAIModal({ wallet, config, amount, onClose, onSuccess }) {
  const [step, setStep] = useState("options"); // options, option1, option2, processing
  const [loading, setLoading] = useState(false);
  
  // Opción 2: campos para nueva meta
  const [newGoalAmount, setNewGoalAmount] = useState("");
  const [newDeadlineValue, setNewDeadlineValue] = useState("");
  const [newDeadlineUnit, setNewDeadlineUnit] = useState("months");
  
  const currentAICapital = (wallet?.ai_capital || 0);
  const freeBalance = (wallet?.free_balance || 0);
  const newAICapital = currentAICapital + amount;
  
  const initialCapital = config?.initial_capital || 0;
  const goalAmount = config?.goal_amount || 0;
  const deadlineMonths = config?.deadline_months || 0;
  
  // Cálculos para opción 2
  const newGoalNum = parseFloat(newGoalAmount) || 0;
  const newDeadlineNum = parseFloat(newDeadlineValue) || 0;
  const newDeadlineMonths = newDeadlineUnit === "days" ? newDeadlineNum / 30 : newDeadlineNum;
  const newRequiredReturn = calcRequiredMonthlyReturn(newAICapital, newGoalNum, newDeadlineMonths);
  const newRiskProfile = calcRiskProfile(newRequiredReturn);
  const canGoOption2 = newGoalNum >= newAICapital * 1.1 && newDeadlineNum >= 1;
  
  const handleOption1 = async () => {
    setLoading(true);
    try {
      const newRequiredReturn = calcRequiredMonthlyReturn(newAICapital, goalAmount, deadlineMonths);
      const newRiskProfile = calcRiskProfile(newRequiredReturn);
      
      await base44.entities.UserConfig.update(config.id, {
        initial_capital: newAICapital,
        required_monthly_return: newRequiredReturn,
        risk_level: newRiskProfile.level,
        estimated_probability: newRiskProfile.prob,
        initial_investment_pending: true
      });
      
      await base44.entities.Wallet.update(wallet.id, {
        free_balance: freeBalance - amount,
        ai_capital: newAICapital,
        liquid_cash: (wallet?.liquid_cash || 0) + amount
      });
      
      await base44.entities.WalletMovement.create({
        type: "send_to_ai",
        amount,
        resulting_balance: freeBalance - amount,
        notes: "Dinero enviado a la IA - Opción 1: Mantener meta"
      });
      
      await base44.entities.Alert.create({
        message: `💰 Capital enviado a la IA: $${fmtPrecise(amount)}. Capital total bajo gestión: $${fmtPrecise(newAICapital)}`,
        type: "info"
      });
      
      setLoading(false);
      onSuccess();
    } catch (err) {
      console.error("Option 1 error:", err);
      setLoading(false);
    }
  };
  
  const handleOption2 = async () => {
    if (!canGoOption2) return;
    setLoading(true);
    try {
      await base44.entities.UserConfig.update(config.id, {
        initial_capital: newAICapital,
        goal_amount: newGoalNum,
        deadline_months: newDeadlineMonths,
        required_monthly_return: newRequiredReturn,
        risk_level: newRiskProfile.level,
        estimated_probability: newRiskProfile.prob,
        initial_investment_pending: true
      });
      
      await base44.entities.Wallet.update(wallet.id, {
        free_balance: freeBalance - amount,
        ai_capital: newAICapital,
        liquid_cash: (wallet?.liquid_cash || 0) + amount
      });
      
      await base44.entities.WalletMovement.create({
        type: "send_to_ai",
        amount,
        resulting_balance: freeBalance - amount,
        notes: "Dinero enviado a la IA - Opción 2: Nueva meta"
      });
      
      await base44.entities.Alert.create({
        message: `💰 Capital enviado a la IA: $${fmtPrecise(amount)}. Capital total bajo gestión: $${fmtPrecise(newAICapital)}`,
        type: "info"
      });
      
      setLoading(false);
      onSuccess();
    } catch (err) {
      console.error("Option 2 error:", err);
      setLoading(false);
    }
  };
  
  const handleOption3 = async () => {
    setLoading(true);
    try {
      await base44.entities.Wallet.update(wallet.id, {
        free_balance: freeBalance - amount,
        ai_capital: newAICapital,
        liquid_cash: (wallet?.liquid_cash || 0) + amount
      });
      
      await base44.entities.UserConfig.update(config.id, {
        initial_investment_pending: true
      });
      
      await base44.entities.WalletMovement.create({
        type: "send_to_ai",
        amount,
        resulting_balance: freeBalance - amount,
        notes: "Dinero enviado a la IA - Opción 3: Solo invertir"
      });
      
      await base44.entities.Alert.create({
        message: `💰 Capital enviado a la IA: $${fmtPrecise(amount)}. Capital total bajo gestión: $${fmtPrecise(newAICapital)}`,
        type: "info"
      });
      
      setLoading(false);
      onSuccess();
    } catch (err) {
      console.error("Option 3 error:", err);
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-[#0f1629] border border-[#1a2240] rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        >
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-bold text-white">Enviar a la IA</h3>
            <button onClick={onClose} disabled={loading} className="text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-50">
              <X className="w-5 h-5" />
            </button>
          </div>

          <AnimatePresence mode="wait">
            {step === "options" && (
              <motion.div key="options" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {/* Resumen */}
                <div className="mb-6 p-4 rounded-lg bg-[#1a2240] border border-[#243056]">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Monto a enviar</p>
                      <p className="text-xl font-mono font-bold text-[#00ff88]">${fmtPrecise(amount)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Capital total (después)</p>
                      <p className="text-xl font-mono font-bold text-[#3b82f6]">${fmt(newAICapital)}</p>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-slate-400 mb-4 font-semibold">Elige cómo deseas proceder:</p>

                {/* Opción 1 */}
                <button
                  onClick={() => setStep("option1")}
                  disabled={loading}
                  className="w-full mb-3 p-4 rounded-lg border border-[#243056] hover:border-[#3b82f6]/50 transition-colors text-left bg-[#0f1629] disabled:opacity-50"
                >
                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-[#3b82f6] flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-white text-sm">Mantener meta actual</p>
                      <p className="text-xs text-slate-500 mt-1">La IA invertirá el dinero extra. Tu meta de ${fmt(goalAmount)} será más fácil de alcanzar.</p>
                    </div>
                  </div>
                </button>

                {/* Opción 2 */}
                <button
                  onClick={() => setStep("option2")}
                  disabled={loading}
                  className="w-full mb-3 p-4 rounded-lg border border-[#243056] hover:border-[#fbbf24]/50 transition-colors text-left bg-[#0f1629] disabled:opacity-50"
                >
                  <div className="flex items-start gap-3">
                    <TrendingUp className="w-5 h-5 text-[#fbbf24] flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-white text-sm">Subir mi meta</p>
                      <p className="text-xs text-slate-500 mt-1">Aprovecha el nuevo capital para apuntar más alto.</p>
                    </div>
                  </div>
                </button>

                {/* Opción 3 */}
                <button
                  onClick={() => setStep("option3")}
                  disabled={loading}
                  className="w-full p-4 rounded-lg border border-[#243056] hover:border-[#ff4757]/50 transition-colors text-left bg-[#0f1629] disabled:opacity-50"
                >
                  <div className="flex items-start gap-3">
                    <Zap className="w-5 h-5 text-[#ff4757] flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-white text-sm">Solo invertir, sin cambios</p>
                      <p className="text-xs text-slate-500 mt-1">El dinero extra se invierte pero los objetivos quedan igual.</p>
                    </div>
                  </div>
                </button>
              </motion.div>
            )}

            {step === "option1" && (
              <motion.div key="option1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <p className="text-sm text-slate-400 mb-4">Se recalculará tu perfil de riesgo manteniendo la meta en ${fmt(goalAmount)}:</p>
                
                <div className="p-4 rounded-lg bg-[#1a2240] mb-4 border border-[#243056]">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Capital inicial (antes)</p>
                      <p className="text-sm font-mono text-slate-300">${fmt(initialCapital)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Capital inicial (después)</p>
                      <p className="text-sm font-mono text-[#00ff88] font-bold">${fmt(newAICapital)}</p>
                    </div>
                  </div>
                  <div className="border-t border-[#1a2240] pt-4">
                    <p className="text-xs text-slate-400 mb-2">Nuevo perfil de riesgo:</p>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ background: newRiskProfile.color }}
                      />
                      <p className="text-sm font-semibold" style={{ color: newRiskProfile.color }}>
                        {newRiskProfile.name}
                      </p>
                      <p className="text-xs text-slate-500 ml-auto">~{newRiskProfile.prob}% prob.</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep("options")}
                    disabled={loading}
                    className="flex-1 py-2.5 rounded-lg border border-[#1a2240] text-slate-300 hover:text-white transition-colors disabled:opacity-50 text-sm font-semibold"
                  >
                    Atrás
                  </button>
                  <button
                    onClick={handleOption1}
                    disabled={loading}
                    className="flex-1 py-2.5 rounded-lg bg-[#3b82f6] text-[#0a0e1a] hover:bg-[#2563eb] transition-colors disabled:opacity-50 text-sm font-semibold flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <><Zap className="w-4 h-4 animate-pulse" /> Procesando...</>
                    ) : (
                      <><CheckCircle className="w-4 h-4" /> Confirmar</>
                    )}
                  </button>
                </div>
              </motion.div>
            )}

            {step === "option2" && (
              <motion.div key="option2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <p className="text-sm text-slate-400 mb-4">Define tu nueva meta y plazo:</p>
                
                <div className="space-y-4 mb-4">
                  <div>
                    <label className="text-xs text-slate-400 mb-2 block font-mono">NUEVA META</label>
                    <div className="flex items-center gap-3 border border-[#1a2240] rounded-xl px-4 py-3 focus-within:border-[#fbbf24]/50 transition-colors">
                      <DollarSign className="w-5 h-5 text-[#fbbf24] flex-shrink-0" />
                      <input
                        type="number"
                        placeholder={`Mín. $${fmt(newAICapital * 1.1)}`}
                        value={newGoalAmount}
                        onChange={(e) => setNewGoalAmount(e.target.value)}
                        className="flex-1 bg-transparent text-2xl font-mono font-bold text-white outline-none placeholder-slate-600"
                      />
                    </div>
                    {newGoalNum > 0 && newGoalNum < newAICapital * 1.1 && (
                      <p className="text-xs text-[#ff4757] mt-1">Debe ser al menos 10% más que el capital (${fmt(newAICapital * 1.1)})</p>
                    )}
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 mb-2 block font-mono">PLAZO</label>
                    <div className="flex gap-3">
                      <div className="flex items-center gap-2 border border-[#1a2240] rounded-xl px-4 py-3 flex-1 focus-within:border-[#fbbf24]/50 transition-colors">
                        <input
                          type="number"
                          placeholder="12"
                          value={newDeadlineValue}
                          onChange={(e) => setNewDeadlineValue(e.target.value)}
                          className="flex-1 bg-transparent text-xl font-mono font-bold text-white outline-none placeholder-slate-600 w-16"
                          min={1}
                        />
                      </div>
                      <div className="flex border border-[#1a2240] rounded-xl overflow-hidden">
                        {["days", "months"].map((u) => (
                          <button
                            key={u}
                            onClick={() => setNewDeadlineUnit(u)}
                            className={`px-4 py-3 text-sm font-mono transition-colors ${
                              newDeadlineUnit === u ? "bg-[#fbbf24] text-[#0a0e1a]" : "text-slate-400 hover:text-white"
                            }`}
                          >
                            {u === "days" ? "Días" : "Meses"}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {canGoOption2 && (
                  <div className="p-4 rounded-lg bg-[#1a2240] mb-4 border border-[#243056]">
                    <p className="text-xs text-slate-400 mb-2">Nuevo perfil de riesgo:</p>
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ background: newRiskProfile.color }}
                      />
                      <p className="text-sm font-semibold" style={{ color: newRiskProfile.color }}>
                        {newRiskProfile.name}
                      </p>
                      <p className="text-xs text-slate-500 ml-auto">~{newRiskProfile.prob}% prob.</p>
                    </div>
                    <p className="text-xs text-slate-400">Retorno mensual necesario: <span style={{ color: newRiskProfile.color }} className="font-bold">{newRequiredReturn.toFixed(1)}%</span></p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep("options")}
                    disabled={loading}
                    className="flex-1 py-2.5 rounded-lg border border-[#1a2240] text-slate-300 hover:text-white transition-colors disabled:opacity-50 text-sm font-semibold"
                  >
                    Atrás
                  </button>
                  <button
                    onClick={handleOption2}
                    disabled={!canGoOption2 || loading}
                    className="flex-1 py-2.5 rounded-lg bg-[#fbbf24] text-[#0a0e1a] hover:bg-[#f59e0b] transition-colors disabled:opacity-50 text-sm font-semibold flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <><Zap className="w-4 h-4 animate-pulse" /> Procesando...</>
                    ) : (
                      <><CheckCircle className="w-4 h-4" /> Confirmar</>
                    )}
                  </button>
                </div>
              </motion.div>
            )}

            {step === "option3" && (
              <motion.div key="option3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="mb-4 p-4 rounded-lg bg-[#1a2240]/50 border border-[#ff4757]/30 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-[#ff4757] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-[#ff4757] font-semibold mb-1">Tus objetivos se mantienen igual</p>
                    <p className="text-xs text-slate-400">Meta: ${fmt(goalAmount)} | Plazo: {deadlineMonths} meses | Perfil actual: {config?.risk_level}</p>
                  </div>
                </div>

                <p className="text-sm text-slate-400 mb-6">El dinero se invertirá normalmente pero no cambiarán tus parámetros de objetivo.</p>

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep("options")}
                    disabled={loading}
                    className="flex-1 py-2.5 rounded-lg border border-[#1a2240] text-slate-300 hover:text-white transition-colors disabled:opacity-50 text-sm font-semibold"
                  >
                    Atrás
                  </button>
                  <button
                    onClick={handleOption3}
                    disabled={loading}
                    className="flex-1 py-2.5 rounded-lg bg-[#ff4757] text-white hover:bg-[#ff3444] transition-colors disabled:opacity-50 text-sm font-semibold flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <><Zap className="w-4 h-4 animate-pulse" /> Procesando...</>
                    ) : (
                      <><CheckCircle className="w-4 h-4" /> Confirmar</>
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}