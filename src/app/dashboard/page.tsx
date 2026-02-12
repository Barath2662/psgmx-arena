'use client';

import { useSession } from 'next-auth/react';
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
  Clock,
  Zap,
} from 'lucide-react';

export default function DashboardPage() {
  const { data: session } = useSession();
  const role = session?.user?.role;

  if (role === 'ADMIN') return <AdminDashboard />;
  if (role === 'INSTRUCTOR') return <InstructorDashboard />;
  return <StudentDashboard />;
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
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">Platform overview and management</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Users"
          value={stats?.stats?.totalUsers ?? '—'}
          icon={<Users className="h-5 w-5" />}
          description="Registered accounts"
        />
        <StatCard
          title="Instructors"
          value={stats?.stats?.totalInstructors ?? '—'}
          icon={<BookOpen className="h-5 w-5" />}
          description="Quiz creators"
        />
        <StatCard
          title="Quizzes"
          value={stats?.stats?.totalQuizzes ?? '—'}
          icon={<Zap className="h-5 w-5" />}
          description="Created quizzes"
        />
        <StatCard
          title="Sessions"
          value={stats?.stats?.totalSessions ?? '—'}
          icon={<Play className="h-5 w-5" />}
          description="Total sessions run"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          {stats?.recentSessions?.length > 0 ? (
            <div className="space-y-3">
              {stats.recentSessions.map((s: any) => (
                <div key={s.id} className="flex items-center justify-between p-3 border rounded-lg">
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
            <p className="text-muted-foreground">No sessions yet</p>
          )}
        </CardContent>
      </Card>
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
          <h1 className="text-3xl font-bold">Instructor Dashboard</h1>
          <p className="text-muted-foreground">Create and manage your quizzes</p>
        </div>
        <Link href="/dashboard/quizzes/new">
          <Button variant="arena">
            <Plus className="mr-2 h-4 w-4" /> New Quiz
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="My Quizzes"
          value={quizzes.length}
          icon={<BookOpen className="h-5 w-5" />}
          description="Total created"
        />
        <StatCard
          title="Active Sessions"
          value={sessions.filter((s) => s.state !== 'COMPLETED').length}
          icon={<Play className="h-5 w-5" />}
          description="Currently running"
        />
        <StatCard
          title="Total Participants"
          value={sessions.reduce((sum: number, s: any) => sum + (s._count?.participants || 0), 0)}
          icon={<Users className="h-5 w-5" />}
          description="Across all sessions"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
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
                    <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
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

        <Card>
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
                  <div key={s.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{s.quiz?.title}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-3 w-3" /> {s._count?.participants}
                        <span className="font-mono">{s.joinCode}</span>
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

function StudentDashboard() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Student Dashboard</h1>
        <p className="text-muted-foreground">Your quiz participation overview</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Quizzes Taken" value="—" icon={<BookOpen className="h-5 w-5" />} description="Total attempts" />
        <StatCard title="Best Streak" value="—" icon={<Trophy className="h-5 w-5" />} description="Consecutive correct" />
        <StatCard title="Avg. Score" value="—%" icon={<BarChart3 className="h-5 w-5" />} description="Overall accuracy" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Join</CardTitle>
          <CardDescription>Enter a session code to join a live quiz</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/join">
            <Button variant="arena" size="lg">
              <Play className="mr-2 h-5 w-5" /> Join a Quiz
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── STAT CARD ──────────────────────────────────────────

function StatCard({
  title,
  value,
  icon,
  description,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          </div>
          <div className="p-3 rounded-full bg-primary/10 text-primary">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}
