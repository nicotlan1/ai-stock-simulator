import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Bot, Clock, AlertCircle, Moon } from "lucide-react";
import { useMarketStatus } from "@/components/shared/useFinnhub";

const ANALYSIS_INTERVALS = {
  conservative: 60,
  moderate: 30,
  aggressive: 20,
  ultra_aggressive: 15
};

function timeAgo(date) {
  if (!date) return null;
  const now = new Date();
  const diff = Math.floor((now - new Date(date)) / 1000);
  if (diff < 60) return "hace unos segundos";
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} horas`;
  return `hace ${Math.floor(diff / 86400)} días`;
}

function getNextAnalysisIn(lastRun, riskLevel) {
  if (!lastRun) return null;
  const interval = ANALYSIS_INTERVALS[riskLevel] || 30;
  const lastRunTime = new Date(lastRun);
  const nextRunTime = new Date(lastRunTime.getTime() + interval * 60000);
  const now = new Date();
  const diffMs = nextRunTime - now;
  const diffMin = Math.ceil(diffMs / 60000);
  return Math.max(0, diffMin);
}

export default function AIStatusBar({ config, holdings, marketStatus }) {
  const [timeNow, setTimeNow] = useState(new Date());
  const { open: marketOpen } = useMarketStatus();

  useEffect(() => {
    const id = setInterval(() => setTimeNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  if (!config) return null;

  const lastRun = config.last_ai_run;
  const riskLevel = config.risk_level || "moderate";
  const nextInMin = getNextAnalysisIn(lastRun, riskLevel);
  const activePositions = holdings?.length || 0;
  const minutesSinceLastRun = lastRun ? (timeNow.getTime() - new Date(lastRun).getTime()) / 60000 : Infinity;

  let statusText = "Próximo análisis en — min";
  let statusColor = "text-slate-400";
  let icon = <Clock className="w-4 h-4" />;

  if (!lastRun) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 px-4 py-3 rounded-lg bg-[#0f1629] border border-[#1a2240] flex items-center gap-3"
      >
        <Clock className="w-4 h-4 text-slate-400 flex-shrink-0" />
        <span className="text-sm text-slate-400 font-mono">⏳ Esperando primer ciclo de análisis...</span>
      </motion.div>
    );
  }

  if (!marketOpen) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 px-4 py-3 rounded-lg bg-[#0f1629] border border-[#1a2240] flex items-center gap-3"
      >
        <Moon className="w-4 h-4 text-slate-400 flex-shrink-0" />
        <span className="text-sm text-slate-400 font-mono">🌙 Mercado cerrado · La IA reanudará al abrir</span>
      </motion.div>
    );
  }

  if (nextInMin !== null && nextInMin < 2) {
    if (minutesSinceLastRun < 5) {
      statusText = "Analizando...";
      statusColor = "text-[#00ff88]";
      icon = <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity }}>
        <Bot className="w-4 h-4" />
      </motion.div>;
    } else {
      statusText = "Análisis pendiente";
      statusColor = "text-yellow-500";
      icon = <AlertCircle className="w-4 h-4" />;
    }
  } else if (nextInMin !== null) {
    statusText = `Próximo análisis en ${nextInMin} min`;
    statusColor = "text-slate-300";
    icon = <Clock className="w-4 h-4" />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 px-4 py-3 rounded-lg bg-[#0f1629] border border-[#1a2240] flex items-center justify-between"
    >
      <div className="flex items-center gap-3">
        <Bot className="w-4 h-4 text-slate-400 flex-shrink-0" />
        <span className="text-sm text-slate-400 font-mono">
          Último análisis: <span className="text-slate-300">{timeAgo(lastRun)}</span>
        </span>
        <span className="text-slate-600">·</span>
        <span className={`text-sm font-mono ${statusColor}`}>{statusText}</span>
      </div>
      <div className="text-sm text-slate-500 font-mono">
        {activePositions > 0 ? `[${activePositions} posición${activePositions > 1 ? 'es' : ''} activa${activePositions > 1 ? 's' : ''}]` : '[sin posiciones]'}
      </div>
    </motion.div>
  );
}