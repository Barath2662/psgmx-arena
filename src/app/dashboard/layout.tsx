'use client';

import { useSession, signOut } from 'next-auth/react';
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
  Settings,
  LogOut,
  Shield,
  GraduationCap,
  Code2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

const roleNavItems: Record<string, Array<{ href: string; label: string; icon: React.ReactNode }>> = {
  ADMIN: [
    { href: '/dashboard', label: 'Overview', icon: <LayoutDashboard className="h-4 w-4" /> },
    { href: '/dashboard/users', label: 'Users', icon: <Users className="h-4 w-4" /> },
    { href: '/dashboard/quizzes', label: 'All Quizzes', icon: <BookOpen className="h-4 w-4" /> },
    { href: '/dashboard/analytics', label: 'Analytics', icon: <BarChart3 className="h-4 w-4" /> },
    { href: '/dashboard/reports', label: 'Reports', icon: <Shield className="h-4 w-4" /> },
  ],
  INSTRUCTOR: [
    { href: '/dashboard', label: 'Overview', icon: <LayoutDashboard className="h-4 w-4" /> },
    { href: '/dashboard/quizzes', label: 'My Quizzes', icon: <BookOpen className="h-4 w-4" /> },
    { href: '/dashboard/sessions', label: 'Sessions', icon: <Play className="h-4 w-4" /> },
    { href: '/dashboard/analytics', label: 'Analytics', icon: <BarChart3 className="h-4 w-4" /> },
  ],
  STUDENT: [
    { href: '/dashboard', label: 'Overview', icon: <LayoutDashboard className="h-4 w-4" /> },
    { href: '/dashboard/history', label: 'Quiz History', icon: <BookOpen className="h-4 w-4" /> },
    { href: '/dashboard/results', label: 'My Results', icon: <BarChart3 className="h-4 w-4" /> },
  ],
};

const roleBadgeVariant: Record<string, 'default' | 'success' | 'warning'> = {
  ADMIN: 'warning',
  INSTRUCTOR: 'success',
  STUDENT: 'default',
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!session?.user) return null;

  const role = session.user.role || 'STUDENT';
  const navItems = roleNavItems[role] || roleNavItems.STUDENT;
  const initials = session.user.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r bg-card">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center border-b px-6">
            <Link href="/dashboard" className="flex items-center space-x-2">
              <Zap className="h-6 w-6 text-primary" />
              <span className="text-lg font-bold">PSGMX Arena</span>
            </Link>
          </div>

          {/* User card */}
          <div className="border-b p-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="gradient-arena text-white text-sm">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{session.user.name}</p>
                <Badge variant={roleBadgeVariant[role]} className="text-xs">
                  {role}
                </Badge>
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 p-4 space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive ? 'secondary' : 'ghost'}
                    className={`w-full justify-start gap-3 ${isActive ? 'bg-primary/10 text-primary' : ''}`}
                  >
                    {item.icon}
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </nav>

          {/* Bottom actions */}
          <div className="border-t p-4 space-y-1">
            {role === 'INSTRUCTOR' && (
              <Link href="/join">
                <Button variant="ghost" className="w-full justify-start gap-3">
                  <GraduationCap className="h-4 w-4" /> Join as Student
                </Button>
              </Link>
            )}
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-destructive hover:text-destructive"
              onClick={() => signOut({ callbackUrl: '/' })}
            >
              <LogOut className="h-4 w-4" /> Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-64">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
