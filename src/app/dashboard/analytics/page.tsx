'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  BarChart3,
  Users,
  FileQuestion,
  Clock,
  TrendingUp,
  Activity,
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function AnalyticsOverviewPage() {
  const [stats, setStats] = useState<any>(null);
  const [recentSessions, setRecentSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/analytics').then((r) => r.json()),
      fetch('/api/session').then((r) => r.json()),
    ])
      .then(([statsData, sessionsData]) => {
        setStats(statsData);
        setRecentSessions((sessionsData.sessions || []).slice(0, 5));
      })
      .catch(() => toast.error('Failed to load analytics'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Analytics Overview</h1>

      {/* Global stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { icon: Users, label: 'Total Users', value: stats?.totalUsers || 0, color: 'text-blue-500' },
          { icon: FileQuestion, label: 'Total Quizzes', value: stats?.totalQuizzes || 0, color: 'text-purple-500' },
          { icon: Activity, label: 'Total Sessions', value: stats?.totalSessions || 0, color: 'text-green-500' },
          { icon: Users, label: 'Total Participants', value: stats?.totalParticipants || 0, color: 'text-orange-500' },
          { icon: Clock, label: 'Active Sessions', value: stats?.activeSessions || 0, color: 'text-cyan-500' },
          { icon: TrendingUp, label: 'Avg Score', value: stats?.avgScore || 0, color: 'text-pink-500' },
        ].map((s, i) => (
          <Card key={i}>
            <CardContent className="p-4 text-center">
              <s.icon className={`h-6 w-6 mx-auto mb-2 ${s.color}`} />
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent sessions with link to detailed analytics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" /> Recent Sessions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentSessions.length === 0 && (
            <p className="text-sm text-muted-foreground">No sessions yet.</p>
          )}
          <div className="space-y-3">
            {recentSessions.map((s: any) => (
              <div key={s.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">{s.quiz?.title || 'Untitled'}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">{s.joinCode}</Badge>
                    <Badge variant={
                      s.state === 'COMPLETED' ? 'success' :
                      s.state === 'WAITING' ? 'outline' : 'default'
                    } className="text-xs">{s.state}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {s._count?.participants || 0} players
                    </span>
                  </div>
                </div>
                <Link href={`/dashboard/analytics/${s.id}`}>
                  <Button variant="outline" size="sm">
                    <BarChart3 className="mr-1 h-4 w-4" /> View
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
