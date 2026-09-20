import React, { useState, useEffect } from 'react';
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
  Globe,
  Upload,
  ExternalLink,
  FileText
} from 'lucide-react';
import {
  SUPPORTED_MT5_BROKERS,
  MT5Storage,
  connectAndSyncMT5,
  parseMt5ReportFile
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

  const [activeTab, setActiveTab] = useState<'cloud' | 'file'>('cloud');
  const [selectedBroker, setSelectedBroker] = useState<'Elefin' | 'XM' | 'Vantage' | 'Exness' | 'WinPro'>('Elefin');
  const [selectedServer, setSelectedServer] = useState<string>('ElefinTrade-Server');
  const [login, setLogin] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [startingBalance, setStartingBalance] = useState<string>('10000');

  const [cloudToken, setCloudToken] = useState<string>('');
  const [showTokenSettings, setShowTokenSettings] = useState<boolean>(false);

  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Load saved cloud token on open
  useEffect(() => {
    if (isOpen) {
      const savedToken = MT5Storage.getCloudToken();
      if (savedToken) {
        setCloudToken(savedToken);
      }
    }
  }, [isOpen]);

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

    // Save token if provided
    if (cloudToken.trim()) {
      MT5Storage.saveCloudToken(cloudToken.trim());
    }

    setIsConnecting(true);
    setStatusMsg({ type: 'info', text: `Connecting to ${selectedBroker} MT5 (${selectedServer})...` });

    try {
      const accountName = `${selectedBroker} MT5 (#${login.trim()})`;
      let targetAccount = accounts.find(
        a => a.mt5Login === login.trim() || a.name.toLowerCase().includes(login.trim().toLowerCase())
      );

      const result = await connectAndSyncMT5({
        broker: selectedBroker,
        server: selectedServer,
        login: login.trim(),
        password: password.trim(),
        targetAccountId: targetAccount?.id,
        metaApiToken: cloudToken.trim() || undefined
      });

      const initBal = parseFloat(startingBalance) || result.initialBalance || 10000;
      const curBal = result.currentBalance || initBal;

      // 1. Create dedicated account if new
      let updatedAccountsList = [...accounts];
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
        updatedAccountsList = [targetAccount, ...accounts];
      } else {
        updateAccount(targetAccount.id, {
          initialBalance: initBal,
          currentBalance: curBal,
          mt5Login: login.trim(),
          mt5Server: selectedServer,
          lastSynced: new Date().toISOString()
        });
      }

      // 2. Scope and import all synced trades strictly to this account
      const isolatedTrades = result.trades.map(t => ({
        ...t,
        accountId: targetAccount!.id
      }));

      // Pass updatedAccountsList so deduplication engine immediately recognizes the new account
      if (isolatedTrades.length > 0) {
        importTrades(isolatedTrades, updatedAccountsList);
      }

      // 3. Save credentials locally
      MT5Storage.saveCredentials({
        broker: selectedBroker,
        server: selectedServer,
        login: login.trim(),
        password: password.trim(),
        accountId: targetAccount.id
      }, targetAccount.id);

      // 4. Switch active account to this newly synced account
      setActiveAccountId(targetAccount.id);

      setStatusMsg({
        type: 'success',
        text: `Connected to ${selectedBroker}! Account: ${accountName} · Balance: $${curBal.toLocaleString()} · ${isolatedTrades.length} trade${isolatedTrades.length === 1 ? '' : 's'} synced.`
      });

      onSyncSuccess?.();

      setTimeout(() => {
        setIsConnecting(false);
        onClose();
      }, 1600);
    } catch (err: any) {
      setIsConnecting(false);
      setStatusMsg({
        type: 'error',
        text: err.message || 'Failed to connect to MT5 server.'
      });
    }
  };

  // Handle direct MT5 statement file upload (HTML or CSV)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) return;

      try {
        const accountLogin = login.trim() || 'Imported';
        const accountName = `${selectedBroker} MT5 (${accountLogin})`;

        let targetAccount = accounts.find(
          a => a.name.toLowerCase() === accountName.toLowerCase() || (a.mt5Login && a.mt5Login === accountLogin)
        );

        const tempAccId = targetAccount?.id || `acc-mt5-${Date.now()}`;
        const result = parseMt5ReportFile({
          fileContent: content,
          accountId: tempAccId,
          broker: selectedBroker,
          server: selectedServer,
          login: accountLogin
        });

        const initBal = result.initialBalance || 10000;
        const curBal = result.currentBalance || initBal;

        let updatedAccountsList = [...accounts];
        if (!targetAccount) {
          targetAccount = addAccount({
            name: accountName,
            broker: `${selectedBroker} (MetaTrader 5)`,
            type: 'Live',
            currency: result.currency || 'USD',
            initialBalance: initBal,
            currentBalance: curBal,
            isDefault: accounts.length === 0,
            mt5Login: accountLogin,
            mt5Server: selectedServer,
            lastSynced: new Date().toISOString()
          });
          updatedAccountsList = [targetAccount, ...accounts];
        } else {
          updateAccount(targetAccount.id, {
            initialBalance: initBal,
            currentBalance: curBal,
            lastSynced: new Date().toISOString()
          });
        }

        const isolatedTrades = result.trades.map(t => ({
          ...t,
          accountId: targetAccount!.id
        }));

        importTrades(isolatedTrades, updatedAccountsList);
        setActiveAccountId(targetAccount.id);

        setStatusMsg({
          type: 'success',
          text: `Successfully imported ${isolatedTrades.length} trades from MT5 statement into ${accountName}! Balance: $${curBal.toLocaleString()}`
        });

        setTimeout(() => {
          onClose();
        }, 1500);
      } catch (err: any) {
        setStatusMsg({
          type: 'error',
          text: `Failed to parse MT5 statement: ${err.message}`
        });
      }
    };
    reader.readAsText(file);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Connect Broker" maxWidth="md">
      <div className="-mt-3 mb-4 flex items-center justify-between">
        <p className="text-xs text-muted">
          Select your broker and enter MT5 credentials
        </p>

        {/* Tab switch */}
        <div className="flex items-center p-0.5 rounded-lg bg-surface border border-border text-[11px]">
          <button
            type="button"
            onClick={() => setActiveTab('cloud')}
            className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
              activeTab === 'cloud'
                ? 'bg-purple-500 text-white shadow-sm'
                : 'text-muted hover:text-foreground'
            }`}
          >
            Direct Cloud Sync
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('file')}
            className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
              activeTab === 'file'
                ? 'bg-purple-500 text-white shadow-sm'
                : 'text-muted hover:text-foreground'
            }`}
          >
            Drop Statement (.html/.csv)
          </button>
        </div>
      </div>

      {activeTab === 'cloud' ? (
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

          {/* Cloud Gateway Token (Optional / Saved) */}
          <div className="pt-1">
            <div className="flex items-center justify-between mb-1">
              <button
                type="button"
                onClick={() => setShowTokenSettings(!showTokenSettings)}
                className="text-[11px] text-primary hover:text-primary-hover font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>{showTokenSettings ? 'Hide Cloud Token Settings' : cloudToken ? 'Cloud Gateway Token Configured ✓' : 'Add Free MetaApi Cloud Token (Recommended for Direct Web Sync)'}</span>
              </button>
              <a
                href="https://metaapi.cloud"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10.5px] text-muted hover:text-foreground flex items-center gap-1"
              >
                <span>Get Free Token (30s)</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {(showTokenSettings || !cloudToken) && (
              <div className="p-3 rounded-xl bg-surface border border-border space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground text-[11px]">Free MetaApi Token</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                    100% Free Forever
                  </span>
                </div>
                <input
                  type="password"
                  value={cloudToken}
                  onChange={e => setCloudToken(e.target.value)}
                  placeholder="Paste your free token from app.metaapi.cloud"
                  className="w-full px-3 py-1.5 rounded-lg bg-surface-card border border-border text-foreground text-xs font-mono focus:outline-none focus:border-primary"
                />
                <p className="text-[10.5px] text-muted leading-relaxed">
                  MetaTrader 5 servers require a cloud API gateway to connect directly from web browsers. Register at <a href="https://metaapi.cloud" target="_blank" rel="noopener noreferrer" className="text-primary underline">metaapi.cloud</a>, copy your personal token, and paste it here once.
                </p>
              </div>
            )}
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
      ) : (
        /* Direct MT5 File Upload Tab */
        <div className="space-y-4 py-2">
          <div className="p-5 rounded-2xl border-2 border-dashed border-border hover:border-primary/50 text-center transition-all bg-surface/50">
            <FileText className="w-10 h-10 text-primary mx-auto mb-2.5 opacity-80" />
            <h4 className="text-sm font-bold text-foreground mb-1">
              Drop Your MT5 Report (.html or .csv)
            </h4>
            <p className="text-xs text-muted max-w-sm mx-auto mb-4">
              In MT5: Right-click on <strong>Trade History</strong> &rarr; select <strong>Report</strong> &rarr; save as <strong>HTML or CSV</strong> and drop it here.
            </p>

            <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover transition-colors cursor-pointer shadow-sm">
              <Upload className="w-4 h-4" />
              <span>Select MT5 Report File</span>
              <input
                type="file"
                accept=".html,.htm,.csv,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          <div className="p-3.5 rounded-xl bg-surface border border-border text-xs text-muted space-y-1.5">
            <div className="font-semibold text-foreground text-[11px] flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>100% Instant, Zero Cloud Setup</span>
            </div>
            <p className="text-[10.5px] leading-relaxed">
              Automatically creates <strong>{selectedBroker} MT5</strong> account, extracts your starting balance, and loads every single trade without needing tokens or third-party connections.
            </p>
          </div>

          {statusMsg && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center gap-2 transition-all ${
                statusMsg.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
              }`}
            >
              {statusMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              <span>{statusMsg.text}</span>
            </div>
          )}

          <div className="flex justify-end pt-2 border-t border-border">
            <Button variant="outline" onClick={onClose}>Close</Button>
          </div>
        </div>
      )}
    </Modal>
  );
};
