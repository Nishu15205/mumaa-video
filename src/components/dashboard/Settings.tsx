'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Camera,
  Mail,
  Phone,
  FileText,
  Lock,
  Bell,
  BellOff,
  MailCheck,
  Trash2,
  Save,
  Loader2,
  AlertTriangle,
  Upload,
  X,
  CheckCircle2,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { apiPut } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
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

// ---------- Avatar Upload Constants ----------
const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function uploadFileWithProgress(
  file: File,
  folder: string,
  onProgress: (percent: number) => void
): Promise<{ url: string; key: string; size: number }> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);

    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        onProgress(percent);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          if (data.url && data.key) {
            resolve({ url: data.url, key: data.key, size: data.size });
          } else {
            reject(new Error(data.error || 'Upload failed'));
          }
        } catch {
          reject(new Error('Invalid response from server'));
        }
      } else {
        try {
          const data = JSON.parse(xhr.responseText);
          reject(new Error(data.error || `Upload failed with status ${xhr.status}`));
        } catch {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Network error during upload'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload cancelled'));
    });

    xhr.open('POST', '/api/upload');
    xhr.send(formData);
  });
}

export default function Settings() {
  const { user, setUser, logout } = useAuthStore();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const [emailNotif, setEmailNotif] = useState(true);
  const [pushNotif, setPushNotif] = useState(true);
  const [callReminders, setCallReminders] = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(false);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Avatar upload state
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setPhone(user.phone || '');
      setBio(user.bio || '');
    }
  }, [user]);

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  const handleSaveProfile = async () => {
    if (!user) return;
    try {
      setSaving(true);
      const updated = await apiPut<{ user: typeof user }>('/api/auth/profile', {
        name,
        phone: phone || null,
        bio: bio || null,
      });
      setUser(updated.user);
      toast.success('Profile updated successfully');
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  // ---------- Avatar Upload Logic ----------

  const validateAvatarFile = useCallback((file: File): string | null => {
    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
      return `Unsupported file type. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`;
    }
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return `Unsupported file extension: .${ext}`;
    }
    if (file.size > MAX_AVATAR_SIZE) {
      return `File too large (${formatFileSize(file.size)}). Maximum: ${formatFileSize(MAX_AVATAR_SIZE)}`;
    }
    if (file.size === 0) {
      return 'File is empty';
    }
    return null;
  }, []);

  const processFile = useCallback(
    (file: File) => {
      const error = validateAvatarFile(file);
      if (error) {
        toast.error(error);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      handleAvatarUpload(file);
    },
    [validateAvatarFile]
  );

  const handleAvatarUpload = useCallback(async (file: File) => {
    if (!user) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const result = await uploadFileWithProgress(file, 'avatars', setUploadProgress);

      const updated = await apiPut<{ user: typeof user }>('/api/auth/profile', {
        avatar: result.url,
      });
      setUser(updated.user);
      setAvatarPreview(null);
      toast.success('Avatar updated successfully');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to upload avatar';
      setAvatarPreview(null);
      toast.error(message);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [user, setUser]);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        processFile(file);
      }
      e.target.value = '';
    },
    [processFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const file = e.dataTransfer.files?.[0];
      if (file) {
        processFile(file);
      }
    },
    [processFile]
  );

  // ---------- Password & Delete ----------

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Please fill all password fields');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    try {
      setSavingPassword(true);
      await apiPut('/api/auth/password', {
        currentPassword,
        newPassword,
      });
      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      toast.error('Failed to change password');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleDeleteAccount = () => {
    toast.error('Account deletion is not available in demo mode');
    setShowDeleteDialog(false);
  };

  if (!user) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  const displayAvatar = avatarPreview || user.avatar;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">Manage your account preferences</p>
      </div>

      {/* Profile Settings */}
      <Card className="rounded-xl border-gray-200 shadow-sm">
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <User className="h-5 w-5 text-rose-500" />
            Profile Settings
          </h2>

          {/* Avatar Upload Section */}
          <div className="flex items-start gap-4 mb-6">
            <div
              className="relative group cursor-pointer"
              onClick={() => !isUploading && fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  if (!isUploading) fileInputRef.current?.click();
                }
              }}
              aria-label="Upload profile photo"
            >
              <Avatar className={cn(
                'h-24 w-24 transition-all duration-200',
                isDragging && 'ring-4 ring-rose-400 ring-offset-2 scale-105',
                !isUploading && 'group-hover:ring-2 group-hover:ring-rose-300 group-hover:ring-offset-2'
              )}>
                {displayAvatar ? (
                  <AvatarImage src={displayAvatar} alt={user.name} className="object-cover" />
                ) : null}
                <AvatarFallback className="bg-rose-100 text-rose-700 text-2xl font-bold">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>

              {!isUploading && (
                <div className={cn(
                  'absolute inset-0 rounded-full flex items-center justify-center transition-all duration-200',
                  isDragging
                    ? 'bg-rose-500/80'
                    : 'bg-black/0 group-hover:bg-black/40'
                )}>
                  <div className={cn(
                    'text-white transition-opacity duration-200',
                    isDragging ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  )}>
                    <Upload className="h-6 w-6" />
                  </div>
                </div>
              )}

              {isUploading && (
                <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 text-white animate-spin" />
                </div>
              )}
            </div>

            {/* Avatar info & controls */}
            <div className="flex-1 pt-1">
              <div className="flex items-center gap-2">
                <p className="font-medium text-gray-900">{user.name}</p>
                {isUploading && (
                  <span className="inline-flex items-center gap-1 text-xs text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Uploading...
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500">{user.email}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Member since {new Date(user.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
              </p>

              <div className="flex items-center gap-2 mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="h-8 text-xs gap-1.5 border-gray-200 text-gray-600 hover:text-gray-900"
                >
                  <Camera className="h-3.5 w-3.5" />
                  Change Photo
                </Button>
                {user.avatar && !isUploading && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      try {
                        const { user: currentUser } = useAuthStore.getState();
                        if (!currentUser) return;
                        await apiPut('/api/auth/profile', { avatar: null });
                        setUser({ ...currentUser, avatar: null });
                        setAvatarPreview(null);
                        toast.success('Avatar removed');
                      } catch {
                        toast.error('Failed to remove avatar');
                      }
                    }}
                    className="h-8 text-xs gap-1.5 text-gray-500 hover:text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove
                  </Button>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-2">
                JPG, PNG, GIF or WebP. Max {formatFileSize(MAX_AVATAR_SIZE)}.
              </p>
            </div>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
              onChange={handleFileSelect}
              className="hidden"
              disabled={isUploading}
            />
          </div>

          {/* Upload progress bar */}
          {isUploading && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Uploading photo...</span>
                <span className="text-sm font-medium text-gray-900">{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
              <p className="text-xs text-gray-400 mt-1.5">
                Image will be resized to 800x800px and optimized automatically
              </p>
            </motion.div>
          )}

          {/* Preview section */}
          {avatarPreview && !isUploading && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={avatarPreview} alt="Preview" className="object-cover" />
                    <AvatarFallback className="bg-rose-100 text-rose-700">
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium text-gray-900">New photo ready</p>
                    <p className="text-xs text-gray-500">Saving to your profile...</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span className="text-xs text-emerald-600">Uploaded</span>
                </div>
              </div>
            </motion.div>
          )}

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name" className="text-sm font-medium text-gray-700">Full Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1.5 h-10"
                />
              </div>
              <div>
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">Email</Label>
                <Input
                  id="email"
                  value={user.email}
                  disabled
                  className="mt-1.5 h-10 bg-gray-50"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="phone" className="text-sm font-medium text-gray-700">Phone Number</Label>
              <div className="relative mt-1.5">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="phone"
                  placeholder="+91 XXXXX XXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="pl-9 h-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="bio" className="text-sm font-medium text-gray-700">Bio</Label>
              <Textarea
                id="bio"
                placeholder="Tell us about yourself..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="mt-1.5 resize-none h-24"
              />
            </div>
            <Button
              onClick={handleSaveProfile}
              disabled={saving}
              className="bg-rose-500 hover:bg-rose-600 text-white gap-2"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card className="rounded-xl border-gray-200 shadow-sm">
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Lock className="h-5 w-5 text-rose-500" />
            Change Password
          </h2>
          <div className="space-y-4 max-w-md">
            <div>
              <Label htmlFor="current-password" className="text-sm font-medium text-gray-700">Current Password</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="mt-1.5 h-10"
              />
            </div>
            <div>
              <Label htmlFor="new-password" className="text-sm font-medium text-gray-700">New Password</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="Min 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1.5 h-10"
              />
            </div>
            <div>
              <Label htmlFor="confirm-password" className="text-sm font-medium text-gray-700">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1.5 h-10"
              />
            </div>
            <Button
              onClick={handleChangePassword}
              disabled={savingPassword}
              variant="outline"
              className="border-gray-200 text-gray-700 gap-2"
            >
              {savingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
              Update Password
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card className="rounded-xl border-gray-200 shadow-sm">
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Bell className="h-5 w-5 text-rose-500" />
            Notification Preferences
          </h2>
          <div className="space-y-4">
            {[
              { label: 'Email Notifications', desc: 'Receive email updates about your account and calls', value: emailNotif, setter: setEmailNotif, icon: <MailCheck className="h-4 w-4" /> },
              { label: 'Push Notifications', desc: 'Get real-time push notifications in your browser', value: pushNotif, setter: setPushNotif, icon: <Bell className="h-4 w-4" /> },
              { label: 'Call Reminders', desc: 'Receive reminders before scheduled calls', value: callReminders, setter: setCallReminders, icon: <Bell className="h-4 w-4" /> },
              { label: 'Marketing Emails', desc: 'Receive promotional offers and updates', value: marketingEmails, setter: setMarketingEmails, icon: <Mail className="h-4 w-4" /> },
            ].map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gray-100 text-gray-500">
                    {item.icon}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.label}</p>
                    <p className="text-xs text-gray-500">{item.desc}</p>
                  </div>
                </div>
                <Switch
                  checked={item.value}
                  onCheckedChange={item.setter}
                  className="data-[state=checked]:bg-rose-500"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="rounded-xl border-red-200 shadow-sm">
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold text-red-600 mb-2 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Danger Zone
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Once you delete your account, there is no going back. Please be certain.
          </p>
          <Button
            variant="outline"
            onClick={() => setShowDeleteDialog(true)}
            className="border-red-200 text-red-600 hover:bg-red-50 gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Delete Account
          </Button>
        </CardContent>
      </Card>

      {/* Delete confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Delete your account?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete your account and all associated data including call history, reviews, and subscriptions. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Delete Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
