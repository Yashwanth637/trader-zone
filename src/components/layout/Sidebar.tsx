import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import logoImg from '../../assets/logo.png';
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

  const desktopSidebarRef = useRef<HTMLElement>(null);
  const mobileSidebarRef = useRef<HTMLDivElement>(null);
  const desktopScrollRef = useRef<HTMLDivElement>(null);
  const mobileScrollRef = useRef<HTMLDivElement>(null);

  // Independent Scrolling Isolation:
  // When hovering on the sidebar, wheel events only scroll the sidebar
  // and are strictly prevented from bubbling or chaining to the main page / document.
  useEffect(() => {
    const bindWheelIsolation = (
      wrapper: HTMLElement | null,
      scroller: HTMLDivElement | null
    ) => {
      if (!wrapper || !scroller) return () => {};

      const handleWheel = (e: WheelEvent) => {
        const { deltaY } = e;
        if (deltaY === 0) return;

        const { scrollTop, scrollHeight, clientHeight } = scroller;
        const maxScrollTop = scrollHeight - clientHeight;
        const canScrollUp = scrollTop > 0;
        const canScrollDown = scrollTop < maxScrollTop - 1;

        // If hovering on sidebar header or footer (outside scroller)
        if (e.target && !scroller.contains(e.target as Node)) {
          if ((deltaY > 0 && canScrollDown) || (deltaY < 0 && canScrollUp)) {
            scroller.scrollTop += deltaY;
          }
          // Strictly prevent document/main page scroll
          e.preventDefault();
          return;
        }

        // If hovering inside scroller:
        // Prevent scroll past top or past bottom so it never chains to main page
        if (deltaY < 0 && !canScrollUp) {
          e.preventDefault();
        } else if (deltaY > 0 && !canScrollDown) {
          e.preventDefault();
        }
      };

      wrapper.addEventListener('wheel', handleWheel, { passive: false });
      return () => {
        wrapper.removeEventListener('wheel', handleWheel);
      };
    };

    const cleanupDesktop = bindWheelIsolation(desktopSidebarRef.current, desktopScrollRef.current);
    const cleanupMobile = bindWheelIsolation(mobileSidebarRef.current, mobileScrollRef.current);

    return () => {
      cleanupDesktop();
      cleanupMobile();
    };
  }, [mobileOpen, collapsed]);

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

  const renderSidebar = (scrollerRef: React.RefObject<HTMLDivElement>) => (
    <div className="flex flex-col h-full sidebar-container">
      {/* Brand Header */}
      <div className="flex items-center justify-between h-16 px-3.5 border-b border-[var(--sidebar-border)] shrink-0">
        {!collapsed && (
          <NavLink to="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl overflow-hidden border border-[var(--sidebar-border)] flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform bg-[var(--sidebar-bg)] shrink-0">
              <img src={logoImg} alt="Trader Zone Logo" className="w-full h-full object-cover" />
            </div>
            <div className="flex items-baseline font-black text-lg tracking-tight">
              <span className="text-[var(--text-hover)]">Trader</span>
              <span className="text-[var(--text-inactive)] ml-1 font-semibold">Zone 2.0</span>
            </div>
          </NavLink>
        )}
        {collapsed && (
          <NavLink to="/dashboard" className="mx-auto" title="Trader Zone">
            <div className="w-9 h-9 rounded-xl overflow-hidden border border-[var(--sidebar-border)] flex items-center justify-center shadow-sm hover:scale-105 transition-transform bg-[var(--sidebar-bg)] shrink-0">
              <img src={logoImg} alt="Trader Zone Logo" className="w-full h-full object-cover" />
            </div>
          </NavLink>
        )}
        <button
          onClick={onToggleCollapse}
          className="hidden md:flex items-center justify-center w-8 h-8 rounded-lg text-[var(--text-inactive)] hover:text-[var(--text-hover)] hover:bg-[var(--item-hover-bg)] transition-colors"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Links - Isolated Scroll Area */}
      <div
        ref={scrollerRef}
        className="flex-1 sidebar-scroll-area px-3 py-4 space-y-1.5 overscroll-contain"
      >
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
              <span className="sidebar-badge sidebar-badge-version">2.0</span>
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
              <span className="sidebar-badge sidebar-badge-live">
                <span className="sidebar-badge-dot" />
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
          <LayoutGrid className="shrink-0" />
          {!collapsed && (
            <div className="flex items-center justify-between w-full">
              <span>Market Heatmap</span>
              <span className="sidebar-badge sidebar-badge-live">
                <span className="sidebar-badge-dot" />
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

        {/* Settings */}
        <NavLink
          to="/settings"
          onClick={onMobileClose}
          className={({ isActive }) => navClass(isActive)}
          title={collapsed ? "Settings" : undefined}
        >
          <Sliders className="shrink-0" />
          {!collapsed && <span>Settings</span>}
        </NavLink>
      </div>

      {/* Footer User Info - Strictly Solid Matte */}
      {!collapsed && (
        <div className="sidebar-footer mt-auto px-3 py-3 border-t border-[var(--sidebar-border)] shrink-0">
          <NavLink
            to={user ? "/settings" : "/login"}
            onClick={onMobileClose}
            className="p-2.5 rounded-xl hover:bg-[var(--item-hover-bg)] transition-colors block group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[var(--item-active-bg)] border border-[var(--item-active-border)] flex items-center justify-center text-[var(--text-hover)] font-bold text-xs shadow-sm shrink-0">
                {user?.name ? user.name.slice(0, 2).toUpperCase() : 'TZ'}
              </div>
              <div className="overflow-hidden">
                <div className="text-xs font-semibold text-[var(--text-hover)] truncate">
                  {user ? user.name : 'Guest Trader'}
                </div>
                <div className="text-[10px] text-[var(--text-sub-item)] truncate">
                  {user ? user.email : 'Click to Sign In / Sync'}
                </div>
              </div>
            </div>
          </NavLink>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        ref={desktopSidebarRef}
        className={`hidden md:block fixed top-0 left-0 h-screen z-30 transition-all duration-300 overflow-hidden ${
          collapsed ? 'w-16' : 'w-[268px]'
        }`}
        style={{ width: collapsed ? '4rem' : 'var(--sidebar-width, 268px)' }}
      >
        {renderSidebar(desktopScrollRef)}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onMobileClose}
          />
          <div
            ref={mobileSidebarRef}
            className="relative w-[268px] h-full sidebar-container shadow-2xl z-10 animate-in slide-in-from-left duration-200 overflow-hidden"
          >
            {renderSidebar(mobileScrollRef)}
          </div>
        </div>
      )}
    </>
  );
};
