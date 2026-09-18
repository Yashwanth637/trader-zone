import React, { useState } from 'react';
import { useTrading } from '../context/TradingContext';
import { Button } from '../components/ui/Button';
import { formatCurrency } from '../lib/calculations';
import { Modal } from '../components/ui/Modal';
import {
  Layers,
  Plus,
  CheckCircle2,
  Trash2,
  Upload,
  RefreshCw,
  Wallet,
  Zap,
  ShieldCheck,
  Pencil
} from 'lucide-react';
import { DeltaSyncModal } from '../components/broker/DeltaSyncModal';
import { DeltaStorage } from '../lib/deltaIndiaApi';
import { TradingAccount } from '../types/trade';

export const BrokerHubPage: React.FC<{ onOpenCsvImport: () => void }> = ({ onOpenCsvImport }) => {
  const { accounts, addAccount, updateAccount, deleteAccount, activeAccountId, setActiveAccountId } = useTrading();
  const [modalOpen, setModalOpen] = useState(false);
  const [deltaModalOpen, setDeltaModalOpen] = useState(false);
  const [editBalanceModalOpen, setEditBalanceModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<TradingAccount | null>(null);
  const [newStartingBalance, setNewStartingBalance] = useState('');

  const [accName, setAccName] = useState('');
  const [broker, setBroker] = useState('Delta Exchange India');
  const [accType, setAccType] = useState<'Prop Firm' | 'Live' | 'Demo' | 'Challenge'>('Live');
  const [balance, setBalance] = useState('100000');
  const [currency, setCurrency] = useState('USD');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accName.trim()) return;
    const newAcc = addAccount({
      name: accName,
      broker,
      type: accType,
      currency,
      initialBalance: parseFloat(balance) || 10000,
      currentBalance: parseFloat(balance) || 10000,
      isDefault: accounts.length === 0
    });
    setActiveAccountId(newAcc.id);
    setAccName('');
    setBalance('100000');
    setModalOpen(false);
  };

  const handleOpenEditBalance = (acc: TradingAccount) => {
    setEditingAccount(acc);
    setNewStartingBalance(acc.initialBalance.toString());
    setEditBalanceModalOpen(true);
  };

  const handleSaveStartingBalance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount) return;
    const parsed = parseFloat(newStartingBalance);
    if (isNaN(parsed) || parsed < 0) return;

    updateAccount(editingAccount.id, {
      initialBalance: parsed
    });
    setEditBalanceModalOpen(false);
    setEditingAccount(null);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Layers className="w-6 h-6 text-purple-400" />
            <span>Broker Hub & Account Connections</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Link, organize, and synchronize multiple MT4/MT5 accounts, prop firms, and broker statements.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="primary"
            icon={<Zap className="w-4 h-4 text-amber-300" />}
            onClick={() => setDeltaModalOpen(true)}
          >
            Sync Delta India
          </Button>
          <Button size="sm" variant="secondary" icon={<Upload className="w-4 h-4" />} onClick={onOpenCsvImport}>
            Import Statement CSV
          </Button>
          <Button size="sm" variant="outline" icon={<Plus className="w-4 h-4" />} onClick={() => setModalOpen(true)}>
            Connect Account
          </Button>
        </div>
      </div>

      {/* Delta Exchange India Direct API Sync Card */}
      {(() => {
        const hasDeltaCreds = Boolean(DeltaStorage.getCredentials().apiKey);
        const lastDeltaSync = DeltaStorage.getLastSynced();
        return (
          <div className="premium-card p-5 border border-primary/40 bg-gradient-to-r from-primary/10 via-surface to-surface flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white tracking-wide">Delta Exchange India — Direct API Sync</h3>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                      hasDeltaCreds
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400 border border-border'
                    }`}
                  >
                    {hasDeltaCreds ? 'Configured & Active' : 'Setup Available'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Direct 1-click sync for closed positions and orders. Automatically formats dates in DD-MM-YYYY.
                </p>
                {lastDeltaSync && (
                  <span className="text-[10.5px] text-slate-400 mt-1 block">
                    Last Synced: <span className="text-slate-300 font-mono">{new Date(lastDeltaSync).toLocaleString()}</span>
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <Button
                size="sm"
                variant="primary"
                icon={<RefreshCw className="w-4 h-4" />}
                onClick={() => setDeltaModalOpen(true)}
              >
                {hasDeltaCreds ? 'Sync Trades' : 'Setup API Key'}
              </Button>
            </div>
          </div>
        );
      })()}

      {/* Connected Accounts Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {accounts.map(acc => {
          const isActive = activeAccountId === acc.id;
          return (
            <div
              key={acc.id}
              className={`premium-card p-6 space-y-4 border transition-all ${
                isActive ? 'border-primary/50 shadow-glow-primary' : 'border-border'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white">{acc.name}</h3>
                    {isActive && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary text-white font-bold">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {acc.broker} · <span className="font-semibold text-slate-300">{acc.type}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {!isActive && (
                    <Button size="sm" variant="outline" onClick={() => setActiveAccountId(acc.id)}>
                      Select
                    </Button>
                  )}
                  {accounts.length > 1 && (
                    <button
                      onClick={() => {
                        if (confirm(`Remove account ${acc.name}?`)) {
                          deleteAccount(acc.id);
                        }
                      }}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-surface border border-border">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Current Balance</span>
                  <div className="text-xl font-black text-white font-mono mt-0.5">
                    {formatCurrency(acc.currentBalance)}
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Initial Balance</span>
                    <button
                      type="button"
                      onClick={() => handleOpenEditBalance(acc)}
                      className="text-[11px] text-primary hover:text-primary-light font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      title="Update starting balance"
                    >
                      <Pencil className="w-3 h-3" />
                      <span>Update</span>
                    </button>
                  </div>
                  <div className="text-xl font-black text-slate-300 font-mono mt-0.5">
                    {formatCurrency(acc.initialBalance)}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                <span>Created: {new Date(acc.createdAt).toLocaleDateString()}</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Synced & Ready
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Connect Account Modal */}
      {modalOpen && (
        <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add Trading Account" maxWidth="md">
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Account Label</label>
              <input
                type="text"
                required
                value={accName}
                onChange={e => setAccName(e.target.value)}
                placeholder="e.g. FTMO 100k Challenge, Exness Live"
                className="w-full px-3.5 py-2 rounded-xl bg-surface-card border border-border text-white text-xs focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Broker Platform</label>
                <select
                  value={broker}
                  onChange={e => setBroker(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-card border border-border text-white text-xs focus:outline-none"
                >
                  <option value="Delta Exchange India">Delta Exchange India</option>
                  <option value="MetaTrader 5">MetaTrader 5</option>
                  <option value="MetaTrader 4">MetaTrader 4</option>
                  <option value="Exness">Exness</option>
                  <option value="Vantage">Vantage</option>
                  <option value="XM Global">XM Global</option>
                  <option value="Binance">Binance</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Account Type</label>
                <select
                  value={accType}
                  onChange={e => setAccType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-card border border-border text-white text-xs focus:outline-none"
                >
                  <option value="Prop Firm">Prop Firm</option>
                  <option value="Challenge">Evaluation Challenge</option>
                  <option value="Live">Live Personal</option>
                  <option value="Demo">Demo</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Starting Balance</label>
                <input
                  type="number"
                  required
                  value={balance}
                  onChange={e => setBalance(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-surface-card border border-border text-white text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Currency</label>
                <select
                  value={currency}
                  onChange={e => setCurrency(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-card border border-border text-white text-xs focus:outline-none"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="INR">INR (₹)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button type="submit" variant="primary">Add Account</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delta Exchange India Direct Sync Modal */}
      {deltaModalOpen && (
        <DeltaSyncModal
          isOpen={deltaModalOpen}
          onClose={() => setDeltaModalOpen(false)}
        />
      )}

      {/* Update Starting Balance Modal */}
      {editBalanceModalOpen && editingAccount && (
        <Modal
          isOpen={editBalanceModalOpen}
          onClose={() => {
            setEditBalanceModalOpen(false);
            setEditingAccount(null);
          }}
          title={`Update Starting Balance · ${editingAccount.name}`}
          maxWidth="md"
        >
          <form onSubmit={handleSaveStartingBalance} className="space-y-4">
            <p className="text-xs text-slate-400 leading-relaxed">
              Set the base capital or initial deposit for this account. Your current balance, equity curves, drawdown calculations, and ROI % will automatically re-calculate based on this starting figure.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Starting / Initial Balance ({editingAccount.currency || 'USD'})
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  min="0"
                  required
                  autoFocus
                  value={newStartingBalance}
                  onChange={e => setNewStartingBalance(e.target.value)}
                  placeholder="e.g. 100000"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-card border border-border text-white text-sm font-mono font-bold focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            {/* Quick Capital Presets */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Quick Presets
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                {[5000, 10000, 25000, 50000, 100000, 200000].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setNewStartingBalance(val.toString())}
                    className={`py-1.5 px-1 text-[11px] font-mono font-bold rounded-lg border transition-all ${
                      newStartingBalance === val.toString()
                        ? 'bg-primary text-white border-primary shadow-sm'
                        : 'bg-surface border-border text-slate-300 hover:text-white hover:border-slate-600'
                    }`}
                  >
                    ${(val / 1000)}k
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditBalanceModalOpen(false);
                  setEditingAccount(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                Save Starting Balance
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
