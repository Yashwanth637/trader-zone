import React, { useState, useEffect } from 'react';
import { useTrading } from '../context/TradingContext';
import { useTheme } from '../context/ThemeContext';
import { Button } from '../components/ui/Button';
import {
  Sliders,
  Download,
  Upload,
  RotateCcw,
  CheckCircle,
  ShieldAlert,
  User,
  Key,
  Sun,
  Moon,
  Zap
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

  const [autoSaved, setAutoSaved] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // Auto-save debounced effect for profile & risk limits
  useEffect(() => {
    const timer = setTimeout(() => {
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
      setAutoSaved(true);
      const hideTimer = setTimeout(() => setAutoSaved(false), 1800);
      return () => clearTimeout(hideTimer);
    }, 400);

    return () => clearTimeout(timer);
  }, [name, email, bio, currency, apiKey, maxDailyLoss, maxRiskPerTrade, maxTradesDay]);

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
        setImportStatus('Failed to restore backup. Invalid JSON format.');
      }
      setTimeout(() => setImportStatus(null), 3000);
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2.5">
            <Sliders className="w-6 h-6 text-primary" />
            <span>Settings & Preferences</span>
          </h1>
          <p className="text-xs text-muted mt-0.5">
            Manage your trader profile, risk limits, appearance, and offline backups.
          </p>
        </div>

        {/* Live Auto-Save Pill */}
        <div className="flex items-center gap-2">
          {autoSaved ? (
            <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-full flex items-center gap-1.5 animate-in fade-in duration-150">
              <CheckCircle className="w-3.5 h-3.5" /> Auto-saved
            </span>
          ) : (
            <span className="text-xs font-medium text-muted bg-surface-card border border-border px-3 py-1.5 rounded-full flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-500" /> Instant Auto-Sync
            </span>
          )}
        </div>
      </div>

      {/* Main Settings Sections */}
      <div className="space-y-6">
        {/* Profile Card */}
        <div className="premium-card p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-foreground">
            <User className="w-4 h-4 text-primary" />
            <span>Trader Profile</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Display Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-surface border border-border text-foreground text-xs focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-surface border border-border text-foreground text-xs focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Default Currency</label>
              <select
                value={currency}
                onChange={e => setCurrency(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-foreground text-xs focus:border-primary focus:outline-none"
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
              <label className="block text-xs font-semibold text-foreground mb-1">Visual Theme</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTheme('dark')}
                  className={`py-2 text-xs font-bold rounded-xl border flex items-center justify-center gap-2 transition-all ${
                    theme === 'dark'
                      ? 'bg-primary text-white border-primary shadow-sm'
                      : 'bg-surface text-muted border-border hover:text-foreground'
                  }`}
                >
                  <Moon className="w-3.5 h-3.5" />
                  <span>Pitch Black</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTheme('light')}
                  className={`py-2 text-xs font-bold rounded-xl border flex items-center justify-center gap-2 transition-all ${
                    theme === 'light'
                      ? 'bg-primary text-white border-primary shadow-sm'
                      : 'bg-surface text-muted border-border hover:text-foreground'
                  }`}
                >
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                  <span>Crisp Light</span>
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Bio / Trading Philosophy</label>
            <textarea
              rows={2}
              value={bio}
              onChange={e => setBio(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-surface border border-border text-foreground text-xs focus:border-primary focus:outline-none resize-none"
            />
          </div>
        </div>

        {/* Risk Limits */}
        <div className="premium-card p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-foreground">
            <ShieldAlert className="w-4 h-4 text-rose-500" />
            <span>Strict Risk Management Limits</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Max Daily Loss ($)</label>
              <input
                type="number"
                value={maxDailyLoss}
                onChange={e => setMaxDailyLoss(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-surface border border-border text-foreground text-xs focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Max Risk Per Trade (%)</label>
              <input
                type="number"
                step="0.1"
                value={maxRiskPerTrade}
                onChange={e => setMaxRiskPerTrade(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-surface border border-border text-foreground text-xs focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Max Trades Per Day</label>
              <input
                type="number"
                value={maxTradesDay}
                onChange={e => setMaxTradesDay(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-surface border border-border text-foreground text-xs focus:border-primary focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* AI Key Configuration */}
        <div className="premium-card p-6 space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-foreground">
            <Key className="w-4 h-4 text-primary" />
            <span>Optional: LLM API Key (OpenAI / Gemini)</span>
          </div>
          <p className="text-xs text-muted">
            Trader Zone has built-in smart AI heuristic models. You can optionally paste an API key for live multimodal cloud vision.
          </p>
          <input
            type="password"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder="sk-... or AIzaSy..."
            className="w-full px-3.5 py-2 rounded-xl bg-surface border border-border text-foreground text-xs font-mono focus:border-primary focus:outline-none"
          />
        </div>

        {/* Data Backup & Restore */}
        <div className="premium-card p-6 space-y-4">
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Data Backup & Local Persistence</h3>
          <p className="text-xs text-muted leading-relaxed">
            Trader Zone stores 100% of your data client-side in your browser. Download a full JSON backup to move your data between devices or preserve it permanently.
          </p>

          {importStatus && (
            <div className="p-3 rounded-xl bg-primary/15 border border-primary/40 text-xs text-primary font-bold">
              {importStatus}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button variant="secondary" size="sm" icon={<Download className="w-4 h-4" />} onClick={handleExport}>
              Export Full Backup (JSON)
            </Button>

            <label className="inline-flex items-center justify-center font-medium rounded-xl text-xs px-3 py-1.5 gap-1.5 bg-surface hover:bg-surface-card text-foreground border border-border cursor-pointer shadow-sm">
              <Upload className="w-4 h-4 text-primary" />
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
    </div>
  );
};
