import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, DollarSign, CheckCircle, AlertTriangle } from "lucide-react";

export default function ActionPanel({ action, wallet, onConfirm, onClose }) {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const num = parseFloat(amount) || 0;

  const config = {
    deposit: {
      title: "Depositar Fondos",
      desc: "El monto se sumará a tu saldo libre.",
      color: "#00ff88",
      maxLabel: null,
      max: null,
      btnLabel: "Confirmar Depósito"
    },
    send_to_ai: {
      title: "Enviar a la IA",
      desc: "El dinero saldrá de tu billetera y la IA lo desplegará en su próximo ciclo.",
      color: "#3b82f6",
      maxLabel: "Saldo libre disponible",
      max: wallet?.free_balance || 0,
      btnLabel: "Enviar a la IA"
    },
    withdraw_from_ai: {
      title: "Retirar de la IA",
      desc: "Solo puedes retirar cash líquido (ventas ejecutadas). Las posiciones abiertas no se pueden retirar.",
      color: "#fbbf24",
      maxLabel: "Cash líquido disponible",
      max: wallet?.liquid_cash || 0,
      btnLabel: "Retirar a Billetera"
    }
  };

  const cfg = config[action];
  const isOverMax = cfg.max !== null && num > cfg.max;
  const isValid = num > 0 && !isOverMax;

  const handleConfirm = async () => {
    if (!isValid) return;
    setLoading(true);
    await onConfirm(action, num);
    setLoading(false);
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
          className="bg-[#0f1629] border border-[#1a2240] rounded-2xl p-6 w-full max-w-sm"
        >
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-bold text-white">{cfg.title}</h3>
            <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <p className="text-sm text-slate-400 mb-5 leading-relaxed">{cfg.desc}</p>

          {cfg.max !== null && (
            <div className="mb-4 p-3 rounded-lg bg-[#1a2240] flex justify-between items-center">
              <span className="text-xs text-slate-400 font-mono">{cfg.maxLabel}</span>
              <span className="text-sm font-mono font-bold" style={{ color: cfg.color }}>
                ${(cfg.max).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          )}

          <div
            className="flex items-center gap-3 border rounded-xl px-4 py-3 mb-2 transition-colors"
            style={{ borderColor: isOverMax ? "#ff4757" : `${cfg.color}40` }}
          >
            <DollarSign className="w-5 h-5 flex-shrink-0" style={{ color: cfg.color }} />
            <input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="flex-1 bg-transparent text-2xl font-mono font-bold text-white outline-none placeholder-slate-600"
              min={0.01}
              autoFocus
            />
          </div>

          {isOverMax && (
            <div className="flex items-center gap-2 mb-3 text-xs text-[#ff4757]">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Supera el máximo disponible</span>
            </div>
          )}

          <button
            onClick={handleConfirm}
            disabled={!isValid || loading}
            className="w-full mt-4 py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ background: cfg.color, color: "#0a0e1a" }}
          >
            {loading ? (
              <span className="animate-pulse">Procesando...</span>
            ) : (
              <><CheckCircle className="w-4 h-4" /> {cfg.btnLabel}</>
            )}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}