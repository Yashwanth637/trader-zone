import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Button } from '../components/ui/Button';
import {
  Sparkles,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Smartphone,
  Laptop,
  CheckCircle2,
  AlertCircle,
  QrCode,
  User as UserIcon,
  Globe
} from 'lucide-react';
import { DeviceSyncModal } from '../components/auth/DeviceSyncModal';

export const LoginPage: React.FC = () => {
  const { login, signup, continueAsGuest, user, registeredUsers, switchUser } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncModalOpen, setSyncModalOpen] = useState(false);

  // Return to requested page or dashboard after authentication
  const redirectPath = (location.state as any)?.from || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isSignUp) {
        const res = await signup(email, password, name);
        if (res.success) {
          navigate(redirectPath);
        } else {
          setError(res.error || 'Failed to create account.');
        }
      } else {
        const res = await login(email, password);
        if (res.success) {
          navigate(redirectPath);
        } else {
          setError(res.error || 'Invalid email or password.');
        }
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = () => {
    continueAsGuest();
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Brand Header */}
      <div className="text-center mb-8 relative z-10">
        <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-surface border border-border shadow-md mb-4">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white shadow-sm">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="font-black text-xl tracking-tight">
            Trader<span className="text-primary">Zone</span>
          </span>
          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-primary/20 text-primary border border-primary/30">
            Cloud Auth
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
          {isSignUp ? 'Create Your Trader Account' : 'Sign In to Your Trading Journal'}
        </h1>
        <p className="text-xs sm:text-sm text-muted mt-1.5 max-w-md mx-auto">
          Log in with your email to access your synchronized journal on your MacBook and phone.
        </p>
      </div>

      {/* Main Auth Card */}
      <div className="w-full max-w-md bg-surface border border-border rounded-3xl shadow-2xl p-6 sm:p-8 relative z-10 space-y-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Tab Toggle: Sign In vs Sign Up */}
        <div className="grid grid-cols-2 p-1 rounded-2xl bg-surface-card border border-border">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(false);
              setError(null);
            }}
            className={`py-2 text-xs font-bold rounded-xl transition-all ${
              !isSignUp
                ? 'bg-primary text-white shadow-md'
                : 'text-muted hover:text-foreground'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setIsSignUp(true);
              setError(null);
            }}
            className={`py-2 text-xs font-bold rounded-xl transition-all ${
              isSignUp
                ? 'bg-primary text-white shadow-md'
                : 'text-muted hover:text-foreground'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 animate-in shake duration-200">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                <UserIcon className="w-3.5 h-3.5 text-primary" /> Full Name or Alias
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Yashwanth Kumar"
                className="w-full px-4 py-2.5 rounded-xl bg-surface-card border border-border text-foreground text-xs focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-primary" /> Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full px-4 py-2.5 rounded-xl bg-surface-card border border-border text-foreground text-xs focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-primary" /> Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full px-4 py-2.5 pr-11 rounded-xl bg-surface-card border border-border text-foreground text-xs focus:outline-none focus:border-primary transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground p-1"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            className="w-full py-2.5 text-xs font-bold justify-center"
            disabled={loading}
            icon={<ArrowRight className="w-4 h-4" />}
          >
            {loading ? 'Authenticating...' : isSignUp ? 'Create & Launch Journal' : 'Sign In to Journal'}
          </Button>
        </form>

        {/* Existing Accounts on this Device */}
        {registeredUsers.length > 0 && !isSignUp && (
          <div className="pt-2 border-t border-border">
            <span className="text-[10px] uppercase font-bold text-muted tracking-wider block mb-2">
              Fast Switch Account
            </span>
            <div className="space-y-1.5">
              {registeredUsers.map(u => (
                <button
                  key={u.id}
                  onClick={() => {
                    switchUser(u.id);
                    navigate(redirectPath);
                  }}
                  className="w-full p-2 rounded-xl bg-surface-card hover:bg-black/5 dark:hover:bg-white/5 border border-border flex items-center justify-between text-xs transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary/20 text-primary font-bold text-[11px] flex items-center justify-center">
                      {u.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-foreground text-xs">{u.name}</div>
                      <div className="text-[10px] text-muted">{u.email}</div>
                    </div>
                  </div>
                  <span className="text-[10px] text-primary font-bold">Switch →</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Phone & MacBook Sync Assistance */}
        <div className="p-3.5 rounded-2xl bg-surface-card border border-border flex items-start gap-3">
          <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
            <Smartphone className="w-4 h-4" />
          </div>
          <div className="text-[11px] text-muted leading-relaxed">
            <span className="font-bold text-foreground block mb-0.5">Phone & MacBook Sync</span>
            Use the same email on your phone and MacBook to access your journal on both devices.
            <button
              onClick={() => setSyncModalOpen(true)}
              className="text-primary hover:underline font-semibold block mt-1"
            >
              Have a 6-digit sync code or QR code? Link device →
            </button>
          </div>
        </div>

        {/* Guest Access Option */}
        <div className="text-center pt-2">
          <button
            type="button"
            onClick={handleGuest}
            className="text-xs text-muted hover:text-foreground transition-colors inline-flex items-center gap-1 font-medium"
          >
            <span>Continue as Guest Trader (Local Demo)</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Device Sync & Pairing Modal */}
      {syncModalOpen && (
        <DeviceSyncModal
          isOpen={syncModalOpen}
          onClose={() => setSyncModalOpen(false)}
          onLinked={() => navigate(redirectPath)}
        />
      )}
    </div>
  );
};
