import React, { useState } from 'react';
import { useTrading } from '../context/TradingContext';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import {
  Layers,
  Plus,
  CheckCircle2,
  Trash2,
  Upload,
  RefreshCw,
  Wallet
} from 'lucide-react';

export const BrokerHubPage: React.FC<{ onOpenCsvImport: () => void }> = ({ onOpenCsvImport }) => {
  const { accounts, addAccount, deleteAccount, activeAccountId, setActiveAccountId } = useTrading();
  const [modalOpen, setModalOpen] = useState(false);

  const [accName, setAccName] = useState('');
  const [broker, setBroker] = useState('MetaTrader 5');
  const [accType, setAccType] = useState<'Prop Firm' | 'Live' | 'Demo' | 'Challenge'>('Prop Firm');
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
          <Button size="sm" variant="secondary" icon={<Upload className="w-4 h-4" />} onClick={onOpenCsvImport}>
            Import Statement CSV
          </Button>
          <Button size="sm" variant="primary" icon={<Plus className="w-4 h-4" />} onClick={() => setModalOpen(true)}>
            Connect Account
          </Button>
        </div>
      </div>

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
                    ${acc.currentBalance.toLocaleString()} {acc.currency}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Initial Balance</span>
                  <div className="text-xl font-black text-slate-400 font-mono mt-0.5">
                    ${acc.initialBalance.toLocaleString()}
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
    </div>
  );
};
