'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Filter,
  Star,
  Phone,
  Calendar,
  Eye,
  X,
  Globe,
  Briefcase,
  Sparkles,
  UserPlus,
  Video,
  Clock,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useAppStore } from '@/stores/app-store';
import { apiGet, apiPost } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import ScheduleDialog from '@/components/dashboard/ScheduleDialog';
import NannyProfileDialog from '@/components/dashboard/NannyProfileDialog';
import type { NannyProfile, CallSession } from '@/types';

interface NannyWithUser extends NannyProfile {
  user?: {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
    isOnline: boolean;
  } | null;
}

export default function FindNannies() {
  const { user } = useAuthStore();
  const { startCall, setWaitingForNanny, currentCall } = useAppStore();
  const [nannies, setNannies] = useState<NannyWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [skillFilter, setSkillFilter] = useState('');
  const [minRating, setMinRating] = useState('0');
  const [sortBy, setSortBy] = useState('rating');
  const [showFilters, setShowFilters] = useState(false);
  const [joiningNanny, setJoiningNanny] = useState<string | null>(null);
  const [selectedNanny, setSelectedNanny] = useState<NannyWithUser | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [profileNanny, setProfileNanny] = useState<NannyWithUser | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  const fetchNannies = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (skillFilter) params.append('skill', skillFilter);
      if (minRating !== '0') params.append('minRating', minRating);
      params.append('sort', sortBy);
      params.append('available', 'true');

      const res = await apiGet<{ nannies: NannyWithUser[] }>(`/api/nannies?${params.toString()}`);
      const nanniesList = Array.isArray(res.nannies) ? res.nannies : [];
      setNannies(nanniesList);
    } catch {
      toast.error('Failed to load nannies');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, skillFilter, minRating, sortBy]);

  useEffect(() => {
    const debounce = setTimeout(fetchNannies, 300);
    return () => clearTimeout(debounce);
  }, [fetchNannies]);

  const handleJoinCall = async (nanny: NannyWithUser) => {
    if (!user || !nanny.userId) return;

    // Prevent double action
    if (currentCall) {
      toast.error('You already have an active call.');
      return;
    }

    try {
      setJoiningNanny(nanny.userId);

      // 1. Pre-acquire camera/mic on button tap (user gesture for mobile!)
      let mediaStream: MediaStream | null = null;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          video: {
            width: { ideal: 640, max: 1280 },
            height: { ideal: 480, max: 720 },
            frameRate: { ideal: 24 },
            facingMode: 'user',
          },
        });
      } catch (mediaErr: any) {
        console.warn('Media pre-acquire failed, will retry in call:', mediaErr.name);
      }

      // 2. Create call in DB
      const res = await apiPost<{ call: any }>('/api/calls/instant', {
        parentId: user.id,
        nannyId: nanny.userId,
      });

      // 3. Flatten nested data
      const rawCall = res.call;
      const flatCall: CallSession = {
        id: rawCall.id,
        parentId: rawCall.parentId,
        nannyId: rawCall.nannyId,
        parentName: rawCall.parent?.name || user.name,
        nannyName: rawCall.nanny?.name || nanny.user?.name || 'Nanny',
        parentAvatar: rawCall.parent?.avatar || null,
        nannyAvatar: rawCall.nanny?.avatar || null,
        type: rawCall.type,
        status: rawCall.status,
        scheduledAt: rawCall.scheduledAt,
        startedAt: rawCall.startedAt,
        endedAt: rawCall.endedAt,
        duration: rawCall.duration || 0,
        price: rawCall.price || 0,
        notes: rawCall.notes,
        callRoomId: rawCall.callRoomId,
        rating: rawCall.rating,
        reviewComment: rawCall.reviewComment,
        createdAt: rawCall.createdAt,
        updatedAt: rawCall.updatedAt,
      };

      // 4. Set call + show waiting screen with pre-acquired media
      useAppStore.getState().setWaitingForNanny(true);
      if (mediaStream) {
        useAppStore.getState().setLocalStream(mediaStream);
      }
      startCall(flatCall, mediaStream);
      toast.success('Waiting for nanny to join...');
    } catch (err: any) {
      toast.error('Failed to connect. Nanny may be offline.');
    } finally {
      setJoiningNanny(null);
    }
  };

  const getInitials = (name: string) => name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={cn(
          'h-3.5 w-3.5',
          i < Math.round(rating)
            ? 'fill-amber-400 text-amber-400'
            : 'text-gray-200'
        )}
      />
    ));
  };

  const skillOptions = [
    'Baby Care', 'Toddler Care', 'Child Development',
    'First Aid', 'Nutrition', 'Special Needs',
    'Sleep Training', 'Early Education',
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-40 mb-1" />
          <Skeleton className="h-4 w-60" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-10" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Find Nannies</h1>
        <p className="text-gray-500 mt-1">Browse trusted nannies available for video calls</p>
      </div>

      {/* Search and filter bar */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by name, skills..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 bg-white border-gray-200"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="h-4 w-4 text-gray-400" />
            </button>
          )}
        </div>
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            'h-10 gap-2 border-gray-200',
            showFilters && 'bg-rose-50 border-rose-200 text-rose-600'
          )}
        >
          <Filter className="h-4 w-4" />
          Filters
        </Button>
      </div>

      {/* Expandable filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap gap-3 p-4 bg-white rounded-xl border border-gray-200">
              <div className="flex-1 min-w-[180px]">
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Skill</label>
                <Select value={skillFilter} onValueChange={setSkillFilter}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="All Skills" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Skills</SelectItem>
                    {skillOptions.map((skill) => (
                      <SelectItem key={skill} value={skill}>{skill}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-[160px]">
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Min Rating</label>
                <Select value={minRating} onValueChange={setMinRating}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Any Rating" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Any Rating</SelectItem>
                    <SelectItem value="3">3+ Stars</SelectItem>
                    <SelectItem value="4">4+ Stars</SelectItem>
                    <SelectItem value="4.5">4.5+ Stars</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-[160px]">
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Sort By</label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rating">Highest Rated</SelectItem>
                    <SelectItem value="experience">Most Experience</SelectItem>
                    <SelectItem value="price">Lowest Price</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSkillFilter('');
                    setMinRating('0');
                    setSortBy('rating');
                    setSearchQuery('');
                  }}
                  className="text-gray-500 text-sm"
                >
                  Clear all
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Nannies grid */}
      {nannies.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No nannies found</h3>
          <p className="text-sm text-gray-500">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {nannies.map((nanny, index) => (
              <motion.div
                key={nanny.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="rounded-xl border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden group">
                  {/* Card top gradient */}
                  <div className="h-20 bg-gradient-to-br from-emerald-50 to-teal-50 relative">
                    <div className="absolute -bottom-8 left-4">
                      <div className="relative">
                        <Avatar className="h-16 w-16 border-4 border-white shadow-sm">
                          <AvatarFallback className="bg-emerald-100 text-emerald-700 text-lg font-bold">
                            {nanny.user?.name ? getInitials(nanny.user.name) : '??'}
                          </AvatarFallback>
                        </Avatar>
                        {(nanny.isAvailable && nanny.user?.isOnline) && (
                          <span className="absolute bottom-0 right-0 h-4 w-4 rounded-full bg-emerald-500 border-2 border-white" />
                        )}
                      </div>
                    </div>
                  </div>

                  <CardContent className="p-4 pt-12">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-900">{nanny.user?.name || 'Unknown'}</h3>
                        <div className="flex items-center gap-1 mt-0.5">
                          {renderStars(nanny.rating)}
                          <span className="text-xs text-gray-500 ml-1">
                            {nanny.rating.toFixed(1)} ({nanny.totalSessions})
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-rose-600">₹{nanny.hourlyRate}</p>
                        <p className="text-[10px] text-gray-400">/hour</p>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-3 mb-3">
                      <span className="flex items-center gap-1">
                        <Briefcase className="h-3 w-3" />
                        {nanny.experience} yrs
                      </span>
                      <span className="flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        {nanny.languages?.split(',').slice(0, 2).join(', ')}
                      </span>
                    </div>

                    {/* Skills tags */}
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {nanny.skills?.split(',').slice(0, 3).map((skill) => (
                        <Badge
                          key={skill}
                          variant="secondary"
                          className="text-[10px] bg-gray-100 text-gray-600 font-normal px-2 py-0"
                        >
                          {skill.trim()}
                        </Badge>
                      ))}
                      {nanny.skills?.split(',').length > 3 && (
                        <Badge variant="secondary" className="text-[10px] bg-gray-100 text-gray-500 font-normal px-2 py-0">
                          +{nanny.skills.split(',').length - 3}
                        </Badge>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      {(nanny.isAvailable && nanny.user?.isOnline) ? (
                        <Button
                          size="sm"
                          onClick={() => handleJoinCall(nanny)}
                          disabled={joiningNanny === nanny.userId}
                          className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white text-sm gap-1.5 h-9"
                        >
                          <Video className="h-3.5 w-3.5" />
                          {joiningNanny === nanny.userId ? 'Connecting...' : 'Join'}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          disabled
                          className="flex-1 text-sm gap-1.5 h-9"
                        >
                          <Clock className="h-3.5 w-3.5" />
                          Offline
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedNanny(nanny);
                          setScheduleOpen(true);
                        }}
                        className="flex-1 border-rose-200 text-rose-600 hover:bg-rose-50 text-sm gap-1.5 h-9"
                      >
                        <Calendar className="h-3.5 w-3.5" />
                        Schedule
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setProfileNanny(nanny);
                          setProfileOpen(true);
                        }}
                        className="h-9 w-9 p-0 text-gray-400 hover:text-gray-600"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Dialogs */}
      <ScheduleDialog
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        nanny={selectedNanny}
        onSuccess={() => fetchNannies()}
      />
      <NannyProfileDialog
        open={profileOpen}
        onOpenChange={setProfileOpen}
        nanny={profileNanny}
        onCall={(nanny) => {
          setProfileOpen(false);
          handleJoinCall(nanny);
        }}
        onSchedule={(nanny) => {
          setProfileOpen(false);
          setSelectedNanny(nanny);
          setScheduleOpen(true);
        }}
      />
    </div>
  );
}
