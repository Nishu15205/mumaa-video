'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardList,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Mail,
  Phone,
  Briefcase,
  Star,
  IndianRupee,
  Languages,
  Award,
  FileText,
  Loader2,
  UserCheck,
  Copy,
  Check,
  KeyRound,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { apiGet, apiPut } from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface NannyApplication {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  experience: number;
  skills: string;
  hourlyRate: number;
  languages: string;
  certifications: string;
  bio: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectReason: string | null;
  approvedUserId: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  if (diffDays < 30) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

const statusConfig = {
  PENDING: { color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock },
  APPROVED: { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  REJECTED: { color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle },
};

export default function AdminApplications() {
  const [applications, setApplications] = useState<NannyApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [credentialsDialog, setCredentialsDialog] = useState<{name: string; email: string; password: string} | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const data = await apiGet<{ applications: NannyApplication[] }>('/api/nanny-apply');
      setApplications(data.applications || []);
    } catch {
      toast.error('Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      setActionLoading(id);
      const data: any = await apiPut(`/api/nanny-apply/${id}`, { action: 'approve' });
      // Show credentials dialog if returned
      if (data.credentials) {
        setCredentialsDialog(data.credentials);
      }
      toast.success('Application approved! Nanny account has been created.');
      fetchApplications();
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve application');
    } finally {
      setActionLoading(null);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleReject = async () => {
    if (!rejectId) return;
    if (!rejectReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }
    try {
      setActionLoading(rejectId);
      await apiPut(`/api/nanny-apply/${rejectId}`, { action: 'reject', reason: rejectReason.trim() });
      toast.success('Application rejected');
      setRejectId(null);
      setRejectReason('');
      fetchApplications();
    } catch (err: any) {
      toast.error(err.message || 'Failed to reject application');
    } finally {
      setActionLoading(null);
    }
  };

  const pendingCount = applications.filter((a) => a.status === 'PENDING').length;

  const filteredApplications = applications.filter((a) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'pending') return a.status === 'PENDING';
    if (activeTab === 'approved') return a.status === 'APPROVED';
    if (activeTab === 'rejected') return a.status === 'REJECTED';
    return true;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-52" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <Skeleton className="h-10 w-96 rounded-lg" />
        <div className="grid gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nanny Applications</h1>
          <p className="text-gray-500 mt-1">Review and manage nanny applications</p>
        </div>
        {pendingCount > 0 && (
          <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100 text-xs px-3 py-1">
            {pendingCount} pending
          </Badge>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-gray-100 rounded-xl">
          <TabsTrigger value="all" className="rounded-lg text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">
            All ({applications.length})
          </TabsTrigger>
          <TabsTrigger value="pending" className="rounded-lg text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">
            Pending ({pendingCount})
          </TabsTrigger>
          <TabsTrigger value="approved" className="rounded-lg text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">
            Approved
          </TabsTrigger>
          <TabsTrigger value="rejected" className="rounded-lg text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">
            Rejected
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Application Cards */}
      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {filteredApplications.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-16 text-gray-400"
            >
              <ClipboardList className="h-12 w-12 mb-3" />
              <p className="text-sm font-medium">No applications found</p>
              <p className="text-xs mt-1">
                {activeTab === 'pending'
                  ? 'All applications have been reviewed'
                  : activeTab === 'all'
                    ? 'No applications submitted yet'
                    : `No ${activeTab} applications`}
              </p>
            </motion.div>
          ) : (
            filteredApplications.map((app, index) => {
              const config = statusConfig[app.status];
              const StatusIcon = config.icon;
              const skills = app.skills ? app.skills.split(',').map((s) => s.trim()).filter(Boolean) : [];

              return (
                <motion.div
                  key={app.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ delay: index * 0.03 }}
                  layout
                >
                  <Card className="rounded-xl border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                    <CardContent className="p-5">
                      {/* Top row: status, name, date */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            'w-10 h-10 rounded-full flex items-center justify-center shrink-0',
                            app.status === 'PENDING' ? 'bg-amber-100 text-amber-600' :
                            app.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-600' :
                            'bg-red-100 text-red-600'
                          )}>
                            <StatusIcon className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-gray-900">{app.name}</h3>
                              <Badge variant="outline" className={cn('text-[10px] px-2 py-0', config.color)}>
                                {app.status}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {app.email}
                              </span>
                              {app.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3 h-3" />
                                  {app.phone}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <span className="text-xs text-gray-400 whitespace-nowrap">
                          Applied {formatRelativeTime(app.createdAt)}
                        </span>
                      </div>

                      {/* Details grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                        <div className="flex items-center gap-2 text-sm">
                          <Briefcase className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600">
                            <span className="font-medium text-gray-900">{app.experience}</span> yr exp
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <IndianRupee className="w-4 h-4 text-gray-400" />
                          <span className="font-medium text-gray-900">₹{app.hourlyRate}/hr</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Languages className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600 truncate">{app.languages || 'Not specified'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Award className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600 truncate">{app.certifications || 'None'}</span>
                        </div>
                      </div>

                      {/* Skills badges */}
                      {skills.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {skills.map((skill) => (
                            <Badge key={skill} variant="secondary" className="bg-rose-50 text-rose-600 text-[11px] px-2 py-0 border-0">
                              <Star className="w-3 h-3 mr-1" />
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Bio */}
                      {app.bio && (
                        <div className="flex items-start gap-2 mb-4 p-3 rounded-lg bg-gray-50">
                          <FileText className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                          <p className="text-sm text-gray-600 leading-relaxed">{app.bio}</p>
                        </div>
                      )}

                      {/* Reject reason for rejected */}
                      {app.status === 'REJECTED' && app.rejectReason && (
                        <div className="flex items-start gap-2 mb-4 p-3 rounded-lg bg-red-50 border border-red-100">
                          <XCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-xs font-semibold text-red-600">Rejection Reason</p>
                            <p className="text-sm text-red-700 mt-0.5">{app.rejectReason}</p>
                          </div>
                        </div>
                      )}

                      {/* Approved badge */}
                      {app.status === 'APPROVED' && app.approvedUserId && (
                        <div className="flex items-center gap-2 mb-2 p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                          <UserCheck className="w-4 h-4 text-emerald-500" />
                          <span className="text-sm font-medium text-emerald-700">User Account Created</span>
                        </div>
                      )}

                      {/* Action buttons for pending */}
                      {app.status === 'PENDING' && (
                        <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                          <Button
                            size="sm"
                            onClick={() => handleApprove(app.id)}
                            disabled={actionLoading === app.id}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white h-9 rounded-lg gap-1.5 shadow-sm"
                          >
                            {actionLoading === app.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            )}
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setRejectId(app.id);
                              setRejectReason('');
                            }}
                            disabled={actionLoading === app.id}
                            className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 h-9 rounded-lg gap-1.5"
                          >
                            {actionLoading === app.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <XCircle className="w-3.5 h-3.5" />
                            )}
                            Reject
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>

      {/* Reject Dialog */}
      <AlertDialog open={!!rejectId} onOpenChange={(open) => !open && setRejectId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Application</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 pt-2">
                <p className="text-sm text-gray-600">
                  Please provide a reason for rejecting this application. This will be shared with the applicant.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="reject-reason" className="text-sm font-medium text-gray-700">
                    Reason <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="reject-reason"
                    placeholder="e.g., Insufficient experience, missing certifications..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="rounded-lg border-gray-200 focus:border-red-400 focus:ring-red-400/20"
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              disabled={!!actionLoading || !rejectReason.trim()}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {actionLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Rejecting...
                </>
              ) : (
                'Reject Application'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Credentials Dialog - shown after approval */}
      <Dialog open={!!credentialsDialog} onOpenChange={(open) => !open && setCredentialsDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              Account Created Successfully!
            </DialogTitle>
          </DialogHeader>
          {credentialsDialog && (
            <div className="space-y-4 pt-2">
              <p className="text-sm text-gray-600">
                Share these login credentials with <strong>{credentialsDialog.name}</strong>. They can also set their own password from the login page.
              </p>

              {/* Email */}
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
                <p className="text-xs font-medium text-gray-500 mb-1">Email</p>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-900 truncate">{credentialsDialog.email}</p>
                  <button
                    onClick={() => copyToClipboard(credentialsDialog.email, 'email')}
                    className="shrink-0 p-1.5 rounded-lg hover:bg-gray-200 transition-colors"
                    title="Copy email"
                  >
                    {copiedField === 'email' ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Copy className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              {/* Password */}
              <div className="p-3 rounded-xl bg-violet-50 border border-violet-200">
                <p className="text-xs font-medium text-violet-600 mb-1 flex items-center gap-1">
                  <KeyRound className="w-3 h-3" />
                  Temporary Password
                </p>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold text-violet-800 font-mono tracking-wide">{credentialsDialog.password}</p>
                  <button
                    onClick={() => copyToClipboard(credentialsDialog.password, 'password')}
                    className="shrink-0 p-1.5 rounded-lg hover:bg-violet-200 transition-colors"
                    title="Copy password"
                  >
                    {copiedField === 'password' ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Copy className="w-4 h-4 text-violet-400" />
                    )}
                  </button>
                </div>
              </div>

              {/* Info */}
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-100">
                <p className="text-xs text-amber-700 leading-relaxed">
                  ⚡ <strong>Tip:</strong> The nanny can also go to the login page and click &quot;Set Up My Password&quot; to create their own password. The temporary password above will work for immediate login.
                </p>
              </div>

              <Button
                onClick={() => setCredentialsDialog(null)}
                className="w-full h-11 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-medium"
              >
                Done
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
