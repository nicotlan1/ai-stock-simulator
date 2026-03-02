import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import {
  Wallet, LayoutDashboard, TrendingUp, Bot, List, Bell, Settings, Globe, LogOut, ChevronUp
} from "lucide-react";

const navItems = [
  { name: "Dashboard",      page: "Dashboard",    icon: LayoutDashboard },
  { name: "Mercado",        page: "Market",       icon: Globe },
  { name: "Billetera",      page: "Wallet",       icon: Wallet },
  { name: "Rendimiento",    page: "Performance",  icon: TrendingUp },
  { name: "Decisiones IA",  page: "AILog",        icon: Bot },
  { name: "Transacciones",  page: "Transactions", icon: List },
  { name: "Alertas",        page: "Alerts",       icon: Bell, badge: true },
  { name: "Configuración",  page: "Settings",     icon: Settings },
];

export default function SidebarNav({ currentPage, collapsed }) {
  const [unread, setUnread] = useState(0);
  const [user, setUser] = useState(null);
  const [showLogout, setShowLogout] = useState(false);

  useEffect(() => {
    const load = async () => {
      const alerts = await base44.entities.Alert.filter({ is_read: false });
      setUnread(alerts.length);
    };
    load();
    const unsub = base44.entities.Alert.subscribe(() => load());
    return unsub;
  }, []);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const initials = user?.full_name
    ? user.full_name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  return (
    <div className="flex flex-col h-full justify-between">
      <nav className="flex flex-col gap-1 px-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.page;
          const showBadge = item.badge && unread > 0;

          return (
            <Link
              key={item.page}
              to={createPageUrl(item.page)}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 relative
                ${isActive
                  ? "bg-[#00ff88]/10 text-[#00ff88]"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                }
              `}
            >
              <div className="relative flex-shrink-0">
                <Icon className={`w-[18px] h-[18px] ${isActive ? "text-[#00ff88]" : ""}`} />
                {showBadge && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-[#ff4757] text-[9px] font-bold font-mono text-white flex items-center justify-center">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </div>
              {!collapsed && (
                <span className="text-sm font-medium truncate flex-1">{item.name}</span>
              )}
              {!collapsed && showBadge && (
                <span className="ml-auto min-w-[20px] h-5 px-1.5 rounded-full bg-[#ff4757] text-[10px] font-bold font-mono text-white flex items-center justify-center">
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User section at bottom */}
      <div className="px-3 pb-2 border-t border-[#1a2240] pt-3">
        <button
          onClick={() => !collapsed && setShowLogout(prev => !prev)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-all duration-200 text-left"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00ff88]/30 to-[#00cc6a]/30 border border-[#00ff88]/30 flex items-center justify-center flex-shrink-0">
            <span className="text-[11px] font-bold text-[#00ff88]">{initials}</span>
          </div>
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-200 truncate">{user?.full_name || "Usuario"}</p>
                <p className="text-[11px] text-slate-500 truncate">{user?.email || ""}</p>
              </div>
              <ChevronUp className={`w-4 h-4 text-slate-500 transition-transform ${showLogout ? "" : "rotate-180"}`} />
            </>
          )}
        </button>

        {showLogout && !collapsed && (
          <button
            onClick={() => base44.auth.logout()}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#ff4757]/10 text-[#ff4757] transition-all duration-200 mt-1"
          >
            <LogOut className="w-[18px] h-[18px] flex-shrink-0" />
            <span className="text-sm font-medium">Cerrar sesión</span>
          </button>
        )}
      </div>
    </div>
  );
}