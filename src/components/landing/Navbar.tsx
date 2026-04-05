'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Menu, X, ChevronDown, LogOut, User, LayoutDashboard, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuthStore } from '@/stores/auth-store';
import { useAppStore } from '@/stores/app-store';
import type { AppView } from '@/types';

const navLinks = [
  { label: 'Features', href: '#features' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Apply as Nanny', href: 'apply-nanny' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, isAuthenticated } = useAuthStore();
  const { setCurrentView } = useAppStore();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavClick = (view: AppView) => {
    setCurrentView(view);
    setMobileOpen(false);
  };

  const handleScrollTo = (href: string) => {
    setMobileOpen(false);
    if (href === 'apply-nanny') {
      setCurrentView('apply-nanny' as AppView);
      return;
    }
    const el = document.querySelector(href);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/90 backdrop-blur-lg shadow-md border-b border-gray-100'
          : 'bg-transparent'
      }`}
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-18">
          {/* Logo */}
          <a href="#" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-lg shadow-rose-500/25 group-hover:shadow-rose-500/40 transition-shadow">
              <Heart className="w-5 h-5 text-white fill-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent">
              Mumaa
            </span>
          </a>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <button
                key={link.href}
                onClick={() => handleScrollTo(link.href)}
                className="text-sm font-medium text-gray-600 hover:text-rose-600 transition-colors relative group"
              >
                {link.label}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-rose-500 rounded-full group-hover:w-full transition-all duration-300" />
              </button>
            ))}
          </div>

          {/* Desktop Right Side */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer">
                    <Avatar className="h-8 w-8 border-2 border-rose-200">
                      <AvatarFallback className="bg-rose-100 text-rose-600 text-sm font-semibold">
                        {getInitials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium text-gray-700 max-w-24 truncate">
                      {user.name.split(' ')[0]}
                    </span>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => handleNavClick('profile')}>
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleNavClick(user.role === 'PARENT' ? 'parent-dashboard' : user.role === 'NANNY' ? 'nanny-dashboard' : 'admin-dashboard')}>
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleNavClick('profile')}>
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      useAuthStore.getState().logout();
                      setCurrentView('landing');
                    }}
                    className="text-red-600 focus:text-red-600"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Button
                  variant="outline"
                  className="rounded-xl border-gray-200 hover:border-rose-300 hover:text-rose-600 hover:bg-rose-50"
                  onClick={() => handleNavClick('login')}
                >
                  Login
                </Button>
                <Button
                  className="rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white shadow-lg shadow-rose-500/25 hover:shadow-rose-500/40 transition-all"
                  onClick={() => handleNavClick('signup')}
                >
                  Get Started
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu */}
          <div className="md:hidden">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-xl">
                  <Menu className="h-5 w-5 text-gray-700" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80 p-0">
                <SheetHeader className="p-6 pb-4 border-b border-gray-100">
                  <SheetTitle className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center">
                      <Heart className="w-4 h-4 text-white fill-white" />
                    </div>
                    <span className="text-xl font-bold bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent">
                      Mumaa
                    </span>
                  </SheetTitle>
                </SheetHeader>
                <div className="p-6 space-y-2">
                  {navLinks.map((link) => (
                    <button
                      key={link.href}
                      onClick={() => handleScrollTo(link.href)}
                      className="w-full text-left px-4 py-3 rounded-xl text-gray-600 hover:text-rose-600 hover:bg-rose-50 transition-all text-base font-medium"
                    >
                      {link.label}
                    </button>
                  ))}
                  <div className="pt-4 border-t border-gray-100 mt-4 space-y-3">
                    {isAuthenticated && user ? (
                      <>
                        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50">
                          <Avatar className="h-10 w-10 border-2 border-rose-200">
                            <AvatarFallback className="bg-rose-100 text-rose-600 text-sm font-semibold">
                              {getInitials(user.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                            <p className="text-xs text-gray-500 capitalize">{user.role.toLowerCase()}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleNavClick(user.role === 'PARENT' ? 'parent-dashboard' : user.role === 'NANNY' ? 'nanny-dashboard' : 'admin-dashboard')}
                          className="w-full text-left px-4 py-3 rounded-xl text-gray-600 hover:text-rose-600 hover:bg-rose-50 transition-all text-base font-medium"
                        >
                          <LayoutDashboard className="inline w-4 h-4 mr-2" />
                          Dashboard
                        </button>
                        <button
                          onClick={() => handleNavClick('profile')}
                          className="w-full text-left px-4 py-3 rounded-xl text-gray-600 hover:text-rose-600 hover:bg-rose-50 transition-all text-base font-medium"
                        >
                          <User className="inline w-4 h-4 mr-2" />
                          Profile
                        </button>
                        <button
                          onClick={() => {
                            useAuthStore.getState().logout();
                            setCurrentView('landing');
                          }}
                          className="w-full text-left px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 transition-all text-base font-medium"
                        >
                          <LogOut className="inline w-4 h-4 mr-2" />
                          Logout
                        </button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          className="w-full rounded-xl border-gray-200 hover:border-rose-300 hover:text-rose-600 h-12 text-base"
                          onClick={() => handleNavClick('login')}
                        >
                          Login
                        </Button>
                        <Button
                          className="w-full rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white shadow-lg h-12 text-base"
                          onClick={() => handleNavClick('signup')}
                        >
                          Get Started
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>
    </motion.header>
  );
}
