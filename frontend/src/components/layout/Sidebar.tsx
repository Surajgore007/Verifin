import React from "react";
import {
  PlusCircle,
  Files,
  LayoutTemplate,
  ShieldCheck,
  Activity,
  ChevronLeft,
  ChevronRight,
  Search,
  Settings,
} from "lucide-react";

interface SidebarProps {
  currentView: string;
  setCurrentView: (v: string) => void;
  collapsed: boolean;
  setCollapsed: (c: boolean) => void;
  onOpenActivityDrawer: () => void;
  activityCount: number;
  activeCompany: string;
  onSettingsClick?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  setCurrentView,
  collapsed,
  setCollapsed,
  onOpenActivityDrawer,
  activityCount,
  activeCompany,
  onSettingsClick,
}) => {
  const navItems = [
    { id: "home", label: "New Research", icon: PlusCircle },
    { id: "research", label: "Research & Tie-Out", icon: Search },
    { id: "documents", label: "Documents & Filings", icon: Files },
    { id: "report", label: "Final Report", icon: LayoutTemplate },
    { id: "reliability", label: "Reliability & Benchmarks", icon: ShieldCheck },
  ];

  // Patch E: 64px when collapsed (icon rail), 240px when expanded
  return (
    <aside
      className={`h-screen sticky top-0 bg-white border-r border-slate-200 transition-all duration-200 flex flex-col z-30 ${
        collapsed ? "w-16" : "w-60"
      }`}
    >
      {/* Brand Header */}
      <div className={`h-14 flex items-center border-b border-slate-100 ${collapsed ? "justify-center px-0" : "px-3 justify-between"}`}>
        {!collapsed && (
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-xs shrink-0">
              V
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-slate-900 text-sm tracking-tight flex items-center gap-1.5">
                Verifin
                <span className="text-[9px] font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                  v2.0
                </span>
              </span>
              <span className="text-[10px] text-slate-500 font-medium truncate">Tie-Out System</span>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-xs">
            V
          </div>
        )}

        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            title="Collapse sidebar"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Expand button when collapsed */}
      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          className="mt-2 mx-auto p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          title="Expand sidebar"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}

      {/* Active Context Banner — only expanded */}
      {!collapsed && (
        <div className="px-3 py-2.5 bg-slate-50 border-b border-slate-100">
          <div className="text-[9px] uppercase tracking-wider font-bold text-slate-400 mb-0.5">Entity</div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">{activeCompany}</span>
            <span className="text-[9px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-semibold border border-emerald-200">
              10-K
            </span>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              title={item.label}
              className={`w-full flex items-center gap-2.5 rounded-lg text-xs font-medium transition-colors ${
                collapsed ? "justify-center p-2.5" : "px-3 py-2"
              } ${
                isActive
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 ${isActive ? "text-indigo-600" : "text-slate-400"}`}
              />
              {!collapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Bottom: Activity + Settings */}
      <div className={`border-t border-slate-100 p-2 space-y-1`}>
        <button
          onClick={onOpenActivityDrawer}
          title="Multi-Agent Activity"
          className={`w-full flex items-center rounded-lg border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs text-slate-700 transition-colors relative ${
            collapsed ? "justify-center p-2.5" : "px-3 py-2 justify-between"
          }`}
        >
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-500 animate-pulse shrink-0" />
            {!collapsed && <span className="font-medium text-xs">Agent Activity</span>}
          </div>
          {!collapsed && activityCount > 0 && (
            <span className="text-[10px] font-bold bg-white px-1.5 py-0.5 rounded-full border border-slate-200 tabular-nums">
              {activityCount}
            </span>
          )}
          {collapsed && activityCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-600 rounded-full text-[9px] text-white font-bold flex items-center justify-center">
              {activityCount > 9 ? "9+" : activityCount}
            </span>
          )}
        </button>

        {/* Settings button — 5 clicks unlocks replay */}
        <button
          onClick={onSettingsClick}
          title="Settings"
          className={`w-full flex items-center rounded-lg text-xs text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors ${
            collapsed ? "justify-center p-2.5" : "px-3 py-2 gap-2"
          }`}
        >
          <Settings className="w-3.5 h-3.5 shrink-0" />
          {!collapsed && <span>Settings</span>}
        </button>
      </div>
    </aside>
  );
};
