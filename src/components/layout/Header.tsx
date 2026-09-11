import React, { useState, useEffect } from 'react';
import { useTrading } from '../../context/TradingContext';
import { useTheme } from '../../context/ThemeContext';
import { Button } from '../ui/Button';
import {
  Menu,
  Plus,
  Moon,
  Sun,
  ChevronDown,
  Wallet,
  Activity,
  Calculator
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
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);
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
      className={`sticky top-0 z-20 h-16 bg-surface/80 backdrop-blur-md border-b border-border transition-all duration-300 px-4 md:px-6 flex items-center justify-between ${
        collapsed ? 'md:ml-16' : 'md:ml-64'
      }`}
    >
      {/* Left side: Mobile Toggle & Account Selector */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="md:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Account Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => setAccountDropdownOpen(!accountDropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-card border border-border hover:border-primary/40 text-xs font-semibold text-white transition-colors"
          >
            <Wallet className="w-3.5 h-3.5 text-primary-light" />
            <span className="max-w-[140px] md:max-w-[180px] truncate">
              {activeAccountId === 'all'
                ? 'All Accounts'
                : activeAccount?.name || 'Select Account'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {accountDropdownOpen && (
            <div className="absolute left-0 mt-2 w-64 bg-surface border border-border-glow rounded-xl shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Switch Trading Account
              </div>
              <button
                onClick={() => {
                  setActiveAccountId('all');
                  setAccountDropdownOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-xs hover:bg-white/5 flex items-center justify-between ${
                  activeAccountId === 'all' ? 'text-primary-light font-bold bg-primary/10' : 'text-slate-300'
                }`}
              >
                <span>All Accounts Combined</span>
                <span className="text-[10px] text-slate-400">Aggregated</span>
              </button>
              {accounts.map(acc => (
                <button
                  key={acc.id}
                  onClick={() => {
                    setActiveAccountId(acc.id);
                    setAccountDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-white/5 flex items-center justify-between ${
                    activeAccountId === acc.id ? 'text-primary-light font-bold bg-primary/10' : 'text-slate-300'
                  }`}
                >
                  <div className="truncate pr-2">
                    <div>{acc.name}</div>
                    <div className="text-[10px] text-slate-400">{acc.broker} ({acc.type})</div>
                  </div>
                  <span className="font-mono text-xs text-white">
                    ${acc.currentBalance.toLocaleString()}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Live Market Session Indicator */}
        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-card border border-border text-[11px] font-medium text-slate-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <Activity className="w-3.5 h-3.5 text-emerald-400 ml-0.5" />
          <span>Session: <strong className="text-white">{currentSession}</strong></span>
        </div>
      </div>

      {/* Right side: Quick Calculator, Add Trade, Theme Toggle, Profile */}
      <div className="flex items-center gap-2.5">
        {/* Quick Position Calculator */}
        <button
          onClick={onOpenCalculator}
          title="Position Size Calculator"
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-border transition-all"
        >
          <Calculator className="w-4 h-4" />
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          title="Toggle Theme"
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-border transition-all"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
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
      </div>
    </header>
  );
};

export const Footer: React.FC<{ collapsed: boolean }> = ({ collapsed }) => {
  return (
    <footer
      className={`py-8 px-6 border-t border-border/80 text-center text-xs text-slate-500 transition-all duration-300 ${
        collapsed ? 'md:ml-16' : 'md:ml-64'
      }`}
    >
      <div className="flex flex-col sm:flex-row items-center justify-between max-w-6xl mx-auto gap-4">
        <div className="flex items-center gap-2">
          <span className="font-bold text-white">Trader</span>
          <span className="text-primary-light font-bold">Zone</span>
          <span>· The AI-Powered Trading Journal</span>
        </div>
        <div className="flex items-center gap-6">
          <a href="/#/terms" className="hover:text-slate-300 transition-colors">Terms of Service</a>
          <a href="/#/privacy" className="hover:text-slate-300 transition-colors">Privacy Policy</a>
          <a href="/#/disclaimer" className="hover:text-slate-300 transition-colors">Legal Disclaimer</a>
        </div>
        <div>
          <span>Personal Edition · 100% Client-Side Private</span>
        </div>
      </div>
    </footer>
  );
};
