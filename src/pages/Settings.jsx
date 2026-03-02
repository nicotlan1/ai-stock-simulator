import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import PageHeader from "@/components/shared/PageHeader";
import {
  DollarSign, Target, Shield, TrendingUp, Flame, AlertTriangle,
  RotateCcw, Edit3, Bell, BellOff, Clock, Percent, Zap, CheckCircle,
  ArrowRight, X, Database, CheckCircle2
} from "lucide-react";

function calcRiskProfile(monthlyReturnPct) {
  if (monthlyReturnPct < 5)  return { level: "conservative",   name: "Conservador",    prob: 65, color: "#3b82f6" };
  if (monthlyReturnPct < 15) return { level: "moderate",       name: "Moderado",       prob: 35, color: "#fbbf24" };
  if (monthlyReturnPct < 30) return { level: "aggressive",     name: "Agresivo",       prob: 12, color: "#ff4757" };
  return                      { level: "ultra_aggressive",      name: "Ultra Agresivo", prob: 3,  color: "#ff0000" };
}

const RISK_META = {
  conservative:     { name: "Conservador",   icon: Shield,        color: "#3b82f6" },
  moderate:         { name: "Moderado",       icon: TrendingUp,    color: "#fbbf24" },
  aggressive:       { name: "Agresivo",       icon: Flame,         color: "#ff4757" },
  ultra_aggressive: { name: "Ultra Agresivo", icon: AlertTriangle, color: "#ff0000" },
};

function SettingRow({ label, value, icon: Icon }) {
  return (
    <div className="flex items-center justify-between py-3.5 border-b border-[#1a2240] last:border-0">
      <div className="flex items-center gap-3">
        <Icon className="w-4 h-4 text-slate-500" />
        <span className="text-sm text-slate-400">{label}</span>
      </div>
      <span className="text-sm font-mono text-white">{value}</span>
    </div>
  );
}

