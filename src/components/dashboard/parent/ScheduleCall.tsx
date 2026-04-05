'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Clock,
  X,
  ChevronLeft,
  ChevronRight,
  Search,
  UserCheck,
  Loader2,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { apiGet, apiPost, apiPut } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
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
import type { NannyProfile, CallSession } from '@/types';

interface NannyWithUser extends NannyProfile {
  user?: { id: string; name: string; avatar: string | null; isOnline: boolean } | null;
}

export default function ScheduleCall() {
  const { user } = useAuthStore();
  const [nannies, setNannies] = useState<NannyWithUser[]>([]);
  const [scheduledCalls, setScheduledCalls] = useState<CallSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedNanny, setSelectedNanny] = useState<NannyWithUser | null>(null);
  const [nannySearch, setNannySearch] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState('');
  const [duration, setDuration] = useState('30');
  const [notes, setNotes] = useState('');
  const [cancelId, setCancelId] = useState<string | null>(null);

  const timeSlots = [];
  for (let hour = 8; hour <= 20; hour++) {
    for (let min = 0; min < 60; min += 30) {
      const h = hour.toString().padStart(2, '0');
      const m = min.toString().padStart(2, '0');
      timeSlots.push(`${h}:${m}`);
    }
  }

  useEffect(() => {
    fetchData();
  }, [user?.id]);

  const fetchData = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const [nanniesRes, callsRes] = await Promise.all([
        apiGet<{ nannies: NannyWithUser[] }>('/api/nannies'),
        apiGet<{ calls: CallSession[] }>(`/api/calls?userId=${user.id}&limit=50`),
      ]);
      setNannies((nanniesRes.nannies || []).filter((n: NannyWithUser) => n.isAvailable));
      setScheduledCalls(
        (callsRes.calls || [])
          .filter((c: CallSession) => c.type === 'SCHEDULED' && c.status !== 'CANCELLED')
          .sort((a: CallSession, b: CallSession) => new Date(b.scheduledAt || '').getTime() - new Date(a.scheduledAt || '').getTime())
      );
    } catch {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const filteredNannies = nannies.filter((n) =>
    n.user?.name?.toLowerCase().includes(nannySearch.toLowerCase())
  );

  const estimatedCost = () => {
    if (!selectedNanny || !duration) return 0;
    const hours = parseInt(duration) / 60;
    return Math.round(selectedNanny.hourlyRate * hours);
  };

  const handleSubmit = async () => {
    if (!selectedNanny || !selectedDate || !selectedTime || !user) {
      toast.error('Please fill all required fields');
      return;
    }
    try {
      setSubmitting(true);
      const scheduledAt = new Date(selectedDate);
      const [h, m] = selectedTime.split(':').map(Number);
      scheduledAt.setHours(h, m, 0, 0);

      await apiPost('/api/calls/schedule', {
        parentId: user.id,
        nannyId: selectedNanny.userId,
        scheduledAt: scheduledAt.toISOString(),
        notes: notes || undefined,
      });

      toast.success('Call scheduled successfully!');
      setSelectedNanny(null);
      setSelectedDate(undefined);
      setSelectedTime('');
      setDuration('30');
      setNotes('');
      fetchData();
    } catch {
      toast.error('Failed to schedule call');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelId) return;
    try {
      await apiPut(`/api/calls/${cancelId}/status`, { status: 'CANCELLED' });
      toast.success('Call cancelled');
      setCancelId(null);
      fetchData();
    } catch {
      toast.error('Failed to cancel call');
    }
  };

  const getInitials = (name: string) => name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-IN', {
      hour: '2-digit', minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[400px] rounded-xl" />
        <Skeleton className="h-[300px] rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Schedule a Call</h1>
        <p className="text-gray-500 mt-1">Pick a nanny, date, and time for your video session</p>
      </div>

      {/* Schedule form */}
      <Card className="rounded-xl border-gray-200 shadow-sm">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left column - Nanny selection */}
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">Select Nanny</Label>
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search nannies..."
                    value={nannySearch}
                    onChange={(e) => setNannySearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                  {filteredNannies.map((nanny) => (
                    <button
                      key={nanny.id}
                      onClick={() => setSelectedNanny(nanny)}
                      className={cn(
                        'w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left',
                        selectedNanny?.id === nanny.id
                          ? 'border-rose-300 bg-rose-50'
                          : 'border-gray-200 hover:border-gray-300'
                      )}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-emerald-100 text-emerald-700 text-sm">
                          {nanny.user?.name ? getInitials(nanny.user.name) : '??'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{nanny.user?.name}</p>
                        <p className="text-xs text-gray-500">
                          ₹{nanny.hourlyRate}/hr · {nanny.experience} yrs exp
                        </p>
                      </div>
                      {selectedNanny?.id === nanny.id && (
                        <div className="h-5 w-5 rounded-full bg-rose-500 flex items-center justify-center">
                          <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right column - Date, time, duration */}
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">Select Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn('w-full justify-start h-10', !selectedDate && 'text-gray-400')}>
                      <Calendar className="mr-2 h-4 w-4" />
                      {selectedDate ? selectedDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                      className="p-3"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">Select Time</Label>
                <Select value={selectedTime} onValueChange={setSelectedTime}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Pick a time slot" />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {timeSlots.map((slot) => (
                      <SelectItem key={slot} value={slot}>
                        {slot}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">Duration</Label>
                <div className="grid grid-cols-4 gap-2">
                  {['15', '30', '45', '60'].map((d) => (
                    <button
                      key={d}
                      onClick={() => setDuration(d)}
                      className={cn(
                        'py-2 px-3 rounded-lg text-sm font-medium border transition-all',
                        duration === d
                          ? 'border-rose-300 bg-rose-50 text-rose-600'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      )}
                    >
                      {d} min
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">Notes / Topic</Label>
                <Textarea
                  placeholder="What would you like to discuss?"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="resize-none h-20"
                />
              </div>

              {/* Estimated cost */}
              {selectedNanny && duration && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-between">
                  <span className="text-sm text-amber-700">Estimated cost</span>
                  <span className="text-lg font-bold text-amber-800">₹{estimatedCost()}</span>
                </div>
              )}

              <Button
                onClick={handleSubmit}
                disabled={submitting || !selectedNanny || !selectedDate || !selectedTime}
                className="w-full bg-rose-500 hover:bg-rose-600 text-white h-10 gap-2"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Calendar className="h-4 w-4" />
                )}
                Schedule Call
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* My scheduled calls */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">My Scheduled Calls</h2>
        {scheduledCalls.length === 0 ? (
          <Card className="rounded-xl border-gray-200 shadow-sm">
            <CardContent className="p-8 text-center">
              <Calendar className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No scheduled calls yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {scheduledCalls.map((call) => (
              <motion.div
                key={call.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="rounded-xl border-gray-200 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-emerald-100 text-emerald-700 text-sm">
                          {call.nannyName ? getInitials(call.nannyName) : '??'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{call.nannyName}</p>
                        <Badge
                          variant="secondary"
                          className={cn(
                            'text-[10px]',
                            call.status === 'ACCEPTED' ? 'bg-emerald-100 text-emerald-700' :
                            call.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                            'bg-gray-100 text-gray-600'
                          )}
                        >
                          {call.status}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCancelId(call.id)}
                        className="text-gray-400 hover:text-red-500 h-8 w-8 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    {call.scheduledAt && (
                      <div className="flex items-center gap-3 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatDate(call.scheduledAt)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {formatTime(call.scheduledAt)}
                        </span>
                      </div>
                    )}
                    {call.notes && (
                      <p className="text-xs text-gray-400 mt-2 truncate">{call.notes}</p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Cancel confirmation dialog */}
      <AlertDialog open={!!cancelId} onOpenChange={() => setCancelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this call?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The nanny will be notified about the cancellation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Cancel Call
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
