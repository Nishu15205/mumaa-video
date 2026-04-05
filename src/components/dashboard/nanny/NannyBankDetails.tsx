'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Building2,
  Landmark,
  CreditCard,
  Smartphone,
  User,
  Loader2,
  Shield,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth-store';
import { apiGet, apiPut } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { NannyProfile, Subscription } from '@/types';

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------

interface BankDetailsForm {
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  ifscCode: string;
  upiId: string;
}

interface SubscriptionResponse {
  subscription: Subscription;
}

interface NannyProfileResponse {
  nanny: NannyProfile;
}

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const end = new Date(dateStr);
  const now = new Date();
  return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
}

const initialForm: BankDetailsForm = {
  bankName: '',
  accountHolder: '',
  accountNumber: '',
  ifscCode: '',
  upiId: '',
};

// ----------------------------------------------------------------
// Field definitions (kept outside render for stability)
// ----------------------------------------------------------------

const FIELDS: {
  key: keyof BankDetailsForm;
  label: string;
  placeholder: string;
  icon: React.ReactNode;
  required: boolean;
}[] = [
  {
    key: 'bankName',
    label: 'Bank Name',
    placeholder: 'e.g. State Bank of India',
    icon: <Building2 className="h-4 w-4" />,
    required: true,
  },
  {
    key: 'accountHolder',
    label: 'Account Holder Name',
    placeholder: 'Name as on your bank account',
    icon: <User className="h-4 w-4" />,
    required: true,
  },
  {
    key: 'accountNumber',
    label: 'Account Number',
    placeholder: 'e.g. 1234567890',
    icon: <CreditCard className="h-4 w-4" />,
    required: true,
  },
  {
    key: 'ifscCode',
    label: 'IFSC Code',
    placeholder: 'e.g. SBIN0001234',
    icon: <Landmark className="h-4 w-4" />,
    required: true,
  },
  {
    key: 'upiId',
    label: 'UPI ID',
    placeholder: 'e.g. name@upi (optional)',
    icon: <Smartphone className="h-4 w-4" />,
    required: false,
  },
];

// ----------------------------------------------------------------
// Component
// ----------------------------------------------------------------

