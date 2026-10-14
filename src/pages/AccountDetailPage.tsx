import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTrading } from '../context/TradingContext';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { formatCurrency } from '../lib/calculations';
import {
  ArrowLeft,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Trash2,
  CheckCircle2,
  Clock,
  FileText,
  CreditCard,
  PlusCircle,
  MinusCircle
} from 'lucide-react';

export const AccountDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    accounts,
    trades,
    transactions,
    addTransaction,
    deleteTransaction,
    activeAccountId,
    setActiveAccountId
  } = useTrading();

  // Find target account
  const account = accounts.find(a => a.id === id);

  // Modals state
  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);

  // Form states
  const todayStr = new Date().toISOString().split('T')[0];
  const [depositAmount, setDepositAmount] = useState('');
  const [depositDate, setDepositDate] = useState(todayStr);
  const [depositNotes, setDepositNotes] = useState('');

  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawDate, setWithdrawDate] = useState(todayStr);
  const [withdrawNotes, setWithdrawNotes] = useState('');

  if (!account) {
    return (
      <div className="py-20 text-center space-y-4 max-w-lg mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-surface border border-border flex items-center justify-center mx-auto text-muted">
          <Wallet className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Account Not Found</h2>
        <p className="text-xs text-muted">
          The requested trading account does not exist or may have been removed.
        </p>
        <Button variant="outline" size="sm" onClick={() => navigate('/broker-hub')}>
          Back to Broker Hub
        </Button>
      </div>
    );
  }

  const isActive = activeAccountId === account.id;

  // Filter transactions for this account
  const accountTransactions = transactions.filter(tx => tx.accountId === account.id);
  const deposits = accountTransactions
    .filter(tx => tx.type === 'DEPOSIT')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const withdrawals = accountTransactions
    .filter(tx => tx.type === 'WITHDRAWAL')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const totalDeposits = deposits.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
  const totalWithdrawals = withdrawals.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);

  // Trading P&L for this account
  const accountTrades = trades.filter(t => t.accountId === account.id);
  const realizedTradingPnl = accountTrades.reduce((sum, t) => sum + (Number(t.netPnl) || 0), 0);

  const handleDepositSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(depositAmount);
    if (isNaN(parsed) || parsed <= 0) return;

    addTransaction({
      accountId: account.id,
      type: 'DEPOSIT',
      amount: parsed,
      date: depositDate || todayStr,
      notes: depositNotes.trim() || undefined
    });

    setDepositAmount('');
    setDepositDate(todayStr);
    setDepositNotes('');
    setDepositModalOpen(false);
  };

  const handleWithdrawSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(withdrawAmount);
    if (isNaN(parsed) || parsed <= 0) return;

    addTransaction({
      accountId: account.id,
      type: 'WITHDRAWAL',
      amount: parsed,
      date: withdrawDate || todayStr,
      notes: withdrawNotes.trim() || undefined
    });

    setWithdrawAmount('');
    setWithdrawDate(todayStr);
    setWithdrawNotes('');
    setWithdrawModalOpen(false);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Navigation & Account Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <button
            onClick={() => navigate('/broker-hub')}
            className="inline-flex items-center gap-2 text-xs font-semibold text-muted hover:text-foreground transition-colors mb-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Broker Hub</span>
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-foreground tracking-tight">{account.name}</h1>
            {isActive ? (
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-primary text-white font-bold flex items-center gap-1 shadow-sm">
                <CheckCircle2 className="w-3 h-3" /> ACTIVE ACCOUNT
              </span>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setActiveAccountId(account.id)}>
                Set as Active
              </Button>
            )}
          </div>
          <div className="text-xs text-muted flex items-center gap-2">
            <span>{account.broker}</span>
            <span>•</span>
            <span className="font-semibold text-foreground">{account.type}</span>
            <span>•</span>
            <span>Currency: <strong className="text-foreground">{account.currency || 'USD'}</strong></span>
          </div>
        </div>

        {/* Deposit & Withdraw Quick Actions */}
        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-md shadow-emerald-500/20"
            icon={<ArrowDownLeft className="w-4 h-4" />}
            onClick={() => setDepositModalOpen(true)}
          >
            Deposit Funds
          </Button>
          <Button
            variant="outline"
            className="border-amber-500/40 text-amber-500 hover:bg-amber-500/10 font-bold"
            icon={<ArrowUpRight className="w-4 h-4" />}
            onClick={() => setWithdrawModalOpen(true)}
          >
            Withdraw Funds
          </Button>
        </div>
      </div>

      {/* Metrics Cards Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Current Balance */}
        <div className="premium-card p-4 border border-border">
          <div className="flex items-center justify-between text-muted text-xs font-semibold uppercase">
            <span>Current Balance</span>
            <Wallet className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-black text-foreground font-mono mt-1.5">
            {formatCurrency(account.currentBalance)}
          </div>
          <div className="text-[11px] text-muted mt-1">
            Live balance reflecting trades & flows
          </div>
        </div>

        {/* Initial Capital */}
        <div className="premium-card p-4 border border-border">
          <div className="flex items-center justify-between text-muted text-xs font-semibold uppercase">
            <span>Starting Capital</span>
            <CreditCard className="w-4 h-4 text-muted" />
          </div>
          <div className="text-2xl font-black text-foreground font-mono mt-1.5">
            {formatCurrency(account.initialBalance)}
          </div>
          <div className="text-[11px] text-muted mt-1">
            Initial base account capital
          </div>
        </div>

        {/* Total Deposited */}
        <div className="premium-card p-4 border border-emerald-500/20 bg-emerald-500/5">
          <div className="flex items-center justify-between text-emerald-400 text-xs font-semibold uppercase">
            <span>Total Deposited</span>
            <PlusCircle className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 font-mono mt-1.5">
            +{formatCurrency(totalDeposits)}
          </div>
          <div className="text-[11px] text-muted mt-1">
            {deposits.length} deposit transaction{deposits.length === 1 ? '' : 's'}
          </div>
        </div>

        {/* Total Withdrawn */}
        <div className="premium-card p-4 border border-amber-500/20 bg-amber-500/5">
          <div className="flex items-center justify-between text-amber-400 text-xs font-semibold uppercase">
            <span>Total Withdrawn</span>
            <MinusCircle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400 font-mono mt-1.5">
            -{formatCurrency(totalWithdrawals)}
          </div>
          <div className="text-[11px] text-muted mt-1">
            {withdrawals.length} withdrawal transaction{withdrawals.length === 1 ? '' : 's'}
          </div>
        </div>
      </div>

      {/* Secondary Performance Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-surface border border-border flex items-center justify-between">
          <div>
            <span className="text-xs text-muted uppercase font-semibold">Realized Trading P&L</span>
            <div className={`text-xl font-black font-mono mt-0.5 ${realizedTradingPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {realizedTradingPnl >= 0 ? `+${formatCurrency(realizedTradingPnl)}` : formatCurrency(realizedTradingPnl)}
            </div>
          </div>
          <div className="text-xs text-muted text-right">
            <span>{accountTrades.length} Closed Trades</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-surface border border-border flex items-center justify-between">
          <div>
            <span className="text-xs text-muted uppercase font-semibold">Net Capital Transfer (In - Out)</span>
            <div className={`text-xl font-black font-mono mt-0.5 ${totalDeposits - totalWithdrawals >= 0 ? 'text-foreground' : 'text-amber-400'}`}>
              {totalDeposits - totalWithdrawals >= 0 ? '+' : ''}
              {formatCurrency(totalDeposits - totalWithdrawals)}
            </div>
          </div>
          <div className="text-xs text-muted text-right">
            <span>{accountTransactions.length} Total Records</span>
          </div>
        </div>
      </div>

      {/* SEPARATE SECTIONS FOR DEPOSITS AND WITHDRAWALS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
        {/* 1. DEPOSITS SECTION */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                <ArrowDownLeft className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground">Deposits History</h2>
                <p className="text-[11px] text-muted">Capital injected into this account</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10">
                +{formatCurrency(totalDeposits)}
              </span>
              <Button
                size="sm"
                variant="outline"
                className="text-xs border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                onClick={() => setDepositModalOpen(true)}
              >
                + Deposit
              </Button>
            </div>
          </div>

          {deposits.length === 0 ? (
            <div className="p-8 rounded-xl bg-surface/50 border border-border text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
                <PlusCircle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">No deposits recorded yet</p>
                <p className="text-xs text-muted mt-0.5">
                  Record your initial funding or add-on deposits to track capital accurately.
                </p>
              </div>
              <Button
                size="sm"
                variant="primary"
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
                onClick={() => setDepositModalOpen(true)}
              >
                Record First Deposit
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {deposits.map(tx => (
                <div
                  key={tx.id}
                  className="p-3.5 rounded-xl bg-surface border border-border hover:border-emerald-500/40 transition-colors flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
                      <ArrowDownLeft className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-black font-mono text-emerald-400">
                        +{formatCurrency(tx.amount)}
                      </div>
                      <div className="text-[11px] text-muted flex items-center gap-1.5 mt-0.5">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(tx.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                        {tx.notes && (
                          <>
                            <span>•</span>
                            <span className="text-foreground/80 font-medium truncate max-w-[180px]">{tx.notes}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (confirm(`Delete this deposit record of ${formatCurrency(tx.amount)}?`)) {
                        deleteTransaction(tx.id);
                      }
                    }}
                    className="p-1.5 rounded-lg text-muted hover:text-rose-500 opacity-60 group-hover:opacity-100 transition-opacity"
                    title="Delete record"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 2. WITHDRAWALS SECTION */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
                <ArrowUpRight className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground">Withdrawals History</h2>
                <p className="text-[11px] text-muted">Profits & capital pulled from this account</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-amber-400 px-2 py-0.5 rounded bg-amber-500/10">
                -{formatCurrency(totalWithdrawals)}
              </span>
              <Button
                size="sm"
                variant="outline"
                className="text-xs border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                onClick={() => setWithdrawModalOpen(true)}
              >
                + Withdraw
              </Button>
            </div>
          </div>

          {withdrawals.length === 0 ? (
            <div className="p-8 rounded-xl bg-surface/50 border border-border text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto">
                <MinusCircle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">No withdrawals recorded yet</p>
                <p className="text-xs text-muted mt-0.5">
                  Record payouts or capital reductions to maintain an exact balance ledger.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="border-amber-500/40 text-amber-400 hover:bg-amber-500/10"
                onClick={() => setWithdrawModalOpen(true)}
              >
                Record First Withdrawal
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {withdrawals.map(tx => (
                <div
                  key={tx.id}
                  className="p-3.5 rounded-xl bg-surface border border-border hover:border-amber-500/40 transition-colors flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 shrink-0">
                      <ArrowUpRight className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-black font-mono text-amber-400">
                        -{formatCurrency(tx.amount)}
                      </div>
                      <div className="text-[11px] text-muted flex items-center gap-1.5 mt-0.5">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(tx.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                        {tx.notes && (
                          <>
                            <span>•</span>
                            <span className="text-foreground/80 font-medium truncate max-w-[180px]">{tx.notes}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (confirm(`Delete this withdrawal record of ${formatCurrency(tx.amount)}?`)) {
                        deleteTransaction(tx.id);
                      }
                    }}
                    className="p-1.5 rounded-lg text-muted hover:text-rose-500 opacity-60 group-hover:opacity-100 transition-opacity"
                    title="Delete record"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* POP-UP CARD: DEPOSIT MODAL */}
      {depositModalOpen && (
        <Modal
          isOpen={depositModalOpen}
          onClose={() => setDepositModalOpen(false)}
          title="Deposit Funds"
          maxWidth="md"
        >
          <form onSubmit={handleDepositSubmit} className="space-y-4">
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 flex items-center gap-2">
              <ArrowDownLeft className="w-4 h-4 shrink-0" />
              <span>Depositing capital increases the balance of <strong>{account.name}</strong>.</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Deposit Amount ({account.currency || 'USD'})
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted text-sm font-bold">
                  $
                </span>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  required
                  autoFocus
                  value={depositAmount}
                  onChange={e => setDepositAmount(e.target.value)}
                  placeholder="e.g. 1000.00"
                  className="w-full pl-8 pr-3.5 py-2.5 rounded-xl bg-surface border border-border text-foreground text-sm font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Date of Deposit
              </label>
              <input
                type="date"
                required
                value={depositDate}
                onChange={e => setDepositDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-border text-foreground text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Notes / Reference (Optional)
              </label>
              <input
                type="text"
                value={depositNotes}
                onChange={e => setDepositNotes(e.target.value)}
                placeholder="e.g. Bank wire, Initial funding, Prop firm refund"
                className="w-full px-3.5 py-2 rounded-xl bg-surface border border-border text-foreground text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <Button type="button" variant="outline" onClick={() => setDepositModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold">
                Confirm Deposit
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* POP-UP CARD: WITHDRAWAL MODAL */}
      {withdrawModalOpen && (
        <Modal
          isOpen={withdrawModalOpen}
          onClose={() => setWithdrawModalOpen(false)}
          title="Withdraw Funds"
          maxWidth="md"
        >
          <form onSubmit={handleWithdrawSubmit} className="space-y-4">
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400 flex items-center gap-2">
              <ArrowUpRight className="w-4 h-4 shrink-0" />
              <span>Withdrawing capital reduces the balance of <strong>{account.name}</strong>.</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Withdrawal Amount ({account.currency || 'USD'})
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted text-sm font-bold">
                  $
                </span>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  required
                  autoFocus
                  value={withdrawAmount}
                  onChange={e => setWithdrawAmount(e.target.value)}
                  placeholder="e.g. 500.00"
                  className="w-full pl-8 pr-3.5 py-2.5 rounded-xl bg-surface border border-border text-foreground text-sm font-mono focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Date of Withdrawal
              </label>
              <input
                type="date"
                required
                value={withdrawDate}
                onChange={e => setWithdrawDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-border text-foreground text-xs focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Notes / Reference (Optional)
              </label>
              <input
                type="text"
                value={withdrawNotes}
                onChange={e => setWithdrawNotes(e.target.value)}
                placeholder="e.g. Payout #1, Profit split, Bank transfer"
                className="w-full px-3.5 py-2 rounded-xl bg-surface border border-border text-foreground text-xs focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <Button type="button" variant="outline" onClick={() => setWithdrawModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" className="bg-amber-600 hover:bg-amber-500 text-white font-bold">
                Confirm Withdrawal
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
