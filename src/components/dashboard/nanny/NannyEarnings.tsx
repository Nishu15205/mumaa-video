'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  Calendar,
  Wallet,
  IndianRupee,
  Clock,
  Phone,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { apiGet } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { NannyProfile, CallSession } from '@/types';

export default function NannyEarnings() {
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<NannyProfile | null>(null);
  const [calls, setCalls] = useState<CallSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, [user?.id]);

  const fetchData = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const [profileRes, callsRes, paymentsRes] = await Promise.all([
        apiGet<{ nanny: NannyProfile }>(`/api/nannies/${user.id}`),
        apiGet<{ calls: CallSession[] }>(`/api/calls?userId=${user.id}&limit=100`),
        apiGet<{ payments: any[]; stats: any }>(`/api/admin/payments?nannyId=${user.id}`),
      ]);
      setProfile(profileRes.nanny);
      setCalls((callsRes.calls || []).filter((c) => c.status === 'COMPLETED'));
      setPayments(paymentsRes.payments || []);
    } catch {
      // empty
    } finally {
      setLoading(false);
    }
  };

  const paidEarnings = profile?.paidEarnings || 0;
  const totalEarningsFromCalls = calls.reduce((sum, c) => sum + (c.price || 0), 0);
  const pendingEarnings = Math.max(0, totalEarningsFromCalls - paidEarnings);
  const completedCalls = calls;

  const thisWeekPayments = payments
    .filter((p: any) => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return new Date(p.createdAt) >= weekAgo;
    })
    .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

  const thisMonthPayments = payments
    .filter((p: any) => {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      return new Date(p.createdAt) >= monthAgo;
    })
    .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-32 rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Earnings</h1>
        <p className="text-gray-500 mt-1">Track your payments and earnings history</p>
      </div>

      {/* Pending Payment Banner */}
      {pendingEarnings > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="rounded-xl border border-amber-200 bg-amber-50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100">
                <AlertCircle className="h-5 w-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-800">
                  ₹{pendingEarnings.toLocaleString('en-IN')} pending payment
                </p>
                <p className="text-xs text-amber-600">Admin will process your payment soon</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Paid Earnings - Big card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="rounded-xl border-0 shadow-sm bg-gradient-to-br from-rose-500 via-pink-500 to-fuchsia-500 overflow-hidden">
          <CardContent className="p-6 text-white relative">
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/10 -translate-y-8 translate-x-8" />
            <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-white/5 translate-y-6 -translate-x-6" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-1">
                <Wallet className="h-5 w-5 opacity-80" />
                <span className="text-sm font-medium opacity-80">Total Paid</span>
              </div>
              <p className="text-4xl font-bold">₹{paidEarnings.toLocaleString('en-IN')}</p>
              <div className="flex items-center gap-4 mt-4">
                <div className="flex items-center gap-1.5 text-sm opacity-90">
                  <IndianRupee className="h-4 w-4" />
                  This month: ₹{thisMonthPayments.toLocaleString('en-IN')}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Breakdown cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            label: 'This Week',
            value: thisWeekPayments,
            icon: <Calendar className="h-5 w-5" />,
            color: 'from-emerald-50 to-teal-50',
            iconColor: 'text-emerald-500',
          },
          {
            label: 'This Month',
            value: thisMonthPayments,
            icon: <TrendingUp className="h-5 w-5" />,
            color: 'from-amber-50 to-orange-50',
            iconColor: 'text-amber-500',
          },
          {
            label: 'Total Calls',
            value: completedCalls.length,
            icon: <Phone className="h-5 w-5" />,
            color: 'from-purple-50 to-violet-50',
            iconColor: 'text-purple-500',
          },
        ].map((card, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08 }}
          >
            <Card className={cn('border-0 shadow-sm bg-gradient-to-br rounded-xl', card.color)}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-500 font-medium">{card.label}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {card.label === 'Total Calls'
                        ? card.value
                        : `₹${(card.value as number).toLocaleString('en-IN')}`}
                    </p>
                  </div>
                  <div className={cn('p-2.5 rounded-lg bg-white/70', card.iconColor)}>
                    {card.icon}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Payment History */}
      <Card className="rounded-xl border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Payment History</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs font-medium text-gray-500 px-6 py-3">Date</th>
                <th className="text-left text-xs font-medium text-gray-500 px-6 py-3">Amount</th>
                <th className="text-left text-xs font-medium text-gray-500 px-6 py-3">Method</th>
                <th className="text-left text-xs font-medium text-gray-500 px-6 py-3">Note</th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-sm text-gray-400">
                    <Wallet className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    No payments received yet. Admin will pay you once your calls are completed.
                  </td>
                </tr>
              ) : (
                payments.map((payment: any) => (
                  <tr key={payment.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3 text-sm text-gray-700">
                      {new Date(payment.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-3 text-sm font-semibold text-emerald-600">
                      +₹{(payment.amount || 0).toFixed(0)}
                    </td>
                    <td className="px-6 py-3">
                      <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-700">
                        {payment.method || 'Manual'}
                      </Badge>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-500">{payment.note || '--'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
