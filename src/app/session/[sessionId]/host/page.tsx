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
  Trophy,
  Square,
  Clock,
  CheckCircle,
  Loader2,
  BarChart3,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function HostSessionPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;

  const [session, setSession] = useState<any>(null);
  const [state, setState] = useState('WAITING');
  const [participantCount, setParticipantCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [globalTimer, setGlobalTimer] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  // Fetch session data
  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch(`/api/session/${sessionId}`);
      const data = await res.json();
      if (!res.ok) return;

      setSession(data.session);
      setState(data.session.state);
      setParticipantCount(data.session.participants?.length || 0);

      // Set up timer for active session
      if (data.session.state === 'QUESTION_ACTIVE' && data.session.startedAt && !startTimeRef.current) {
        startTimeRef.current = new Date(data.session.startedAt).getTime();
        const totalSeconds = data.session.quiz?.timePerQuestion || 1800;
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        const remaining = Math.max(0, totalSeconds - elapsed);
        setGlobalTimer(remaining);

        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
          setGlobalTimer((prev) => {
            if (prev <= 1) {
              if (timerRef.current) clearInterval(timerRef.current);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, [sessionId]);

  // Initial fetch + polling
  useEffect(() => {
    fetchSession();
    pollRef.current = setInterval(fetchSession, 3000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
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
      setState(data.session.state);
      fetchSession();
    } catch {
      toast.error('Action failed');
    } finally {
      setActionLoading(false);
    }
  }

  // Format timer as MM:SS
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (loading || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const questions = session.quiz?.questions || [];
  const totalQuestions = questions.length;

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="border-b bg-card sticky top-0 z-50">
        <div className="container flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-4">
            <h1 className="font-bold truncate max-w-xs">{session.quiz?.title}</h1>
            {state === 'QUESTION_ACTIVE' && (
              <Badge variant="success" className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3" /> Live
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3">
            {state === 'QUESTION_ACTIVE' && globalTimer > 0 && (
              <div className={`flex items-center gap-1 text-lg font-mono font-bold ${globalTimer <= 60 ? 'text-destructive animate-pulse' : 'text-primary'}`}>
                <Clock className="h-4 w-4" /> {formatTime(globalTimer)}
              </div>
            )}
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
                {totalQuestions} questions &middot; {Math.round((session.quiz?.timePerQuestion || 1800) / 60)} minutes
              </p>
              <p className="text-lg text-muted-foreground">
                Join Code: <span className="font-mono font-bold text-primary text-2xl">{session.joinCode}</span>
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

        {/* QUESTION ACTIVE */}
        {state === 'QUESTION_ACTIVE' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Quiz In Progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-3xl font-bold text-primary">{totalQuestions}</p>
                    <p className="text-sm text-muted-foreground">Questions</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold">{participantCount}</p>
                    <p className="text-sm text-muted-foreground">Participants</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold font-mono">{formatTime(globalTimer)}</p>
                    <p className="text-sm text-muted-foreground">Remaining</p>
                  </div>
                </div>
                <p className="text-center text-muted-foreground">
                  Students are answering all questions freely. The quiz will end when the timer runs out or you end it manually.
                </p>
              </CardContent>
            </Card>

            {/* All questions list */}
            <Card>
              <CardHeader>
                <CardTitle>Questions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {questions.map((q: any, i: number) => (
                  <div key={q.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm text-muted-foreground w-6">Q{i + 1}</span>
                      <div>
                        <p className="text-sm font-medium truncate max-w-[400px]">{q.title}</p>
                        <Badge variant="outline" className="text-xs">{q.type} &middot; {q.points}pts</Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="flex justify-center">
              <Button
                variant="destructive"
                size="lg"
                onClick={() => {
                  if (confirm('End this session? All student answers will be saved.')) {
                    sessionAction('end');
                  }
                }}
                disabled={actionLoading}
              >
                {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Square className="mr-2 h-4 w-4" />}
                End Quiz
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
