import React from "react";
import { 
  PlusCircle, 
  Files, 
  LayoutTemplate, 
  History, 
  ShieldCheck, 
  Activity, 
  ChevronLeft, 
  ChevronRight,
  Search,
  Sparkles
} from "lucide-react";

interface SidebarProps {
  currentView: string;
  setCurrentView: (v: string) => void;
  collapsed: boolean;
  setCollapsed: (c: boolean) => void;
  onOpenActivityDrawer: () => void;
  activityCount: number;
  activeCompany: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  setCurrentView,
  collapsed,
  setCollapsed,
  onOpenActivityDrawer,
  activityCount,
  activeCompany
}) => {
  const navItems = [
    { id: "home", label: "New Research", icon: PlusCircle },
    { id: "research", label: "Research & Tie-Out", icon: Search },
    { id: "documents", label: "Documents & Filings", icon: Files },
    { id: "report", label: "Final Report & Sign-Off", icon: LayoutTemplate },
    { id: "reliability", label: "Reliability & Benchmarks", icon: ShieldCheck },
  ];

  return (
    <aside
      className={`h-screen sticky top-0 bg-white border-r border-slate-200 transition-all duration-200 flex flex-col z-30 ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-slate-100">
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-base shadow-xs">
              V
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-slate-900 text-sm tracking-tight flex items-center gap-1.5">
                Verifin
                <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                  v2.0
                </span>
              </span>
              <span className="text-[11px] text-slate-500 font-medium">Financial Tie-Out System</span>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 mx-auto rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-base">
            V
          </div>
        )}

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Active Context Banner */}
      {!collapsed && (
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
          <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 mb-1">Target Entity</div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">{activeCompany}</span>
            <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-medium border border-emerald-200">
              SEC 10-K Ingested
            </span>
          </div>
        </div>
      )}

      {/* Nav Navigation */}
      <nav className="flex-1 px-2.5 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                isActive
                  ? "bg-indigo-50 text-indigo-700 font-semibold"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
              title={collapsed ? item.label : undefined}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-indigo-600" : "text-slate-400"}`} />
              {!collapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Multi-Agent Activity Drawer Button */}
      <div className="p-3 border-t border-slate-100">
        <button
          onClick={onOpenActivityDrawer}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs text-slate-700 transition-colors ${
            collapsed ? "justify-center" : ""
          }`}
          title="Multi-Agent Activity Drawer"
        >
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-600 animate-pulse" />
            {!collapsed && <span className="font-medium">Multi-Agent Activity</span>}
          </div>
          {!collapsed && (
            <span className="text-[10px] font-semibold bg-white px-1.5 py-0.5 rounded-full border border-slate-200 tabular-nums">
              {activityCount} msgs
            </span>
          )}
        </button>
      </div>
    </aside>
  );
};
