import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Bell, ArrowRight } from "lucide-react";

const TYPE_STYLES = {
  buy:          { bg: "bg-[#00ff88]/10", text: "text-[#00ff88]",  label: "COMPRA" },
  sell:         { bg: "bg-[#ff4757]/10", text: "text-[#ff4757]",  label: "VENTA" },
  stop_loss:    { bg: "bg-[#ff4757]/10", text: "text-[#ff4757]",  label: "STOP" },
  info:         { bg: "bg-[#3b82f6]/10", text: "text-[#3b82f6]",  label: "INFO" },
  goal_reached: { bg: "bg-[#a78bfa]/10", text: "text-[#a78bfa]", label: "META" },
  warning:      { bg: "bg-[#fbbf24]/10", text: "text-[#fbbf24]", label: "AVISO" }
};

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60) return `Hace ${Math.floor(diff)}s`;
  if (diff < 3600) return `Hace ${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `Hace ${Math.floor(diff / 3600)}h`;
  return `Hace ${Math.floor(diff / 86400)}d`;
}

export default function RecentAlerts({ alerts }) {
  const recent = (alerts || []).slice(0, 5);
  const style = TYPE_STYLES;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.35 }}
      className="card-terminal p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-200">Últimas Alertas IA</h3>
        </div>
        <Link
          to={createPageUrl("Alerts")}
          className="flex items-center gap-1 text-xs text-[#00ff88] hover:text-[#00ff88]/80 transition-colors font-mono"
        >
          Ver todas <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {recent.length === 0 ? (
        <p className="text-slate-600 text-sm font-mono py-4 text-center">Sin alertas recientes.</p>
      ) : (
        <div className="space-y-2">
          {recent.map((alert) => {
            const s = style[alert.type] || style.info;
            return (
              <div key={alert.id} className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold flex-shrink-0 ${s.bg} ${s.text}`}>
                  {s.label}
                </span>
                <p className="flex-1 text-xs text-slate-300 leading-relaxed">{alert.message}</p>
                <span className="text-[10px] text-slate-600 font-mono whitespace-nowrap">{timeAgo(alert.created_date)}</span>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}