'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Star,
  X,
  Phone,
  Calendar,
  Clock,
  Globe,
  Briefcase,
  Award,
  Users,
  Loader2,
  MessageSquare,
} from 'lucide-react';
import { apiGet } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { NannyProfile, Review } from '@/types';

interface NannyWithUser extends Omit<NannyProfile, 'user'> {
  user?: { id: string; name: string; email: string; avatar: string | null; isOnline: boolean } | null;
}

interface NannyProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nanny: NannyWithUser | null;
  onCall?: (nanny: NannyWithUser) => void;
  onSchedule?: (nanny: NannyWithUser) => void;
}

export default function NannyProfileDialog({ open, onOpenChange, nanny, onCall, onSchedule }: NannyProfileDialogProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && nanny?.user?.id) {
      fetchReviews();
    }
  }, [open, nanny?.user?.id]);

  const fetchReviews = async () => {
    if (!nanny?.user?.id) return;
    try {
      setLoading(true);
      const data = await apiGet<{ nanny: NannyProfile; reviews: Review[] }>(`/api/nannies/${nanny.user.id}`);
      setReviews(data.reviews || []);
    } catch {
      // empty
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  const renderStars = (rating: number, size = 'sm') => {
    const starClass = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={cn(
          starClass,
          i < Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'text-gray-200'
        )}
      />
    ));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nanny Profile</DialogTitle>
          <DialogDescription>View detailed profile information</DialogDescription>
        </DialogHeader>

        {nanny && (
          <div className="space-y-5">
            {/* Header */}
            <div className="text-center">
              <Avatar className="h-20 w-20 mx-auto mb-3">
                <AvatarFallback className="bg-emerald-100 text-emerald-700 text-2xl font-bold">
                  {nanny.user?.name ? getInitials(nanny.user.name) : '??'}
                </AvatarFallback>
              </Avatar>
              <h3 className="text-xl font-bold text-gray-900">{nanny.user?.name}</h3>
              <div className="flex items-center justify-center gap-2 mt-1">
                <div className="flex items-center gap-0.5">
                  {renderStars(nanny.rating, 'sm')}
                </div>
                <span className="text-sm text-gray-600">{nanny.rating.toFixed(1)}</span>
                <span className="text-xs text-gray-400">({nanny.totalSessions} sessions)</span>
              </div>
              <div className="flex items-center justify-center gap-2 mt-2">
                {(nanny.isAvailable && nanny.user?.isOnline) ? (
                  <Badge className="bg-emerald-100 text-emerald-700 text-xs">Available Now</Badge>
                ) : nanny.isAvailable ? (
                  <Badge className="bg-gray-100 text-gray-600 text-xs">Available (Offline)</Badge>
                ) : (
                  <Badge className="bg-gray-100 text-gray-500 text-xs">Unavailable</Badge>
                )}
              </div>
            </div>

            <Separator />

            {/* Info grid */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Experience', value: `${nanny.experience} years`, icon: <Briefcase className="h-4 w-4" /> },
                { label: 'Hourly Rate', value: `₹${nanny.hourlyRate}/hr`, icon: <Clock className="h-4 w-4" /> },
                { label: 'Languages', value: nanny.languages || 'N/A', icon: <Globe className="h-4 w-4" /> },
                { label: 'Certifications', value: nanny.certifications || 'N/A', icon: <Award className="h-4 w-4" /> },
              ].map((item, i) => (
                <div key={i} className="p-3 rounded-lg bg-gray-50">
                  <div className="flex items-center gap-1.5 text-gray-400 mb-1">
                    {item.icon}
                    <span className="text-xs">{item.label}</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900">{item.value}</p>
                </div>
              ))}
            </div>

            {/* Skills */}
            {nanny.skills && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Skills</h4>
                <div className="flex flex-wrap gap-1.5">
                  {nanny.skills.split(',').map((skill) => (
                    <Badge key={skill} variant="secondary" className="bg-rose-50 text-rose-600 text-xs font-normal">
                      {skill.trim()}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Age Groups */}
            {nanny.ageGroup && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Age Groups</h4>
                <div className="flex flex-wrap gap-1.5">
                  {nanny.ageGroup.split(',').map((group) => (
                    <Badge key={group} variant="secondary" className="bg-emerald-50 text-emerald-600 text-xs font-normal">
                      {group.trim()}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Reviews */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Reviews ({reviews.length})
              </h4>
              {loading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
                </div>
              ) : reviews.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No reviews yet</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {reviews.map((review) => (
                    <div key={review.id} className="p-3 rounded-lg bg-gray-50">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-900">
                          {review.fromUserName || 'Anonymous'}
                        </span>
                        <div className="flex items-center gap-0.5">
                          {renderStars(review.rating, 'sm')}
                        </div>
                      </div>
                      {review.comment && (
                        <p className="text-xs text-gray-600">{review.comment}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Actions */}
            <div className="flex gap-3">
              {(nanny.isAvailable && nanny.user?.isOnline) && (
                <Button
                  onClick={() => onCall?.(nanny)}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white gap-2"
                >
                  <Phone className="h-4 w-4" />
                  Call Now
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => onSchedule?.(nanny)}
                className="flex-1 border-rose-200 text-rose-600 hover:bg-rose-50 gap-2"
              >
                <Calendar className="h-4 w-4" />
                Schedule
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
