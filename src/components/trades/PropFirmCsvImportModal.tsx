import React, { useState, useMemo } from 'react';
import { useTrading, isTradeDuplicate } from '../../context/TradingContext';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { PropStage, Trade } from '../../types/trade';
import { parseFundedRoomCsv, isFundedRoomCsv } from '../../lib/fundedRoomParser';
import { parseBrokerCsv } from '../../lib/brokerParser';
import { formatCurrency } from '../../lib/calculations';
import { AssetLogo, formatSymbolDisplay } from '../common/AssetLogo';
import {
  Upload,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Info,
  Layers,
  Clock,
  Filter
} from 'lucide-react';

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
  const { trades, importTrades, activeAccountId, accounts } = useTrading();

  // Find all prop firm accounts
  const propAccounts = accounts.filter(a => a.type === 'Prop Firm' || a.propFirmData);
  const initialAccountId = defaultAccountId || (propAccounts.find(a => a.id === activeAccountId)?.id) || (propAccounts[0]?.id || accounts[0]?.id || 'acc-1');

  const [targetAccount, setTargetAccount] = useState<string>(initialAccountId);
  const [targetStage, setTargetStage] = useState<PropStage>(defaultStage || 'stage1');
  const [csvText, setCsvText] = useState<string>('');
  const [parsedTrades, setParsedTrades] = useState<Trade[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [filterTab, setFilterTab] = useState<'new' | 'all' | 'skipped'>('new');
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

  // Existing trades for this target account
  const existingAccTrades = useMemo(() => {
    return trades.filter(t => t.accountId === targetAccount);
  }, [trades, targetAccount]);

  // Split parsed trades into new vs duplicate
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

  // Auto-switch filter tab when new file is parsed
  React.useEffect(() => {
    if (parsedTrades.length > 0) {
      if (newTrades.length > 0) {
        setFilterTab('new');
      } else {
        setFilterTab('all');
      }
    }
  }, [parsedTrades.length, newTrades.length]);

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
    if (newTrades.length === 0) return;

    // Only import the truly new trades, ignoring already existing trades
    importTrades(newTrades);
    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      setCsvText('');
      setParsedTrades([]);
      setFileName('');
      onClose();
    }, 1400);
  };

  // Display trades based on active tab
  const displayedTrades = filterTab === 'new'
    ? newTrades
    : filterTab === 'skipped'
    ? duplicateTrades
    : parsedTrades;

  const displayedNetPnl = displayedTrades.reduce((sum, t) => sum + (t.netPnl || 0), 0);
  const displayedWinCount = displayedTrades.filter(t => (t.netPnl || 0) > 0).length;
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
                Full statement supported · Duplicate historical trades are automatically ignored
              </p>
            </div>
          </label>
        </div>

        {/* Parsed Trades Preview */}
        {parsedTrades.length > 0 && (
          <div className="space-y-3 animate-in fade-in duration-200">
            {/* Detection & Duplicate Summary Bar */}
            <div className="p-3.5 rounded-2xl bg-surface border border-border space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-xs font-bold text-foreground">
                    Detected {parsedTrades.length} Total Trade{parsedTrades.length === 1 ? '' : 's'} in File
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{newTrades.length} New to Import</span>
                  </span>

                  {duplicateTrades.length > 0 && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-500/15 border border-slate-500/25 text-slate-500 dark:text-slate-400">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>{duplicateTrades.length} Existing (Ignored)</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Net PnL of new trades */}
              <div className="flex items-center justify-between text-xs pt-1 border-t border-border">
                <span className="text-muted font-medium">
                  {filterTab === 'new' ? 'New Trades Volume' : filterTab === 'skipped' ? 'Ignored Duplicates Volume' : 'Total File Volume'}:{' '}
                  <strong className="text-foreground">{displayedTrades.length} trades ({displayedWinCount}W / {displayedTrades.length - displayedWinCount}L)</strong>
                </span>
                <div className="font-mono font-bold">
                  Net P&L:{' '}
                  <span className={displayedNetPnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}>
                    {displayedNetPnl >= 0 ? '+' : ''}{formatCurrency(displayedNetPnl)}
                  </span>
                </div>
              </div>
            </div>

            {/* Zero New Trades Alert */}
            {newTrades.length === 0 && (
              <div className="p-3.5 rounded-xl bg-sky-500/10 border border-sky-500/25 text-xs flex items-start gap-2.5">
                <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-foreground">All trades in this file already exist in your journal</div>
                  <div className="text-muted mt-0.5 leading-relaxed">
                    All {parsedTrades.length} trades are already recorded under this account. No duplicate trades will be created.
                  </div>
                </div>
              </div>
            )}

            {/* Filter Tabs */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-surface border border-border text-xs">
                <button
                  type="button"
                  onClick={() => setFilterTab('new')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    filterTab === 'new'
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-muted hover:text-foreground'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>New Trades ({newTrades.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFilterTab('all')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    filterTab === 'all'
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-muted hover:text-foreground'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>All Detected ({parsedTrades.length})</span>
                </button>

                {duplicateTrades.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setFilterTab('skipped')}
                    className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      filterTab === 'skipped'
                        ? 'bg-primary text-white shadow-sm'
                        : 'text-muted hover:text-foreground'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Ignored ({duplicateTrades.length})</span>
                  </button>
                )}
              </div>

              <span className="text-[11px] text-muted font-medium hidden sm:inline">
                Showing {displayedTrades.length} {filterTab === 'new' ? 'new' : filterTab === 'skipped' ? 'ignored' : ''} trade{displayedTrades.length === 1 ? '' : 's'}
              </span>
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
                    {filterTab === 'all' && (
                      <th className="py-2 px-3 text-right">Status</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {displayedTrades.map((t, idx) => {
                    const isWin = (t.netPnl || 0) > 0;
                    const isDup = isTradeDuplicate(t, existingAccTrades).isDuplicate;
                    return (
                      <tr key={idx} className="hover:bg-black/5 dark:hover:bg-white/5">
                        <td className="py-2 px-3 text-muted font-mono whitespace-nowrap">
                          {t.closeTime ? new Date(t.closeTime).toLocaleDateString() : 'Open'}
                        </td>
                        <td className="py-2 px-3 font-bold text-foreground">
                          <div className="flex items-center gap-2">
                            <AssetLogo symbol={t.symbol} size="xs" />
                            <span>{formatSymbolDisplay(t.symbol)}</span>
                          </div>
                        </td>
                        <td className="py-2 px-3">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            t.direction === 'BUY' ? 'bg-blue-500/15 text-blue-500' : 'bg-rose-500/15 text-rose-500'
                          }`}>
                            {t.direction}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-mono">{t.lotSize}</td>
                        <td className="py-2 px-3 font-mono">{t.entryPrice}</td>
                        <td className="py-2 px-3 font-mono">{t.exitPrice || '—'}</td>
                        <td className={`py-2 px-3 font-mono font-bold text-right ${isWin ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {isWin ? '+' : ''}{formatCurrency(t.netPnl || 0)}
                        </td>
                        {filterTab === 'all' && (
                          <td className="py-2 px-3 text-right whitespace-nowrap">
                            {isDup ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-500/15 text-slate-500 dark:text-slate-400 border border-slate-500/25">
                                <ShieldCheck className="w-2.5 h-2.5" />
                                <span>IGNORED</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                                <Sparkles className="w-2.5 h-2.5" />
                                <span>NEW</span>
                              </span>
                            )}
                          </td>
                        )}
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
            disabled={parsedTrades.length === 0 || newTrades.length === 0 || success}
            className="font-bold flex items-center gap-2"
            onClick={handleImport}
          >
            {success ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Imported {newTrades.length} New Trade{newTrades.length === 1 ? '' : 's'}!</span>
              </>
            ) : newTrades.length === 0 && parsedTrades.length > 0 ? (
              <span>All Trades Already Imported</span>
            ) : (
              <>
                <span>
                  Import {newTrades.length > 0 ? `${newTrades.length} New Trade${newTrades.length === 1 ? '' : 's'}` : 'Trades'}
                  {duplicateTrades.length > 0 ? ` (${duplicateTrades.length} Ignored)` : ''}
                </span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
