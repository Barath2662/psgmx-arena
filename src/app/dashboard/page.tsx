'use client';

import { useAuth } from '@/components/providers/auth-provider';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
                        {s.participants?.length ?? '—'} participants
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
          value={sessions.reduce((sum: number, s: any) => sum + (s.participants?.length || 0), 0)}
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
                          {q.questions?.length ?? '—'} questions
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
                        <Users className="h-3 w-3" /> {s.participants?.length ?? '—'}
                        <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{s.joinCode}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={s.state === 'COMPLETED' ? 'secondary' : 'success'}>
                        {s.state === 'WAITING' ? 'Scheduled' : s.state === 'QUESTION_ACTIVE' ? 'Live' : s.state}
                      </Badge>
                      {s.state === 'COMPLETED' && (
                        <Link href={`/dashboard/analytics/${s.id}`}>
                          <Button size="sm" variant="outline">Results</Button>
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
  const { user } = useAuth();
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [myParticipations, setMyParticipations] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'live' | 'upcoming' | 'completed'>('live');
  const router = useRouter();

  useEffect(() => {
    Promise.all([
      fetch('/api/quiz?status=PUBLISHED&limit=50').then((r) => r.json()),
      fetch('/api/session?limit=200').then((r) => r.json()),
    ])
      .then(([qData, sData]) => {
        setQuizzes(qData.quizzes || []);
        const allSessions = sData.sessions || [];
        setSessions(allSessions);

        // Build set of session IDs where current user participated
        const participated = new Set<string>();
        allSessions.forEach((s: any) => {
          if (s.participants?.some((p: any) => p.userId === user?.id)) {
            participated.add(s.id);
          }
        });
        setMyParticipations(participated);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user?.id]);

  const joinQuiz = async (quizId: string) => {
    setJoining(quizId);
    setError('');
    try {
      const res = await fetch(`/api/quiz/${quizId}/join`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to join');
        setJoining(null);
        return;
      }
      // Store participant info for the play page
      if (data.participantId) {
        sessionStorage.setItem('participantId', data.participantId);
      }
      router.push(`/play/${data.sessionId}`);
    } catch {
      setError('Network error');
      setJoining(null);
    }
  };

  // Categorize quizzes
  const now = new Date();
  const liveQuizzes: any[] = [];
  const upcomingQuizzes: any[] = [];
  const completedQuizzes: any[] = [];

  quizzes.forEach((q) => {
    // Check if user completed any session of this quiz
    const quizSessions = sessions.filter((s: any) => s.quizId === q.id);
    const completedSession = quizSessions.find(
      (s: any) => s.state === 'COMPLETED' && myParticipations.has(s.id)
    );
    const liveSession = quizSessions.find(
      (s: any) => s.state === 'WAITING' || s.state === 'QUESTION_ACTIVE'
    );
    const allSessionsCompleted = quizSessions.length > 0 && quizSessions.every(
      (s: any) => s.state === 'COMPLETED'
    );

    if (completedSession) {
      // Student participated in a completed session → completed tab
      completedQuizzes.push({ ...q, _session: completedSession });
    } else if (allSessionsCompleted) {
      // All sessions ended but student didn't participate → completed (missed)
      completedQuizzes.push({ ...q, _session: quizSessions[0], _missed: true });
    } else if (liveSession) {
      liveQuizzes.push({ ...q, _session: liveSession });
    } else if (q.scheduledStartTime && new Date(q.scheduledStartTime) > now) {
      upcomingQuizzes.push(q);
    } else {
      // No active session and no schedule — treat as upcoming/available
      upcomingQuizzes.push(q);
    }
  });

  const tabData = tab === 'live' ? liveQuizzes : tab === 'upcoming' ? upcomingQuizzes : completedQuizzes;

  return (
    <div className="space-y-8">
      {/* Welcome banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 via-purple-500/10 to-pink-500/10 p-8 border">
        <div className="relative z-10">
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome, {userName}! <span className="animate-pulse">👋</span>
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Your quizzes are organized below. Join live tests or check your completed ones.
          </p>
          <div className="flex gap-3 mt-6">
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

      {error && (
        <div className="bg-destructive/10 text-destructive border border-destructive/20 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* Tab buttons */}
      <div className="flex gap-1 bg-muted rounded-lg p-1 w-fit">
        {[
          { key: 'live' as const, label: 'Live Tests', count: liveQuizzes.length },
          { key: 'upcoming' as const, label: 'Upcoming', count: upcomingQuizzes.length },
          { key: 'completed' as const, label: 'Completed', count: completedQuizzes.length },
        ].map((t) => (
          <Button
            key={t.key}
            size="sm"
            variant={tab === t.key ? 'default' : 'ghost'}
            onClick={() => setTab(t.key)}
            className="text-xs"
          >
            {t.label}
            {t.count > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">
                {t.count}
              </Badge>
            )}
          </Button>
        ))}
      </div>

      {/* Quiz list */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {tab === 'live' && <><Play className="h-5 w-5 text-green-500" /> Live Tests</>}
            {tab === 'upcoming' && <><Calendar className="h-5 w-5 text-blue-500" /> Upcoming Tests</>}
            {tab === 'completed' && <><Star className="h-5 w-5 text-yellow-500" /> Completed Tests</>}
          </CardTitle>
          <CardDescription>
            {tab === 'live' && 'Tests currently in progress — join now!'}
            {tab === 'upcoming' && 'Tests scheduled for later or not yet started'}
            {tab === 'completed' && 'Tests you have already taken'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-center py-8">Loading quizzes...</p>
          ) : tabData.length === 0 ? (
            <div className="text-center py-8">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">
                {tab === 'live' ? 'No live tests right now' : tab === 'upcoming' ? 'No upcoming tests' : 'No completed tests yet'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {tabData.map((q: any) => (
                <div
                  key={q.id}
                  className="flex items-center justify-between p-4 border rounded-xl hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{q.title}</p>
                    {q.description && (
                      <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{q.description}</p>
                    )}
                    {q.syllabus && (
                      <details className="mt-1">
                        <summary className="text-xs text-blue-500 cursor-pointer hover:underline">View Syllabus</summary>
                        <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line bg-muted/50 rounded-lg p-2">{q.syllabus}</p>
                      </details>
                    )}
                    <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1 flex-wrap">
                      <span className="flex items-center gap-1">
                        <BookOpen className="h-3 w-3" />
                        {q.questions?.length ?? 0} questions
                      </span>
                      {q.timePerQuestion && (
                        <span className="flex items-center gap-1">
                          ⏱️ {Math.round(q.timePerQuestion / 60)} min total
                        </span>
                      )}
                      {q.instructor?.name && (
                        <span className="flex items-center gap-1">
                          <GraduationCap className="h-3 w-3" />
                          {q.instructor.name}
                        </span>
                      )}
                      {tab === 'upcoming' && q.scheduledStartTime && (
                        <span className="flex items-center gap-1 text-blue-500">
                          <Calendar className="h-3 w-3" />
                          {new Date(q.scheduledStartTime).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                  {tab === 'live' && (
                    <Button
                      variant="arena"
                      size="sm"
                      onClick={() => joinQuiz(q.id)}
                      disabled={joining === q.id}
                    >
                      {joining === q.id ? (
                        'Joining...'
                      ) : (
                        <>
                          <Play className="mr-1 h-4 w-4" /> Join
                        </>
                      )}
                    </Button>
                  )}
                  {tab === 'upcoming' && (
                    <Badge variant="outline" className="text-xs">
                      {q.scheduledStartTime ? 'Scheduled' : 'Not Started'}
                    </Badge>
                  )}
                  {tab === 'completed' && q._session && (
                    <div className="text-right">
                      {q._missed ? (
                        <Badge variant="destructive">Missed</Badge>
                      ) : (() => {
                        const part = q._session.participants?.find(
                          (p: any) => p.userId === user?.id
                        );
                        return part ? (
                          <div>
                            <p className="text-lg font-bold text-primary">{part.totalScore ?? 0}</p>
                            <p className="text-xs text-muted-foreground">{part.correctCount ?? 0} correct</p>
                          </div>
                        ) : (
                          <Badge variant="secondary">Done</Badge>
                        );
                      })()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Help */}
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
