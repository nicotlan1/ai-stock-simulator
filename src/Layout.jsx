import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import SidebarNav from "@/components/sidebar/SidebarNav";
import {
  Activity,
  PanelLeftClose,
  PanelLeft,
  Menu,
  X
} from "lucide-react";

export default function Layout({ children, currentPageName }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Check if setup is needed
  const [setupDone, setSetupDone] = useState(null);

  useEffect(() => {
    const done = localStorage.getItem("ai_stock_setup_done");
    setSetupDone(!!done);
  }, [currentPageName]);

  // Redirect to setup if not done and not on setup page
  useEffect(() => {
    if (setupDone === false && currentPageName !== "Setup") {
      window.location.href = createPageUrl("Setup");
    }
  }, [setupDone, currentPageName]);

  // Don't show layout on setup page
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
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:sticky top-0 left-0 z-50 h-screen
          bg-[#0b1022] border-r border-[#1a2240]
          flex flex-col transition-all duration-300 ease-in-out
          ${collapsed ? "w-[68px]" : "w-[240px]"}
          ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {/* Logo area */}
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

        {/* Nav */}
        <div className="flex-1 overflow-y-auto py-4">
          <SidebarNav currentPage={currentPageName} collapsed={collapsed} />
        </div>

        {/* Collapse button - desktop only */}
        <div className="hidden lg:flex items-center justify-center h-12 border-t border-[#1a2240]">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-slate-500 hover:text-slate-300 transition-colors p-2"
          >
            {collapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        </div>

        {/* Mobile close */}
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden absolute top-4 right-3 text-slate-400"
        >
          <X className="w-5 h-5" />
        </button>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0">
        {/* Top bar mobile */}
        <div className="lg:hidden flex items-center gap-3 px-4 h-14 border-b border-[#1a2240] bg-[#0b1022] sticky top-0 z-30">
          <button onClick={() => setMobileOpen(true)} className="text-slate-400">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#00ff88]" />
            <span className="text-sm font-bold text-slate-100">AI Stock Simulator</span>
          </div>
        </div>

        <div className="p-4 md:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}