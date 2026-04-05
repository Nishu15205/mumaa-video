'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Mail,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  Clock,
  XCircle,
  Search,
  KeyRound,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAppStore } from '@/stores/app-store';
import { toast } from 'sonner';

type Step = 'check' | 'result' | 'set-password' | 'done';

interface CheckResult {
  status: string;
  name: string;
  appliedAt: string;
  rejectReason: string | null;
  isApproved: boolean;
  hasAccount: boolean;
}

export default function NannySetup() {
  const { setCurrentView } = useAppStore();
  const [step, setStep] = useState<Step>('check');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkResult, setCheckResult] = useState<CheckResult | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      toast.error('Please enter a valid email address.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/nanny-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), action: 'check' }),
      });
      const data = await res.json();
      if (!res.ok && data.error) {
        toast.error(data.error);
        return;
      }
      setCheckResult(data);
      if (data.isApproved && data.hasAccount) {
        setStep('set-password');
      } else {
        setStep('result');
      }
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/nanny-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          action: 'set-password',
          newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to set password.');
        return;
      }
      toast.success('Password set successfully!');
      setStep('done');
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 via-pink-50 to-orange-50 px-4 py-12">
      {/* Decorative blobs */}
      <div className="fixed top-20 -left-20 w-72 h-72 bg-violet-200/30 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-20 -right-20 w-64 h-64 bg-pink-200/25 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative"
      >
        {/* Back button */}
        <button
          onClick={() => setCurrentView('login')}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-rose-600 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to login
        </button>

        <AnimatePresence mode="wait">
          {/* Step 1: Check application status */}
          {step === 'check' && (
            <motion.div
              key="check"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8"
            >
              {/* Logo */}
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
                  <Search className="w-5 h-5 text-white" />
                </div>
              </div>

              <h1 className="text-2xl font-bold text-gray-900 text-center mt-4 mb-1">
                Nanny Account Setup
              </h1>
              <p className="text-sm text-gray-500 text-center mb-6">
                Enter your application email to check your status or set your password
              </p>

              <form onSubmit={handleCheck} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="setup-email" className="text-sm font-medium text-gray-700">
                    Application Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="setup-email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-11 rounded-xl border-gray-200 focus:border-violet-400 focus:ring-violet-400/20 pl-10"
                      disabled={loading}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white font-semibold shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    'Check Status'
                  )}
                </Button>
              </form>
            </motion.div>
          )}

          {/* Step 2: Result (not approved / pending / rejected) */}
          {step === 'result' && checkResult && (
            <motion.div
              key="result"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center"
            >
              {checkResult.status === 'NOT_FOUND' && (
                <>
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                    <Search className="w-8 h-8 text-gray-400" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">No Application Found</h2>
                  <p className="text-gray-500 text-sm mb-6">
                    We couldn&apos;t find any application with this email. Please make sure you entered the correct email address.
                  </p>
                </>
              )}

              {checkResult.status === 'PENDING' && (
                <>
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-100 flex items-center justify-center">
                    <Clock className="w-8 h-8 text-amber-600" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">Application Pending</h2>
                  <p className="text-gray-500 text-sm mb-2">
                    Welcome, <strong>{checkResult.name}</strong>!
                  </p>
                  <p className="text-gray-500 text-sm mb-6">
                    Your application is still under review. Our team will review it within 24-48 hours. You&apos;ll be able to set your password once approved.
                  </p>
                </>
              )}

              {checkResult.status === 'REJECTED' && (
                <>
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                    <XCircle className="w-8 h-8 text-red-500" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">Application Not Approved</h2>
                  <p className="text-gray-500 text-sm mb-4">
                    Unfortunately, your application was not approved at this time.
                  </p>
                  {checkResult.rejectReason && (
                    <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-left">
                      <p className="text-xs font-semibold text-red-600 mb-1">Reason</p>
                      <p className="text-sm text-red-700">{checkResult.rejectReason}</p>
                    </div>
                  )}
                </>
              )}

              <div className="flex flex-col gap-2">
                <Button
                  onClick={() => { setStep('check'); setCheckResult(null); }}
                  variant="outline"
                  className="h-11 rounded-xl"
                >
                  Try Different Email
                </Button>
                <Button
                  onClick={() => setCurrentView('apply-nanny')}
                  className="h-11 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-semibold"
                >
                  Submit New Application
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Set Password */}
          {step === 'set-password' && checkResult && (
            <motion.div
              key="set-password"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8"
            >
              <div className="text-center mb-6">
                <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-emerald-100 flex items-center justify-center">
                  <CheckCircle2 className="w-7 h-7 text-emerald-600" />
                </div>
                <h1 className="text-xl font-bold text-gray-900 mb-1">
                  Welcome, {checkResult.name}!
                </h1>
                <p className="text-sm text-gray-500">
                  Your application has been approved. Set your password to get started.
                </p>
              </div>

              <form onSubmit={handleSetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password" className="text-sm font-medium text-gray-700">
                    New Password
                  </Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="new-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="At least 6 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="h-11 rounded-xl border-gray-200 focus:border-violet-400 focus:ring-violet-400/20 pl-10 pr-10"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password" className="text-sm font-medium text-gray-700">
                    Confirm Password
                  </Label>
                  <div className="relative">
                    <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="confirm-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Re-enter your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="h-11 rounded-xl border-gray-200 focus:border-violet-400 focus:ring-violet-400/20 pl-10"
                      disabled={loading}
                    />
                  </div>
                  {confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={loading || newPassword.length < 6 || newPassword !== confirmPassword}
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white font-semibold shadow-lg shadow-violet-500/25 transition-all"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Setting Password...
                    </>
                  ) : (
                    'Set Password & Continue'
                  )}
                </Button>
              </form>
            </motion.div>
          )}

          {/* Step 4: Done */}
          {step === 'done' && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/25"
              >
                <CheckCircle2 className="w-10 h-10 text-white" />
              </motion.div>

              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                You&apos;re All Set!
              </h1>
              <p className="text-gray-500 leading-relaxed mb-6">
                Your password has been set successfully. You can now sign in with your email and password.
              </p>

              <Button
                onClick={() => setCurrentView('login')}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white font-semibold shadow-lg shadow-violet-500/25 transition-all"
              >
                Go to Login
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
