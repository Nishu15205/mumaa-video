'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Wallet,
  IndianRupee,
  CreditCard,
  Banknote,
  Building2,
  Smartphone,
  StickyNote,
  Loader2,
  TrendingUp,
  Calendar,
  Receipt,
  Clock,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { apiGet, apiPost } from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface NannyOption {
  id: string;
  name: string;
  email: string;
}

interface PaymentRecord {
  id: string;
  nannyId: string;
  nannyName: string;
  amount: number;
  method: string;
  note: string | null;
  paidByName: string;
  createdAt: string;
}

interface PaymentStats {
  totalThisMonth: number;
  totalAllTime: number;
  totalPayments: number;
}

const methodIcons: Record<string, any> = {
  CASH: Banknote,
  UPI: Smartphone,
  BANK_TRANSFER: Building2,
};

const methodLabels: Record<string, string> = {
  CASH: 'Cash',
  UPI: 'UPI',
  BANK_TRANSFER: 'Bank Transfer',
};

const methodColors: Record<string, string> = {
  CASH: 'bg-emerald-100 text-emerald-700',
  UPI: 'bg-violet-100 text-violet-700',
  BANK_TRANSFER: 'bg-blue-100 text-blue-700',
};

export default function AdminPayments() {
  const [nannies, setNannies] = useState<NannyOption[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [stats, setStats] = useState<PaymentStats>({ totalThisMonth: 0, totalAllTime: 0, totalPayments: 0 });
  const [loading, setLoading] = useState(true);
  const [payLoading, setPayLoading] = useState(false);

  // Form state
  const [selectedNanny, setSelectedNanny] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);

      const [nanniesData, paymentsData] = await Promise.all([
        apiGet<{ nannies: NannyOption[] }>('/api/nannies?all=true'),
        apiGet<{ payments: PaymentRecord[]; totalThisMonth: number; totalAllTime: number; totalPayments: number }>('/api/admin/payments'),
      ]);

      if (Array.isArray(nanniesData.nannies)) {
        setNannies(nanniesData.nannies);
      }

      setPayments(paymentsData.payments || []);
      setStats({
        totalThisMonth: paymentsData.totalThisMonth || 0,
        totalAllTime: paymentsData.totalAllTime || 0,
        totalPayments: paymentsData.totalPayments || 0,
      });
    } catch {
      toast.error('Failed to load payment data');
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNanny) {
      toast.error('Please select a nanny');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (!method) {
      toast.error('Please select a payment method');
      return;
    }

    setPayLoading(true);
    try {
      await apiPost('/api/admin/payments', {
        nannyId: selectedNanny,
        amount: parseFloat(amount),
        method,
        note: note.trim() || null,
      });
      toast.success(`₹${parseFloat(amount).toLocaleString('en-IN')} paid successfully!`);
      setSelectedNanny('');
      setAmount('');
      setMethod('');
      setNote('');
      fetchAll();
    } catch (err: any) {
      toast.error(err.message || 'Failed to process payment');
    } finally {
      setPayLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
        <Skeleton className="h-80 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Nanny Payments</h1>
        <p className="text-gray-500 mt-1">Manage manual payments to nannies</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
          <Card className="rounded-xl border-gray-200 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Paid This Month</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">₹{stats.totalThisMonth.toLocaleString('en-IN')}</p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-lg shadow-rose-500/20">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="rounded-xl border-gray-200 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Paid All Time</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">₹{stats.totalAllTime.toLocaleString('en-IN')}</p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="rounded-xl border-gray-200 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Payments</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalPayments}</p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
                  <Receipt className="w-5 h-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Pay Nanny Form */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <Card className="rounded-xl border-gray-200 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center">
                <Wallet className="w-4 h-4 text-white" />
              </div>
              Pay Nanny
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePay} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Nanny Select */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Nanny</Label>
                  <Select value={selectedNanny} onValueChange={setSelectedNanny}>
                    <SelectTrigger className="h-11 rounded-lg border-gray-200">
                      <SelectValue placeholder="Select a nanny..." />
                    </SelectTrigger>
                    <SelectContent>
                      {nannies.map((nanny) => (
                        <SelectItem key={nanny.id} value={nanny.id}>
                          {nanny.name} ({nanny.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Amount */}
                <div className="space-y-2">
                  <Label htmlFor="pay-amount" className="text-sm font-medium text-gray-700">Amount (₹)</Label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="pay-amount"
                      type="number"
                      min="1"
                      step="1"
                      placeholder="Enter amount"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="h-11 rounded-lg border-gray-200 focus:border-rose-400 focus:ring-rose-400/20 pl-10"
                    />
                  </div>
                </div>

                {/* Payment Method */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Payment Method</Label>
                  <Select value={method} onValueChange={setMethod}>
                    <SelectTrigger className="h-11 rounded-lg border-gray-200">
                      <SelectValue placeholder="Select method..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASH">
                        <span className="flex items-center gap-2">
                          <Banknote className="w-4 h-4 text-emerald-600" />
                          Cash
                        </span>
                      </SelectItem>
                      <SelectItem value="UPI">
                        <span className="flex items-center gap-2">
                          <Smartphone className="w-4 h-4 text-violet-600" />
                          UPI
                        </span>
                      </SelectItem>
                      <SelectItem value="BANK_TRANSFER">
                        <span className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-blue-600" />
                          Bank Transfer
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Note */}
                <div className="space-y-2">
                  <Label htmlFor="pay-note" className="text-sm font-medium text-gray-700">Note (optional)</Label>
                  <div className="relative">
                    <StickyNote className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="pay-note"
                      placeholder="e.g., November earnings"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className="h-11 rounded-lg border-gray-200 focus:border-rose-400 focus:ring-rose-400/20 pl-10"
                    />
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                disabled={payLoading}
                className="bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-semibold shadow-lg shadow-rose-500/25 hover:shadow-rose-500/40 transition-all h-11 rounded-lg gap-2"
              >
                {payLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" />
                    Pay Now
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>

      {/* Payment History */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card className="rounded-xl border-gray-200 shadow-sm overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="w-5 h-5 text-gray-500" />
              Payment History
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left text-xs font-semibold text-gray-600 px-5 py-3">Date</th>
                    <th className="text-left text-xs font-semibold text-gray-600 px-5 py-3">Nanny Name</th>
                    <th className="text-right text-xs font-semibold text-gray-600 px-5 py-3">Amount</th>
                    <th className="text-left text-xs font-semibold text-gray-600 px-5 py-3">Method</th>
                    <th className="text-left text-xs font-semibold text-gray-600 px-5 py-3 hidden sm:table-cell">Note</th>
                    <th className="text-left text-xs font-semibold text-gray-600 px-5 py-3 hidden md:table-cell">Paid By</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-sm text-gray-400">
                        <Wallet className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                        No payments recorded yet
                      </td>
                    </tr>
                  ) : (
                    payments.map((payment, index) => {
                      const MethodIcon = methodIcons[payment.method] || CreditCard;
                      return (
                        <motion.tr
                          key={payment.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: index * 0.02 }}
                          className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-5 py-3 text-sm text-gray-600">
                            {formatDate(payment.createdAt)}
                          </td>
                          <td className="px-5 py-3">
                            <span className="text-sm font-medium text-gray-900">{payment.nannyName}</span>
                          </td>
                          <td className="px-5 py-3 text-right">
                            <span className="text-sm font-bold text-gray-900">
                              ₹{payment.amount.toLocaleString('en-IN')}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            <Badge variant="secondary" className={cn('text-[11px]', methodColors[payment.method] || 'bg-gray-100 text-gray-600')}>
                              <MethodIcon className="w-3 h-3 mr-1" />
                              {methodLabels[payment.method] || payment.method}
                            </Badge>
                          </td>
                          <td className="px-5 py-3 text-sm text-gray-500 hidden sm:table-cell max-w-[200px] truncate">
                            {payment.note || '—'}
                          </td>
                          <td className="px-5 py-3 text-sm text-gray-500 hidden md:table-cell">
                            {payment.paidByName}
                          </td>
                        </motion.tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
