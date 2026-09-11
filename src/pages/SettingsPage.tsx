import React, { useState } from 'react';
import { useTrading } from '../context/TradingContext';
import { useTheme } from '../context/ThemeContext';
import { Button } from '../components/ui/Button';
import {
  Sliders,
  Download,
  Upload,
  RotateCcw,
  Save,
  CheckCircle,
  ShieldAlert,
  User,
  Key
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const {
    profile,
    updateProfile,
    riskLimits,
    updateRiskLimits,
    exportData,
    importData,
    resetAllData
  } = useTrading();

  const { theme, setTheme } = useTheme();

  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email);
  const [bio, setBio] = useState(profile.bio);
  const [currency, setCurrency] = useState(profile.currency);
  const [apiKey, setApiKey] = useState(profile.apiKey || '');

  const [maxDailyLoss, setMaxDailyLoss] = useState(riskLimits.maxDailyLossUsd.toString());
  const [maxRiskPerTrade, setMaxRiskPerTrade] = useState(riskLimits.maxRiskPerTradePercent.toString());
  const [maxTradesDay, setMaxTradesDay] = useState(riskLimits.maxTradesPerDay.toString());

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({
      name,
      email,
      bio,
      currency: currency as any,
      apiKey
    });
    updateRiskLimits({
      maxDailyLossUsd: parseFloat(maxDailyLoss) || 2500,
      maxRiskPerTradePercent: parseFloat(maxRiskPerTrade) || 1.5,
      maxTradesPerDay: parseInt(maxTradesDay) || 4
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleExport = () => {
    const jsonStr = exportData();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trader-zone-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target?.result as string;
      const ok = importData(text);
      if (ok) {
        setImportStatus('Backup restored successfully!');
      } else {
        setImportStatus('Failed to restore backup. Invalid JSON.');
      }
      setTimeout(() => setImportStatus(null), 3000);
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
          <Sliders className="w-6 h-6 text-slate-400" />
          <span>Settings & Preferences</span>
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Manage your trader profile, risk limits, appearance, and offline backups.
        </p>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSaveProfile} className="space-y-6">
        {/* Profile Card */}
        <div className="premium-card p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <User className="w-4 h-4 text-primary-light" />
            <span>Trader Profile</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Display Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-surface-card border border-border text-white text-xs focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-surface-card border border-border text-white text-xs focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Default Currency</label>
              <select
                value={currency}
                onChange={e => setCurrency(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-surface-card border border-border text-white text-xs focus:outline-none"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="INR">INR (₹)</option>
                <option value="JPY">JPY (¥)</option>
                <option value="AUD">AUD (A$)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Theme Mode</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTheme('dark')}
                  className={`py-2 text-xs font-bold rounded-lg border ${
                    theme === 'dark' ? 'bg-primary text-white border-primary' : 'bg-surface-card text-slate-400 border-border'
                  }`}
                >
                  Dark Obsidian
                </button>
                <button
                  type="button"
                  onClick={() => setTheme('light')}
                  className={`py-2 text-xs font-bold rounded-lg border ${
                    theme === 'light' ? 'bg-primary text-white border-primary' : 'bg-surface-card text-slate-400 border-border'
                  }`}
                >
                  Light Mode
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Bio / Trading Philosophy</label>
            <textarea
              rows={2}
              value={bio}
              onChange={e => setBio(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-surface-card border border-border text-white text-xs focus:outline-none resize-none"
            />
          </div>
        </div>

        {/* Risk Limits */}
        <div className="premium-card p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            <span>Strict Risk Management Limits</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Max Daily Loss ($)</label>
              <input
                type="number"
                value={maxDailyLoss}
                onChange={e => setMaxDailyLoss(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-surface-card border border-border text-white text-xs focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Max Risk Per Trade (%)</label>
              <input
                type="number"
                step="0.1"
                value={maxRiskPerTrade}
                onChange={e => setMaxRiskPerTrade(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-surface-card border border-border text-white text-xs focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Max Trades Per Day</label>
              <input
                type="number"
                value={maxTradesDay}
                onChange={e => setMaxTradesDay(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-surface-card border border-border text-white text-xs focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* AI Key Configuration */}
        <div className="premium-card p-6 space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <Key className="w-4 h-4 text-primary-light" />
            <span>Optional: LLM API Key (OpenAI / Gemini)</span>
          </div>
          <p className="text-xs text-slate-400">
            Trader Zone has built-in smart AI heuristic models. You can optionally paste an API key for live multimodal cloud vision.
          </p>
          <input
            type="password"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder="sk-... or AIzaSy..."
            className="w-full px-3.5 py-2 rounded-xl bg-surface-card border border-border text-white text-xs font-mono focus:outline-none"
          />
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-between">
          {savedSuccess ? (
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4" /> Preferences saved!
            </span>
          ) : <div />}
          <Button type="submit" variant="primary" icon={<Save className="w-4 h-4" />}>
            Save Preferences
          </Button>
        </div>
      </form>

      {/* Data Backup & Restore */}
      <div className="premium-card p-6 space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Data Backup & Local Persistence</h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          Trader Zone stores 100% of your data client-side in your browser. Download a full JSON backup to move your data between devices or preserve it permanently.
        </p>

        {importStatus && (
          <div className="p-3 rounded-xl bg-primary/20 border border-primary/40 text-xs text-white">
            {importStatus}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Button variant="secondary" size="sm" icon={<Download className="w-4 h-4" />} onClick={handleExport}>
            Export Full Backup (JSON)
          </Button>

          <label className="inline-flex items-center justify-center font-medium rounded-xl text-xs px-3 py-1.5 gap-1.5 bg-surface-card hover:bg-surface-card-hover text-slate-200 border border-border cursor-pointer">
            <Upload className="w-4 h-4" />
            <span>Restore Backup File</span>
            <input type="file" accept=".json" onChange={handleFileImport} className="hidden" />
          </label>

          <Button
            variant="danger"
            size="sm"
            icon={<RotateCcw className="w-4 h-4" />}
            onClick={() => {
              if (confirm('Reset journal back to sample data? This will overwrite your current trades.')) {
                resetAllData();
              }
            }}
          >
            Reset to Sample Data
          </Button>
        </div>
      </div>
    </div>
  );
};
