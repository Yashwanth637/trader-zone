import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import {
  Smartphone,
  Laptop,
  QrCode,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Copy,
  Check,
  ShieldCheck,
  ArrowRight
} from 'lucide-react';

interface DeviceSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLinked?: () => void;
}

export const DeviceSyncModal: React.FC<DeviceSyncModalProps> = ({
  isOpen,
  onClose,
  onLinked
}) => {
  const { user, syncCloud, linkDeviceWithCode, lastSynced, syncStatus } = useAuth();
  const [activeTab, setActiveTab] = useState<'generate' | 'enter'>('generate');
  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [inputCode, setInputCode] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Auto-generate pairing code when opened on 'generate' tab
  useEffect(() => {
    if (isOpen && activeTab === 'generate') {
      handleGenerateCode();
    }
  }, [isOpen, activeTab]);

  const handleGenerateCode = async () => {
    setLoading(true);
    setMessage(null);
    const res = await syncCloud();
    setLoading(false);
    if (res.success && res.pairingCode) {
      setGeneratedCode(res.pairingCode);
    } else {
      setMessage({ type: 'error', text: res.error || 'Failed to generate sync code.' });
    }
  };

  const handleCopy = () => {
    if (!generatedCode) return;
    navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleLinkDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode.trim()) return;

    setLoading(true);
    setMessage(null);

    const res = await linkDeviceWithCode(inputCode.trim());
    setLoading(false);

    if (res.success) {
      setMessage({
        type: 'success',
        text: 'Device linked successfully! All journal trades, accounts, and rules are now synchronized.'
      });
      setTimeout(() => {
        if (onLinked) onLinked();
        onClose();
      }, 1200);
    } else {
      setMessage({
        type: 'error',
        text: res.error || 'Invalid sync code. Make sure you entered the code accurately.'
      });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cross-Device Sync — Phone & MacBook"
      maxWidth="md"
    >
      <div className="space-y-5">
        {/* Security Info */}
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-xs text-foreground/80 leading-relaxed">
            <span className="font-bold text-foreground block mb-0.5">End-to-End Private Sync</span>
            Synchronize your entire trading journal between your MacBook and phone. All data remains encrypted on your personal devices.
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 p-1 rounded-2xl bg-surface-card border border-border">
          <button
            type="button"
            onClick={() => {
              setActiveTab('generate');
              setMessage(null);
            }}
            className={`py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'generate'
                ? 'bg-primary text-white shadow-md'
                : 'text-muted hover:text-foreground'
            }`}
          >
            <Laptop className="w-3.5 h-3.5" />
            <span>Send to Phone</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('enter');
              setMessage(null);
            }}
            className={`py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'enter'
                ? 'bg-primary text-white shadow-md'
                : 'text-muted hover:text-foreground'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Receive on this Device</span>
          </button>
        </div>

        {/* Status Message */}
        {message && (
          <div
            className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
              message.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            )}
            <span className="leading-relaxed">{message.text}</span>
          </div>
        )}

        {/* Tab 1: Generate Code */}
        {activeTab === 'generate' && (
          <div className="space-y-4 text-center">
            <div className="p-6 rounded-2xl bg-surface-card border border-border space-y-3">
              <span className="text-xs text-muted block uppercase font-bold tracking-wider">
                Your 6-Digit Device Pairing Code
              </span>

              <div className="flex items-center justify-center gap-3">
                <div className="text-3xl sm:text-4xl font-black font-mono tracking-widest text-primary bg-surface px-6 py-3 rounded-2xl border border-primary/30 shadow-inner">
                  {loading ? '••••••' : generatedCode || 'TZ-••••••'}
                </div>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="p-3 rounded-2xl bg-surface border border-border hover:border-primary/50 text-foreground transition-all shadow-sm"
                  title="Copy code"
                >
                  {copied ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>

              <div className="text-[11px] text-muted max-w-sm mx-auto leading-relaxed pt-1">
                Open <strong>Trader Zone</strong> on your phone, click <strong>"Link Device"</strong> or Sign In, and enter this code to immediately mirror all trades.
              </div>
            </div>

            <div className="flex justify-center gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateCode}
                disabled={loading}
                icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
              >
                Regenerate Code
              </Button>
            </div>
          </div>
        )}

        {/* Tab 2: Enter Code */}
        {activeTab === 'enter' && (
          <form onSubmit={handleLinkDevice} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Enter Pairing Code from your MacBook
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={inputCode}
                  onChange={e => setInputCode(e.target.value.toUpperCase())}
                  placeholder="e.g. TZ-849201"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-surface-card border border-border text-foreground font-mono font-bold tracking-wider text-base focus:outline-none focus:border-primary uppercase"
                />
              </div>
              <p className="text-[11px] text-muted mt-1.5">
                Generate this code on your MacBook by clicking "Send to Phone" above.
              </p>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full py-2.5 text-xs font-bold justify-center"
              disabled={loading || !inputCode.trim()}
              icon={<ArrowRight className="w-4 h-4" />}
            >
              {loading ? 'Restoring Journal...' : 'Link & Sync Journal'}
            </Button>
          </form>
        )}

        {/* Last Synced Info */}
        {lastSynced && (
          <div className="text-[11px] text-muted flex items-center justify-between px-1 pt-2 border-t border-border">
            <span>Last Cloud State:</span>
            <span className="font-mono text-foreground font-medium">
              {new Date(lastSynced).toLocaleString()}
            </span>
          </div>
        )}
      </div>
    </Modal>
  );
};
