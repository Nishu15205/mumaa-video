'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, ArrowLeft, Loader2, Mail, Lock, CheckCircle, Copy, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAppStore } from '@/stores/app-store';

type Step = 'email' | 'otp' | 'success';

export default function ForgotPasswordForm() {
  const { setCurrentView } = useAppStore();

  const [step, setStep] = useState<Step>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1
  const [email, setEmail] = useState('');

  // Step 2
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Demo OTP display
  const [demoOtp, setDemoOtp] = useState('');
  const [copied, setCopied] = useState(false);

  const slideVariants = {
    enter: { x: 50, opacity: 0 },
    center: { x: 0, opacity: 1 },
    exit: { x: -50, opacity: 0 },
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    if (!email.includes('@') || !email.includes('.')) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error || 'Failed to send OTP. Please try again.');
        return;
      }

      if (data.otp) {
        setDemoOtp(data.otp);
      }
      setStep('otp');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!otp.trim() || otp.length !== 6) {
      setError('Please enter the 6-digit OTP.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          otp,
          newPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error || 'Failed to reset password. Please try again.');
        return;
      }

      setStep('success');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyOtp = () => {
    navigator.clipboard.writeText(demoOtp).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="w-full max-w-md relative">
      {/* Back button */}
      {step !== 'success' && (
        <button
          onClick={() =>
            step === 'otp' ? setStep('email') : setCurrentView('login')
          }
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-rose-600 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          {step === 'otp' ? 'Back' : 'Back to login'}
        </button>
      )}

      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 overflow-hidden">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-lg shadow-rose-500/25">
            <Heart className="w-5 h-5 text-white fill-white" />
          </div>
          <span className="text-2xl font-bold bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent">
            Mumaa
          </span>
        </div>

        <AnimatePresence mode="wait">
          {/* Step 1: Enter Email */}
          {step === 'email' && (
            <motion.div
              key="email-step"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
            >
              <div className="text-center mb-6">
                <div className="w-14 h-14 rounded-2xl bg-rose-50 flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-7 h-7 text-rose-500" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-1">
                  Forgot Password?
                </h1>
                <p className="text-sm text-gray-500">
                  No worries! Enter your email and we&apos;ll send you a code to reset your password.
                </p>
              </div>

              {error && (
                <div className="mb-5 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm flex items-center justify-between">
                  {error}
                  <button onClick={() => setError('')}>
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <form onSubmit={handleSendOtp} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="fp-email" className="text-sm font-medium text-gray-700">
                    Email Address
                  </Label>
                  <Input
                    id="fp-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 rounded-xl border-gray-200 focus:border-rose-400 focus:ring-rose-400/20"
                    disabled={loading}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-semibold shadow-lg shadow-rose-500/25 hover:shadow-rose-500/40 transition-all"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending OTP...
                    </>
                  ) : (
                    'Send Reset Code'
                  )}
                </Button>
              </form>
            </motion.div>
          )}

          {/* Step 2: Enter OTP + New Password */}
          {step === 'otp' && (
            <motion.div
              key="otp-step"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
            >
              <div className="text-center mb-6">
                <div className="w-14 h-14 rounded-2xl bg-rose-50 flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-7 h-7 text-rose-500" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-1">
                  Reset Your Password
                </h1>
                <p className="text-sm text-gray-500">
                  Enter the 6-digit code and your new password
                </p>
              </div>

              {/* Demo OTP display */}
              {demoOtp && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-5 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-amber-700 mb-1">
                        Demo OTP (would be emailed in production)
                      </p>
                      <p className="text-lg font-bold text-amber-800 tracking-widest font-mono">
                        {demoOtp}
                      </p>
                    </div>
                    <button
                      onClick={handleCopyOtp}
                      className="p-2 rounded-lg bg-amber-100 hover:bg-amber-200 transition-colors"
                      title="Copy OTP"
                    >
                      {copied ? (
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Copy className="w-4 h-4 text-amber-700" />
                      )}
                    </button>
                  </div>
                </motion.div>
              )}

              {error && (
                <div className="mb-5 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm flex items-center justify-between">
                  {error}
                  <button onClick={() => setError('')}>
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fp-otp" className="text-sm font-medium text-gray-700">
                    6-Digit Code
                  </Label>
                  <Input
                    id="fp-otp"
                    type="text"
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="h-12 rounded-xl border-gray-200 focus:border-rose-400 focus:ring-rose-400/20 text-center text-lg tracking-[0.5em] font-mono"
                    disabled={loading}
                    maxLength={6}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fp-new-password" className="text-sm font-medium text-gray-700">
                    New Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="fp-new-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Min 6 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="h-12 rounded-xl border-gray-200 focus:border-rose-400 focus:ring-rose-400/20 pr-12"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? (
                        <X className="w-4 h-4" />
                      ) : (
                        <Mail className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fp-confirm-password" className="text-sm font-medium text-gray-700">
                    Confirm New Password
                  </Label>
                  <Input
                    id="fp-confirm-password"
                    type="password"
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="h-12 rounded-xl border-gray-200 focus:border-rose-400 focus:ring-rose-400/20"
                    disabled={loading}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-semibold shadow-lg shadow-rose-500/25 hover:shadow-rose-500/40 transition-all"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Resetting Password...
                    </>
                  ) : (
                    'Reset Password'
                  )}
                </Button>

                <p className="text-center text-xs text-gray-400 mt-3">
                  Didn&apos;t receive the code?{' '}
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={loading}
                    className="text-rose-600 hover:text-rose-700 font-medium"
                  >
                    Resend
                  </button>
                </p>
              </form>
            </motion.div>
          )}

          {/* Step 3: Success */}
          {step === 'success' && (
            <motion.div
              key="success-step"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="text-center py-4"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
                className="w-20 h-20 rounded-full bg-emerald-50 border-4 border-emerald-200 flex items-center justify-center mx-auto mb-6"
              >
                <CheckCircle className="w-10 h-10 text-emerald-500" />
              </motion.div>

              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Password Reset!
              </h1>
              <p className="text-sm text-gray-500 mb-8 max-w-xs mx-auto">
                Your password has been successfully updated. You can now sign in with your new password.
              </p>

              <Button
                onClick={() => setCurrentView('login')}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-semibold shadow-lg shadow-rose-500/25 hover:shadow-rose-500/40 transition-all"
              >
                Back to Login
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
