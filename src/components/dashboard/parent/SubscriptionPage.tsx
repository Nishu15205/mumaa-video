'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  CreditCard,
  Crown,
  Check,
  X,
  Clock,
  Phone,
  Calendar,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { apiGet, apiPost } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { PRICING_PLANS } from '@/lib/constants';
import type { Subscription, CallSession } from '@/types';
import CheckoutDialog from '@/components/payment/CheckoutDialog';

export default function SubscriptionPage() {
  const { user, subscription, setSubscription } = useAuthStore();
  const [calls, setCalls] = useState<CallSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [checkoutPlan, setCheckoutPlan] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [user?.id]);

  const fetchData = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const [subRes, callsRes] = await Promise.all([
        apiGet<{ subscription: Subscription }>(`/api/subscriptions?userId=${user.id}`),
        apiGet<{ calls: CallSession[] }>(`/api/calls?userId=${user.id}&limit=100`),
      ]);
      setSubscription(subRes.subscription);
      setCalls(callsRes.calls || []);
    } catch {
      // empty
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = (planId: string) => {
    setCheckoutPlan(planId);
  };

  const handleCheckoutSuccess = (sub: Subscription) => {
    setSubscription(sub);
    setCheckoutPlan(null);
  };

  const handleCancel = async () => {
    try {
      const res = await apiPost<{ subscription: Subscription }>('/api/subscriptions/cancel', {
        userId: user?.id,
      });
      setSubscription(res.subscription);
      setShowCancelDialog(false);
      toast.success('Subscription cancelled');
    } catch {
      toast.error('Failed to cancel subscription');
    }
  };

  const completedCalls = calls.filter((c) => c.status === 'COMPLETED').length;
  const scheduledCalls = calls.filter((c) => c.type === 'SCHEDULED' && c.status !== 'CANCELLED').length;

  const trialDaysLeft = subscription?.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(subscription.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const isTrial = subscription?.isTrial && trialDaysLeft > 0;
  const currentPlanId = subscription?.plan || 'FREE';

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-72 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Subscription</h1>
        <p className="text-gray-500 mt-1">Manage your subscription plan and usage</p>
      </div>

      {/* Trial banner */}
      {isTrial && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 flex items-center gap-3"
        >
          <div className="p-2 rounded-lg bg-amber-100">
            <Clock className="h-5 w-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800">
              Free Trial Active — {trialDaysLeft} day{trialDaysLeft !== 1 ? 's' : ''} remaining
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              Your trial ends on {subscription?.trialEndsAt ? new Date(subscription.trialEndsAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'}
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => handleUpgrade('BASIC')}
            className="bg-amber-500 hover:bg-amber-600 text-white"
          >
            Upgrade Now
          </Button>
        </motion.div>
      )}

      {/* Current plan */}
      <Card className="rounded-xl border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-rose-500 to-pink-600 p-6 text-white">
          <div className="flex items-center gap-2 mb-2">
            <Crown className="h-5 w-5" />
            <span className="text-sm font-medium opacity-90">Current Plan</span>
          </div>
          <h2 className="text-2xl font-bold">{subscription?.plan || 'Free'}</h2>
          <p className="text-sm opacity-80 mt-1">
            {subscription?.status === 'ACTIVE'
              ? `Renews on ${subscription?.currentPeriodEnds ? new Date(subscription.currentPeriodEnds).toLocaleDateString('en-IN', { day: 'numeric', month: 'long' }) : 'N/A'}`
              : 'Inactive'}
          </p>
        </div>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-2">Calls This Month</p>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-gray-400" />
                    Completed calls
                  </span>
                  <span className="font-medium text-gray-900">{completedCalls}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-gray-400" />
                    Scheduled calls
                  </span>
                  <span className="font-medium text-gray-900">{scheduledCalls}</span>
                </div>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 mb-2">Plan Features</p>
              <div className="space-y-1.5">
                {(PRICING_PLANS.find((p) => p.id === currentPlanId)?.features || []).slice(0, 4).map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
                    <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    {f}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Cancel button for paid plans */}
          {currentPlanId !== 'FREE' && subscription?.status === 'ACTIVE' && (
            <div className="mt-6 pt-4 border-t border-gray-100">
              <Button
                variant="ghost"
                onClick={() => setShowCancelDialog(true)}
                className="text-red-500 hover:text-red-600 hover:bg-red-50 text-sm"
              >
                Cancel Subscription
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Plans */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Available Plans</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PRICING_PLANS.map((plan, index) => {
            const isCurrent = plan.id === currentPlanId;
            const isPopular = plan.popular;
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card
                  className={cn(
                    'rounded-xl overflow-hidden relative',
                    isCurrent ? 'border-rose-300 ring-2 ring-rose-100' : 'border-gray-200',
                    isPopular && !isCurrent && 'border-amber-300'
                  )}
                >
                  {isPopular && (
                    <div className="bg-amber-500 text-white text-xs font-semibold text-center py-1">
                      Most Popular
                    </div>
                  )}
                  <CardContent className="p-5">
                    <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                    <div className="mt-2 mb-4">
                      <span className="text-3xl font-bold text-gray-900">
                        ₹{plan.price}
                      </span>
                      <span className="text-sm text-gray-500">/month</span>
                    </div>
                    <ul className="space-y-2 mb-6">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                          <Check className={cn('h-4 w-4 shrink-0', isCurrent ? 'text-rose-500' : 'text-emerald-500')} />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <Button
                      disabled={isCurrent}
                      onClick={() => handleUpgrade(plan.id)}
                      variant={isCurrent ? 'secondary' : isPopular ? 'default' : 'outline'}
                      className={cn(
                        'w-full h-10',
                        isCurrent && 'bg-gray-100 text-gray-500 cursor-default',
                        !isCurrent && isPopular && 'bg-rose-500 hover:bg-rose-600 text-white',
                        !isCurrent && !isPopular && 'border-gray-200'
                      )}
                    >
                      {isCurrent ? (
                        'Current Plan'
                      ) : (
                        'Start Free Trial'
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Checkout Dialog */}
      <CheckoutDialog
        open={!!checkoutPlan}
        onOpenChange={(open) => {
          if (!open) setCheckoutPlan(null);
        }}
        planId={checkoutPlan || 'BASIC'}
        userId={user?.id || ''}
        onSuccess={handleCheckoutSuccess}
      />

      {/* Cancel dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Cancel your subscription?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Your subscription will be cancelled and you will be moved to the Free plan. You will lose access to premium features at the end of your current billing period.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Yes, Cancel
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
