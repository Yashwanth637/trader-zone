import React, { useState } from 'react';
import { useTrading } from '../../context/TradingContext';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { PropStage, Trade } from '../../types/trade';
import { parseFundedRoomCsv, isFundedRoomCsv } from '../../lib/fundedRoomParser';
import { parseBrokerCsv } from '../../lib/brokerParser';
import { formatCurrency } from '../../lib/calculations';
import { Upload, FileSpreadsheet, CheckCircle2, Award, ArrowRight, ShieldCheck, Clock } from 'lucide-react';

interface PropFirmCsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultAccountId?: string;
  defaultStage?: PropStage;
}

export const PropFirmCsvImportModal: React.FC<PropFirmCsvImportModalProps> = ({
  isOpen,
  onClose,
  defaultAccountId,
  defaultStage
}) => {
  const { importTrades, activeAccountId, accounts } = useTrading();

  // Find all prop firm accounts
  const propAccounts = accounts.filter(a => a.type === 'Prop Firm' || a.propFirmData);
  const initialAccountId = defaultAccountId || (propAccounts.find(a => a.id === activeAccountId)?.id) || (propAccounts[0]?.id || accounts[0]?.id || 'acc-1');

  const [targetAccount, setTargetAccount] = useState<string>(initialAccountId);
  const [targetStage, setTargetStage] = useState<PropStage>(defaultStage || 'stage1');
  const [csvText, setCsvText] = useState<string>('');
  const [parsedTrades, setParsedTrades] = useState<Trade[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [success, setSuccess] = useState<boolean>(false);

  React.useEffect(() => {
    if (isOpen) {
      const activeId = defaultAccountId || (propAccounts.find(a => a.id === activeAccountId)?.id) || (propAccounts[0]?.id || accounts[0]?.id || 'acc-1');
      setTargetAccount(activeId);
      const selectedAcc = accounts.find(a => a.id === activeId);
      if (defaultStage) {
        setTargetStage(defaultStage);
      } else if (selectedAcc?.propFirmData?.currentStage) {
        setTargetStage(selectedAcc.propFirmData.currentStage);
      }
    }
  }, [isOpen, defaultAccountId, defaultStage, activeAccountId, accounts]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = event => {
      const text = event.target?.result as string;
      setCsvText(text);

      let parsed: Trade[] = [];
      if (isFundedRoomCsv(text)) {
        parsed = parseFundedRoomCsv(text, targetAccount, targetStage);
      } else {
        parsed = parseBrokerCsv(text, targetAccount, targetStage);
      }
      setParsedTrades(parsed);
    };
    reader.readAsText(file);
  };

  const handleStageChange = (stage: PropStage) => {
    setTargetStage(stage);
    if (csvText) {
      if (isFundedRoomCsv(csvText)) {
        setParsedTrades(parseFundedRoomCsv(csvText, targetAccount, stage));
      } else {
        setParsedTrades(parseBrokerCsv(csvText, targetAccount, stage));
      }
    }
  };

  const handleImport = () => {
    if (parsedTrades.length === 0) return;

    importTrades(parsedTrades);
    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      setCsvText('');
      setParsedTrades([]);
      setFileName('');
      onClose();
    }, 1200);
  };

  const totalNetPnl = parsedTrades.reduce((sum, t) => sum + (t.netPnl || 0), 0);
  const winCount = parsedTrades.filter(t => t.netPnl > 0).length;
  const targetAccObj = accounts.find(a => a.id === targetAccount);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Import ${targetAccObj?.broker || 'Prop Firm'} CSV Trade History`}
      maxWidth="lg"
    >
      <div className="space-y-4">
        {/* Account and Stage Selector Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-2xl bg-surface border border-border">
          {/* Target Account */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Target Account</label>
            <select
              value={targetAccount}
              onChange={e => {
                const accId = e.target.value;
                setTargetAccount(accId);
                const acc = accounts.find(a => a.id === accId);
                const newStage = acc?.propFirmData?.currentStage || targetStage;
                if (acc?.propFirmData?.currentStage) {
                  setTargetStage(acc.propFirmData.currentStage);
                }
                if (csvText) {
                  if (isFundedRoomCsv(csvText)) {
                    setParsedTrades(parseFundedRoomCsv(csvText, accId, newStage));
                  } else {
                    setParsedTrades(parseBrokerCsv(csvText, accId, newStage));
                  }
                }
              }}
              className="w-full px-3 py-2 rounded-xl bg-surface-card border border-border text-foreground text-xs font-medium focus:outline-none focus:border-primary"
            >
              {propAccounts.length > 0 ? (
                propAccounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.broker} - {formatCurrency(acc.initialBalance)})
                  </option>
                ))
              ) : (
                accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.broker})
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Target Evaluation Stage */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Assign to Evaluation Stage</label>
            <div className="grid grid-cols-3 gap-1">
              {(['stage1', 'stage2', 'funded'] as const).map(stg => (
                <button
                  key={stg}
                  type="button"
                  onClick={() => handleStageChange(stg)}
                  className={`py-2 px-1 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                    targetStage === stg
                      ? 'bg-primary text-white border-primary shadow-sm'
                      : 'bg-surface-card border-border text-muted hover:text-foreground hover:border-primary/50'
                  }`}
                >
                  {stg === 'stage1' ? 'Phase 1' : stg === 'stage2' ? 'Phase 2' : 'Funded'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* File Upload Box */}
        <div className="border-2 border-dashed border-border rounded-2xl p-6 text-center space-y-3 hover:border-primary/50 transition-colors bg-surface/50">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="hidden"
            id="prop-firm-csv-input"
          />
          <label
            htmlFor="prop-firm-csv-input"
            className="cursor-pointer block space-y-2"
          >
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-center mx-auto text-purple-400">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">
                {fileName ? fileName : 'Click to upload or drag & drop Funded Room CSV'}
              </p>
              <p className="text-[11px] text-muted mt-0.5">
                Supports official Funded Room, MT4/MT5, and broker trade statement exports (.csv)
              </p>
            </div>
          </label>
        </div>

        {/* Parsed Trades Preview */}
        {parsedTrades.length > 0 && (
          <div className="space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between p-3 rounded-xl bg-purple-500/10 border border-purple-500/25 text-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-foreground">
                  Detected {parsedTrades.length} Trade{parsedTrades.length === 1 ? '' : 's'}
                </span>
                <span className="text-muted">
                  ({winCount} wins, {parsedTrades.length - winCount} losses)
                </span>
              </div>
              <div className="font-mono font-bold">
                Net P&L:{' '}
                <span className={totalNetPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                  {totalNetPnl >= 0 ? '+' : ''}{formatCurrency(totalNetPnl)}
                </span>
              </div>
            </div>

            {/* Compact Table Preview */}
            <div className="max-h-56 overflow-y-auto rounded-xl border border-border">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-surface border-b border-border text-muted uppercase tracking-wider font-semibold sticky top-0">
                  <tr>
                    <th className="py-2 px-3">Date</th>
                    <th className="py-2 px-3">Symbol</th>
                    <th className="py-2 px-3">Side</th>
                    <th className="py-2 px-3">Lots</th>
                    <th className="py-2 px-3">Entry</th>
                    <th className="py-2 px-3">Exit</th>
                    <th className="py-2 px-3 text-right">Net P&L</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {parsedTrades.map((t, idx) => {
                    const isWin = (t.netPnl || 0) > 0;
                    return (
                      <tr key={idx} className="hover:bg-black/5 dark:hover:bg-white/5">
                        <td className="py-2 px-3 text-muted font-mono whitespace-nowrap">
                          {t.closeTime ? new Date(t.closeTime).toLocaleDateString() : 'Open'}
                        </td>
                        <td className="py-2 px-3 font-bold text-foreground">{t.symbol}</td>
                        <td className="py-2 px-3">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            t.direction === 'BUY' ? 'bg-blue-500/15 text-blue-400' : 'bg-rose-500/15 text-rose-400'
                          }`}>
                            {t.direction}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-mono">{t.lotSize}</td>
                        <td className="py-2 px-3 font-mono">{t.entryPrice}</td>
                        <td className="py-2 px-3 font-mono">{t.exitPrice || '—'}</td>
                        <td className={`py-2 px-3 font-mono font-bold text-right ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isWin ? '+' : ''}{formatCurrency(t.netPnl || 0)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal Action Buttons */}
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>

          <Button
            variant="primary"
            size="sm"
            disabled={parsedTrades.length === 0 || success}
            className="font-bold flex items-center gap-2"
            onClick={handleImport}
          >
            {success ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Imported Successfully!</span>
              </>
            ) : (
              <>
                <span>Import {parsedTrades.length > 0 ? `${parsedTrades.length} Trades` : 'Trades'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
