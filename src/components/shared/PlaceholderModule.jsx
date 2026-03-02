import React from "react";
import { Construction } from "lucide-react";
import { motion } from "framer-motion";

export default function PlaceholderModule({ title, icon: Icon, description }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6"
    >
      <div className="card-terminal p-8 max-w-md w-full relative overflow-hidden scanline">
        <div className="absolute inset-0 bg-gradient-to-br from-[#00ff88]/5 to-transparent pointer-events-none" />
        <div className="relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-[#00ff88]/10 flex items-center justify-center mx-auto mb-5">
            {Icon ? (
              <Icon className="w-8 h-8 text-[#00ff88]" />
            ) : (
              <Construction className="w-8 h-8 text-[#00ff88]" />
            )}
          </div>
          <h2 className="text-xl font-semibold text-slate-100 mb-2">{title}</h2>
          <p className="text-sm text-slate-400 mb-6">
            {description || "Módulo en construcción"}
          </p>
          <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
            <span className="w-2 h-2 rounded-full bg-[#fbbf24] pulse-dot" />
            <span className="font-mono">PRÓXIMAMENTE</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}