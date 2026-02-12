'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useSocket } from '@/components/providers/socket-provider';
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
  Copy,
  Square,
  Clock,
  CheckCircle,
  XCircle,
  Wifi,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function HostSessionPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;
  const { socket, isConnected, emit } = useSocket();

  const [session, setSession] = useState<any>(null);
  const [state, setState] = useState('WAITING');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answerCount, setAnswerCount] = useState(0);
  const [participantCount, setParticipantCount] = useState(0);
  const [timer, setTimer] = useState(0);
  const [loading, setLoading] = useState(true);

  // Fetch session data
  useEffect(() => {
    fetch(`/api/session/${sessionId}`)
      .then((r) => r.json())
      .then((data) => {
        setSession(data.session);
        setState(data.session.state);
        setCurrentIndex(data.session.currentQuestionIndex);
        setParticipantCount(data.session.participants?.length || 0);
      })
      .catch(() => toast.error('Failed to load session'))
      .finally(() => setLoading(false));
  }, [sessionId]);

  // Socket events
  useEffect(() => {
    if (!socket) return;

    socket.emit('JOIN_SESSION', { sessionId, participantId: 'instructor' });

    socket.on('SESSION_STATE_CHANGE', ({ state: s, currentQuestionIndex }: { state: string; currentQuestionIndex: number }) => {
      setState(s);
      setCurrentIndex(currentQuestionIndex);
      setAnswerCount(0);
    });

    socket.on('PARTICIPANT_JOINED', ({ count }: { count: number }) => setParticipantCount(count));
    socket.on('PARTICIPANT_LEFT', ({ count }: { count: number }) => setParticipantCount(count));
    socket.on('ANSWER_COUNT_UPDATE', ({ count }: { count: number }) => setAnswerCount(count));
    socket.on('TIMER_SYNC', ({ remaining }: { remaining: number }) => setTimer(remaining));

    return () => {
      socket.off('SESSION_STATE_CHANGE');
      socket.off('PARTICIPANT_JOINED');
      socket.off('PARTICIPANT_LEFT');
      socket.off('ANSWER_COUNT_UPDATE');
      socket.off('TIMER_SYNC');
    };
  }, [socket, sessionId]);

  const startSession = useCallback(() => {
    emit('START_SESSION', { sessionId });
  }, [emit, sessionId]);

  const nextQuestion = useCallback(() => {
    emit('NEXT_QUESTION', { sessionId });
  }, [emit, sessionId]);

  const lockQuestion = useCallback(() => {
    emit('LOCK_QUESTION', { sessionId });
  }, [emit, sessionId]);

  const showResults = useCallback(() => {
    emit('SHOW_RESULTS', { sessionId });
  }, [emit, sessionId]);

  const endSession = useCallback(() => {
    if (confirm('End this session?')) {
      emit('END_SESSION', { sessionId });
    }
  }, [emit, sessionId]);

  if (loading || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
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
            <Badge variant={isConnected ? 'success' : 'destructive'} className="flex items-center gap-1">
              <Wifi className="h-3 w-3" /> {isConnected ? 'Connected' : 'Disconnected'}
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1 bg-muted rounded-md">
              <span className="text-sm text-muted-foreground">Code:</span>
              <span className="font-mono font-bold text-lg">{session.joinCode}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => {
                  navigator.clipboard.writeText(session.joinCode);
                  toast.success('Code copied!');
                }}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
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
              <h2 className="text-4xl font-bold mb-4">Waiting for Students</h2>
              <p className="text-xl text-muted-foreground mb-2">
                Share the join code with your students
              </p>
              <div className="inline-block bg-muted rounded-2xl px-12 py-6 mt-4">
                <p className="text-6xl font-mono font-extrabold tracking-[0.3em] text-primary">
                  {session.joinCode}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-center gap-2 text-lg">
              <Users className="h-6 w-6 text-primary" />
              <span className="font-bold text-2xl">{participantCount}</span>
              <span className="text-muted-foreground">students joined</span>
            </div>
            <Button
              variant="arena"
              size="xl"
              onClick={startSession}
              disabled={participantCount === 0}
              className="animate-pulse-glow"
            >
              <Play className="mr-2 h-6 w-6" /> Start Quiz
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

            {/* Timer */}
            {state === 'QUESTION_ACTIVE' && timer > 0 && (
              <div className="flex items-center justify-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                <span className={`text-3xl font-mono font-bold ${timer <= 5 ? 'text-destructive animate-pulse' : ''}`}>
                  {timer}s
                </span>
              </div>
            )}

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
                            ? 'border-green-500 bg-green-50'
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

                {/* Answer progress */}
                <div className="mt-6 p-4 bg-muted rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Responses</span>
                    <span className="text-sm text-muted-foreground">
                      {answerCount} / {participantCount}
                    </span>
                  </div>
                  <Progress
                    value={participantCount > 0 ? (answerCount / participantCount) * 100 : 0}
                    className="h-3"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Controls */}
            <div className="flex justify-center gap-3">
              {state === 'QUESTION_ACTIVE' && (
                <Button variant="destructive" onClick={lockQuestion}>
                  <Lock className="mr-2 h-4 w-4" /> Lock Answers
                </Button>
              )}
              {state === 'LOCKED' && (
                <Button onClick={showResults}>
                  <BarChart3 className="mr-2 h-4 w-4" /> Show Results
                </Button>
              )}
              {state === 'RESULTS' && currentIndex < totalQuestions - 1 && (
                <Button variant="arena" onClick={nextQuestion}>
                  <SkipForward className="mr-2 h-4 w-4" /> Next Question
                </Button>
              )}
              {state === 'RESULTS' && currentIndex >= totalQuestions - 1 && (
                <Button variant="arena" onClick={endSession}>
                  <Trophy className="mr-2 h-4 w-4" /> End & Show Leaderboard
                </Button>
              )}
              <Button variant="outline" onClick={endSession}>
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
              <a href={`/api/analytics/session/${sessionId}`}>
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
