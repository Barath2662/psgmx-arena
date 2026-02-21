'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Clock, Play, BarChart3, Copy, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SessionsPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/session')
      .then((r) => r.json())
      .then((data) => setSessions(data.sessions || []))
      .catch(() => toast.error('Failed to load sessions'))
      .finally(() => setLoading(false));
  }, []);

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    toast.success(`Copied: ${code}`);
  }

  const stateColors: Record<string, 'success' | 'warning' | 'secondary' | 'default' | 'destructive'> = {
    WAITING: 'warning',
    QUESTION_ACTIVE: 'success',
    LOCKED: 'default',
    RESULTS: 'default',
    COMPLETED: 'secondary',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Sessions</h1>
        <p className="text-muted-foreground">Manage your live quiz sessions</p>
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
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" /> {s.participants?.length ?? 0} participants
                      </span>
                      <span className="flex items-center gap-1 font-mono text-base">
                        Join: {s.joinCode}
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
                    <Badge variant={stateColors[s.state] || 'default'}>{s.state}</Badge>
                    {s.state !== 'COMPLETED' ? (
                      <Link href={`/session/${s.id}/host`}>
                        <Button variant="arena" size="sm">
                          <Play className="mr-1 h-3 w-3" /> Host
                        </Button>
                      </Link>
                    ) : (
                      <Link href={`/dashboard/analytics?session=${s.id}`}>
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
              Create a quiz and start a live session to see it here
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
