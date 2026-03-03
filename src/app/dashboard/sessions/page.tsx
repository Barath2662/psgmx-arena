'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Clock, Play, BarChart3, Copy, Square, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SessionsPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  function fetchSessions() {
    fetch('/api/session')
      .then((r) => r.json())
      .then((data) => setSessions(data.sessions || []))
      .catch(() => toast.error('Failed to load sessions'))
      .finally(() => setLoading(false));
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    toast.success(`Copied: ${code}`);
  }

  async function sessionAction(sessionId: string, action: string) {
    setActionLoading(sessionId);
    try {
      const res = await fetch(`/api/session/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Action failed');
        return;
      }
      toast.success(action === 'start' ? 'Quiz started!' : action === 'end' ? 'Quiz ended!' : 'Done');
      fetchSessions();
    } catch {
      toast.error('Action failed');
    } finally {
      setActionLoading(null);
    }
  }

  const stateColors: Record<string, 'success' | 'warning' | 'secondary' | 'default' | 'destructive'> = {
    WAITING: 'warning',
    QUESTION_ACTIVE: 'success',
    LOCKED: 'default',
    RESULTS: 'default',
    COMPLETED: 'secondary',
  };

  const stateLabels: Record<string, string> = {
    WAITING: 'Scheduled',
    QUESTION_ACTIVE: 'Live',
    COMPLETED: 'Completed',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Sessions</h1>
        <p className="text-muted-foreground">Manage your quiz sessions</p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-6 h-24" />
            </Card>
          ))}
        </div>
      ) : sessions.length > 0 ? (
        <div className="space-y-4">
          {sessions.map((s) => (
            <Card key={s.id}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="font-semibold text-lg">{s.quiz?.title}</h3>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" /> {s.participants?.length ?? 0} participants
                      </span>
                      <span className="flex items-center gap-1 font-mono text-base">
                        Code: {s.joinCode}
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyCode(s.joinCode)}>
                          <Copy className="h-3 w-3" />
                        </Button>
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(s.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={stateColors[s.state] || 'default'}>
                      {stateLabels[s.state] || s.state}
                    </Badge>
                    {s.state === 'WAITING' && (
                      <Button
                        variant="arena"
                        size="sm"
                        onClick={() => sessionAction(s.id, 'start')}
                        disabled={actionLoading === s.id}
                      >
                        {actionLoading === s.id ? (
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        ) : (
                          <Play className="mr-1 h-3 w-3" />
                        )}
                        Start Now
                      </Button>
                    )}
                    {s.state === 'QUESTION_ACTIVE' && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          if (confirm('End this quiz? All student answers will be saved.')) {
                            sessionAction(s.id, 'end');
                          }
                        }}
                        disabled={actionLoading === s.id}
                      >
                        {actionLoading === s.id ? (
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        ) : (
                          <Square className="mr-1 h-3 w-3" />
                        )}
                        End Quiz
                      </Button>
                    )}
                    {s.state === 'COMPLETED' && (
                      <Link href={`/dashboard/analytics/${s.id}`}>
                        <Button variant="outline" size="sm">
                          <BarChart3 className="mr-1 h-3 w-3" /> Analytics
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Play className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No sessions yet</h3>
            <p className="text-muted-foreground mb-4">
              Publish a quiz to auto-create a session
            </p>
            <Link href="/dashboard/quizzes">
              <Button variant="arena">Go to Quizzes</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
