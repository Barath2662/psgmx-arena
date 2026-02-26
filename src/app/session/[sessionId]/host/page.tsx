'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Users,
  Play,
  SkipForward,
  Lock,
  BarChart3,
  Trophy,
  Square,
  Clock,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function HostSessionPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;

  const [session, setSession] = useState<any>(null);
  const [state, setState] = useState('WAITING');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [participantCount, setParticipantCount] = useState(0);
  const [answerCount, setAnswerCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch session data
  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch(`/api/session/${sessionId}`);
      const data = await res.json();
      if (!res.ok) return;

      setSession(data.session);
      setState(data.session.state);
      setCurrentIndex(data.session.currentQuestionIndex ?? 0);
      setParticipantCount(data.session.participants?.length || 0);

      // Count answers for current question
      if (data.session.session_questions) {
        const currentSQ = data.session.session_questions[data.session.currentQuestionIndex ?? 0];
        if (currentSQ) {
          // Count student_answers for this question
          const qId = currentSQ.questionId;
          const answered = (data.session.participants || []).filter((p: any) => p.totalScore !== undefined).length;
          // Rough count - we'll get precise from answer count API if needed
        }
      }
    } catch {
      // Silent - polling will retry
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  // Initial fetch + polling
  useEffect(() => {
    fetchSession();
    pollRef.current = setInterval(fetchSession, 3000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchSession]);

  // Session control actions
  async function sessionAction(action: string) {
    setActionLoading(true);
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
      // Immediately update local state
      setState(data.session.state);
      setCurrentIndex(data.session.currentQuestionIndex ?? 0);
      // Trigger a fresh poll
      fetchSession();
    } catch {
      toast.error('Action failed');
    } finally {
      setActionLoading(false);
    }
  }

  if (loading || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const questions = session.quiz?.questions || [];
  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="border-b bg-card sticky top-0 z-50">
        <div className="container flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-4">
            <h1 className="font-bold truncate max-w-xs">{session.quiz?.title}</h1>
            <Badge variant="success" className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3" /> Live
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-sm">
              <Users className="h-4 w-4" />
              <span className="font-bold">{participantCount}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-6 px-4 max-w-4xl mx-auto">
        {/* WAITING STATE */}
        {state === 'WAITING' && (
          <div className="text-center py-20 space-y-8">
            <div>
              <h2 className="text-4xl font-bold mb-4">Ready to Start</h2>
              <p className="text-xl text-muted-foreground mb-2">
                {totalQuestions} questions prepared
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 text-lg">
              <Users className="h-6 w-6 text-primary" />
              <span className="font-bold text-2xl">{participantCount}</span>
              <span className="text-muted-foreground">students joined</span>
            </div>
            <Button
              variant="arena"
              size="lg"
              onClick={() => sessionAction('start')}
              disabled={actionLoading}
              className="text-lg px-8 py-6"
            >
              {actionLoading ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : <Play className="mr-2 h-6 w-6" />}
              Start Quiz
            </Button>
          </div>
        )}

        {/* QUESTION ACTIVE / LOCKED / RESULTS */}
        {['QUESTION_ACTIVE', 'LOCKED', 'RESULTS'].includes(state) && currentQuestion && (
          <div className="space-y-6">
            {/* Progress */}
            <div className="flex items-center justify-between text-sm">
              <span>
                Question {currentIndex + 1} of {totalQuestions}
              </span>
              <Badge variant="outline">
                {currentQuestion.points} pts
              </Badge>
            </div>
            <Progress value={((currentIndex + 1) / totalQuestions) * 100} className="h-2" />

            {/* Question */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline">
                    {currentQuestion.type}
                  </Badge>
                  <Badge variant={state === 'QUESTION_ACTIVE' ? 'success' : state === 'LOCKED' ? 'warning' : 'default'}>
                    {state === 'QUESTION_ACTIVE' ? 'Active' : state === 'LOCKED' ? 'Locked' : 'Results'}
                  </Badge>
                </div>
                <CardTitle className="text-xl">{currentQuestion.title}</CardTitle>
                {currentQuestion.description && (
                  <p className="text-muted-foreground mt-2">{currentQuestion.description}</p>
                )}
              </CardHeader>
              <CardContent>
                {/* Show options for MCQ types */}
                {currentQuestion.optionsData?.options && (
                  <div className="space-y-2">
                    {currentQuestion.optionsData.options.map((opt: any, i: number) => (
                      <div
                        key={opt.id}
                        className={`p-3 rounded-lg border ${
                          state === 'RESULTS' && opt.isCorrect
                            ? 'border-green-500 bg-green-50 dark:bg-green-950'
                            : 'border-border'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span>
                            <span className="font-mono text-muted-foreground mr-2">
                              {String.fromCharCode(65 + i)}.
                            </span>
                            {opt.text}
                          </span>
                          {state === 'RESULTS' && opt.isCorrect && (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Show CODE question info */}
                {currentQuestion.type === 'CODE' && currentQuestion.optionsData && (
                  <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Language:</span>
                      <Badge variant="outline">{currentQuestion.optionsData.language || 'python'}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Students are writing code solutions
                    </p>
                  </div>
                )}

                {/* Participant count */}
                <div className="mt-6 p-4 bg-muted rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Participants</span>
                    <span className="text-sm text-muted-foreground">
                      {participantCount} students
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Controls */}
            <div className="flex justify-center gap-3">
              {state === 'QUESTION_ACTIVE' && (
                <Button variant="destructive" onClick={() => sessionAction('lock')} disabled={actionLoading}>
                  {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}
                  Lock Answers
                </Button>
              )}
              {state === 'LOCKED' && (
                <Button onClick={() => sessionAction('results')} disabled={actionLoading}>
                  {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BarChart3 className="mr-2 h-4 w-4" />}
                  Show Results
                </Button>
              )}
              {state === 'RESULTS' && currentIndex < totalQuestions - 1 && (
                <Button variant="arena" onClick={() => sessionAction('next')} disabled={actionLoading}>
                  {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <SkipForward className="mr-2 h-4 w-4" />}
                  Next Question
                </Button>
              )}
              {state === 'RESULTS' && currentIndex >= totalQuestions - 1 && (
                <Button variant="arena" onClick={() => sessionAction('end')} disabled={actionLoading}>
                  {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trophy className="mr-2 h-4 w-4" />}
                  End & Show Leaderboard
                </Button>
              )}
              <Button variant="outline" onClick={() => { if (confirm('End this session?')) sessionAction('end'); }} disabled={actionLoading}>
                <Square className="mr-2 h-4 w-4" /> End Session
              </Button>
            </div>
          </div>
        )}

        {/* COMPLETED */}
        {state === 'COMPLETED' && (
          <div className="text-center py-20 space-y-6">
            <Trophy className="h-20 w-20 text-yellow-500 mx-auto" />
            <h2 className="text-4xl font-bold">Session Complete!</h2>
            <p className="text-muted-foreground text-lg">
              {participantCount} students participated
            </p>
            <div className="flex justify-center gap-4">
              <a href={`/dashboard/analytics/${sessionId}`}>
                <Button variant="arena" size="lg">
                  <BarChart3 className="mr-2 h-5 w-5" /> View Full Analytics
                </Button>
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
