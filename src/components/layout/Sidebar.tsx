import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
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
  Sliders,
  ChevronDown,
  Layers,
  ChevronLeft,
  ChevronRight,
  Target,
  Flame,
  CalendarDays,
  LayoutGrid,
  Sun,
  Moon
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
  const { theme, toggleTheme } = useTheme();
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
    `sidebar-nav-item ${isActive ? 'active' : ''} ${collapsed ? 'justify-center !px-0' : ''}`;

  const sidebarContent = (
    <div className="flex flex-col h-full sidebar-container border-r border-[var(--sidebar-border)] transition-colors duration-200">
      {/* Brand Header */}
      <div className="flex items-center justify-between h-16 px-3.5 border-b border-[var(--sidebar-border)]">
        {!collapsed && (
          <NavLink to="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl bg-[var(--sidebar-surface)] border border-[var(--sidebar-border)] flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
              <Sparkles className="w-4 h-4 text-[var(--sidebar-accent)]" />
            </div>
            <div className="flex items-baseline font-black text-lg tracking-tight">
              <span className="text-[var(--sidebar-accent-strong)]">Trader</span>
              <span className="text-[var(--sidebar-accent)] ml-0.5">Zone</span>
              <span className="sidebar-badge ai ml-1.5 text-[9px] uppercase tracking-wider">
                2.0
              </span>
            </div>
          </NavLink>
        )}
        {collapsed && (
          <NavLink to="/dashboard" className="mx-auto">
            <div className="w-9 h-9 rounded-xl bg-[var(--sidebar-surface)] border border-[var(--sidebar-border)] flex items-center justify-center shadow-sm">
              <Sparkles className="w-5 h-5 text-[var(--sidebar-accent)]" />
            </div>
          </NavLink>
        )}
        <div className="flex items-center gap-1.5">
          {!collapsed && (
            <button
              onClick={toggleTheme}
              className="sidebar-theme-toggle"
              title={theme === 'dark' ? "Switch to Light Theme" : "Switch to Dark Theme"}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          )}
          <button
            onClick={onToggleCollapse}
            className="hidden md:flex items-center justify-center w-8 h-8 rounded-lg text-[var(--sidebar-muted)] hover:text-[var(--sidebar-accent-strong)] hover:bg-[var(--sidebar-surface)] transition-colors"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5">
        {/* Main Dashboard */}
        <NavLink
          to="/dashboard"
          onClick={onMobileClose}
          className={({ isActive }) => navClass(isActive)}
          title={collapsed ? "Dashboard" : undefined}
        >
          <LayoutDashboard className="shrink-0" />
          {!collapsed && <span>Dashboard</span>}
        </NavLink>

        {/* Analytics Dropdown Group */}
        <div>
          <div
            onClick={() => setAnalyticsOpen(!analyticsOpen)}
            className={`sidebar-nav-item ${isAnalyticsActive ? 'active' : ''} ${analyticsOpen ? 'expanded' : ''} ${collapsed ? 'justify-center !px-0' : ''}`}
            title={collapsed ? "Analytics" : undefined}
          >
            <BarChart3 className="shrink-0" />
            {!collapsed && (
              <>
                <span>Analytics</span>
                <ChevronDown className="sidebar-chevron" />
              </>
            )}
          </div>

          {(!collapsed || mobileOpen) && (
            <div className={`sidebar-submenu ${analyticsOpen ? 'open' : ''}`}>
              <div className="sidebar-submenu-inner py-1 space-y-0.5">
                <NavLink
                  to="/analytics"
                  onClick={onMobileClose}
                  className={({ isActive }) => isActive ? 'active' : ''}
                >
                  <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                  <span>Performance</span>
                </NavLink>
                <NavLink
                  to="/reports"
                  onClick={onMobileClose}
                  className={({ isActive }) => isActive ? 'active' : ''}
                >
                  <FileText className="w-3.5 h-3.5 shrink-0" />
                  <span>Reports</span>
                </NavLink>
                <NavLink
                  to="/day-view"
                  onClick={onMobileClose}
                  className={({ isActive }) => isActive ? 'active' : ''}
                >
                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                  <span>Day View</span>
                </NavLink>
                <NavLink
                  to="/strategies"
                  onClick={onMobileClose}
                  className={({ isActive }) => isActive ? 'active' : ''}
                >
                  <Layers className="w-3.5 h-3.5 shrink-0" />
                  <span>Strategies</span>
                </NavLink>
                <NavLink
                  to="/replay"
                  onClick={onMobileClose}
                  className={({ isActive }) => isActive ? 'active' : ''}
                >
                  <PlayCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>Trade Replay</span>
                </NavLink>
                <NavLink
                  to="/share-cards"
                  onClick={onMobileClose}
                  className={({ isActive }) => isActive ? 'active' : ''}
                >
                  <Share2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Share Cards</span>
                </NavLink>
              </div>
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
          <Tv className="shrink-0" />
          {!collapsed && <span>Web Terminal</span>}
        </NavLink>

        {/* Trade History */}
        <NavLink
          to="/trades"
          onClick={onMobileClose}
          className={({ isActive }) => navClass(isActive)}
          title={collapsed ? "Trade History" : undefined}
        >
          <History className="shrink-0" />
          {!collapsed && <span>Trade History</span>}
        </NavLink>

        {/* Calendar Journal */}
        <NavLink
          to="/journal"
          onClick={onMobileClose}
          className={({ isActive }) => navClass(isActive)}
          title={collapsed ? "Journal" : undefined}
        >
          <Calendar className="shrink-0" />
          {!collapsed && <span>Journal</span>}
        </NavLink>

        {/* Trader Zone AI 2.0 */}
        <NavLink
          to="/ai-2"
          onClick={onMobileClose}
          className={({ isActive }) => navClass(isActive)}
          title={collapsed ? "Trader Zone AI 2.0" : undefined}
        >
          <Sparkles className="shrink-0" />
          {!collapsed && (
            <div className="flex items-center justify-between w-full">
              <span>Trader Zone AI</span>
              <span className="sidebar-badge ai">2.0</span>
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
          <Flame className="shrink-0" />
          {!collapsed && <span>Hot Topics</span>}
        </NavLink>

        {/* Event Calendar */}
        <NavLink
          to="/calendar"
          onClick={onMobileClose}
          className={({ isActive }) => navClass(isActive)}
          title={collapsed ? "Event Calendar" : undefined}
        >
          <CalendarDays className="shrink-0" />
          {!collapsed && (
            <div className="flex items-center justify-between w-full">
              <span>Event Calendar</span>
              <span className="sidebar-badge live-red">LIVE</span>
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
          <LayoutGrid className="shrink-0" />
          {!collapsed && (
            <div className="flex items-center justify-between w-full">
              <span>Market Heatmap</span>
              <span className="sidebar-badge live-green">LIVE</span>
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
          <Target className="shrink-0" />
          {!collapsed && <span>100 Trades Challenge</span>}
        </NavLink>

        {/* Market Hours */}
        <NavLink
          to="/market-hours"
          onClick={onMobileClose}
          className={({ isActive }) => navClass(isActive)}
          title={collapsed ? "Market Hours" : undefined}
        >
          <Clock className="shrink-0" />
          {!collapsed && <span>Market Hours</span>}
        </NavLink>

        {/* Broker Hub */}
        <NavLink
          to="/broker-hub"
          onClick={onMobileClose}
          className={({ isActive }) => navClass(isActive)}
          title={collapsed ? "Broker Hub" : undefined}
        >
          <Layers className="shrink-0" />
          {!collapsed && <span>Broker Hub</span>}
        </NavLink>
      </div>

      {/* Footer User Info + Settings */}
      <div className="sidebar-footer mt-auto px-3 py-3 border-t border-[var(--sidebar-border)] space-y-1">
        <NavLink
          to="/settings"
          onClick={onMobileClose}
          className={({ isActive }) => navClass(isActive)}
          title={collapsed ? "Settings" : undefined}
        >
          <Sliders className="shrink-0" />
          {!collapsed && <span>Settings</span>}
        </NavLink>

        {!collapsed && (
          <NavLink
            to={user ? "/settings" : "/login"}
            onClick={onMobileClose}
            className="p-2.5 rounded-xl hover:bg-[var(--sidebar-surface)] transition-all block group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[var(--sidebar-accent)] to-[var(--sidebar-accent-strong)] flex items-center justify-center text-white dark:text-black font-bold text-xs shadow-sm shrink-0">
                {user?.name ? user.name.slice(0, 2).toUpperCase() : 'TZ'}
              </div>
              <div className="overflow-hidden">
                <div className="text-xs font-semibold text-[var(--sidebar-accent-strong)] truncate">
                  {user ? user.name : 'Guest Trader'}
                </div>
                <div className="text-[10px] text-[var(--sidebar-muted)] truncate">
                  {user ? user.email : 'Click to Sign In / Sync'}
                </div>
              </div>
            </div>
          </NavLink>
        )}
      </div>
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
