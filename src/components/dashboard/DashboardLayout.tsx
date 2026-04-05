'use client';

import { useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Search,
  Bell,
  LogOut,
  Menu,
  X,
  Phone,
  CalendarPlus,
  CreditCard,
  Settings,
  Users,
  Clock,
  DollarSign,
  BarChart3,
  ChevronLeft,
  Baby,
  UserCheck,
  Star,
  ClipboardList,
  Wallet,
  Landmark,
} from 'lucide-react';
import NotificationPanel from '@/components/dashboard/NotificationPanel';
import { useAuthStore } from '@/stores/auth-store';
import { useAppStore } from '@/stores/app-store';
import { useNotificationStore } from '@/stores/notification-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { AppView } from '@/types';

interface NavItem {
  id: AppView;
  label: string;
  icon: ReactNode;
}

const parentNav: NavItem[] = [
  { id: 'parent-dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
  { id: 'parent-dashboard', label: 'Find Nannies', icon: <UserCheck className="h-5 w-5" /> },
  { id: 'parent-dashboard', label: 'My Calls', icon: <Phone className="h-5 w-5" /> },
  { id: 'parent-dashboard', label: 'Schedule Call', icon: <CalendarPlus className="h-5 w-5" /> },
  { id: 'parent-dashboard', label: 'Subscription', icon: <CreditCard className="h-5 w-5" /> },
  { id: 'parent-dashboard', label: 'Settings', icon: <Settings className="h-5 w-5" /> },
];

const nannyNav: NavItem[] = [
  { id: 'nanny-dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
  { id: 'nanny-dashboard', label: 'My Calls', icon: <Phone className="h-5 w-5" /> },
  { id: 'nanny-dashboard', label: 'Availability', icon: <Clock className="h-5 w-5" /> },
  { id: 'nanny-dashboard', label: 'Earnings', icon: <DollarSign className="h-5 w-5" /> },
  { id: 'nanny-dashboard', label: 'Bank Details', icon: <Landmark className="h-5 w-5" /> },
  { id: 'nanny-dashboard', label: 'Settings', icon: <Settings className="h-5 w-5" /> },
];

const adminNav: NavItem[] = [
  { id: 'admin-dashboard', label: 'Overview', icon: <BarChart3 className="h-5 w-5" /> },
  { id: 'admin-dashboard', label: 'Users', icon: <Users className="h-5 w-5" /> },
  { id: 'admin-dashboard', label: 'Call Sessions', icon: <Phone className="h-5 w-5" /> },
  { id: 'admin-dashboard', label: 'Applications', icon: <ClipboardList className="h-5 w-5" /> },
  { id: 'admin-dashboard', label: 'Payments', icon: <Wallet className="h-5 w-5" /> },
  { id: 'admin-dashboard', label: 'Analytics', icon: <BarChart3 className="h-5 w-5" /> },
];

interface DashboardLayoutProps {
  children: ReactNode;
  activePage?: string;
  onPageChange?: (page: string) => void;
}

export default function DashboardLayout({ children, activePage = 'dashboard', onPageChange }: DashboardLayoutProps) {
  const { user, logout } = useAuthStore();
  const { sidebarOpen, toggleSidebar, setSidebarOpen } = useAppStore();
  const { notifications } = useNotificationStore();
  const [searchQuery, setSearchQuery] = useState('');

  const navItems = user?.role === 'ADMIN' ? adminNav : user?.role === 'NANNY' ? nannyNav : parentNav;
  const navLabels = user?.role === 'ADMIN' ? ['overview', 'users', 'calls', 'applications', 'payments', 'analytics'] : user?.role === 'NANNY' ? ['dashboard', 'calls', 'availability', 'earnings', 'bank', 'settings'] : ['dashboard', 'find', 'calls', 'schedule', 'subscription', 'settings'];

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadgeColor = () => {
    switch (user?.role) {
      case 'PARENT': return 'bg-rose-100 text-rose-700';
      case 'NANNY': return 'bg-emerald-100 text-emerald-700';
      case 'ADMIN': return 'bg-amber-100 text-amber-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getRoleLabel = () => {
    switch (user?.role) {
      case 'PARENT': return 'Parent';
      case 'NANNY': return 'Nanny';
      case 'ADMIN': return 'Admin';
      default: return '';
    }
  };

  const handleNavClick = (label: string) => {
    onPageChange?.(label);
    setSidebarOpen(false);
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile overlay - only on small screens */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar - always visible on desktop, slide on mobile */}
      <aside
        className={cn(
          'fixed lg:sticky top-0 z-50 lg:z-auto h-screen w-[260px] bg-white border-r border-gray-200 flex flex-col shrink-0 transition-transform duration-300 ease-in-out',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          'lg:translate-x-0'
        )}
      >
        {/* Sidebar header */}
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center">
              <Baby className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-lg leading-none">Mumaa</h2>
              <p className="text-xs text-gray-500">Video Call Platform</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden h-8 w-8"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <Separator />

        {/* User info */}
        <div className="p-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className={cn('text-sm font-semibold', getRoleBadgeColor())}>
                {user?.name ? getInitials(user.name) : '??'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
              <Badge variant="secondary" className={cn('text-[10px] px-1.5 py-0', getRoleBadgeColor())}>
                {getRoleLabel()}
              </Badge>
            </div>
          </div>
        </div>

        <Separator />

        {/* Navigation */}
        <ScrollArea className="flex-1 px-3 py-2">
          <nav className="space-y-1">
            {navItems.map((item, index) => {
              const label = navLabels[index];
              const isActive = activePage === label;
              return (
                <button
                  key={index}
                  onClick={() => handleNavClick(label)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200',
                    isActive
                      ? 'bg-rose-50 text-rose-600 font-medium'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  )}
                >
                  <span className={cn(isActive ? 'text-rose-500' : 'text-gray-400')}>
                    {item.icon}
                  </span>
                  {item.label}
                </button>
              );
            })}
          </nav>
        </ScrollArea>

        <Separator />

        {/* Logout */}
        <div className="p-3">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            Log out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 shrink-0">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden h-9 w-9"
              onClick={toggleSidebar}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-64 h-9 bg-gray-50 border-gray-200"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 relative">
            {/* Notifications */}
            <NotificationPanel />

            {/* User dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 h-9 px-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs font-semibold bg-rose-100 text-rose-700">
                      {user?.name ? getInitials(user.name) : '??'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden md:block text-sm font-medium text-gray-700">
                    {user?.name?.split(' ')[0]}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => onPageChange?.('settings')}>
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                  <LogOut className="h-4 w-4 mr-2" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
