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
  Flame,
  CalendarDays,
  LayoutGrid
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
        ? 'sidebar-item-active'
        : 'sidebar-item-inactive'
    }`;

  const sidebarContent = (
    <div className="flex flex-col h-full sidebar-container border-r sidebar-border-subtle transition-colors duration-200">
      {/* Brand Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b sidebar-border-subtle">
        {!collapsed && (
          <NavLink to="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#F5E5BE] via-[#DDB86C] to-[#B8883B] border border-[#CCA051]/60 shadow-sm shadow-[#B8883B]/20 dark:bg-gradient-to-br dark:from-slate-700 dark:via-slate-800 dark:to-slate-900 dark:border-white/20 dark:shadow-none flex items-center justify-center group-hover:scale-105 transition-transform">
              <Sparkles className="w-4 h-4 text-white drop-shadow-sm dark:text-slate-100" />
            </div>
            <div className="flex items-baseline font-black text-lg tracking-tight">
              <span className="text-foreground">Trader</span>
              <span className="text-[#B8883B] dark:text-slate-200 ml-0.5">Zone</span>
              <span className="text-[10px] font-black uppercase ml-1.5 px-1.5 py-0.5 rounded dark:bg-white/10 dark:text-slate-200 dark:border dark:border-white/20 bg-[#F4E6CA] text-[#785114] border border-[#CCA051]/60">
                AI 2.0
              </span>
            </div>
          </NavLink>
        )}
        {collapsed && (
          <NavLink to="/dashboard" className="mx-auto">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#F5E5BE] via-[#DDB86C] to-[#B8883B] border border-[#CCA051]/60 shadow-sm shadow-[#B8883B]/20 dark:bg-gradient-to-br dark:from-slate-700 dark:via-slate-800 dark:to-slate-900 dark:border-white/20 dark:shadow-none flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white drop-shadow-sm dark:text-slate-100" />
            </div>
          </NavLink>
        )}
        <button
          onClick={onToggleCollapse}
          className="hidden md:flex items-center justify-center w-7 h-7 rounded-lg sidebar-item-inactive hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
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
          <LayoutDashboard className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Dashboard</span>}
        </NavLink>

        {/* Analytics Dropdown Group */}
        <div>
          <button
            onClick={() => setAnalyticsOpen(!analyticsOpen)}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
              isAnalyticsActive ? 'sidebar-item-active' : 'sidebar-item-inactive'
            }`}
          >
            <div className="flex items-center gap-3">
              <BarChart3 className="w-4 h-4 shrink-0" />
              {!collapsed && <span>Analytics</span>}
            </div>
            {!collapsed && (
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  analyticsOpen ? 'rotate-180' : ''
                }`}
              />
            )}
          </button>

          {(!collapsed || mobileOpen) && analyticsOpen && (
            <div className="pl-6 pr-1 py-1 space-y-1 border-l sidebar-border-subtle ml-4 mt-1">
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
          <Tv className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Web Terminal</span>}
        </NavLink>

        {/* Trade History */}
        <NavLink
          to="/trades"
          onClick={onMobileClose}
          className={({ isActive }) => navClass(isActive)}
          title={collapsed ? "Trade History" : undefined}
        >
          <History className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Trade History</span>}
        </NavLink>

        {/* Calendar Journal */}
        <NavLink
          to="/journal"
          onClick={onMobileClose}
          className={({ isActive }) => navClass(isActive)}
          title={collapsed ? "Journal" : undefined}
        >
          <Calendar className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Journal</span>}
        </NavLink>

        {/* Trader Zone AI 2.0 */}
        <NavLink
          to="/ai-2"
          onClick={onMobileClose}
          className={({ isActive }) => navClass(isActive)}
          title={collapsed ? "Trader Zone AI 2.0" : undefined}
        >
          <Sparkles className="w-4 h-4 shrink-0" />
          {!collapsed && (
            <div className="flex items-center justify-between w-full">
              <span>Trader Zone AI</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded transition-colors dark:bg-white/10 dark:text-slate-200 dark:border dark:border-white/20 bg-[#F4E6CA] text-[#785114] border border-[#CCA051]/60">
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
          <Flame className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Hot Topics</span>}
        </NavLink>

        {/* Event Calendar */}
        <NavLink
          to="/calendar"
          onClick={onMobileClose}
          className={({ isActive }) => navClass(isActive)}
          title={collapsed ? "Event Calendar" : undefined}
        >
          <CalendarDays className="w-4 h-4 shrink-0" />
          {!collapsed && (
            <div className="flex items-center justify-between w-full">
              <span>Event Calendar</span>
              <span className="badge-live-red text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded transition-all">
                LIVE
              </span>
            </div>
          )}
        </NavLink>

        {/* Market Heatmap (Crypto & Gold) */}
        <NavLink
          to="/heatmap"
          onClick={onMobileClose}
          className={({ isActive }) => navClass(isActive)}
          title={collapsed ? "Market Heatmap" : undefined}
        >
          <LayoutGrid className="w-4 h-4 shrink-0" />
          {!collapsed && (
            <div className="flex items-center justify-between w-full">
              <span>Market Heatmap</span>
              <span className="badge-live-green text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded transition-all">
                LIVE
              </span>
            </div>
          )}
        </NavLink>

        {/* 100 Trades Challenge */}
        <NavLink
          to="/progress-tracker"
          onClick={onMobileClose}
          className={({ isActive }) => navClass(isActive)}
          title={collapsed ? "100 Trades Challenge" : undefined}
        >
          <Target className="w-4 h-4 shrink-0" />
          {!collapsed && <span>100 Trades Challenge</span>}
        </NavLink>

        {/* Market Hours */}
        <NavLink
          to="/market-hours"
          onClick={onMobileClose}
          className={({ isActive }) => navClass(isActive)}
          title={collapsed ? "Market Hours" : undefined}
        >
          <Clock className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Market Hours</span>}
        </NavLink>


        {/* Broker Hub */}
        <NavLink
          to="/broker-hub"
          onClick={onMobileClose}
          className={({ isActive }) => navClass(isActive)}
          title={collapsed ? "Broker Hub" : undefined}
        >
          <Layers className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Broker Hub</span>}
        </NavLink>

        {/* Settings */}
        <NavLink
          to="/settings"
          onClick={onMobileClose}
          className={({ isActive }) => navClass(isActive)}
          title={collapsed ? "Settings" : undefined}
        >
          <Sliders className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Settings</span>}
        </NavLink>
      </div>

      {/* Footer User Info */}
      {!collapsed && (
        <NavLink
          to={user ? "/settings" : "/login"}
          onClick={onMobileClose}
          className="p-3.5 border-t sidebar-border-subtle transition-colors block hover:bg-black/5 dark:hover:bg-white/5"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-purple-600 dark:from-slate-700 dark:to-slate-500 flex items-center justify-center text-white font-bold text-xs shadow-sm shrink-0">
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
          <div className="relative w-64 h-full sidebar-container shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
