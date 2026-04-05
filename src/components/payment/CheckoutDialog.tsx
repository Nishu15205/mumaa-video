'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard,
  Lock,
  Check,
  Loader2,
  Shield,
  X,
  CalendarClock,
  Zap,
  Users,
  Video,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { apiPost } from '@/lib/api';
import type { Subscription } from '@/types';
import { toast } from 'sonner';
import { PRICING_PLANS } from '@/lib/constants';

interface CheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string;
  userId: string;
  onSuccess: (subscription: Subscription) => void;
}

export default function CheckoutDialog({
  open,
  onOpenChange,
  planId,
  userId,
  onSuccess,
}: CheckoutDialogProps) {
  const plan = PRICING_PLANS.find((p) => p.id === planId);

  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Reset form on open
  useEffect(() => {
    if (open) {
      setCardNumber('');
      setExpiry('');
      setCvv('');
      setCardholderName('');
      setProcessing(false);
      setSuccess(false);
      setError('');
    }
  }, [open]);

  const formatCardNumber = useCallback((value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 16);
    const groups = digits.match(/.{1,4}/g);
    return groups ? groups.join(' ') : '';
  }, []);

  const formatExpiry = useCallback((value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) {
      return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    }
    return digits;
  }, []);

  const formatCvv = useCallback((value: string) => {
    return value.replace(/\D/g, '').slice(0, 3);
  }, []);

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCardNumber(formatCardNumber(e.target.value));
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setExpiry(formatExpiry(e.target.value));
  };

  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCvv(formatCvv(e.target.value));
  };

  const isFormValid = () => {
    return (
      cardNumber.replace(/\s/g, '').length === 16 &&
      expiry.length === 5 &&
      cvv.length === 3 &&
      cardholderName.trim().length >= 2
    );
  };

  const handleSubmit = async () => {
    if (!isFormValid()) {
      setError('Please fill in all card details correctly.');
      return;
    }

    try {
      setProcessing(true);
      setError('');

      // Simulate payment processing delay
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const res = await apiPost<{
        sessionId: string;
        url: string;
        subscription: Subscription;
      }>('/api/payments/checkout', {
        userId,
        plan: planId,
        amount: plan?.price || 0,
      });

      // Show success animation
      setSuccess(true);

      setTimeout(() => {
        onSuccess(res.subscription);
        onOpenChange(false);
        toast.success(`Welcome! Your ${plan?.name || planId} plan trial has started.`);
      }, 1500);
    } catch {
      setError('Payment processing failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const getPlanFeatureIcon = (feature: string) => {
    if (feature.toLowerCase().includes('video')) return <Video className="h-3.5 w-3.5 text-emerald-400" />;
    if (feature.toLowerCase().includes('nanni')) return <Users className="h-3.5 w-3.5 text-emerald-400" />;
    if (feature.toLowerCase().includes('instant') || feature.toLowerCase().includes('schedul')) return <Zap className="h-3.5 w-3.5 text-emerald-400" />;
    return <Check className="h-3.5 w-3.5 text-emerald-400" />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden gap-0 bg-white border-gray-200">
        <AnimatePresence mode="wait">
          {success ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="p-8 flex flex-col items-center justify-center min-h-[400px]"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mb-6"
              >
                <Check className="h-10 w-10 text-emerald-600" />
              </motion.div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Payment Successful!</h3>
              <p className="text-sm text-gray-500 text-center">
                Your {plan?.name} free trial has started.
              </p>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-4"
              >
                <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Header */}
              <DialogHeader className="p-6 pb-0">
                <div className="flex items-center justify-between">
                  <DialogTitle className="text-lg font-semibold text-gray-900">
                    Checkout
                  </DialogTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-lg"
                    onClick={() => onOpenChange(false)}
                  >
                    <X className="h-4 w-4 text-gray-400" />
                  </Button>
                </div>
              </DialogHeader>

              <div className="p-6 space-y-5">
                {/* Order Summary */}
                <div className="rounded-xl bg-slate-900 p-4 text-white">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{plan?.name} Plan</p>
                      <p className="text-xs text-slate-400">Monthly subscription</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-white">
                        ₹{plan?.price || 0}
                      </p>
                      <p className="text-xs text-slate-400">/month</p>
                    </div>
                  </div>

                  <div className="border-t border-slate-700 pt-3 space-y-2">
                    {plan?.features.slice(0, 3).map((feature, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-slate-300">
                        {getPlanFeatureIcon(feature)}
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-700">
                    <div className="flex items-center gap-2">
                      <CalendarClock className="h-4 w-4 text-amber-400" />
                      <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 hover:bg-amber-500/30 text-xs font-medium">
                        7-Day Free Trial
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-400 mt-1.5">
                      You won&apos;t be charged until the trial ends
                    </p>
                  </div>
                </div>

                {/* Payment Form */}
                <div className="space-y-4">
                  <p className="text-sm font-medium text-gray-700">Payment Details</p>

                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1.5 block">
                      Cardholder Name
                    </label>
                    <Input
                      placeholder="Name on card"
                      value={cardholderName}
                      onChange={(e) => setCardholderName(e.target.value)}
                      className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 h-11 rounded-lg focus-visible:ring-rose-500 focus-visible:border-rose-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1.5 block">
                      Card Number
                    </label>
                    <div className="relative">
                      <Input
                        placeholder="4242 4242 4242 4242"
                        value={cardNumber}
                        onChange={handleCardNumberChange}
                        className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 h-11 rounded-lg pr-11 focus-visible:ring-rose-500 focus-visible:border-rose-500"
                        maxLength={19}
                      />
                      <CreditCard className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1.5 block">
                        Expiry Date
                      </label>
                      <Input
                        placeholder="MM/YY"
                        value={expiry}
                        onChange={handleExpiryChange}
                        className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 h-11 rounded-lg focus-visible:ring-rose-500 focus-visible:border-rose-500"
                        maxLength={5}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1.5 block">
                        CVV
                      </label>
                      <div className="relative">
                        <Input
                          placeholder="123"
                          value={cvv}
                          onChange={handleCvvChange}
                          type="password"
                          className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 h-11 rounded-lg pr-9 focus-visible:ring-rose-500 focus-visible:border-rose-500"
                          maxLength={3}
                        />
                        <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600"
                  >
                    {error}
                  </motion.div>
                )}

                {/* Submit Button */}
                <Button
                  onClick={handleSubmit}
                  disabled={processing || !isFormValid()}
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-semibold text-sm transition-all"
                >
                  {processing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Processing Payment...
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4 mr-2" />
                      Start Free Trial
                    </>
                  )}
                </Button>

                <p className="text-xs text-center text-gray-400">
                  Your card won&apos;t be charged during the trial period.
                  Cancel anytime before the trial ends.
                </p>

                {/* Security Badge */}
                <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                  <Shield className="h-3.5 w-3.5" />
                  <span>Secured by 256-bit SSL encryption</span>
                  <Lock className="h-3 w-3" />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
