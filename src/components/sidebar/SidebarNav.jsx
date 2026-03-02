import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Wallet,
  LayoutDashboard,
  TrendingUp,
  Bot,
  List,
  Bell,
  Settings,
  Activity
} from "lucide-react";

const navItems = [
  { name: "Dashboard", page: "Dashboard", icon: LayoutDashboard },
  { name: "Billetera", page: "Wallet", icon: Wallet },
  { name: "Rendimiento", page: "Performance", icon: TrendingUp },
  { name: "Decisiones IA", page: "AILog", icon: Bot },
  { name: "Transacciones", page: "Transactions", icon: List },
  { name: "Alertas", page: "Alerts", icon: Bell },
  { name: "Configuración", page: "Settings", icon: Settings },
];

export default function SidebarNav({ currentPage, collapsed }) {
  return (
    <nav className="flex flex-col gap-1 px-3">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = currentPage === item.page;

        return (
          <Link
            key={item.page}
            to={createPageUrl(item.page)}
            className={`
              flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200
              ${isActive
                ? "bg-[#00ff88]/10 text-[#00ff88]"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
              }
            `}
          >
            <Icon className={`w-[18px] h-[18px] flex-shrink-0 ${isActive ? "text-[#00ff88]" : ""}`} />
            {!collapsed && (
              <span className="text-sm font-medium truncate">{item.name}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}