import React, { useState } from 'react';
import { useTrading } from '../../context/TradingContext';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import {
  Key,
  Lock,
  Eye,
  EyeOff,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Building2,
  Server,
  ShieldCheck,
  ChevronDown
} from 'lucide-react';
import {
  SUPPORTED_MT5_BROKERS,
  MT5Storage,
  connectAndSyncMT5
} from '../../lib/mt5BrokerService';

interface Mt5ConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncSuccess?: () => void;
}

export const Mt5ConnectModal: React.FC<Mt5ConnectModalProps> = ({
  isOpen,
  onClose,
  onSyncSuccess
}) => {
  const { accounts, addAccount, updateAccount, importTrades, setActiveAccountId } = useTrading();

  const [selectedBroker, setSelectedBroker] = useState<'Elefin' | 'XM' | 'Vantage' | 'Exness' | 'WinPro'>('Elefin');
  const [selectedServer, setSelectedServer] = useState<string>('ElefinTrade-Server');
  const [login, setLogin] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [startingBalance, setStartingBalance] = useState<string>('10000');

  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const brokerConfig = SUPPORTED_MT5_BROKERS.find(b => b.id === selectedBroker) || SUPPORTED_MT5_BROKERS[0];

  const handleBrokerChange = (b: 'Elefin' | 'XM' | 'Vantage' | 'Exness' | 'WinPro') => {
    setSelectedBroker(b);
    const cfg = SUPPORTED_MT5_BROKERS.find(item => item.id === b);
    if (cfg) {
      setSelectedServer(cfg.defaultServer);
    }
  };

  const handleConnectAndSync = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!login.trim()) {
      setStatusMsg({ type: 'error', text: `Please enter your ${selectedBroker} MT5 Login ID.` });
      return;
    }
    if (!password.trim()) {
      setStatusMsg({ type: 'error', text: 'Please enter your MT5 password (Investor or Master).' });
      return;
    }

    setIsConnecting(true);
    setStatusMsg({ type: 'info', text: `Connecting to ${selectedBroker} MT5 (${selectedServer})...` });

    try {
      // 1. Check if an account for this broker & login already exists
      const accountName = `${selectedBroker} MT5 (#${login.trim()})`;
      let targetAccount = accounts.find(
        a => a.mt5Login === login.trim() || a.name.toLowerCase().includes(login.trim().toLowerCase())
      );

      // 2. Perform automated MT5 synchronization
      const result = await connectAndSyncMT5({
        broker: selectedBroker,
        server: selectedServer,
        login: login.trim(),
        password: password.trim(),
        targetAccountId: targetAccount?.id
      });

      const initBal = parseFloat(startingBalance) || result.initialBalance || 10000;
      const curBal = result.currentBalance || initBal;

      // 3. Create dedicated account if new, ensuring 100% isolation from Delta
      if (!targetAccount) {
        targetAccount = addAccount({
          name: accountName,
          broker: `${selectedBroker} (MetaTrader 5)`,
          type: 'Live',
          currency: result.currency || 'USD',
          initialBalance: initBal,
          currentBalance: curBal,
          isDefault: accounts.length === 0,
          mt5Login: login.trim(),
          mt5Server: selectedServer,
          lastSynced: new Date().toISOString()
        });
      } else {
        updateAccount(targetAccount.id, {
          initialBalance: initBal,
          currentBalance: curBal,
          mt5Login: login.trim(),
          mt5Server: selectedServer,
          lastSynced: new Date().toISOString()
        });
      }

      // 4. Scope and import all synced trades strictly to this account
      const isolatedTrades = result.trades.map(t => ({
        ...t,
        accountId: targetAccount!.id
      }));

      if (isolatedTrades.length > 0) {
        importTrades(isolatedTrades);
      }

      // 5. Save credentials locally
      MT5Storage.saveCredentials({
        broker: selectedBroker,
        server: selectedServer,
        login: login.trim(),
        password: password.trim(),
        accountId: targetAccount.id
      }, targetAccount.id);

      // 6. Switch active account to this newly synced account
      setActiveAccountId(targetAccount.id);

      setStatusMsg({
        type: 'success',
        text: `Connected to ${selectedBroker}! Account created: ${accountName} · Synced ${isolatedTrades.length} trade${isolatedTrades.length === 1 ? '' : 's'} · Balance: $${curBal.toLocaleString()}`
      });

      onSyncSuccess?.();

      setTimeout(() => {
        setIsConnecting(false);
        onClose();
      }, 1500);
    } catch (err: any) {
      setIsConnecting(false);
      setStatusMsg({
        type: 'error',
        text: err.message || 'Failed to connect to MT5 server. Please check your credentials.'
      });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Connect Broker" maxWidth="md">
      <div className="-mt-3 mb-4">
        <p className="text-xs text-muted">
          Select your broker and enter MT5 credentials
        </p>
      </div>

      <form onSubmit={handleConnectAndSync} className="space-y-4">
        {/* Choose Broker */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-amber-400" />
            <span>Choose Broker</span>
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {SUPPORTED_MT5_BROKERS.map(b => {
              const isSelected = selectedBroker === b.id;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => handleBrokerChange(b.id)}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all border text-center ${
                    isSelected
                      ? 'bg-purple-500/15 border-purple-500 text-white shadow-[0_0_12px_rgba(168,85,247,0.35)] ring-1 ring-purple-500'
                      : 'bg-surface border-border text-muted hover:text-foreground hover:border-primary/40'
                  }`}
                >
                  {b.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Server Selection */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-purple-400" />
              <span>{selectedBroker} Server</span>
            </label>
            <span className="text-[10.5px] text-muted">Select or paste exact server</span>
          </div>
          <div className="relative">
            <input
              type="text"
              required
              list="mt5-server-suggestions"
              value={selectedServer}
              onChange={e => setSelectedServer(e.target.value)}
              placeholder="e.g. ElefinTrade-Server"
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-border text-foreground text-xs font-mono font-semibold focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
            />
            <datalist id="mt5-server-suggestions">
              {brokerConfig.servers.map(srv => (
                <option key={srv} value={srv} />
              ))}
            </datalist>
          </div>

          {/* Quick Server Chips */}
          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
            {brokerConfig.servers.map(srv => (
              <button
                key={srv}
                type="button"
                onClick={() => setSelectedServer(srv)}
                className={`text-[10px] px-2 py-0.5 rounded-lg border transition-all font-mono ${
                  selectedServer === srv
                    ? 'bg-purple-500/20 border-purple-500 text-purple-300 font-bold'
                    : 'bg-surface border-border text-muted hover:text-foreground hover:border-purple-500/40'
                }`}
              >
                {srv}
              </button>
            ))}
          </div>
        </div>

        {/* MT5 Login */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Key className="w-3.5 h-3.5 text-cyan-400" />
            <span>{selectedBroker} MT5 Login</span>
          </label>
          <div className="relative">
            <input
              type="text"
              required
              value={login}
              onChange={e => setLogin(e.target.value)}
              placeholder="e.g. 12345806865"
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-border text-foreground text-xs font-mono focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 pr-10"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
              <Key className="w-4 h-4 text-cyan-400/70" />
            </div>
          </div>
        </div>

        {/* MT5 Password */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-purple-400" />
            <span>MT5 Password</span>
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-border text-foreground text-xs font-mono focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors"
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-muted/80 mt-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Use your <strong>Investor (Read-Only) Password</strong> for secure, view-only sync.</span>
          </div>
        </div>

        {/* Starting Balance */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground flex items-center justify-between">
            <span>Starting Capital / Initial Balance ($)</span>
            <span className="text-[10.5px] text-muted">Auto-detected or custom</span>
          </label>
          <input
            type="number"
            step="any"
            min="0"
            value={startingBalance}
            onChange={e => setStartingBalance(e.target.value)}
            placeholder="10000"
            className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-border text-foreground text-xs font-mono focus:outline-none focus:border-primary"
          />
        </div>

        {/* Status Message */}
        {statusMsg && (
          <div
            className={`p-3 rounded-xl border text-xs flex items-center gap-2 transition-all ${
              statusMsg.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : statusMsg.type === 'error'
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                : 'bg-primary/10 border-primary/30 text-primary-light'
            }`}
          >
            {statusMsg.type === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0" />}
            {statusMsg.type === 'error' && <AlertCircle className="w-4 h-4 shrink-0" />}
            {statusMsg.type === 'info' && <RefreshCw className="w-4 h-4 shrink-0 animate-spin" />}
            <span>{statusMsg.text}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isConnecting}
          >
            Cancel
          </Button>
          <button
            type="submit"
            disabled={isConnecting}
            className="px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-400 hover:to-cyan-500 transition-all flex items-center gap-2 shadow-lg shadow-cyan-500/20 disabled:opacity-50 cursor-pointer"
          >
            {isConnecting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Connecting & Syncing...</span>
              </>
            ) : (
              <span>Connect & Sync</span>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
