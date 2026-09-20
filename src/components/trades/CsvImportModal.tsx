import React, { useState } from 'react';
import { useTrading } from '../../context/TradingContext';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { parseBrokerCsv } from '../../lib/brokerParser';
import { isDeltaIndiaCsv } from '../../lib/deltaIndiaParser';
import { Upload, FileSpreadsheet, CheckCircle2, Sparkles, ShieldCheck } from 'lucide-react';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CsvImportModal: React.FC<CsvImportModalProps> = ({ isOpen, onClose }) => {
  const { importTrades, activeAccountId, accounts } = useTrading();
  const [csvText, setCsvText] = useState('');
  const [targetAccount, setTargetAccount] = useState(activeAccountId === 'all' ? (accounts[0]?.id || 'acc-1') : activeAccountId);
  const [parsedCount, setParsedCount] = useState<number | null>(null);
  const [isDelta, setIsDelta] = useState(false);
  const [success, setSuccess] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setTargetAccount(activeAccountId === 'all' ? (accounts[0]?.id || 'acc-1') : activeAccountId);
    }
  }, [isOpen, activeAccountId, accounts]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      const text = event.target?.result as string;
      setCsvText(text);
      setIsDelta(isDeltaIndiaCsv(text));
      const parsed = parseBrokerCsv(text, targetAccount);
      setParsedCount(parsed.length);
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    if (!csvText) return;
    const parsed = parseBrokerCsv(csvText, targetAccount);
    if (parsed.length > 0) {
      importTrades(parsed);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setCsvText('');
        setParsedCount(null);
        setIsDelta(false);
        onClose();
      }, 1500);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Import Broker Statement / CSV" maxWidth="lg">
      <div className="space-y-4">
        <p className="text-xs text-slate-400">
          Upload statements from <strong>Delta Exchange India</strong>, <strong>MetaTrader 4/5</strong>, Exness, Vantage, XM, or generic CSV. All trades are automatically audited and normalized into your journal.
        </p>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">Destination Account</label>
          <select
            value={targetAccount}
            onChange={e => setTargetAccount(e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl bg-surface-card border border-border text-white text-sm focus:border-primary focus:outline-none"
          >
            {accounts.map(acc => (
              <option key={acc.id} value={acc.id}>{acc.name} ({acc.broker})</option>
            ))}
          </select>
        </div>

        {/* Drag & Drop File */}
        <label className="border-2 border-dashed border-border hover:border-primary/50 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer bg-surface-card/50 transition-colors">
          <Upload className="w-8 h-8 text-primary-light mb-2" />
          <span className="text-xs font-semibold text-white">Click to upload statement file</span>
          <span className="text-[10px] text-slate-400 mt-0.5">Supports .csv, .txt, .html</span>
          <input type="file" accept=".csv,.txt,.html" onChange={handleFileUpload} className="hidden" />
        </label>

        {/* Direct Text Paste */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">Or Paste Raw CSV Data</label>
          <textarea
            rows={4}
            value={csvText}
            onChange={e => {
              const val = e.target.value;
              setCsvText(val);
              setIsDelta(isDeltaIndiaCsv(val));
              const parsed = parseBrokerCsv(val, targetAccount);
              setParsedCount(parsed.length);
            }}
            placeholder="Time, Contract, Qty, Side, Filled/Remaining, Exec.Price, Realised P&L..."
            className="w-full px-3.5 py-2 rounded-xl bg-surface-card border border-border text-white font-mono text-xs focus:border-primary focus:outline-none resize-none"
          />
        </div>

        {isDelta && (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-xs text-amber-300 animate-in fade-in duration-200">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-amber-200">Delta Exchange India Order History Detected</div>
              <div className="text-[11px] text-amber-300/80 mt-0.5 leading-relaxed">
                ✓ Cancelled & zero-filled order clutter automatically filtered out<br />
                ✓ Contract quantities divided by 100 into standard lots<br />
                ✓ Round-trip positions paired with accurate DD-MM-YYYY timestamps
              </div>
            </div>
          </div>
        )}

        {parsedCount !== null && (
          <div className="p-3 rounded-xl bg-primary/10 border border-primary/30 flex items-center gap-2 text-xs text-primary-light">
            <FileSpreadsheet className="w-4 h-4 shrink-0" />
            <span>Ready to import <strong>{parsedCount}</strong> detected trades.</span>
          </div>
        )}

        {success && (
          <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center gap-2 text-xs text-emerald-400 font-bold">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Trades imported successfully!</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!csvText || parsedCount === 0 || success} onClick={handleImport}>
            Import {parsedCount ? `${parsedCount} Trades` : 'Trades'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
