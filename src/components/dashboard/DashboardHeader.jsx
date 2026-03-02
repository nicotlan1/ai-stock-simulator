import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Clock, Target } from "lucide-react";
import { useMarketStatus } from "@/components/shared/useFinnhub";

function useESTClock() {
  const [time, setTime] = useState("");
  useEffect(() => {
    const tick = () => {
      setTime(new Date().toLocaleTimeString("en-US", { timeZone: "America/New_York", hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

function useCountdown(isOpen) {
  const [label, setLabel] = useState("");
  useEffect(() => {
    const calc = () => {
      const now = new Date();
      const est = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
      const day = est.getDay();
      const h = est.getHours(), m = est.getMinutes(), s = est.getSeconds();

      // Next open: 9:30 AM EST on next weekday
      let target = new Date(est);
      target.setHours(9, 30, 0, 0);
      if (h > 9 || (h === 9 && m >= 30)) target.setDate(target.getDate() + 1);
      // Skip weekends
      while (target.getDay() === 0 || target.getDay() === 6) target.setDate(target.getDate() + 1);

      const diff = Math.max(0, target - est);
      const hh = Math.floor(diff / 3600000);
      const mm = Math.floor((diff % 3600000) / 60000);
      const ss = Math.floor((diff % 60000) / 1000);
      setLabel(`Abre en ${hh}h ${mm}m ${ss}s`);
    };
    if (!isOpen) {
      calc();
      const id = setInterval(calc, 1000);
      return () => clearInterval(id);
    }
  }, [isOpen]);
  return label;
}

export default function DashboardHeader({ config }) {
  const { open, loading } = useMarketStatus();
  const estTime = useESTClock();
  const countdown = useCountdown(open);

  const daysLeft = config?.deadline_months
    ? Math.round(config.deadline_months * 30.4 - (Date.now() - new Date(config.start_date || Date.now())) / 86400000)
    : null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
      <div className="flex flex-wrap items-center gap-3">
        {/* Market status badge */}
        {!loading && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-mono font-bold ${
              open
                ? "bg-[#00ff88]/10 border-[#00ff88]/30 text-[#00ff88]"
                : "bg-[#ff4757]/10 border-[#ff4757]/30 text-[#ff4757]"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${open ? "bg-[#00ff88] pulse-dot" : "bg-[#ff4757]"}`} />
            {open ? "MERCADO ABIERTO" : `MERCADO CERRADO — ${countdown}`}
          </motion.div>
        )}

        {/* Goal */}
        {config && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#1a2240] text-xs font-mono text-slate-400">
            <Target className="w-3.5 h-3.5" />
            Meta: ${(config.goal_amount || 0).toLocaleString("en-US")}
            {daysLeft !== null && daysLeft > 0 && ` | ${daysLeft} días restantes`}
          </div>
        )}
      </div>

      {/* EST Clock */}
      <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
        <Clock className="w-3.5 h-3.5" />
        {estTime} EST
      </div>
    </div>
  );
}