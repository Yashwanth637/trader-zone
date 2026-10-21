import React, { useState, useMemo } from 'react';
import { useTrading, isTradeDuplicate } from '../../context/TradingContext';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { parseBrokerCsv } from '../../lib/brokerParser';
import { isDeltaIndiaCsv } from '../../lib/deltaIndiaParser';
import { Trade } from '../../types/trade';
import { Upload, FileSpreadsheet, CheckCircle2, Sparkles, ShieldCheck, ArrowRight, Info } from 'lucide-react';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CsvImportModal: React.FC<CsvImportModalProps> = ({ isOpen, onClose }) => {
  const { trades, importTrades, activeAccountId, accounts } = useTrading();
  const [csvText, setCsvText] = useState('');
  const [targetAccount, setTargetAccount] = useState(activeAccountId === 'all' ? (accounts[0]?.id || 'acc-1') : activeAccountId);
  const [parsedTrades, setParsedTrades] = useState<Trade[]>([]);
  const [isDelta, setIsDelta] = useState(false);
  const [success, setSuccess] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setTargetAccount(activeAccountId === 'all' ? (accounts[0]?.id || 'acc-1') : activeAccountId);
    }
  }, [isOpen, activeAccountId, accounts]);

  const existingAccTrades = useMemo(() => {
    return trades.filter(t => t.accountId === targetAccount);
  }, [trades, targetAccount]);

  const { newTrades, duplicateTrades } = useMemo(() => {
    const fresh: Trade[] = [];
    const dupes: Trade[] = [];
    parsedTrades.forEach(t => {
      if (isTradeDuplicate(t, existingAccTrades).isDuplicate) {
        dupes.push(t);
      } else {
        fresh.push(t);
      }
    });
    return { newTrades: fresh, duplicateTrades: dupes };
  }, [parsedTrades, existingAccTrades]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      const text = event.target?.result as string;
      setCsvText(text);
      setIsDelta(isDeltaIndiaCsv(text));
      const parsed = parseBrokerCsv(text, targetAccount);
      setParsedTrades(parsed);
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    if (newTrades.length === 0) return;
    importTrades(newTrades);
    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      setCsvText('');
      setParsedTrades([]);
      setIsDelta(false);
      onClose();
    }, 1400);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Import Broker / Delta Exchange CSV" maxWidth="lg">
      <div className="space-y-4">
        <p className="text-xs text-slate-400">
          Upload trade statements and execution fills exported from <strong>Delta Exchange India</strong> (or international). All contracts, lot sizes, trading fees, and realized P&L are automatically calculated. Already imported trades will be automatically skipped.
        </p>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">Destination Account</label>
          <select
            value={targetAccount}
            onChange={e => {
              const accId = e.target.value;
              setTargetAccount(accId);
              if (csvText) {
                const parsed = parseBrokerCsv(csvText, accId);
                setParsedTrades(parsed);
              }
            }}
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
              setParsedTrades(parsed);
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
                ✓ Contract quantities converted to standard lots (1 lot = 1,000 contracts)<br />
                ✓ Round-trip positions paired with accurate DD-MM-YYYY timestamps
              </div>
            </div>
          </div>
        )}

        {parsedTrades.length > 0 && (
          <div className="p-3.5 rounded-xl bg-surface border border-border space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-primary shrink-0" />
                <span className="font-bold text-foreground">
                  Detected {parsedTrades.length} Trade{parsedTrades.length === 1 ? '' : 's'} in Statement
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                  <Sparkles className="w-3 h-3" />
                  <span>{newTrades.length} New to Import</span>
                </span>
                {duplicateTrades.length > 0 && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md font-bold bg-slate-500/15 text-slate-400 border border-slate-500/25">
                    <ShieldCheck className="w-3 h-3" />
                    <span>{duplicateTrades.length} Ignored</span>
                  </span>
                )}
              </div>
            </div>

            {newTrades.length === 0 && (
              <div className="text-[11px] text-sky-400 flex items-center gap-1.5 pt-1 border-t border-border">
                <Info className="w-3.5 h-3.5 shrink-0" />
                <span>All {parsedTrades.length} trades are already present in your journal. No duplicates will be imported.</span>
              </div>
            )}
          </div>
        )}

        {parsedTrades.length === 0 && csvText.trim().length > 30 && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
            No completed round-trip trades detected in this text. Make sure your statement includes closed execution orders.
          </div>
        )}

        {success && (
          <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center gap-2 text-xs text-emerald-400 font-bold">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Successfully imported {newTrades.length} new trade{newTrades.length === 1 ? '' : 's'}!</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            disabled={!csvText || parsedTrades.length === 0 || newTrades.length === 0 || success}
            onClick={handleImport}
          >
            {newTrades.length === 0 && parsedTrades.length > 0 ? (
              'All Trades Already Imported'
            ) : (
              `Import ${newTrades.length > 0 ? `${newTrades.length} New Trades` : 'Trades'}`
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
