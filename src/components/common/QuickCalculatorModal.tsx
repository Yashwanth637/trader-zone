import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Calculator } from 'lucide-react';
import { useTrading } from '../../context/TradingContext';

interface QuickCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QuickCalculatorModal: React.FC<QuickCalculatorModalProps> = ({ isOpen, onClose }) => {
  const { activeAccount } = useTrading();
  const [balance, setBalance] = useState(activeAccount ? activeAccount.currentBalance.toString() : '100000');
  const [riskPercent, setRiskPercent] = useState('1.0');
  const [stopLossPips, setStopLossPips] = useState('20');
  const [pipValue, setPipValue] = useState('10'); // Default $10 per pip per standard lot (Forex)

  const numBal = parseFloat(balance) || 0;
  const numRiskPct = parseFloat(riskPercent) || 0;
  const numSL = parseFloat(stopLossPips) || 1;
  const numPipVal = parseFloat(pipValue) || 10;

  const riskAmountUsd = (numBal * numRiskPct) / 100;
  const calculatedLotSize = numSL > 0 && numPipVal > 0 ? riskAmountUsd / (numSL * numPipVal) : 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Position Size & Risk Calculator" maxWidth="md">
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">Account Balance ($)</label>
          <input
            type="number"
            value={balance}
            onChange={e => setBalance(e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl bg-surface-card border border-border text-white text-sm focus:border-primary focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Risk (%)</label>
            <input
              type="number"
              step="0.1"
              value={riskPercent}
              onChange={e => setRiskPercent(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-surface-card border border-border text-white text-sm focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Stop Loss (Pips)</label>
            <input
              type="number"
              step="0.5"
              value={stopLossPips}
              onChange={e => setStopLossPips(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-surface-card border border-border text-white text-sm focus:border-primary focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">Asset Pip Value ($ / pip / lot)</label>
          <select
            value={pipValue}
            onChange={e => setPipValue(e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl bg-surface-card border border-border text-white text-sm focus:border-primary focus:outline-none"
          >
            <option value="10">Forex Standard ($10.00 / pip / lot)</option>
            <option value="10">Gold XAUUSD ($10.00 / 0.1 move / lot)</option>
            <option value="1">Crypto / BTC ($1.00 / pt)</option>
            <option value="5">Indices / US30 ($5.00 / pt)</option>
          </select>
        </div>

        {/* Calculated Result Card */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/20 via-purple-600/15 to-surface-card border border-primary/30 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-300">Risk Amount:</span>
            <span className="text-base font-black font-mono text-rose-400">
              ${riskAmountUsd.toFixed(2)}
            </span>
          </div>
          <div className="flex items-center justify-between border-t border-white/10 pt-2">
            <span className="text-xs font-bold text-white uppercase tracking-wider">Recommended Position:</span>
            <span className="text-2xl font-black font-mono text-emerald-400">
              {calculatedLotSize.toFixed(2)} Lots
            </span>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="primary" onClick={onClose}>Done</Button>
        </div>
      </div>
    </Modal>
  );
};
