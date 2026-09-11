import React from 'react';
import { Shield, FileText, Scale } from 'lucide-react';

export const TermsPage: React.FC = () => (
  <div className="max-w-3xl mx-auto py-8 space-y-6">
    <div className="flex items-center gap-3">
      <FileText className="w-6 h-6 text-primary-light" />
      <h1 className="text-2xl font-black text-white">Terms of Service</h1>
    </div>
    <div className="premium-card p-6 space-y-4 text-xs text-slate-300 leading-relaxed">
      <p><strong>1. Acceptance of Terms</strong>: Trader Zone is an offline-first, client-side trading journal designed for personal performance analytics and study.</p>
      <p><strong>2. Personal Non-Commercial Use</strong>: You may host, run, and modify this software in your own GitHub repository for personal trading journal tracking.</p>
      <p><strong>3. No Warranties</strong>: The software is provided "as is", without warranty of any kind, express or implied.</p>
    </div>
  </div>
);

export const PrivacyPage: React.FC = () => (
  <div className="max-w-3xl mx-auto py-8 space-y-6">
    <div className="flex items-center gap-3">
      <Shield className="w-6 h-6 text-emerald-400" />
      <h1 className="text-2xl font-black text-white">Privacy Policy</h1>
    </div>
    <div className="premium-card p-6 space-y-4 text-xs text-slate-300 leading-relaxed">
      <p><strong>1. Zero Data Harvesting</strong>: Trader Zone does not track, collect, transmit, or store your trading data on any central server. All your trades, screenshots, and reflections exist strictly in your browser's local storage.</p>
      <p><strong>2. Complete Data Ownership</strong>: You can export your full database at any time in standard JSON format.</p>
    </div>
  </div>
);

export const DisclaimerPage: React.FC = () => (
  <div className="max-w-3xl mx-auto py-8 space-y-6">
    <div className="flex items-center gap-3">
      <Scale className="w-6 h-6 text-amber-400" />
      <h1 className="text-2xl font-black text-white">Legal & Risk Disclaimer</h1>
    </div>
    <div className="premium-card p-6 space-y-4 text-xs text-slate-300 leading-relaxed">
      <p><strong>Risk Warning</strong>: Trading foreign exchange, cryptocurrencies, indices, and commodities on margin carries a high level of risk and may not be suitable for all investors.</p>
      <p><strong>Educational Purpose Only</strong>: Trader Zone and its AI analysis features are intended solely for analytical, organizational, and educational purposes and do not constitute investment advice or recommendations.</p>
    </div>
  </div>
);