export default function NannyBankDetails() {
  const { user } = useAuthStore();

  // State
  const [profile, setProfile] = useState<NannyProfile | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<BankDetailsForm>(initialForm);

  // ----------------------------------------------------------------
  // Data fetching
  // ----------------------------------------------------------------

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const [profileRes, subRes] = await Promise.all([
        apiGet<NannyProfileResponse>(`/api/nannies/${user.id}`),
        apiGet<SubscriptionResponse>(`/api/subscriptions?userId=${user.id}`).catch(() => null),
      ]);

      const nanny = profileRes.nanny;
      setProfile(nanny);
      setForm({
        bankName: nanny.bankName || '',
        accountHolder: nanny.accountHolder || '',
        accountNumber: nanny.accountNumber || '',
        ifscCode: nanny.ifscCode || '',
        upiId: nanny.upiId || '',
      });

      if (subRes?.subscription) {
        setSubscription(subRes.subscription);
      }
    } catch {
      // Silently fail — the form will render empty
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ----------------------------------------------------------------
  // Form handling
  // ----------------------------------------------------------------

  const updateField = (key: keyof BankDetailsForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const isFormValid =
    form.bankName.trim() !== '' &&
    form.accountHolder.trim() !== '' &&
    form.accountNumber.trim() !== '' &&
    form.ifscCode.trim() !== '';

  const handleSave = async () => {
    if (!user?.id || !isFormValid) return;

    try {
      setSaving(true);
      await apiPut('/api/nannies/bank-details', {
        userId: user.id,
        bankName: form.bankName.trim(),
        accountHolder: form.accountHolder.trim(),
        accountNumber: form.accountNumber.trim(),
        ifscCode: form.ifscCode.trim(),
        upiId: form.upiId.trim(),
      });

      toast.success('Bank details saved', {
        description: 'Your payment information has been updated successfully.',
        icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
      });
    } catch {
      toast.error('Failed to save', {
        description: 'Something went wrong. Please try again.',
      });
    } finally {
      setSaving(false);
    }
  };

  // ----------------------------------------------------------------
  // Trial calculation
  // ----------------------------------------------------------------

  const trialDaysLeft = daysUntil(subscription?.trialEndsAt ?? null);
  const showTrialBanner =
    subscription?.isTrial &&
    subscription.status === 'ACTIVE' &&
    trialDaysLeft !== null &&
    trialDaysLeft > 0;

  // ----------------------------------------------------------------
  // Loading skeleton
  // ----------------------------------------------------------------

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-1" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-[520px] rounded-xl" />
      </div>
    );
  }

  // ----------------------------------------------------------------
  // Render
  // ----------------------------------------------------------------

  const hasExistingDetails =
    profile?.bankName || profile?.accountNumber || profile?.ifscCode;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold text-gray-900">Bank Details</h1>
        <p className="text-gray-500 mt-1">
          {hasExistingDetails
            ? 'Update your payment information for receiving earnings'
            : 'Add your bank details to start receiving payments'}
        </p>
      </motion.div>

      {/* Free Trial Banner */}
      {showTrialBanner && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <Card className="rounded-xl border border-rose-200 bg-gradient-to-r from-rose-50 via-pink-50 to-fuchsia-50 overflow-hidden">
            <CardContent className="p-4 flex items-center gap-3 relative">
              <div className="absolute inset-0 bg-gradient-to-r from-rose-500/5 via-pink-500/5 to-fuchsia-500/5" />
              <div className="relative flex items-center gap-3 w-full">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-rose-500 to-pink-500 text-white shadow-sm">
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900">Free Trial Active</p>
                    <Badge className="bg-rose-500 text-white hover:bg-rose-600 border-0 text-[10px] px-2 py-0">
                      {trialDaysLeft} day{trialDaysLeft !== 1 ? 's' : ''} left
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Set up your payment details before the trial ends to receive earnings seamlessly.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Bank Details Form Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="rounded-xl border-gray-200 shadow-sm overflow-hidden">
          {/* Gradient header */}
          <div className="bg-gradient-to-r from-rose-500 via-pink-500 to-fuchsia-500 px-6 py-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-white/10 -translate-y-20 translate-x-20" />
            <div className="absolute bottom-0 left-1/2 w-24 h-24 rounded-full bg-white/5 translate-y-12" />
            <div className="relative flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-white/20 backdrop-blur-sm">
                <Landmark className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-white text-lg">
                  Payment Information
                </CardTitle>
                <p className="text-white/80 text-sm mt-0.5">
                  Your earnings will be credited to this account
                </p>
              </div>
            </div>
          </div>

          <CardContent className="p-6">
            <div className="space-y-5">
              {FIELDS.map((field, index) => (
                <motion.div
                  key={field.key}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + index * 0.05 }}
                >
                  <Label
                    htmlFor={field.key}
                    className="text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5"
                  >
                    {field.icon}
                    {field.label}
                    {!field.required && (
                      <span className="text-xs text-gray-400 font-normal">
                        (optional)
                      </span>
                    )}
                  </Label>
                  <Input
                    id={field.key}
                    type="text"
                    value={form[field.key]}
                    onChange={(e) => updateField(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    className={cn(
                      'rounded-xl h-11 border-gray-200 focus:border-rose-400 focus:ring-rose-400/20 transition-colors',
                      'bg-gray-50/50 hover:bg-white'
                    )}
                  />
                </motion.div>
              ))}

              {/* Save Button */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="pt-2"
              >
                <Button
                  onClick={handleSave}
                  disabled={!isFormValid || saving}
                  className={cn(
                    'w-full h-12 rounded-xl font-semibold text-white shadow-sm',
                    'bg-gradient-to-r from-rose-500 via-pink-500 to-fuchsia-500',
                    'hover:from-rose-600 hover:via-pink-600 hover:to-fuchsia-600',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    'transition-all duration-200'
                  )}
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-5 w-5 mr-2" />
                      Save Bank Details
                    </>
                  )}
                </Button>
              </motion.div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Security Note */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="rounded-xl border-0 bg-gradient-to-br from-gray-50 to-slate-50 shadow-sm">
          <CardContent className="p-4 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-emerald-100 shrink-0 mt-0.5">
              <Shield className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800">
                Your bank details are securely stored
              </p>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                Your bank details are securely stored and will only be used for payment processing.
                We use industry-standard encryption to protect your financial information.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
