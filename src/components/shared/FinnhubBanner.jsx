import React from "react";
import { AlertTriangle, WifiOff } from "lucide-react";

export default function FinnhubBanner({ show }) {
  if (!show) return null;
  return (
    <div className="sticky top-0 z-[100] flex items-center gap-3 px-4 py-3 bg-[#fbbf24]/10 border-b border-[#fbbf24]/40">
      <WifiOff className="w-4 h-4 text-[#fbbf24] flex-shrink-0" />
      <div className="flex-1">
        <span className="text-sm font-semibold text-[#fbbf24]">Finnhub no responde — </span>
        <span className="text-sm text-[#fbbf24]/70">
          Las operaciones de la IA están suspendidas hasta recuperar la conexión.
        </span>
      </div>
      <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#fbbf24]/10 border border-[#fbbf24]/30">
        <AlertTriangle className="w-3 h-3 text-[#fbbf24]" />
        <span className="text-[10px] font-mono text-[#fbbf24] uppercase">IA BLOQUEADA</span>
      </div>
    </div>
  );
}