export default function Settings() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showChangeGoal, setShowChangeGoal] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetStep, setResetStep] = useState(0);
  const [resetting, setResetting] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyResult, setHistoryResult] = useState(null);

  // Change goal form state
  const [newGoal, setNewGoal] = useState("");
  const [newDeadline, setNewDeadline] = useState("");
  const [newDeadlineUnit, setNewDeadlineUnit] = useState("months");

  useEffect(() => {
    base44.entities.UserConfig.list().then(res => {
      setConfig(res[0] || null);
      setLoading(false);
    });
    const perm = localStorage.getItem("notifications_enabled");
    setNotificationsEnabled(perm === "true");
  }, []);

  const handleToggleNotifications = async () => {
    if (!notificationsEnabled) {
      const perm = await Notification.requestPermission();
      if (perm === "granted") {
        setNotificationsEnabled(true);
        localStorage.setItem("notifications_enabled", "true");
      }
    } else {
      setNotificationsEnabled(false);
      localStorage.setItem("notifications_enabled", "false");
    }
  };

  const handleSaveGoal = async () => {
    if (!config) return;
    setSaving(true);
    const goalNum = parseFloat(newGoal);
    const deadlineNum = parseFloat(newDeadline);
    const deadlineMonths = newDeadlineUnit === "days" ? deadlineNum / 30 : deadlineNum;
    const aiCapital = config.initial_capital || 0;
    const requiredMonthlyReturn = deadlineMonths > 0 && aiCapital > 0 && goalNum > aiCapital
      ? (Math.pow(goalNum / aiCapital, 1 / deadlineMonths) - 1) * 100 : 0;
    const rp = calcRiskProfile(requiredMonthlyReturn);

    await base44.entities.UserConfig.update(config.id, {
      goal_amount: goalNum,
      deadline_months: deadlineMonths,
      required_monthly_return: requiredMonthlyReturn,
      risk_level: rp.level === "ultra_aggressive" ? "aggressive" : rp.level,
      estimated_probability: rp.prob
    });

    const updated = await base44.entities.UserConfig.list("-created_date", 1);
    setConfig(updated[0] || null);
    setSaving(false);
    setShowChangeGoal(false);
  };

  const handleLoadHistory = async () => {
    setLoadingHistory(true);
    setHistoryResult(null);
    const res = await base44.functions.invoke("historicalLoader");
    setHistoryResult(res.data);
    setLoadingHistory(false);
  };

  const handleReset = async () => {
    setResetting(true);
    const user = await base44.auth.me();
    if (!user) {
      console.error("No user logged in, cannot perform reset.");
      setResetting(false);
      setShowResetConfirm(false);
      return;
    }
    
    await Promise.all([
      base44.entities.UserConfig.list({ created_by: user.email }).then(rs => Promise.all(rs.map(r => base44.entities.UserConfig.delete(r.id)))),
      base44.entities.Wallet.list({ created_by: user.email }).then(rs => Promise.all(rs.map(r => base44.entities.Wallet.delete(r.id)))),
      base44.entities.Holding.list({ created_by: user.email }).then(rs => Promise.all(rs.map(r => base44.entities.Holding.delete(r.id)))),
      base44.entities.Transaction.list({ created_by: user.email }, "-created_date", 500).then(rs => Promise.all(rs.map(r => base44.entities.Transaction.delete(r.id)))),
      base44.entities.Alert.list({ created_by: user.email }, "-created_date", 500).then(rs => Promise.all(rs.map(r => base44.entities.Alert.delete(r.id)))),
      base44.entities.PerformanceSnapshot.list({ created_by: user.email }, "-created_date", 500).then(rs => Promise.all(rs.map(r => base44.entities.PerformanceSnapshot.delete(r.id)))),
      base44.entities.WalletMovement.list({ created_by: user.email }, "-created_date", 500).then(rs => Promise.all(rs.map(r => base44.entities.WalletMovement.delete(r.id)))),
      base44.entities.SP500History.list({ created_by: user.email }, "-created_date", 500).then(rs => Promise.all(rs.map(r => base44.entities.SP500History.delete(r.id))))
    ]);
    window.location.href = createPageUrl("Setup");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-slate-500 font-mono text-sm animate-pulse">Cargando...</div>
      </div>
    );
  }

  const riskMeta = RISK_META[config?.risk_level] || RISK_META.moderate;
  const RiskIcon = riskMeta.icon;
  const goalNum = parseFloat(newGoal) || 0;
  const deadlineNum = parseFloat(newDeadline) || 0;
  const deadlineMonths = newDeadlineUnit === "days" ? deadlineNum / 30 : deadlineNum;
  const aiCapital = config?.initial_capital || 0;
  const requiredReturn = deadlineMonths > 0 && aiCapital > 0 && goalNum > aiCapital
    ? (Math.pow(goalNum / aiCapital, 1 / deadlineMonths) - 1) * 100 : 0;
  const previewRisk = calcRiskProfile(requiredReturn);
  const canSave = goalNum >= aiCapital * 1.1 && deadlineNum >= 1;

  return (
    <div>
      <PageHeader title="Configuración" subtitle="Gestiona tu objetivo y preferencias" />

      <div className="max-w-2xl space-y-4">

        {/* Current config */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card-terminal p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-200">Objetivo Actual</h3>
            <button
              onClick={() => {
                setNewGoal(config?.goal_amount || "");
                setNewDeadline(config?.deadline_months || "");
                setNewDeadlineUnit("months");
                setShowChangeGoal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-[#00ff88] border border-[#00ff88]/20 rounded-lg hover:bg-[#00ff88]/10 transition-colors"
            >
              <Edit3 className="w-3 h-3" /> Cambiar objetivo
            </button>
          </div>

          {config ? (
            <>
              <SettingRow
                label="Meta" icon={Target}
                value={`$${(config.goal_amount || 0).toLocaleString("en-US", { minimumFractionDigits: 0 })}`}
              />
              <SettingRow
                label="Capital inicial (IA)" icon={DollarSign}
                value={`$${(config.initial_capital || 0).toLocaleString("en-US", { minimumFractionDigits: 0 })}`}
              />
              <SettingRow
                label="Plazo" icon={Clock}
                value={`${config.deadline_months ? config.deadline_months.toFixed(0) : "—"} meses`}
              />
              <SettingRow
                label="Retorno mensual necesario" icon={Percent}
                value={`${(config.required_monthly_return || 0).toFixed(1)}%`}
              />
              <div className="flex items-center justify-between py-3.5">
                <div className="flex items-center gap-3">
                  <RiskIcon className="w-4 h-4" style={{ color: riskMeta.color }} />
                  <span className="text-sm text-slate-400">Nivel de Riesgo</span>
                </div>
                <span className="text-sm font-mono font-bold" style={{ color: riskMeta.color }}>{riskMeta.name}</span>
              </div>
              <div className="flex items-center justify-between py-3.5 border-t border-[#1a2240]">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-4 h-4 text-slate-500" />
                  <span className="text-sm text-slate-400">Probabilidad estimada</span>
                </div>
                <span className="text-sm font-mono text-white">{config.estimated_probability || 0}%</span>
              </div>
            </>
          ) : (
            <p className="text-slate-500 text-sm py-4 text-center">No hay configuración activa.</p>
          )}
        </motion.div>

        {/* Notifications */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="card-terminal p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {notificationsEnabled ? <Bell className="w-4 h-4 text-[#00ff88]" /> : <BellOff className="w-4 h-4 text-slate-500" />}
              <div>
                <p className="text-sm text-slate-200">Notificaciones del navegador</p>
                <p className="text-xs text-slate-500 mt-0.5">Recibe alertas de la IA en tiempo real</p>
              </div>
            </div>
            <button
              onClick={handleToggleNotifications}
              className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${notificationsEnabled ? "bg-[#00ff88]" : "bg-[#1a2240]"}`}
            >
              <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-200 ${notificationsEnabled ? "left-6" : "left-1"}`} />
            </button>
          </div>
        </motion.div>

        {/* Historical Loader */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="card-terminal p-6">
          <h3 className="text-sm font-semibold text-slate-200 mb-1">Historial de Precios</h3>
          <p className="text-xs text-slate-500 mb-4">Carga 6 meses de datos históricos desde Yahoo Finance para mejorar el análisis técnico de la IA.</p>

          <button
            onClick={handleLoadHistory}
            disabled={loadingHistory}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-mono text-[#3b82f6] border border-[#3b82f6]/30 rounded-lg hover:bg-[#3b82f6]/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Database className="w-4 h-4" />
            {loadingHistory ? "Cargando historial..." : "Cargar historial inicial"}
          </button>

          {loadingHistory && (
            <div className="mt-3 flex items-center gap-2 text-xs font-mono text-slate-500">
              <div className="w-3 h-3 border border-[#3b82f6] border-t-transparent rounded-full animate-spin" />
              Descargando datos de Yahoo Finance para todas las acciones...
            </div>
          )}

          {historyResult && !loadingHistory && (
            <div className="mt-3 p-3 rounded-lg bg-[#00ff88]/5 border border-[#00ff88]/20">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-[#00ff88]" />
                <span className="text-xs font-mono text-[#00ff88] font-bold">Historial cargado exitosamente</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(historyResult.results || []).map(r => (
                  <div key={r.symbol} className="text-xs font-mono text-slate-400">
                    <span className="text-white">{r.symbol}</span>
                    {r.error ? <span className="text-[#ff4757]"> Error</span> : <span className="text-slate-500"> +{r.inserted} registros</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        {/* Reset */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card-terminal p-6">
          <h3 className="text-sm font-semibold text-slate-200 mb-1">Zona de Peligro</h3>
          <p className="text-xs text-slate-500 mb-4">Esta acción borrará absolutamente todo y no se puede deshacer.</p>
          <button
            onClick={() => { setShowResetConfirm(true); setResetStep(0); }}
            className="flex items-center gap-2 px-5 py-2.5 text-sm text-[#ff4757] border border-[#ff4757]/30 rounded-lg hover:bg-[#ff4757]/10 transition-colors"
          >
            <RotateCcw className="w-4 h-4" /> Reset Total
          </button>
        </motion.div>
      </div>

      {/* Change Goal Modal */}
      <AnimatePresence>
        {showChangeGoal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
            onClick={() => setShowChangeGoal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="bg-[#0f1629] border border-[#1a2240] rounded-2xl p-6 w-full max-w-md"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-white">Cambiar Objetivo</h3>
                <button onClick={() => setShowChangeGoal(false)} className="text-slate-500 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 rounded-lg bg-[#fbbf24]/5 border border-[#fbbf24]/20 mb-5">
                <p className="text-xs text-[#fbbf24] leading-relaxed">
                  ⚠️ Cambiar el objetivo actualizará la estrategia y el nivel de riesgo de la IA, pero <strong>no afectará tu portafolio ni tu billetera</strong>.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs text-slate-400 font-mono mb-1.5 block">NUEVA META ($)</label>
                  <div className="flex items-center gap-2 border border-[#1a2240] rounded-xl px-3 py-2.5 focus-within:border-[#00ff88]/40">
                    <DollarSign className="w-4 h-4 text-[#00ff88] flex-shrink-0" />
                    <input
                      type="number"
                      value={newGoal}
                      onChange={e => setNewGoal(e.target.value)}
                      className="flex-1 bg-transparent text-lg font-mono font-bold text-white outline-none placeholder-slate-600"
                      placeholder="50,000"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-400 font-mono mb-1.5 block">NUEVO PLAZO</label>
                  <div className="flex gap-2">
                    <div className="flex items-center gap-2 border border-[#1a2240] rounded-xl px-3 py-2.5 flex-1 focus-within:border-[#00ff88]/40">
                      <Clock className="w-4 h-4 text-[#3b82f6] flex-shrink-0" />
                      <input
                        type="number"
                        value={newDeadline}
                        onChange={e => setNewDeadline(e.target.value)}
                        className="flex-1 bg-transparent text-lg font-mono font-bold text-white outline-none placeholder-slate-600"
                        placeholder="12"
                      />
                    </div>
                    <div className="flex border border-[#1a2240] rounded-xl overflow-hidden">
                      {["days", "months"].map(u => (
                        <button key={u} onClick={() => setNewDeadlineUnit(u)}
                          className={`px-3 py-2.5 text-xs font-mono transition-colors ${newDeadlineUnit === u ? "bg-[#3b82f6] text-white" : "text-slate-400 hover:text-white"}`}>
                          {u === "days" ? "Días" : "Meses"}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {canSave && (
                  <div className="p-3 rounded-lg border" style={{ borderColor: `${previewRisk.color}30`, background: `${previewRisk.color}08` }}>
                    <p className="text-xs font-mono" style={{ color: previewRisk.color }}>
                      Nuevo perfil: <strong>{previewRisk.name}</strong> — retorno mensual necesario: {requiredReturn.toFixed(1)}%
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowChangeGoal(false)}
                  className="flex-1 py-2.5 text-sm text-slate-400 border border-[#1a2240] rounded-xl hover:border-[#243056] transition-colors">
                  Cancelar
                </button>
                <button onClick={handleSaveGoal} disabled={!canSave || saving}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold bg-[#00ff88] text-[#0a0e1a] rounded-xl hover:bg-[#00cc6a] disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                  {saving ? <><Zap className="w-4 h-4 animate-pulse" /> Guardando...</> : <><CheckCircle className="w-4 h-4" /> Guardar</>}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reset Confirm Modal */}
      <AnimatePresence>
        {showResetConfirm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="bg-[#0f1629] border border-[#ff4757]/30 rounded-2xl p-6 w-full max-w-sm text-center"
            >
              <div className="w-14 h-14 rounded-full bg-[#ff4757]/10 flex items-center justify-center mx-auto mb-4">
                <RotateCcw className="w-7 h-7 text-[#ff4757]" />
              </div>

              {resetStep === 0 ? (
                <>
                  <h3 className="text-base font-bold text-white mb-2">¿Resetear todo?</h3>
                  <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                    Se borrarán todas las posiciones, transacciones, alertas, historial de rendimiento y configuración. Esto <strong className="text-white">no se puede deshacer</strong>.
                  </p>
                  <div className="flex gap-3">
                    <button onClick={() => setShowResetConfirm(false)}
                      className="flex-1 py-2.5 text-sm text-slate-400 border border-[#1a2240] rounded-xl hover:border-[#243056] transition-colors">
                      Cancelar
                    </button>
                    <button onClick={() => setResetStep(1)}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-[#ff4757]/20 border border-[#ff4757]/40 rounded-xl hover:bg-[#ff4757]/30 transition-colors">
                      <ArrowRight className="w-4 h-4" /> Continuar
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-base font-bold text-[#ff4757] mb-2">¿Estás seguro?</h3>
                  <p className="text-sm text-slate-400 mb-6">
                    Esta es tu última oportunidad. Se borrará absolutamente todo y volverás al setup inicial.
                  </p>
                  <div className="flex gap-3">
                    <button onClick={() => setShowResetConfirm(false)}
                      className="flex-1 py-2.5 text-sm text-slate-400 border border-[#1a2240] rounded-xl hover:border-[#243056] transition-colors">
                      Cancelar
                    </button>
                    <button onClick={handleReset} disabled={resetting}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold text-white bg-[#ff4757] rounded-xl hover:bg-[#cc3945] disabled:opacity-60 transition-colors">
                      {resetting ? "Borrando..." : <><RotateCcw className="w-4 h-4" /> Reset Total</>}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}