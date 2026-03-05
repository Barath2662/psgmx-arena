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
  ChevronDown,
  ChevronRight,
  User,
  RotateCcw,
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function SessionAnalyticsPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
  const [restartingUsers, setRestartingUsers] = useState<Set<string>>(new Set());

  async function restartUser(participantId: string, name: string) {
    if (!confirm(`Reset all answers and scores for "${name}"? They will be able to retake the test from the beginning.`)) return;
    setRestartingUsers((prev) => new Set(prev).add(participantId));
    try {
      const res = await fetch(`/api/session/${sessionId}/restart-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to restart user');
        return;
      }
      toast.success(`${name}'s test has been reset`);
      // Refresh analytics data
      fetch(`/api/analytics/session/${sessionId}`)
        .then((r) => r.json())
        .then((json) => setData(json.analytics || json))
        .catch(() => {});
    } catch {
      toast.error('Failed to restart user');
    } finally {
      setRestartingUsers((prev) => {
        const next = new Set(prev);
        next.delete(participantId);
        return next;
      });
    }
  }

  useEffect(() => {
    fetch(`/api/analytics/session/${sessionId}`)
      .then((r) => r.json())
      .then((json) => {
        setData(json.analytics || json);
      })
      .catch(() => toast.error('Failed to load analytics'))
      .finally(() => setLoading(false));
  }, [sessionId]);

  const exportCSV = () => {
    if (!data) return;
    const rows = [['Student', 'Email', 'Score', 'Correct', 'Total Questions', 'Accuracy (%)']];
    (studentReports || []).forEach((p: any) => {
      rows.push([
        p.name || 'Guest',
        p.email || '',
        p.totalScore,
        p.correctCount,
        p.totalQuestions,
        p.accuracy,
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
    quizTitle,
    totalParticipants = 0,
    avgScore = 0,
    medianScore = 0,
    maxPossibleScore = 0,
    questionStats = [],
    scoreDistribution = [],
    studentReports = [],
    startedAt,
    endedAt,
  } = data;

  const participants = studentReports;
  const overallStats = {
    totalParticipants,
    avgAccuracy: maxPossibleScore > 0 ? Math.round((avgScore / maxPossibleScore) * 100) : 0,
    avgTimeMs: questionStats.length > 0
      ? questionStats.reduce((sum: number, q: any) => sum + (q.avgTimeMs || 0), 0) / questionStats.length
      : 0,
    highScore: studentReports.length > 0
      ? Math.max(...studentReports.map((s: any) => s.totalScore || 0))
      : 0,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <Link href="/dashboard/sessions" className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 mb-2">
            <ArrowLeft className="h-3 w-3" /> Back to sessions
          </Link>
          <h1 className="text-2xl font-bold">{quizTitle || 'Session'} Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Session ID: {sessionId}
            {startedAt ? ` · ${new Date(startedAt).toLocaleDateString()}` : ''}
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
              const maxScore = Math.max(...participants.map((p: any) => p.totalScore || 0), 1);
              const sorted = [...participants].sort((a: any, b: any) => (b.totalScore || 0) - (a.totalScore || 0));
              return sorted.map((p: any, i: number) => (
                <div key={p.id || i} className="flex items-center gap-3">
                  <span className="w-8 text-sm font-mono text-muted-foreground">#{i + 1}</span>
                  <span className="w-32 text-sm truncate">{p.name || 'Guest'}</span>
                  <div className="flex-1">
                    <div className="h-6 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                        style={{ width: `${Math.max(((p.totalScore || 0) / maxScore) * 100, 5)}%` }}
                      >
                        <span className="text-xs font-bold text-white">{p.totalScore || 0}</span>
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
          {questionStats.map((q: any, i: number) => {
            const wrongCount = (q.totalAnswers || 0) - (q.correctCount || 0);
            return (
            <div key={q.questionId || i} className="p-4 border rounded-lg">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <Badge variant="outline" className="mb-1 text-xs">Q{i + 1} &middot; {q.type}</Badge>
                  <p className="font-medium">{q.title}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <p className="text-lg font-bold text-green-600">{q.accuracy || 0}%</p>
                    <p className="text-xs text-muted-foreground">correct</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Progress value={q.accuracy || 0} className="flex-1 h-3" />
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 text-green-500" /> {q.correctCount || 0}
                  </span>
                  <span className="flex items-center gap-1">
                    <XCircle className="h-3 w-3 text-red-400" /> {wrongCount}
                  </span>
                  <span>Avg: {((q.avgTimeMs || 0) / 1000).toFixed(1)}s</span>
                </div>
              </div>
            </div>
            );
          })}
        </CardContent>
      </Card>

      {/* User-wise Analytics — Expandable Student Results */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" /> User-wise Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-4">Click on a student row to view their per-question breakdown</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="p-2 w-8"></th>
                  <th className="p-2">Rank</th>
                  <th className="p-2">Student</th>
                  <th className="p-2">Email</th>
                  <th className="p-2">Score</th>
                  <th className="p-2">Correct</th>
                  <th className="p-2">Wrong</th>
                  <th className="p-2">Accuracy</th>
                  <th className="p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {[...participants]
                  .sort((a: any, b: any) => (b.totalScore || 0) - (a.totalScore || 0))
                  .map((p: any, i: number) => {
                    const wrongCount = (p.totalQuestions || 0) - (p.correctCount || 0);
                    const accuracy = p.accuracy || 0;
                    const isExpanded = expandedStudent === p.id;
                    return (
                      <>
                        <tr
                          key={p.id || i}
                          className="border-b hover:bg-muted/50 cursor-pointer"
                          onClick={() => setExpandedStudent(isExpanded ? null : p.id)}
                        >
                          <td className="p-2">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                          </td>
                          <td className="p-2 font-mono">
                            {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                          </td>
                          <td className="p-2 font-medium">{p.name || 'Guest'}</td>
                          <td className="p-2 text-muted-foreground text-xs">{p.email || '—'}</td>
                          <td className="p-2 font-bold text-primary">{p.totalScore || 0}</td>
                          <td className="p-2 text-green-600">{p.correctCount || 0}</td>
                          <td className="p-2 text-red-400">{wrongCount}</td>
                          <td className="p-2">
                            <div className="flex items-center gap-2">
                              <Progress value={accuracy} className="w-16 h-2" />
                              <span>{accuracy}%</span>
                            </div>
                          </td>
                          <td className="p-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => { e.stopPropagation(); restartUser(p.id, p.name || 'Guest'); }}
                              disabled={restartingUsers.has(p.id)}
                              className="text-orange-500 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950"
                              title="Reset this student's answers and score"
                            >
                              {restartingUsers.has(p.id) ? (
                                <RotateCcw className="h-3 w-3 animate-spin" />
                              ) : (
                                <RotateCcw className="h-3 w-3" />
                              )}
                              <span className="ml-1 hidden sm:inline">Restart</span>
                            </Button>
                          </td>
                        </tr>
                        {/* Expanded per-question details */}
                        {isExpanded && (
                          <tr key={`${p.id}-detail`}>
                            <td colSpan={9} className="p-0">
                              <div className="bg-muted/30 p-4 border-b">
                                <p className="text-xs font-semibold mb-3 text-muted-foreground uppercase">
                                  Per-question breakdown for {p.name}
                                </p>
                                <div className="grid gap-2">
                                  {questionStats.map((q: any, qi: number) => {
                                    const ans = (p.answers || []).find(
                                      (a: any) => a.questionId === q.questionId
                                    );
                                    return (
                                      <div
                                        key={q.questionId}
                                        className="flex items-center gap-3 text-sm p-2 rounded border bg-background"
                                      >
                                        <span className="font-mono text-xs w-8 text-muted-foreground">
                                          Q{qi + 1}
                                        </span>
                                        <span className="flex-1 truncate">{q.title}</span>
                                        {ans ? (
                                          <>
                                            {ans.isCorrect ? (
                                              <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                                            ) : (
                                              <XCircle className="h-4 w-4 text-red-400 shrink-0" />
                                            )}
                                            <span className="text-xs font-medium w-12 text-right">
                                              {ans.score ?? 0} pts
                                            </span>
                                          </>
                                        ) : (
                                          <>
                                            <span className="text-xs text-muted-foreground">
                                              Not answered
                                            </span>
                                            <span className="text-xs font-medium w-12 text-right text-muted-foreground">
                                              0 pts
                                            </span>
                                          </>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
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
