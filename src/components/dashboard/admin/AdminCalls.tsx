'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Filter,
  Phone,
  Download,
  Clock,
  Eye,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { apiGet } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { CallSession } from '@/types';
import { CALL_STATUS_LABELS } from '@/lib/constants';

export default function AdminCalls() {
  const [calls, setCalls] = useState<CallSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [viewCall, setViewCall] = useState<CallSession | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    fetchCalls();
  }, [statusFilter, page]);

  const fetchCalls = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      params.append('limit', pageSize.toString());
      params.append('offset', ((page - 1) * pageSize).toString());

      const res = await apiGet<{ calls: CallSession[] }>(`/api/admin/calls?${params.toString()}`);
      setCalls(res.calls || []);
    } catch {
      // empty
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-emerald-100 text-emerald-700';
      case 'ACTIVE': return 'bg-rose-100 text-rose-700';
      case 'ACCEPTED': return 'bg-emerald-100 text-emerald-700';
      case 'PENDING': return 'bg-amber-100 text-amber-700';
      case 'CANCELLED': return 'bg-gray-100 text-gray-600';
      case 'NO_SHOW': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return '--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-36" />
        <div className="flex gap-3">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Call Sessions</h1>
          <p className="text-gray-500 mt-1">View and manage all platform calls</p>
        </div>
        <Button variant="outline" className="border-gray-200 text-gray-600 gap-2">
          <Download className="h-4 w-4" />
          Export
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="h-10 w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="ACCEPTED">Accepted</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Calls table */}
      <Card className="rounded-xl border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left text-xs font-semibold text-gray-600 px-5 py-3">ID</th>
                <th className="text-left text-xs font-semibold text-gray-600 px-5 py-3">Parent</th>
                <th className="text-left text-xs font-semibold text-gray-600 px-5 py-3">Nanny</th>
                <th className="text-left text-xs font-semibold text-gray-600 px-5 py-3">Type</th>
                <th className="text-left text-xs font-semibold text-gray-600 px-5 py-3">Status</th>
                <th className="text-left text-xs font-semibold text-gray-600 px-5 py-3">Duration</th>
                <th className="text-right text-xs font-semibold text-gray-600 px-5 py-3">Price</th>
                <th className="text-left text-xs font-semibold text-gray-600 px-5 py-3">Date</th>
                <th className="text-center text-xs font-semibold text-gray-600 px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {calls.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-sm text-gray-400">
                    <Phone className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    No calls found
                  </td>
                </tr>
              ) : (
                calls.map((call, index) => (
                  <motion.tr
                    key={call.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.02 }}
                    className="border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => setViewCall(call)}
                  >
                    <td className="px-5 py-3 text-xs text-gray-400 font-mono">
                      {call.id.slice(0, 8)}...
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-900 font-medium">
                      {call.parentName || 'Unknown'}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-900 font-medium">
                      {call.nannyName || 'Unknown'}
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant="outline" className="text-[11px] border-gray-200 text-gray-500">
                        {call.type}
                      </Badge>
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant="secondary" className={cn('text-[11px]', getStatusBadge(call.status))}>
                        {CALL_STATUS_LABELS[call.status] || call.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600">
                      {formatDuration(call.duration)}
                    </td>
                    <td className="px-5 py-3 text-sm font-semibold text-gray-700 text-right">
                      {call.price > 0 ? `₹${call.price.toFixed(0)}` : '--'}
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-500">
                      {formatDate(call.createdAt)}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-gray-400 hover:text-gray-600"
                        onClick={(e) => { e.stopPropagation(); setViewCall(call); }}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page === 1}
          onClick={() => setPage((p) => p - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        <span className="text-sm text-gray-500 px-3">Page {page}</span>
        <Button
          variant="outline"
          size="sm"
          disabled={calls.length < pageSize}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Call detail dialog */}
      <Dialog open={!!viewCall} onOpenChange={() => setViewCall(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Call Details</DialogTitle>
          </DialogHeader>
          {viewCall && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-gray-50">
                  <p className="text-xs text-gray-500">Parent</p>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">{viewCall.parentName || 'Unknown'}</p>
                </div>
                <div className="p-3 rounded-lg bg-gray-50">
                  <p className="text-xs text-gray-500">Nanny</p>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">{viewCall.nannyName || 'Unknown'}</p>
                </div>
                <div className="p-3 rounded-lg bg-gray-50">
                  <p className="text-xs text-gray-500">Status</p>
                  <Badge variant="secondary" className={cn('mt-0.5 text-[11px]', getStatusBadge(viewCall.status))}>
                    {CALL_STATUS_LABELS[viewCall.status] || viewCall.status}
                  </Badge>
                </div>
                <div className="p-3 rounded-lg bg-gray-50">
                  <p className="text-xs text-gray-500">Type</p>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">{viewCall.type}</p>
                </div>
                <div className="p-3 rounded-lg bg-gray-50">
                  <p className="text-xs text-gray-500">Duration</p>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">{formatDuration(viewCall.duration)}</p>
                </div>
                <div className="p-3 rounded-lg bg-gray-50">
                  <p className="text-xs text-gray-500">Price</p>
                  <p className="text-sm font-bold text-emerald-600 mt-0.5">
                    {viewCall.price > 0 ? `₹${viewCall.price.toFixed(0)}` : '--'}
                  </p>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-gray-50">
                <p className="text-xs text-gray-500">Created</p>
                <p className="text-sm text-gray-900 mt-0.5">{new Date(viewCall.createdAt).toLocaleString('en-IN')}</p>
              </div>
              {viewCall.scheduledAt && (
                <div className="p-3 rounded-lg bg-gray-50">
                  <p className="text-xs text-gray-500">Scheduled For</p>
                  <p className="text-sm text-gray-900 mt-0.5">{new Date(viewCall.scheduledAt).toLocaleString('en-IN')}</p>
                </div>
              )}
              {viewCall.notes && (
                <div className="p-3 rounded-lg bg-gray-50">
                  <p className="text-xs text-gray-500">Notes</p>
                  <p className="text-sm text-gray-900 mt-0.5">{viewCall.notes}</p>
                </div>
              )}
              {viewCall.rating && (
                <div className="p-3 rounded-lg bg-amber-50">
                  <p className="text-xs text-amber-600">Rating</p>
                  <p className="text-sm font-bold text-amber-700 mt-0.5">{viewCall.rating}/5</p>
                  {viewCall.reviewComment && (
                    <p className="text-xs text-amber-600 mt-1">&quot;{viewCall.reviewComment}&quot;</p>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
