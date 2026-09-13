import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTrading } from '../../context/TradingContext';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';
import { DeviceSyncModal } from '../auth/DeviceSyncModal';
import {
  Menu,
  Plus,
  Moon,
  Sun,
  ChevronDown,
  Wallet,
  Activity,
  Calculator,
  User as UserIcon,
  LogOut,
  Smartphone,
  LogIn
} from 'lucide-react';
import { detectTradingSession } from '../../lib/calculations';

interface HeaderProps {
  onOpenMobileMenu: () => void;
  onOpenAddTrade: () => void;
  onOpenCalculator: () => void;
  collapsed: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenMobileMenu,
  onOpenAddTrade,
  onOpenCalculator,
  collapsed
}) => {
  const { accounts, activeAccountId, setActiveAccountId, activeAccount } = useTrading();
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [deviceSyncOpen, setDeviceSyncOpen] = useState(false);
  const [currentSession, setCurrentSession] = useState<string>('');

  useEffect(() => {
    const updateSession = () => {
      const sess = detectTradingSession(new Date().toISOString());
      setCurrentSession(sess);
    };
    updateSession();
    const interval = setInterval(updateSession, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header
      className={`sticky top-0 z-20 h-16 bg-surface/85 backdrop-blur-md border-b border-border transition-all duration-300 px-4 md:px-6 flex items-center justify-between ${
        collapsed ? 'md:ml-16' : 'md:ml-64'
      }`}
    >
      {/* Left side: Mobile Toggle & Account Selector */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="md:hidden p-2 rounded-xl text-muted hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Account Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => setAccountDropdownOpen(!accountDropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-card border border-border hover:border-primary/40 text-xs font-semibold text-foreground transition-colors shadow-sm"
          >
            <Wallet className="w-3.5 h-3.5 text-primary" />
            <span className="max-w-[140px] md:max-w-[180px] truncate">
              {activeAccountId === 'all'
                ? 'All Accounts'
                : activeAccount?.name || 'Select Account'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-muted" />
          </button>

          {accountDropdownOpen && (
            <div className="absolute left-0 mt-2 w-64 bg-surface border border-border rounded-xl shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted">
                Switch Trading Account
              </div>
              <button
                onClick={() => {
                  setActiveAccountId('all');
                  setAccountDropdownOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-xs hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-between ${
                  activeAccountId === 'all' ? 'text-primary font-bold bg-primary/10' : 'text-foreground'
                }`}
              >
                <span>All Accounts Combined</span>
                <span className="text-[10px] text-muted">Aggregated</span>
              </button>
              {accounts.map(acc => (
                <button
                  key={acc.id}
                  onClick={() => {
                    setActiveAccountId(acc.id);
                    setAccountDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-between ${
                    activeAccountId === acc.id ? 'text-primary font-bold bg-primary/10' : 'text-foreground'
                  }`}
                >
                  <div className="truncate pr-2">
                    <div className="font-medium">{acc.name}</div>
                    <div className="text-[10px] text-muted">{acc.broker} ({acc.type})</div>
                  </div>
                  <span className="font-mono text-xs text-foreground font-bold">
                    ${acc.currentBalance.toLocaleString()}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Live Market Session Indicator */}
        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-card border border-border text-[11px] font-medium text-foreground">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <Activity className="w-3.5 h-3.5 text-emerald-500 ml-0.5" />
          <span>Session: <strong className="text-foreground font-bold">{currentSession}</strong></span>
        </div>
      </div>

      {/* Right side: Quick Calculator, Add Trade, Theme Toggle */}
      <div className="flex items-center gap-2.5">
        {/* Quick Position Calculator */}
        <button
          onClick={onOpenCalculator}
          title="Position Size Calculator"
          className="p-2 rounded-xl text-muted hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 border border-transparent hover:border-border transition-all"
        >
          <Calculator className="w-4 h-4" />
        </button>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          className="p-2 rounded-xl text-muted hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 border border-border transition-all shadow-sm flex items-center gap-1.5"
        >
          {theme === 'dark' ? (
            <>
              <Sun className="w-4 h-4 text-amber-400" />
              <span className="text-[11px] font-semibold text-muted hidden sm:inline">Light</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 text-primary" />
              <span className="text-[11px] font-semibold text-muted hidden sm:inline">Dark</span>
            </>
          )}
        </button>

        {/* Quick Add Trade Button */}
        <Button
          onClick={onOpenAddTrade}
          size="sm"
          variant="primary"
          icon={<Plus className="w-4 h-4" />}
        >
          <span className="hidden sm:inline">Add Trade</span>
        </Button>

        {/* User Account / Cross-Device Sync Profile */}
        <div className="relative pl-1 border-l border-border">
          {user ? (
            <button
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className="flex items-center gap-2 p-1 sm:px-2.5 sm:py-1.5 rounded-xl bg-surface-card border border-border hover:border-primary/40 text-xs text-foreground transition-all shadow-sm"
              title={user.email}
            >
              <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-primary to-purple-600 flex items-center justify-center text-white text-[10px] font-black shrink-0">
                {user.name ? user.name.slice(0, 2).toUpperCase() : 'TZ'}
              </div>
              <span className="hidden sm:inline font-semibold max-w-[110px] truncate">
                {user.name}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-muted hidden sm:inline" />
            </button>
          ) : (
            <Link
              to="/login"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/30 text-primary text-xs font-bold hover:bg-primary/20 transition-all shadow-sm"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </Link>
          )}

          {userDropdownOpen && user && (
            <div className="absolute right-0 mt-2 w-64 bg-surface border border-border rounded-xl shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3.5 py-2 border-b border-border">
                <div className="text-xs font-bold text-foreground truncate">{user.name}</div>
                <div className="text-[11px] text-muted truncate">{user.email}</div>
                <div className="mt-1 flex items-center gap-1.5 text-[10px] text-emerald-400 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Cloud Synced Account</span>
                </div>
              </div>

              <div className="py-1">
                <button
                  onClick={() => {
                    setUserDropdownOpen(false);
                    setDeviceSyncOpen(true);
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs text-foreground hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2.5 transition-colors"
                >
                  <Smartphone className="w-4 h-4 text-primary" />
                  <div>
                    <span className="block font-medium">Link Phone / Device</span>
                    <span className="text-[10px] text-muted">Sync with phone via 6-digit code</span>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setUserDropdownOpen(false);
                    navigate('/settings');
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs text-foreground hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2.5 transition-colors"
                >
                  <UserIcon className="w-4 h-4 text-muted" />
                  <span>Profile & Preferences</span>
                </button>
              </div>

              <div className="pt-1 border-t border-border">
                <button
                  onClick={() => {
                    setUserDropdownOpen(false);
                    logout();
                    navigate('/login');
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs text-rose-400 hover:bg-rose-500/10 flex items-center gap-2.5 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Device Sync & Pairing Modal */}
      {deviceSyncOpen && (
        <DeviceSyncModal
          isOpen={deviceSyncOpen}
          onClose={() => setDeviceSyncOpen(false)}
        />
      )}
    </header>
  );
};

export const Footer: React.FC<{ collapsed: boolean }> = ({ collapsed }) => {
  return (
    <footer
      className={`py-8 px-6 border-t border-border text-center text-xs text-muted transition-all duration-300 ${
        collapsed ? 'md:ml-16' : 'md:ml-64'
      }`}
    >
      <div className="flex flex-col sm:flex-row items-center justify-between max-w-6xl mx-auto gap-4">
        <div className="flex items-center gap-2">
          <span className="font-black text-foreground">Trader</span>
          <span className="text-primary font-bold">Zone</span>
          <span>· The AI-Powered Trading Journal</span>
        </div>
        <div className="flex items-center gap-6">
          <a href="/#/terms" className="hover:text-foreground transition-colors">Terms of Service</a>
          <a href="/#/privacy" className="hover:text-foreground transition-colors">Privacy Policy</a>
          <a href="/#/disclaimer" className="hover:text-foreground transition-colors">Legal Disclaimer</a>
        </div>
        <div>
          <span>Personal Edition · 100% Client-Side Private</span>
        </div>
      </div>
    </footer>
  );
};
