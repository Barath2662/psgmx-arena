'use client';

import { useAuth } from '@/components/providers/auth-provider';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import {
  BookOpen,
  Users,
  Play,
  BarChart3,
  Plus,
  ArrowRight,
  Trophy,
  Zap,
  GraduationCap,
  Mail,
  TrendingUp,
  Calendar,
  Star,
  Download,
} from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();
  const role = user?.role;

  if (role === 'ADMIN') return <AdminDashboard />;
  if (role === 'INSTRUCTOR') return <InstructorDashboard />;
  return <StudentDashboard userName={user?.name || 'Student'} />;
}

// ─── ADMIN DASHBOARD ────────────────────────────────────

function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    fetch('/api/admin/analytics')
      .then((r) => r.json())
      .then(setStats)
      .catch(console.error);
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Platform overview and management</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Users"
          value={stats?.stats?.totalUsers ?? '—'}
          icon={<Users className="h-5 w-5" />}
          description="Registered accounts"
          gradient="from-blue-500/10 to-cyan-500/10"
          iconColor="text-blue-500"
        />
        <StatCard
          title="Instructors"
          value={stats?.stats?.totalInstructors ?? '—'}
          icon={<GraduationCap className="h-5 w-5" />}
          description="Quiz managers"
          gradient="from-green-500/10 to-emerald-500/10"
          iconColor="text-green-500"
        />
        <StatCard
          title="Quizzes"
          value={stats?.stats?.totalQuizzes ?? '—'}
          icon={<Zap className="h-5 w-5" />}
          description="Created quizzes"
          gradient="from-purple-500/10 to-pink-500/10"
          iconColor="text-purple-500"
        />
        <StatCard
          title="Sessions"
          value={stats?.stats?.totalSessions ?? '—'}
          icon={<Play className="h-5 w-5" />}
          description="Total sessions run"
          gradient="from-orange-500/10 to-amber-500/10"
          iconColor="text-orange-500"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" /> Recent Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.recentSessions?.length > 0 ? (
              <div className="space-y-3">
                {stats.recentSessions.slice(0, 5).map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between p-3 border rounded-xl hover:bg-muted/50 transition-colors">
                    <div>
                      <p className="font-medium">{s.quiz?.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {s._count?.participants} participants
                      </p>
                    </div>
                    <Badge variant={s.state === 'COMPLETED' ? 'secondary' : 'success'}>
                      {s.state}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-6">No sessions yet</p>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" /> Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/dashboard/users" className="block">
              <div className="flex items-center gap-3 p-3 border rounded-xl hover:bg-muted/50 transition-colors cursor-pointer">
                <div className="p-2 rounded-lg bg-blue-500/10"><Users className="h-5 w-5 text-blue-500" /></div>
                <div>
                  <p className="font-medium">Manage Users</p>
                  <p className="text-xs text-muted-foreground">Assign roles and permissions</p>
                </div>
                <ArrowRight className="h-4 w-4 ml-auto text-muted-foreground" />
              </div>
            </Link>
            <Link href="/dashboard/quizzes/new" className="block">
              <div className="flex items-center gap-3 p-3 border rounded-xl hover:bg-muted/50 transition-colors cursor-pointer">
                <div className="p-2 rounded-lg bg-green-500/10"><Plus className="h-5 w-5 text-green-500" /></div>
                <div>
                  <p className="font-medium">Create Quiz</p>
                  <p className="text-xs text-muted-foreground">Build a new assessment</p>
                </div>
                <ArrowRight className="h-4 w-4 ml-auto text-muted-foreground" />
              </div>
            </Link>
            <Link href="/dashboard/analytics" className="block">
              <div className="flex items-center gap-3 p-3 border rounded-xl hover:bg-muted/50 transition-colors cursor-pointer">
                <div className="p-2 rounded-lg bg-purple-500/10"><BarChart3 className="h-5 w-5 text-purple-500" /></div>
                <div>
                  <p className="font-medium">View Analytics</p>
                  <p className="text-xs text-muted-foreground">Platform-wide statistics</p>
                </div>
                <ArrowRight className="h-4 w-4 ml-auto text-muted-foreground" />
              </div>
            </Link>
            <a href="/api/export/report?all=true" className="block">
              <div className="flex items-center gap-3 p-3 border rounded-xl hover:bg-muted/50 transition-colors cursor-pointer">
                <div className="p-2 rounded-lg bg-orange-500/10"><Download className="h-5 w-5 text-orange-500" /></div>
                <div>
                  <p className="font-medium">Download Reports</p>
                  <p className="text-xs text-muted-foreground">Export all test data as Excel</p>
                </div>
                <ArrowRight className="h-4 w-4 ml-auto text-muted-foreground" />
              </div>
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── INSTRUCTOR DASHBOARD ───────────────────────────────

function InstructorDashboard() {
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      fetch('/api/quiz?limit=5').then((r) => r.json()),
      fetch('/api/session?limit=5').then((r) => r.json()),
    ]).then(([qData, sData]) => {
      setQuizzes(qData.quizzes || []);
      setSessions(sData.sessions || []);
    });
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Instructor Dashboard</h1>
          <p className="text-muted-foreground mt-1">Create and manage your quizzes & sessions</p>
        </div>
        <div className="flex gap-2">
          <a href="/api/export/report?all=true">
            <Button variant="outline" className="shadow-sm">
              <Download className="mr-2 h-4 w-4" /> Download Reports
            </Button>
          </a>
          <Link href="/dashboard/quizzes/new">
            <Button variant="arena" className="shadow-md">
              <Plus className="mr-2 h-4 w-4" /> New Quiz
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="My Quizzes"
          value={quizzes.length}
          icon={<BookOpen className="h-5 w-5" />}
          description="Total created"
          gradient="from-blue-500/10 to-cyan-500/10"
          iconColor="text-blue-500"
        />
        <StatCard
          title="Active Sessions"
          value={sessions.filter((s) => s.state !== 'COMPLETED').length}
          icon={<Play className="h-5 w-5" />}
          description="Currently running"
          gradient="from-green-500/10 to-emerald-500/10"
          iconColor="text-green-500"
        />
        <StatCard
          title="Total Participants"
          value={sessions.reduce((sum: number, s: any) => sum + (s._count?.participants || 0), 0)}
          icon={<Users className="h-5 w-5" />}
          description="Across all sessions"
          gradient="from-purple-500/10 to-pink-500/10"
          iconColor="text-purple-500"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Quizzes</CardTitle>
            <Link href="/dashboard/quizzes">
              <Button variant="ghost" size="sm">
                View All <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {quizzes.length > 0 ? (
              <div className="space-y-3">
                {quizzes.map((q: any) => (
                  <Link key={q.id} href={`/dashboard/quizzes/${q.id}`}>
                    <div className="flex items-center justify-between p-3 border rounded-xl hover:bg-muted/50 transition-colors cursor-pointer">
                      <div>
                        <p className="font-medium">{q.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {q._count?.questions} questions
                        </p>
                      </div>
                      <Badge variant={q.status === 'PUBLISHED' ? 'success' : 'secondary'}>
                        {q.status}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground mb-4">No quizzes yet</p>
                <Link href="/dashboard/quizzes/new">
                  <Button variant="outline">Create Your First Quiz</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Sessions</CardTitle>
            <Link href="/dashboard/sessions">
              <Button variant="ghost" size="sm">
                View All <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {sessions.length > 0 ? (
              <div className="space-y-3">
                {sessions.map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between p-3 border rounded-xl">
                    <div>
                      <p className="font-medium">{s.quiz?.title}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-3 w-3" /> {s._count?.participants}
                        <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{s.joinCode}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={s.state === 'COMPLETED' ? 'secondary' : 'success'}>
                        {s.state}
                      </Badge>
                      {s.state !== 'COMPLETED' && (
                        <Link href={`/session/${s.id}/host`}>
                          <Button size="sm" variant="arena">Host</Button>
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">No sessions yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── STUDENT DASHBOARD ──────────────────────────────────

function StudentDashboard({ userName }: { userName: string }) {
  return (
    <div className="space-y-8">
      {/* Welcome banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 via-purple-500/10 to-pink-500/10 p-8 border">
        <div className="relative z-10">
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome, {userName}! <span className="animate-pulse">👋</span>
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Ready for your next challenge? Join a live quiz or review your performance.
          </p>
          <div className="flex gap-3 mt-6">
            <Link href="/join">
              <Button variant="arena" size="lg" className="shadow-lg">
                <Play className="mr-2 h-5 w-5" /> Join a Quiz
              </Button>
            </Link>
            <Link href="/dashboard/leaderboard">
              <Button variant="outline" size="lg">
                <Trophy className="mr-2 h-5 w-5" /> Leaderboard
              </Button>
            </Link>
          </div>
        </div>
        <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-10">
          <Zap className="h-40 w-40" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Quizzes Taken"
          value="—"
          icon={<BookOpen className="h-5 w-5" />}
          description="Total attempts"
          gradient="from-blue-500/10 to-cyan-500/10"
          iconColor="text-blue-500"
        />
        <StatCard
          title="Best Streak"
          value="—"
          icon={<Trophy className="h-5 w-5" />}
          description="Consecutive correct"
          gradient="from-yellow-500/10 to-amber-500/10"
          iconColor="text-yellow-500"
        />
        <StatCard
          title="Avg. Score"
          value="—%"
          icon={<BarChart3 className="h-5 w-5" />}
          description="Overall accuracy"
          gradient="from-green-500/10 to-emerald-500/10"
          iconColor="text-green-500"
        />
      </div>

      {/* Quick actions */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5 text-primary" /> Quick Join
            </CardTitle>
            <CardDescription>Enter a session code to join a live quiz</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/join">
              <Button variant="arena" size="lg" className="w-full">
                <Play className="mr-2 h-5 w-5" /> Enter Join Code
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-blue-500" /> Need Help?
            </CardTitle>
            <CardDescription>Reach out to our support team</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <a href="mailto:barathvikramansk@gmail.com">
              <Button variant="outline" className="w-full">
                <Mail className="mr-2 h-4 w-4" /> Contact Support
              </Button>
            </a>
            <a
              href="https://github.com/psgmx-arena/psgmx-arena"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="ghost" className="w-full mt-2">
                <Star className="mr-2 h-4 w-4 text-yellow-500" /> Star us on GitHub
              </Button>
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── STAT CARD ──────────────────────────────────────────

function StatCard({
  title,
  value,
  icon,
  description,
  gradient = 'from-primary/10 to-primary/5',
  iconColor = 'text-primary',
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description: string;
  gradient?: string;
  iconColor?: string;
}) {
  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          </div>
          <div className={`p-3 rounded-xl bg-gradient-to-br ${gradient} ${iconColor}`}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}
