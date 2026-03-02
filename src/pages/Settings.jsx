import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import PageHeader from "@/components/shared/PageHeader";
import { createPageUrl } from "@/utils";
import {
  Settings as SettingsIcon,
  DollarSign,
  Target,
  Shield,
  TrendingUp,
  Flame,
  RotateCcw
} from "lucide-react";

const RISK_PROFILES = {
  conservative: { name: "Conservador", icon: Shield, color: "#3b82f6" },
  moderate: { name: "Moderado", icon: TrendingUp, color: "#fbbf24" },
  aggressive: { name: "Agresivo", icon: Flame, color: "#ff4757" },
};

function SettingRow({ label, value, icon: Icon }) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-[#1a2240] last:border-0">
      <div className="flex items-center gap-3">
        <Icon className="w-4 h-4 text-slate-500" />
        <span className="text-sm text-slate-300">{label}</span>
      </div>
      <span className="text-sm font-mono text-white">{value}</span>
    </div>
  );
}

export default function Settings() {
  const [config, setConfig] = useState({ initialCapital: 10000, goal: 50000, riskProfile: "moderate" });

  useEffect(() => {
    const saved = localStorage.getItem("ai_stock_config");
    if (saved) setConfig(JSON.parse(saved));
  }, []);

  const handleReset = () => {
    localStorage.removeItem("ai_stock_setup_done");
    localStorage.removeItem("ai_stock_config");
    window.location.href = createPageUrl("Setup");
  };

  const risk = RISK_PROFILES[config.riskProfile] || RISK_PROFILES.moderate;
  const RiskIcon = risk.icon;

  return (
    <div>
      <PageHeader title="Configuración" subtitle="Parámetros de la simulación" />

      <div className="max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="card-terminal p-6 mb-4"
        >
          <h3 className="text-sm font-semibold text-slate-200 mb-2">Parámetros Actuales</h3>
          <SettingRow label="Capital Inicial" value={`$${config.initialCapital.toLocaleString()}`} icon={DollarSign} />
          <SettingRow label="Meta" value={`$${config.goal.toLocaleString()}`} icon={Target} />
          <SettingRow
            label="Perfil de Riesgo"
            value={
              <span className="flex items-center gap-2">
                <RiskIcon className="w-3.5 h-3.5" style={{ color: risk.color }} />
                {risk.name}
              </span>
            }
            icon={SettingsIcon}
          />
          <SettingRow
            label="Multiplicador"
            value={`${(config.goal / config.initialCapital).toFixed(1)}x`}
            icon={TrendingUp}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-5 py-2.5 text-sm text-[#ff4757] border border-[#ff4757]/20 rounded-lg hover:bg-[#ff4757]/10 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reiniciar Simulación
          </button>
        </motion.div>
      </div>
    </div>
  );
}