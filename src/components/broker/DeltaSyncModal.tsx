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
  ShieldCheck,
  Globe,
  Trash2,
  ExternalLink,
  HelpCircle
} from 'lucide-react';
import {
  DeltaStorage,
  DeltaCredentials,
  ProxyMode,
  testDeltaConnection,
  fetchClosedOrders,
  normalizeDeltaOrders
} from '../../lib/deltaIndiaApi';

interface DeltaSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncSuccess?: () => void;
}

export const DeltaSyncModal: React.FC<DeltaSyncModalProps> = ({
  isOpen,
  onClose,
  onSyncSuccess
}) => {
  const { trades, importTrades, accounts, activeAccountId } = useTrading();

  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [proxyMode, setProxyMode] = useState<ProxyMode>('direct');
  const [customProxyUrl, setCustomProxyUrl] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [lastSynced, setLastSynced] = useState<string | null>(null);

  // Load saved credentials on modal open
  useEffect(() => {
    if (isOpen) {
      const saved = DeltaStorage.getCredentials();
      setApiKey(saved.apiKey);
      setApiSecret(saved.apiSecret);
      setProxyMode(saved.proxyMode === 'cors-bridge' ? 'direct' : saved.proxyMode);
      setCustomProxyUrl(saved.customProxyUrl || '');
      setLastSynced(DeltaStorage.getLastSynced());

      // Default target account
      if (!selectedAccountId) {
        const deltaAcc = accounts.find(a => a.broker.toLowerCase().includes('delta'));
        if (deltaAcc) {
          setSelectedAccountId(deltaAcc.id);
        } else if (activeAccountId && activeAccountId !== 'all') {
          setSelectedAccountId(activeAccountId);
        } else if (accounts.length > 0) {
          setSelectedAccountId(accounts[0].id);
        }
      }
    }
  }, [isOpen, accounts, activeAccountId, selectedAccountId]);

  const handleSave = () => {
    DeltaStorage.saveCredentials({
      apiKey,
      apiSecret,
      proxyMode,
      customProxyUrl
    });
  };

  const handleTestConnection = async () => {
    if (!apiKey.trim() || !apiSecret.trim()) {
      setStatusMsg({ type: 'error', text: 'Please enter both your Delta India API Key and Secret.' });
      return;
    }
    setTesting(true);
    setStatusMsg(null);
    handleSave();

    const creds: DeltaCredentials = {
      apiKey: apiKey.trim(),
      apiSecret: apiSecret.trim(),
      proxyMode,
      customProxyUrl: customProxyUrl.trim()
    };

    const res = await testDeltaConnection(creds);
    setTesting(false);

    if (res.success) {
      setStatusMsg({ type: 'success', text: res.message });
    } else {
      setStatusMsg({ type: 'error', text: res.message });
    }
  };

  const handleSyncTrades = async () => {
    if (!apiKey.trim() || !apiSecret.trim()) {
      setStatusMsg({ type: 'error', text: 'Please enter both your Delta India API Key and Secret first.' });
      return;
    }
    setSyncing(true);
    setStatusMsg(null);
    handleSave();

    try {
      const creds: DeltaCredentials = {
        apiKey: apiKey.trim(),
        apiSecret: apiSecret.trim(),
        proxyMode,
        customProxyUrl: customProxyUrl.trim()
      };

      // 1. Fetch closed orders from Delta India API
      const rawOrders = await fetchClosedOrders(creds, 100);

      if (rawOrders.length === 0) {
        setSyncing(false);
        setStatusMsg({ type: 'info', text: 'No closed orders found in your Delta Exchange India account history.' });
        return;
      }

      // 2. Target account
      const targetAccId = selectedAccountId || (accounts[0] ? accounts[0].id : 'default-account');

      // 3. Normalize into journal trades with lot size / 100 and correct directions
      const { trades: newTrades, newCount, duplicatesCount } = normalizeDeltaOrders(
        rawOrders,
        targetAccId,
        trades
      );

      if (newCount > 0) {
        importTrades(newTrades);
        const nowIso = new Date().toISOString();
        DeltaStorage.setLastSynced(nowIso);
        setLastSynced(nowIso);

        setStatusMsg({
          type: 'success',
          text: `Successfully synced ${newCount} trade${newCount > 1 ? 's' : ''}! ${
            duplicatesCount > 0 ? `(${duplicatesCount} duplicate trades were skipped)` : ''
          }`
        });

        if (onSyncSuccess) onSyncSuccess();
      } else {
        setStatusMsg({
          type: 'info',
          text: `All ${rawOrders.length} orders analyzed have already been imported into your journal (${duplicatesCount} duplicates skipped).`
        });
      }
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: err.message || 'Failed to sync orders from Delta Exchange India. Check network or credentials.'
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleClearCredentials = () => {
    if (confirm('Are you sure you want to remove your saved Delta India API credentials from this browser?')) {
      DeltaStorage.clearCredentials();
      setApiKey('');
      setApiSecret('');
      setLastSynced(null);
      setStatusMsg({ type: 'info', text: 'API credentials cleared from your browser storage.' });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Delta Exchange India — Direct API Sync" maxWidth="lg">
      <div className="space-y-5">
        {/* Security Assurance Banner */}
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-300 leading-relaxed">
            <span className="font-bold text-white block mb-0.5">100% Client-Side & Private</span>
            Your API Key & Secret are stored exclusively in your browser's local storage and used directly for HMAC-SHA256 signing. They are never sent to or logged on any external server.
          </div>
        </div>

        {/* Target Journal Account Selection */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Assign Synced Trades To Journal Account
          </label>
          <select
            value={selectedAccountId}
            onChange={e => setSelectedAccountId(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-surface-card border border-border text-white text-xs focus:outline-none focus:border-primary"
          >
            {accounts.map(acc => (
              <option key={acc.id} value={acc.id}>
                {acc.name} ({acc.broker} · {acc.currency})
              </option>
            ))}
          </select>
        </div>

        {/* Credentials Form */}
        <div className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-primary" /> API Key
              </span>
              <a
                href="https://www.delta.exchange/app/account/manageapikeys"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-primary hover:underline flex items-center gap-1"
              >
                Get API Key <ExternalLink className="w-3 h-3" />
              </a>
            </label>
            <input
              type="text"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="Paste your Delta Exchange India API Key"
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-card border border-border text-white font-mono text-xs focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-primary" /> API Secret
              </span>
            </label>
            <div className="relative">
              <input
                type={showSecret ? 'text' : 'password'}
                value={apiSecret}
                onChange={e => setApiSecret(e.target.value)}
                placeholder="Paste your Delta Exchange India API Secret"
                className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-surface-card border border-border text-white font-mono text-xs focus:outline-none focus:border-primary"
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
              >
                {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Advanced Network / Proxy Toggle */}
        <div>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 font-medium"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{showAdvanced ? 'Hide Network & Proxy Settings' : 'Network & Proxy Settings (CORS Relay)'}</span>
          </button>

          {showAdvanced && (
            <div className="mt-2.5 p-3.5 rounded-xl bg-surface-card border border-border space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  CORS Connection Relay
                </label>
                <select
                  value={proxyMode}
                  onChange={e => setProxyMode(e.target.value as ProxyMode)}
                  className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-white text-xs focus:outline-none"
                >
                  <option value="direct">Direct Connection (Recommended — api.india.delta.exchange)</option>
                  <option value="dev-proxy">Local Dev Proxy (/delta-api for npm run dev)</option>
                  <option value="cors-bridge">Cloudflare CORS Bridge (Backup)</option>
                  <option value="custom">Custom Proxy URL</option>
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  Delta Exchange India natively allows web browser connections (CORS enabled). Direct Connection connects directly from your Mac to Delta with zero intermediaries.
                </p>
              </div>

              {proxyMode === 'custom' && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Custom Proxy Endpoint
                  </label>
                  <input
                    type="text"
                    value={customProxyUrl}
                    onChange={e => setCustomProxyUrl(e.target.value)}
                    placeholder="https://your-worker.workers.dev/?url="
                    className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-white font-mono text-xs focus:outline-none"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Status Messages */}
        {statusMsg && (
          <div
            className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
              statusMsg.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : statusMsg.type === 'error'
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                : 'bg-sky-500/10 border-sky-500/30 text-sky-300'
            }`}
          >
            {statusMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
            ) : statusMsg.type === 'error' ? (
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            ) : (
              <HelpCircle className="w-4 h-4 shrink-0 mt-0.5 text-sky-400" />
            )}
            <span className="leading-relaxed">{statusMsg.text}</span>
          </div>
        )}

        {/* Last Synced Indicator */}
        {lastSynced && (
          <div className="text-[11px] text-slate-400 flex items-center justify-between px-1">
            <span>Last Synced:</span>
            <span className="text-slate-300 font-mono">{new Date(lastSynced).toLocaleString()}</span>
          </div>
        )}

        {/* How to setup quick instructions */}
        <div className="p-3 rounded-xl bg-surface-card/60 border border-border/70 text-[11px] text-slate-400 space-y-1">
          <div className="font-bold text-slate-200">Recommended Key Setup on Delta India:</div>
          <ul className="list-disc list-inside space-y-0.5 text-[10.5px]">
            <li>Set Permissions to <strong>Read Data / Order History</strong> (Do not enable trading or withdrawals).</li>
            <li>If prompted for IP Whitelist, enter your current internet IP address.</li>
            <li>Lot sizes are automatically normalized (/ 1000) and dates formatted as DD-MM-YYYY.</li>
          </ul>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-border">
          <div>
            {apiKey && (
              <button
                type="button"
                onClick={handleClearCredentials}
                className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 px-2 py-1 rounded hover:bg-rose-500/10 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Disconnect
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleTestConnection}
              disabled={testing || syncing || !apiKey || !apiSecret}
            >
              {testing ? 'Testing...' : 'Test Connection'}
            </Button>

            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleSyncTrades}
              disabled={syncing || testing || !apiKey || !apiSecret}
              icon={<RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />}
            >
              {syncing ? 'Fetching Orders...' : 'Sync Trades Now'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
