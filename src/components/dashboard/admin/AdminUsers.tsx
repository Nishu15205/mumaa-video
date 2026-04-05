'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Users,
  Shield,
  Eye,
  Ban,
  Trash2,
  ChevronLeft,
  ChevronRight,
  UserCog,
} from 'lucide-react';
import { apiGet, apiDelete, apiPut } from '@/lib/api';
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
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { User as UserType, NannyProfile, ParentProfile } from '@/types';

interface UserWithProfile extends UserType {
  nannyProfile?: NannyProfile | null;
  parentProfile?: ParentProfile | null;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<UserWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewUser, setViewUser] = useState<UserWithProfile | null>(null);
  const pageSize = 10;

  useEffect(() => {
    fetchUsers();
  }, [roleFilter, page]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (roleFilter !== 'ALL') params.append('role', roleFilter);
      if (search) params.append('search', search);
      params.append('limit', pageSize.toString());
      params.append('offset', ((page - 1) * pageSize).toString());

      const res = await apiGet<{ users: UserWithProfile[] }>(`/api/admin/users?${params.toString()}`);
      setUsers(res.users || []);
      setTotalUsers((res.users || []).length);
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchUsers();
  };

  const handleToggleStatus = async (u: UserWithProfile) => {
    try {
      await apiPut(`/api/admin/users/${u.id}/status`, { isActive: !u.isActive });
      toast.success(`${u.name} ${u.isActive ? 'deactivated' : 'activated'}`);
      fetchUsers();
    } catch {
      toast.error('Failed to update user status');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await apiDelete(`/api/admin/users/${deleteId}`);
      toast.success('User deleted');
      setDeleteId(null);
      fetchUsers();
    } catch {
      toast.error('Failed to delete user');
    }
  };

  const getInitials = (name: string) => name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'PARENT': return 'bg-rose-100 text-rose-700';
      case 'NANNY': return 'bg-emerald-100 text-emerald-700';
      case 'ADMIN': return 'bg-amber-100 text-amber-700';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-36" />
        <div className="flex gap-3">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-40" />
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <p className="text-gray-500 mt-1">Manage all platform users</p>
      </div>

      {/* Search & filter */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search users by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-9 h-10"
          />
        </div>
        <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setPage(1); }}>
          <SelectTrigger className="h-10 w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Roles</SelectItem>
            <SelectItem value="PARENT">Parents</SelectItem>
            <SelectItem value="NANNY">Nannies</SelectItem>
            <SelectItem value="ADMIN">Admins</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={handleSearch} className="bg-rose-500 hover:bg-rose-600 text-white h-10">
          Search
        </Button>
      </div>

      {/* User count */}
      <p className="text-sm text-gray-500">
        Showing {users.length} user{users.length !== 1 ? 's' : ''}
        {roleFilter !== 'ALL' && ` (${roleFilter})`}
      </p>

      {/* Users table */}
      <Card className="rounded-xl border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left text-xs font-semibold text-gray-600 px-6 py-3">User</th>
                <th className="text-left text-xs font-semibold text-gray-600 px-6 py-3">Email</th>
                <th className="text-left text-xs font-semibold text-gray-600 px-6 py-3">Role</th>
                <th className="text-left text-xs font-semibold text-gray-600 px-6 py-3">Status</th>
                <th className="text-left text-xs font-semibold text-gray-600 px-6 py-3">Joined</th>
                <th className="text-right text-xs font-semibold text-gray-600 px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-sm text-gray-400">
                    <Users className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className={cn('text-xs font-semibold', getRoleBadge(u.role))}>
                            {getInitials(u.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium text-gray-900">{u.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-500">{u.email}</td>
                    <td className="px-6 py-3">
                      <Badge variant="secondary" className={cn('text-[11px]', getRoleBadge(u.role))}>
                        {u.role === 'PARENT' ? 'Parent' : u.role === 'NANNY' ? 'Nanny' : 'Admin'}
                      </Badge>
                    </td>
                    <td className="px-6 py-3">
                      <Badge
                        variant="secondary"
                        className={cn('text-[11px]', u.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500')}
                      >
                        {u.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-500">
                      {new Date(u.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-gray-400 hover:text-gray-600"
                          onClick={() => setViewUser(u)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {u.role !== 'ADMIN' && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className={cn('h-8 w-8', u.isActive ? 'text-amber-500 hover:text-amber-600' : 'text-emerald-500 hover:text-emerald-600')}
                              onClick={() => handleToggleStatus(u)}
                            >
                              {u.isActive ? <Ban className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-400 hover:text-red-600"
                              onClick={() => setDeleteId(u.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Pagination */}
      {totalUsers > pageSize && (
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
            disabled={users.length < pageSize}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* View user dialog */}
      <Dialog open={!!viewUser} onOpenChange={() => setViewUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
          </DialogHeader>
          {viewUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14">
                  <AvatarFallback className={cn('text-lg font-bold', getRoleBadge(viewUser.role))}>
                    {getInitials(viewUser.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-gray-900">{viewUser.name}</h3>
                  <p className="text-sm text-gray-500">{viewUser.email}</p>
                  <div className="flex gap-2 mt-1">
                    <Badge variant="secondary" className={cn('text-[11px]', getRoleBadge(viewUser.role))}>
                      {viewUser.role}
                    </Badge>
                    <Badge variant="secondary" className={cn('text-[11px]', viewUser.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500')}>
                      {viewUser.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 rounded-lg bg-gray-50">
                  <p className="text-gray-500 text-xs">Phone</p>
                  <p className="font-medium text-gray-900">{viewUser.phone || 'Not set'}</p>
                </div>
                <div className="p-3 rounded-lg bg-gray-50">
                  <p className="text-gray-500 text-xs">Joined</p>
                  <p className="font-medium text-gray-900">
                    {new Date(viewUser.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>
              {viewUser.bio && (
                <div className="p-3 rounded-lg bg-gray-50">
                  <p className="text-gray-500 text-xs">Bio</p>
                  <p className="text-sm text-gray-900 mt-1">{viewUser.bio}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this user?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the user and all their associated data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
