import React, { useState } from 'react';
import { useTrading } from '../../context/TradingContext';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  Building2,
  ArrowRight,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import {
  SUPPORTED_MT5_BROKERS,
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

  const [selectedBroker, setSelectedBroker] = useState<'Elefin' | 'XM' | 'Vantage' | 'Exness' | 'WinPro'>('Elefin');
  const [login, setLogin] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const processFile = (file: File) => {
    if (!file) return;
    setIsProcessing(true);
    setStatusMsg({ type: 'info', text: 'Analyzing MT5 statement and calculating balance...' });

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) {
        setIsProcessing(false);
        setStatusMsg({ type: 'error', text: 'The selected file is empty.' });
        return;
      }

      try {
        const tempAccId = `acc-mt5-${Date.now()}`;
        const result = parseMt5ReportFile({
          fileContent: content,
          accountId: tempAccId,
          broker: selectedBroker,
          server: `${selectedBroker}-Server`,
          login: login.trim() || 'Imported'
        });

        if (result.trades.length === 0 && !content.includes('Deposit') && !content.includes('Balance:')) {
          setIsProcessing(false);
          setStatusMsg({
            type: 'error',
            text: 'Could not detect trades or balance in this file. Please ensure it is an MT5 Report (.html or .csv) from your History tab.'
          });
          return;
        }

        const accountLogin = result.login && result.login !== 'Imported' ? result.login : (login.trim() || 'Imported');
        const accountName = `${selectedBroker} MT5 (#${accountLogin})`;

        let targetAccount = accounts.find(
          a => a.name.toLowerCase() === accountName.toLowerCase() || (a.mt5Login && a.mt5Login === accountLogin)
        );

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
            mt5Server: `${selectedBroker}-Server`,
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

        if (isolatedTrades.length > 0) {
          importTrades(isolatedTrades, updatedAccountsList);
        }
        setActiveAccountId(targetAccount.id);

        setIsProcessing(false);
        setStatusMsg({
          type: 'success',
          text: `Successfully imported ${isolatedTrades.length} trades into ${accountName}! Starting Balance: $${initBal.toLocaleString()}`
        });

        if (onSyncSuccess) onSyncSuccess();

        setTimeout(() => {
          setStatusMsg(null);
          onClose();
        }, 1800);
      } catch (err: any) {
        setIsProcessing(false);
        setStatusMsg({
          type: 'error',
          text: err.message || 'Failed to process MT5 statement.'
        });
      }
    };

    reader.onerror = () => {
      setIsProcessing(false);
      setStatusMsg({ type: 'error', text: 'Error reading file. Please try again.' });
    };

    reader.readAsText(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Import MT5 Broker Statement / CSV`}
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Intro */}
        <p className="text-xs text-muted leading-relaxed">
          Select your MT5 broker and upload your trade report (<strong>.html</strong> or <strong>.csv</strong>). 
          The journal automatically extracts your <strong>starting deposit</strong>, calculates current balance, and imports all closed trades into a dedicated, isolated account.
        </p>

        {/* Broker Selector */}
        <div>
          <label className="text-xs font-bold text-foreground mb-2 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-purple-400" />
            <span>Select Broker</span>
          </label>
          <div className="grid grid-cols-5 gap-2">
            {SUPPORTED_MT5_BROKERS.map(b => {
              const isSelected = selectedBroker === b.id;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setSelectedBroker(b.id)}
                  className={`py-2 px-2 rounded-xl text-xs font-bold transition-all border text-center cursor-pointer ${
                    isSelected
                      ? 'bg-purple-600/20 border-purple-500 text-purple-200 shadow-sm shadow-purple-500/30 ring-1 ring-purple-500/50'
                      : 'bg-surface border-border text-muted hover:text-foreground hover:border-border-hover'
                  }`}
                >
                  {b.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Optional Account Number / Login */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-foreground">
              MT5 Account Number <span className="text-[10px] text-muted font-normal">(Optional)</span>
            </label>
            <span className="text-[10.5px] text-muted">Auto-detected from file if left blank</span>
          </div>
          <input
            type="text"
            value={login}
            onChange={e => setLogin(e.target.value)}
            placeholder="e.g. 401204821 or 12345806865"
            className="w-full px-3.5 py-2 rounded-xl bg-surface border border-border text-foreground text-xs focus:border-purple-500 focus:outline-none placeholder:text-muted/50"
          />
        </div>

        {/* Drag & Drop Zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`p-6 rounded-2xl border-2 border-dashed text-center transition-all ${
            isDragging
              ? 'border-purple-500 bg-purple-500/10'
              : 'border-border hover:border-purple-500/50 bg-surface/50'
          }`}
        >
          <FileText className="w-10 h-10 text-purple-400 mx-auto mb-2.5 opacity-90" />
          <h4 className="text-sm font-bold text-foreground mb-1">
            Drop your {selectedBroker} MT5 Report (.html or .csv)
          </h4>
          <p className="text-xs text-muted max-w-sm mx-auto mb-4">
            Supports official MetaTrader 5 HTML Reports (ReportHistory) and CSV statement exports.
          </p>

          <label className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all cursor-pointer shadow-md shadow-purple-600/20">
            <Upload className="w-4 h-4" />
            <span>Select MT5 Report File</span>
            <input
              type="file"
              accept=".html,.htm,.csv,.txt"
              onChange={handleFileInputChange}
              className="hidden"
            />
          </label>
        </div>

        {/* Quick MT5 Export Instructions */}
        <div className="p-3.5 rounded-xl bg-surface border border-border space-y-2">
          <div className="font-semibold text-foreground text-xs flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>How to export from MetaTrader 5:</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-muted">
            <div className="p-2 rounded-lg bg-surface/60 border border-border/50">
              <span className="font-bold text-foreground block mb-0.5">1. Open History</span>
              Go to the <strong>History</strong> tab at the bottom in MT5.
            </div>
            <div className="p-2 rounded-lg bg-surface/60 border border-border/50">
              <span className="font-bold text-foreground block mb-0.5">2. Right-Click Report</span>
              Right-click anywhere on history &rarr; <strong>Report</strong>.
            </div>
            <div className="p-2 rounded-lg bg-surface/60 border border-border/50">
              <span className="font-bold text-foreground block mb-0.5">3. Save & Drop</span>
              Save as <strong>HTML</strong> or <strong>CSV</strong> and drop it above.
            </div>
          </div>
        </div>

        {/* Status Message */}
        {statusMsg && (
          <div
            className={`p-3 rounded-xl border text-xs flex items-center gap-2.5 transition-all ${
              statusMsg.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-semibold'
                : statusMsg.type === 'error'
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                : 'bg-purple-500/10 border-purple-500/30 text-purple-300'
            }`}
          >
            {statusMsg.type === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />}
            {statusMsg.type === 'error' && <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />}
            {statusMsg.type === 'info' && <RefreshCw className="w-4 h-4 shrink-0 animate-spin text-purple-400" />}
            <span>{statusMsg.text}</span>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-border">
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};
