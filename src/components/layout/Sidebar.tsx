import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  BarChart3,
  Calendar,
  History,
  Sparkles,
  TrendingUp,
  FileText,
  PlayCircle,
  Share2,
  Tv,
  Clock,
  Trophy,
  Sliders,
  ChevronDown,
  Layers,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Target,
  Flame
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onMobileClose
}) => {
  const { user } = useAuth();
  const [analyticsOpen, setAnalyticsOpen] = useState(true);
  const location = useLocation();

  const isAnalyticsActive = [
    '/analytics',
    '/reports',
    '/day-view',
    '/strategies',
    '/replay',
    '/share-cards'
  ].some(path => location.pathname.startsWith(path));

  const navClass = (isActive: boolean) =>
    `group flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
      isActive
        ? 'bg-gradient-to-r from-primary/20 to-purple-600/10 text-primary-light dark:text-white border border-primary/30 shadow-sm font-semibold'
        : 'text-muted hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5'
    }`;

  const sidebarContent = (
    <div className="flex flex-col h-full bg-surface border-r border-border transition-colors duration-200">
      {/* Brand Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-border">
        {!collapsed && (
          <NavLink to="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-md shadow-primary/30 group-hover:scale-105 transition-transform">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="flex items-baseline font-black text-lg tracking-tight">
              <span className="text-foreground">Trader</span>
              <span className="text-primary ml-0.5">Zone</span>
              <span className="text-[10px] font-black uppercase ml-1.5 px-1.5 py-0.5 rounded bg-primary/15 text-primary border border-primary/30">
                AI 2.0
              </span>
            </div>
          </NavLink>
        )}
        {collapsed && (
          <NavLink to="/dashboard" className="mx-auto">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-md shadow-primary/30">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
          </NavLink>
        )}
        <button
          onClick={onToggleCollapse}
          className="hidden md:flex items-center justify-center w-7 h-7 rounded-lg text-muted hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {/* Main Dashboard */}
        <NavLink
          to="/dashboard"
          onClick={onMobileClose}
          className={({ isActive }) => navClass(isActive)}
          title={collapsed ? "Dashboard" : undefined}
        >
          <LayoutDashboard className="w-4 h-4 shrink-0 text-primary" />
          {!collapsed && <span>Dashboard</span>}
        </NavLink>

        {/* Analytics Dropdown Group */}
        <div>
          <button
            onClick={() => setAnalyticsOpen(!analyticsOpen)}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              isAnalyticsActive ? 'text-foreground font-semibold' : 'text-muted hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            <div className="flex items-center gap-3">
              <BarChart3 className="w-4 h-4 shrink-0 text-violet-500" />
              {!collapsed && <span>Analytics</span>}
            </div>
            {!collapsed && (
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 text-muted ${
                  analyticsOpen ? 'rotate-180' : ''
                }`}
              />
            )}
          </button>

          {(!collapsed || mobileOpen) && analyticsOpen && (
            <div className="pl-6 pr-1 py-1 space-y-1 border-l border-border ml-4 mt-1">
              <NavLink
                to="/analytics"
                onClick={onMobileClose}
                className={({ isActive }) => navClass(isActive)}
              >
                <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                <span>Performance</span>
              </NavLink>
              <NavLink
                to="/reports"
                onClick={onMobileClose}
                className={({ isActive }) => navClass(isActive)}
              >
                <FileText className="w-3.5 h-3.5 shrink-0" />
                <span>Reports</span>
              </NavLink>
              <NavLink
                to="/day-view"
                onClick={onMobileClose}
                className={({ isActive }) => navClass(isActive)}
              >
                <Calendar className="w-3.5 h-3.5 shrink-0" />
                <span>Day View</span>
              </NavLink>
              <NavLink
                to="/strategies"
                onClick={onMobileClose}
                className={({ isActive }) => navClass(isActive)}
              >
                <Layers className="w-3.5 h-3.5 shrink-0" />
                <span>Strategies</span>
              </NavLink>
              <NavLink
                to="/replay"
                onClick={onMobileClose}
                className={({ isActive }) => navClass(isActive)}
              >
                <PlayCircle className="w-3.5 h-3.5 shrink-0" />
                <span>Trade Replay</span>
              </NavLink>
              <NavLink
                to="/share-cards"
                onClick={onMobileClose}
                className={({ isActive }) => navClass(isActive)}
              >
                <Share2 className="w-3.5 h-3.5 shrink-0" />
                <span>Share Cards</span>
              </NavLink>
            </div>
          )}
        </div>

        {/* Web Terminal */}
        <NavLink
          to="/terminal"
          onClick={onMobileClose}
          className={({ isActive }) => navClass(isActive)}
          title={collapsed ? "Web Terminal" : undefined}
        >
          <Tv className="w-4 h-4 shrink-0 text-sky-500" />
          {!collapsed && <span>Web Terminal</span>}
        </NavLink>

        {/* Trade History */}
        <NavLink
          to="/trades"
          onClick={onMobileClose}
          className={({ isActive }) => navClass(isActive)}
          title={collapsed ? "Trade History" : undefined}
        >
          <History className="w-4 h-4 shrink-0 text-emerald-500" />
          {!collapsed && <span>Trade History</span>}
        </NavLink>

        {/* Calendar Journal */}
        <NavLink
          to="/journal"
          onClick={onMobileClose}
          className={({ isActive }) => navClass(isActive)}
          title={collapsed ? "Journal" : undefined}
        >
          <Calendar className="w-4 h-4 shrink-0 text-amber-500" />
          {!collapsed && <span>Journal</span>}
        </NavLink>

        {/* Trader Zone AI 2.0 */}
        <NavLink
          to="/ai-2"
          onClick={onMobileClose}
          className={({ isActive }) =>
            `group flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              isActive
                ? 'bg-gradient-to-r from-pink-500/20 via-primary/20 to-purple-500/20 text-foreground border border-pink-500/30 font-semibold'
                : 'text-muted hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5'
            }`
          }
          title={collapsed ? "Trader Zone AI 2.0" : undefined}
        >
          <Sparkles className="w-4 h-4 shrink-0 text-pink-500 animate-pulse" />
          {!collapsed && (
            <div className="flex items-center justify-between w-full">
              <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 dark:from-pink-400 dark:via-purple-300 dark:to-indigo-300">
                Trader Zone AI
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-pink-500/20 text-pink-600 dark:text-pink-300 border border-pink-500/30">
                2.0
              </span>
            </div>
          )}
        </NavLink>

        {/* Hot Topics */}
        <NavLink
          to="/hot-topics"
          onClick={onMobileClose}
          className={({ isActive }) => navClass(isActive)}
          title={collapsed ? "Hot Topics" : undefined}
        >
          <Flame className="w-4 h-4 shrink-0 text-orange-500" />
          {!collapsed && <span>Hot Topics</span>}
        </NavLink>

        {/* Progress Tracker */}
        <NavLink
          to="/progress-tracker"
          onClick={onMobileClose}
          className={({ isActive }) => navClass(isActive)}
          title={collapsed ? "Progress Tracker" : undefined}
        >
          <Target className="w-4 h-4 shrink-0 text-cyan-400" />
          {!collapsed && <span>Progress Tracker</span>}
        </NavLink>

        {/* Market Hours */}
        <NavLink
          to="/market-hours"
          onClick={onMobileClose}
          className={({ isActive }) => navClass(isActive)}
          title={collapsed ? "Market Hours" : undefined}
        >
          <Clock className="w-4 h-4 shrink-0 text-cyan-500" />
          {!collapsed && <span>Market Hours</span>}
        </NavLink>


        {/* Broker Hub */}
        <NavLink
          to="/broker-hub"
          onClick={onMobileClose}
          className={({ isActive }) => navClass(isActive)}
          title={collapsed ? "Broker Hub" : undefined}
        >
          <Layers className="w-4 h-4 shrink-0 text-purple-500" />
          {!collapsed && <span>Broker Hub</span>}
        </NavLink>

        {/* Settings */}
        <NavLink
          to="/settings"
          onClick={onMobileClose}
          className={({ isActive }) => navClass(isActive)}
          title={collapsed ? "Settings" : undefined}
        >
          <Sliders className="w-4 h-4 shrink-0 text-muted" />
          {!collapsed && <span>Settings</span>}
        </NavLink>
      </div>

      {/* Footer User Info */}
      {!collapsed && (
        <NavLink
          to={user ? "/settings" : "/login"}
          onClick={onMobileClose}
          className="p-3.5 border-t border-border bg-surface-card/40 hover:bg-black/5 dark:hover:bg-white/5 transition-colors block"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-purple-600 flex items-center justify-center text-white font-bold text-xs shadow-sm shrink-0">
              {user?.name ? user.name.slice(0, 2).toUpperCase() : 'TZ'}
            </div>
            <div className="overflow-hidden">
              <div className="text-xs font-semibold text-foreground truncate">
                {user ? user.name : 'Guest Trader'}
              </div>
              <div className="text-[10px] text-muted truncate">
                {user ? user.email : 'Click to Sign In / Sync'}
              </div>
            </div>
          </div>
        </NavLink>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:block fixed top-0 left-0 h-screen z-30 transition-all duration-300 ${
          collapsed ? 'w-16' : 'w-64'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onMobileClose}
          />
          <div className="relative w-64 h-full bg-surface shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
