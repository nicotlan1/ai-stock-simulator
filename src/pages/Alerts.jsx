import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import PageHeader from "@/components/shared/PageHeader";
import { Bell, CheckCheck } from "lucide-react";

const ALL_TYPES = ["all", "buy", "sell", "stop_loss", "info", "goal_reached", "warning"];
const TYPE_LABELS = { all: "Todas", buy: "Compra", sell: "Venta", stop_loss: "Stop-Loss", info: "Info", goal_reached: "Meta", warning: "Aviso" };
const TYPE_STYLES = {
  buy:          { bg: "bg-[#00ff88]/10", text: "text-[#00ff88]",  border: "border-[#00ff88]/20" },
  sell:         { bg: "bg-[#ff4757]/10", text: "text-[#ff4757]",  border: "border-[#ff4757]/20" },
  stop_loss:    { bg: "bg-[#ff4757]/10", text: "text-[#ff4757]",  border: "border-[#ff4757]/20" },
  info:         { bg: "bg-[#3b82f6]/10", text: "text-[#3b82f6]",  border: "border-[#3b82f6]/20" },
  goal_reached: { bg: "bg-[#a78bfa]/10", text: "text-[#a78bfa]", border: "border-[#a78bfa]/20" },
  warning:      { bg: "bg-[#fbbf24]/10", text: "text-[#fbbf24]", border: "border-[#fbbf24]/20" }
};

function timeAgo(d) {
  const diff = (Date.now() - new Date(d)) / 1000;
  if (diff < 3600) return `Hace ${Math.floor(diff / 60)}m`;
  if (diff < 172800) return `Hace ${Math.floor(diff / 3600)}h`;
  return `Hace ${Math.floor(diff / 86400)}d`;
}

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [notifGranted, setNotifGranted] = useState(false);

  const load = useCallback(async () => {
    const user = await base44.auth.me();
    const data = await base44.entities.Alert.filter({ user_id: user.email }, "-created_date", 100);
    setAlerts(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Request browser notification permission
  useEffect(() => {
    if ("Notification" in window) {
      if (Notification.permission === "granted") setNotifGranted(true);
      else if (Notification.permission !== "denied") {
        Notification.requestPermission().then(p => setNotifGranted(p === "granted"));
      }
    }
  }, []);

  // Subscribe to new alerts and trigger browser notification
  useEffect(() => {
    const unsub = base44.entities.Alert.subscribe(event => {
      if (event.type === "create" && event.data) {
        setAlerts(prev => [event.data, ...prev]);
        if (notifGranted && document.hidden) {
          new Notification("AI Stock Simulator", {
            body: event.data.message,
            icon: "/favicon.ico"
          });
        }
      } else if (event.type === "update") {
        setAlerts(prev => prev.map(a => a.id === event.id ? { ...a, ...event.data } : a));
      }
    });
    return unsub;
  }, [notifGranted]);

  const markAllRead = async () => {
    const unread = alerts.filter(a => !a.is_read);
    await Promise.all(unread.map(a => base44.entities.Alert.update(a.id, { is_read: true })));
    setAlerts(prev => prev.map(a => ({ ...a, is_read: true })));
  };

  const markOne = async (id) => {
    await base44.entities.Alert.update(id, { is_read: true });
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, is_read: true } : a));
  };

  const filtered = filter === "all" ? alerts : alerts.filter(a => a.type === filter);
  const unreadCount = alerts.filter(a => !a.is_read).length;

  return (
    <div>
      <PageHeader
        title="Alertas"
        subtitle={unreadCount > 0 ? `${unreadCount} sin leer` : "Todo al día"}
        rightContent={
          unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#00ff88]/10 border border-[#00ff88]/20 text-[#00ff88] text-xs font-mono hover:bg-[#00ff88]/20 transition-colors"
            >
              <CheckCheck className="w-3.5 h-3.5" /> Marcar todo como leído
            </button>
          )
        }
      />

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2 mb-5">
        {ALL_TYPES.map(t => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all border ${
              filter === t
                ? "bg-[#00ff88]/10 border-[#00ff88]/30 text-[#00ff88]"
                : "border-[#1a2240] text-slate-500 hover:text-slate-300"
            }`}
          >
            {TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="py-20 text-center text-slate-500 font-mono text-sm animate-pulse">Cargando...</div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center">
          <Bell className="w-10 h-10 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-500 text-sm font-mono">Sin alertas en esta categoría.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(alert => {
            const s = TYPE_STYLES[alert.type] || TYPE_STYLES.info;
            return (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => !alert.is_read && markOne(alert.id)}
                className={`flex items-start gap-3 p-4 rounded-xl border transition-all cursor-pointer ${
                  !alert.is_read
                    ? `${s.bg} ${s.border} border`
                    : "border-[#1a2240] hover:bg-white/[0.02]"
                }`}
              >
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${!alert.is_read ? s.text.replace("text-", "bg-") : "bg-[#1a2240]"}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${s.bg} ${s.text}`}>
                      {TYPE_LABELS[alert.type] || alert.type}
                    </span>
                    {alert.symbol && <span className="text-xs font-mono text-white">{alert.symbol}</span>}
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed">{alert.message}</p>
                </div>
                <span className="text-[10px] font-mono text-slate-600 whitespace-nowrap flex-shrink-0">{timeAgo(alert.created_date)}</span>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}