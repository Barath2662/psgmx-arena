'use client';

import { useAuth } from '@/components/providers/auth-provider';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useEffect } from 'react';
import {
  Zap,
  LayoutDashboard,
  BookOpen,
  Play,
  BarChart3,
  Users,
  Shield,
  LogOut,
  GraduationCap,
  Trophy,
  Mail,
  Star,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/theme-toggle';

const roleNavItems: Record<string, Array<{ href: string; label: string; icon: React.ReactNode }>> = {
  ADMIN: [
    { href: '/dashboard', label: 'Overview', icon: <LayoutDashboard className="h-4 w-4" /> },
    { href: '/dashboard/users', label: 'Manage Users', icon: <Users className="h-4 w-4" /> },
    { href: '/dashboard/quizzes', label: 'All Quizzes', icon: <BookOpen className="h-4 w-4" /> },
    { href: '/dashboard/sessions', label: 'Sessions', icon: <Play className="h-4 w-4" /> },
    { href: '/dashboard/analytics', label: 'Analytics', icon: <BarChart3 className="h-4 w-4" /> },
    { href: '/dashboard/leaderboard', label: 'Leaderboard', icon: <Trophy className="h-4 w-4" /> },
  ],
  INSTRUCTOR: [
    { href: '/dashboard', label: 'Overview', icon: <LayoutDashboard className="h-4 w-4" /> },
    { href: '/dashboard/quizzes', label: 'My Quizzes', icon: <BookOpen className="h-4 w-4" /> },
    { href: '/dashboard/sessions', label: 'Sessions', icon: <Play className="h-4 w-4" /> },
    { href: '/dashboard/analytics', label: 'Analytics', icon: <BarChart3 className="h-4 w-4" /> },
    { href: '/dashboard/leaderboard', label: 'Leaderboard', icon: <Trophy className="h-4 w-4" /> },
  ],
  STUDENT: [
    { href: '/dashboard', label: 'Overview', icon: <LayoutDashboard className="h-4 w-4" /> },
    { href: '/dashboard/leaderboard', label: 'Leaderboard', icon: <Trophy className="h-4 w-4" /> },
  ],
};

const roleLabels: Record<string, string> = {
  ADMIN: 'Admin',
  INSTRUCTOR: 'Instructor',
  STUDENT: 'Student',
};

const roleBadgeVariant: Record<string, 'default' | 'success' | 'warning'> = {
  ADMIN: 'warning',
  INSTRUCTOR: 'success',
  STUDENT: 'default',
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
          <p className="text-sm text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const role = user.role || 'STUDENT';
  const navItems = roleNavItems[role] || roleNavItems.STUDENT;
  const initials = user.name
    ?.split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r bg-card shadow-sm">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-between border-b px-6">
            <Link href="/dashboard" className="flex items-center space-x-2">
              <Zap className="h-6 w-6 text-primary" />
              <span className="text-lg font-bold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
                PSGMX Arena
              </span>
            </Link>
            <ThemeToggle />
          </div>

          {/* User card */}
          <div className="border-b p-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                <AvatarFallback className="bg-gradient-to-br from-primary to-purple-500 text-white text-sm font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{user.name}</p>
                <Badge variant={roleBadgeVariant[role]} className="text-[10px] px-1.5 py-0">
                  {roleLabels[role] || role}
                </Badge>
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive ? 'secondary' : 'ghost'}
                    className={`w-full justify-start gap-3 h-10 ${
                      isActive
                        ? 'bg-primary/10 text-primary font-semibold shadow-sm'
                        : 'hover:bg-muted'
                    }`}
                  >
                    {item.icon}
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </nav>

          {/* Bottom actions */}
          <div className="border-t p-3 space-y-1">
            {/* Contact Support */}
            <a href="mailto:barathvikramansk@gmail.com">
              <Button variant="ghost" className="w-full justify-start gap-3 h-9 text-xs">
                <Mail className="h-4 w-4 text-blue-500" /> Contact Support
              </Button>
            </a>

            {role !== 'STUDENT' && (
              <Link href="/join">
                <Button variant="ghost" className="w-full justify-start gap-3 h-9 text-xs">
                  <GraduationCap className="h-4 w-4" /> Join as Student
                </Button>
              </Link>
            )}

            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-9 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={signOut}
            >
              <LogOut className="h-4 w-4" /> Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-64">
        <div className="p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
