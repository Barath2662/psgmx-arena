'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  BarChart3,
  Users,
  Clock,
  Target,
  Trophy,
  Download,
  ArrowLeft,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function SessionAnalyticsPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/analytics/session/${sessionId}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => toast.error('Failed to load analytics'))
      .finally(() => setLoading(false));
  }, [sessionId]);

  const exportCSV = () => {
    if (!data) return;
    const rows = [['Student', 'Score', 'Correct', 'Wrong', 'Avg Time (s)']];
    (data.participants || []).forEach((p: any) => {
      rows.push([
        p.name || p.userId || 'Guest',
        p.score,
        p.correctCount,
        p.wrongCount,
        ((p.avgTimeMs || 0) / 1000).toFixed(1),
      ]);
    });
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `session-${sessionId}-analytics.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!data) {
    return <div className="text-center py-20 text-muted-foreground">No analytics data found.</div>;
  }

  const {
    session: sess,
    participants = [],
    questionStats = [],
    overallStats = {},
  } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <Link href="/dashboard/sessions" className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 mb-2">
            <ArrowLeft className="h-3 w-3" /> Back to sessions
          </Link>
          <h1 className="text-2xl font-bold">{sess?.quiz?.title || 'Session'} Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Session Code: {sess?.joinCode} &middot;{' '}
            {sess?.createdAt ? new Date(sess.createdAt).toLocaleDateString() : ''}
          </p>
        </div>
        <Button variant="outline" onClick={exportCSV}>
          <Download className="mr-2 h-4 w-4" /> Export CSV
        </Button>
      </div>

      {/* Overview stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">{overallStats.totalParticipants || participants.length}</p>
              <p className="text-xs text-muted-foreground">Participants</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Target className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold">{overallStats.avgAccuracy || 0}%</p>
              <p className="text-xs text-muted-foreground">Avg Accuracy</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="h-8 w-8 text-orange-500" />
            <div>
              <p className="text-2xl font-bold">
                {((overallStats.avgTimeMs || 0) / 1000).toFixed(1)}s
              </p>
              <p className="text-xs text-muted-foreground">Avg Response Time</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Trophy className="h-8 w-8 text-yellow-500" />
            <div>
              <p className="text-2xl font-bold">{overallStats.highScore || 0}</p>
              <p className="text-xs text-muted-foreground">High Score</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Score Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" /> Score Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {(() => {
              const maxScore = Math.max(...participants.map((p: any) => p.score || 0), 1);
              const sorted = [...participants].sort((a: any, b: any) => (b.score || 0) - (a.score || 0));
              return sorted.map((p: any, i: number) => (
                <div key={p.id || i} className="flex items-center gap-3">
                  <span className="w-8 text-sm font-mono text-muted-foreground">#{i + 1}</span>
                  <span className="w-32 text-sm truncate">{p.name || p.user?.name || 'Guest'}</span>
                  <div className="flex-1">
                    <div className="h-6 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                        style={{ width: `${Math.max(((p.score || 0) / maxScore) * 100, 5)}%` }}
                      >
                        <span className="text-xs font-bold text-white">{p.score || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ));
            })()}
          </div>
        </CardContent>
      </Card>

      {/* Question-by-Question */}
      <Card>
        <CardHeader>
          <CardTitle>Question Analysis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {questionStats.length === 0 && (
            <p className="text-sm text-muted-foreground">No question data available</p>
          )}
          {questionStats.map((q: any, i: number) => (
            <div key={q.id || i} className="p-4 border rounded-lg">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <Badge variant="outline" className="mb-1 text-xs">Q{i + 1} &middot; {q.type}</Badge>
                  <p className="font-medium">{q.title}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <p className="text-lg font-bold text-green-600">{q.correctPercent || 0}%</p>
                    <p className="text-xs text-muted-foreground">correct</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Progress value={q.correctPercent || 0} className="flex-1 h-3" />
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 text-green-500" /> {q.correctCount || 0}
                  </span>
                  <span className="flex items-center gap-1">
                    <XCircle className="h-3 w-3 text-red-400" /> {q.wrongCount || 0}
                  </span>
                  <span>Avg: {((q.avgTimeMs || 0) / 1000).toFixed(1)}s</span>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Student Detail Table */}
      <Card>
        <CardHeader>
          <CardTitle>Student Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="p-2">Rank</th>
                  <th className="p-2">Student</th>
                  <th className="p-2">Score</th>
                  <th className="p-2">Correct</th>
                  <th className="p-2">Wrong</th>
                  <th className="p-2">Avg Time</th>
                  <th className="p-2">Accuracy</th>
                </tr>
              </thead>
              <tbody>
                {[...participants]
                  .sort((a: any, b: any) => (b.score || 0) - (a.score || 0))
                  .map((p: any, i: number) => {
                    const total = (p.correctCount || 0) + (p.wrongCount || 0);
                    const accuracy = total > 0 ? Math.round(((p.correctCount || 0) / total) * 100) : 0;
                    return (
                      <tr key={p.id || i} className="border-b hover:bg-muted/50">
                        <td className="p-2 font-mono">
                          {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                        </td>
                        <td className="p-2 font-medium">{p.name || p.user?.name || 'Guest'}</td>
                        <td className="p-2 font-bold text-primary">{p.score || 0}</td>
                        <td className="p-2 text-green-600">{p.correctCount || 0}</td>
                        <td className="p-2 text-red-400">{p.wrongCount || 0}</td>
                        <td className="p-2">{((p.avgTimeMs || 0) / 1000).toFixed(1)}s</td>
                        <td className="p-2">
                          <div className="flex items-center gap-2">
                            <Progress value={accuracy} className="w-16 h-2" />
                            <span>{accuracy}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
