import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import SidebarNav from "@/components/sidebar/SidebarNav";
import FinnhubBanner from "@/components/shared/FinnhubBanner";
import { useMarketStatus } from "@/components/shared/useFinnhub";
import {
  Activity, PanelLeftClose, PanelLeft, Menu, X
} from "lucide-react";

export default function Layout({ children, currentPageName }) {
  const [collapsed, setCollapsed]   = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [setupDone, setSetupDone]   = useState(null);
  const marketStatus = useMarketStatus();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    const checkSetup = async () => {
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 5000)
      );

      try {
        const [user, configs, wallets] = await Promise.race([
          Promise.all([
            base44.auth.me(),
            base44.entities.UserConfig.list(),
            base44.entities.Wallet.list()
          ]),
          timeout
        ]);

        if (cancelled) return;

        // Filter by current user's email
        const userEmail = user?.email;
        const userConfigs = userEmail ? configs.filter(c => c.created_by === userEmail) : [];
        const userWallets = userEmail ? wallets.filter(w => w.created_by === userEmail) : [];
        
        const done = userConfigs.length > 0 && userWallets.length > 0;
        setSetupDone(done);
        if (!done && currentPageName !== "Setup") {
          navigate(createPageUrl("Setup"));
        }
      } catch (err) {
        if (!cancelled) {
          setSetupDone(err.message === "timeout" ? true : false);
        }
      }
    };

    checkSetup();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const updateTitle = async () => {
      try {
        const [wallets, holdings] = await Promise.all([
          base44.entities.Wallet.list(),
          base44.entities.Holding.list()
        ]);
        if (!wallets.length) {
          document.title = "AI Stock Simulator";
          return;
        }
        const wallet  = wallets[0];
        const invested = holdings.reduce((s, h) => s + (h.current_value || 0), 0);
        // FIX: campos correctos del schema
        const netWorth = wallet.net_worth ||
          ((wallet.free_balance || 0) + (wallet.ai_capital || 0) + invested);
        const formatted = netWorth.toLocaleString("en-US", {
          minimumFractionDigits: 0, maximumFractionDigits: 0
        });
        document.title = `$${formatted} | AI Stock Simulator`;
      } catch {
        document.title = "AI Stock Simulator";
      }
    };

    if (setupDone && currentPageName !== "Setup") {
      updateTitle();
      const id = setInterval(updateTitle, 60000);
      return () => clearInterval(id);
    } else {
      document.title = "AI Stock Simulator";
    }
  }, [setupDone, currentPageName]);



  if (currentPageName === "Setup") {
    return <div className="min-h-screen bg-[#0a0e1a]">{children}</div>;
  }

  if (setupDone === null) {
    return (
      <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center">
        <Activity className="w-6 h-6 text-[#00ff88] animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0e1a] flex">
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)} />
      )}

      <aside className={`
        fixed lg:sticky top-0 left-0 z-50 h-screen
        bg-[#0b1022] border-r border-[#1a2240]
        flex flex-col transition-all duration-300 ease-in-out
        ${collapsed ? "w-[68px]" : "w-[240px]"}
        ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}>
        <div className="flex items-center gap-3 px-4 h-16 border-b border-[#1a2240] flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00ff88] to-[#00cc6a] flex items-center justify-center flex-shrink-0">
            <Activity className="w-4 h-4 text-[#0a0e1a]" strokeWidth={3} />
          </div>
          {!collapsed && (
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-bold text-slate-100 truncate">AI Stock</span>
              <span className="text-[10px] font-mono text-[#00ff88] tracking-wider">SIMULATOR</span>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          <SidebarNav currentPage={currentPageName} collapsed={collapsed} />
        </div>

        <div className="hidden lg:flex items-center justify-center h-12 border-t border-[#1a2240]">
          <button onClick={() => setCollapsed(!collapsed)}
            className="text-slate-500 hover:text-slate-300 transition-colors p-2">
            {collapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        </div>

        <button onClick={() => setMobileOpen(false)}
          className="lg:hidden absolute top-4 right-3 text-slate-400">
          <X className="w-5 h-5" />
        </button>
      </aside>

      <main className="flex-1 min-w-0">
        <FinnhubBanner show={!marketStatus.loading && marketStatus.error} />
        <div className="lg:hidden flex items-center gap-3 px-4 h-14 border-b border-[#1a2240] bg-[#0b1022] sticky top-0 z-30">
          <button onClick={() => setMobileOpen(true)} className="text-slate-400">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#00ff88]" />
            <span className="text-sm font-bold text-slate-100">AI Stock Simulator</span>
          </div>
        </div>
        <div className="p-4 md:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}