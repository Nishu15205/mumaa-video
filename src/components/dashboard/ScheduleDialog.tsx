'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar,
  Clock,
  X,
  Loader2,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { apiPost } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
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
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { NannyProfile } from '@/types';

interface NannyWithUser extends NannyProfile {
  user?: { id: string; name: string; avatar: string | null; isOnline: boolean } | null;
}

interface ScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nanny: NannyWithUser | null;
  onSuccess?: () => void;
}

export default function ScheduleDialog({ open, onOpenChange, nanny, onSuccess }: ScheduleDialogProps) {
  const { user } = useAuthStore();
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState('');
  const [duration, setDuration] = useState('30');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const timeSlots = [];
  for (let hour = 8; hour <= 20; hour++) {
    for (let min = 0; min < 60; min += 30) {
      const h = hour.toString().padStart(2, '0');
      const m = min.toString().padStart(2, '0');
      timeSlots.push(`${h}:${m}`);
    }
  }

  const estimatedCost = () => {
    if (!nanny || !duration) return 0;
    const hours = parseInt(duration) / 60;
    return Math.round(nanny.hourlyRate * hours);
  };

  const handleSubmit = async () => {
    if (!nanny || !selectedDate || !selectedTime || !user) {
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
        nannyId: nanny.userId,
        scheduledAt: scheduledAt.toISOString(),
        notes: notes || undefined,
      });

      toast.success('Call scheduled successfully!');
      handleReset();
      onOpenChange(false);
      onSuccess?.();
    } catch {
      toast.error('Failed to schedule call');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setSelectedDate(undefined);
    setSelectedTime('');
    setDuration('30');
    setNotes('');
  };

  const handleClose = () => {
    handleReset();
    onOpenChange(false);
  };

  const getInitials = (name: string) => name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-rose-500" />
            Schedule a Call
          </DialogTitle>
          <DialogDescription>
            Pick a date and time for your session
          </DialogDescription>
        </DialogHeader>

        {nanny && (
          <div className="space-y-4 mt-2">
            {/* Nanny info */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-emerald-100 text-emerald-700 text-sm">
                  {nanny.user?.name ? getInitials(nanny.user.name) : '??'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{nanny.user?.name}</p>
                <p className="text-xs text-gray-500">₹{nanny.hourlyRate}/hr · {nanny.experience} yrs exp</p>
              </div>
            </div>

            {/* Date */}
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-1.5 block">Date</Label>
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

            {/* Time */}
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-1.5 block">Time</Label>
              <Select value={selectedTime} onValueChange={setSelectedTime}>
                <SelectTrigger className="h-10">
                  <Clock className="mr-2 h-4 w-4 text-gray-400" />
                  <SelectValue placeholder="Pick a time" />
                </SelectTrigger>
                <SelectContent className="max-h-48">
                  {timeSlots.map((slot) => (
                    <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Duration */}
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-1.5 block">Duration</Label>
              <div className="grid grid-cols-4 gap-2">
                {['15', '30', '45', '60'].map((d) => (
                  <button
                    key={d}
                    onClick={() => setDuration(d)}
                    className={cn(
                      'py-2 rounded-lg text-sm font-medium border transition-all text-center',
                      duration === d
                        ? 'border-rose-300 bg-rose-50 text-rose-600'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    )}
                  >
                    {d}m
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-1.5 block">
                Notes <span className="text-gray-400 font-normal">(optional)</span>
              </Label>
              <Textarea
                placeholder="What would you like to discuss?"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="resize-none h-16"
              />
            </div>

            {/* Cost */}
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-between">
              <span className="text-sm text-amber-700">Estimated cost</span>
              <span className="text-lg font-bold text-amber-800">₹{estimatedCost()}</span>
            </div>

            {/* Submit */}
            <Button
              onClick={handleSubmit}
              disabled={submitting || !selectedDate || !selectedTime}
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
        )}
      </DialogContent>
    </Dialog>
  );
}
