'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { FullscreenGuard } from '@/components/fullscreen-guard';
import CodeSandbox from '@/components/code-sandbox';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import {
  Clock,
  CheckCircle,
  XCircle,
  Trophy,
  Zap,
  Loader2,
  Send,
  Code2,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function PlaySessionPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;

  const [session, setSession] = useState<any>(null);
  const [state, setState] = useState('WAITING');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timer, setTimer] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<any>(null);
  const [answerSubmitted, setAnswerSubmitted] = useState(false);
  const [participantId, setParticipantId] = useState('');
  const [score, setScore] = useState(0);
  const [playerName, setPlayerName] = useState('');
  const [lastResult, setLastResult] = useState<{ correct: boolean; points: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const startTimeRef = useRef<number>(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevIndexRef = useRef<number>(-1);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-join: ensure the user is a participant
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/session/${sessionId}`);
        if (!res.ok) return;
        const data = await res.json();
        const s = data.session;
        const quizId = s?.quizId || s?.quiz?.id;
        if (!quizId) return;

        // Try to join (idempotent – the API skips if already joined)
        const jr = await fetch(`/api/quiz/${quizId}/join`, { method: 'POST' });
        if (jr.ok) {
          const jd = await jr.json();
          if (jd.participantId) {
            sessionStorage.setItem('participantId', jd.participantId);
            setParticipantId(jd.participantId);
          }
        }
      } catch { /* ignore */ }
    })();
  }, [sessionId]);

  // Fetch session data (used for polling)
  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch(`/api/session/${sessionId}`);
      const data = await res.json();
      if (!res.ok) return;

      const s = data.session;
      setSession(s);
      setState(s.state);
      setCurrentIndex(s.currentQuestionIndex ?? 0);

      // Detect question change → reset answer state
      if (s.currentQuestionIndex !== prevIndexRef.current && s.state === 'QUESTION_ACTIVE') {
        prevIndexRef.current = s.currentQuestionIndex;
        setSelectedAnswer(null);
        setAnswerSubmitted(false);
        setLastResult(null);
        startTimeRef.current = Date.now();

        // Start countdown timer for MCQ/FILL_BLANK
        const questions = s.quiz?.questions || [];
        const currentQ = questions[s.currentQuestionIndex ?? 0];
        if (currentQ && ['MCQ', 'TRUE_FALSE', 'MULTI_SELECT', 'FILL_BLANK'].includes(currentQ.type)) {
          const tl = currentQ.timeLimit || s.quiz?.timePerQuestion || 0;
          if (tl > 0) {
            setTimer(tl);
            if (timerRef.current) clearInterval(timerRef.current);
            timerRef.current = setInterval(() => {
              setTimer((prev) => {
                if (prev <= 1) {
                  if (timerRef.current) clearInterval(timerRef.current);
                  return 0;
                }
                return prev - 1;
              });
            }, 1000);
          } else {
            setTimer(0);
          }
        } else {
          setTimer(0); // No timer for other types
          if (timerRef.current) clearInterval(timerRef.current);
        }
      }
    } catch {
      // Silent retry via polling
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  // Initial fetch + polling every 2s
  useEffect(() => {
    fetchSession();
    pollRef.current = setInterval(fetchSession, 2000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fetchSession]);

  const submitAnswer = useCallback(
    async (answerData: any) => {
      if (answerSubmitted) return;

      const timeTakenMs = Date.now() - startTimeRef.current;

      try {
        await fetch(`/api/session/${sessionId}/answer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            participantId,
            questionId: session?.quiz?.questions?.[currentIndex]?.id,
            answerData,
            timeTakenMs,
          }),
        });
      } catch {
        // Still mark as submitted locally
      }

      setSelectedAnswer(answerData);
      setAnswerSubmitted(true);
      toast.success('Answer submitted!');
    },
    [answerSubmitted, sessionId, participantId, currentIndex, session]
  );

  if (loading || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-arena">
        <Loader2 className="h-12 w-12 animate-spin text-white" />
      </div>
    );
  }

  const questions = session.quiz?.questions || [];
  const currentQuestion = questions[currentIndex];

  return (
    <FullscreenGuard active={state === 'QUESTION_ACTIVE' || state === 'LOCKED' || state === 'RESULTS'}>
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="border-b bg-card sticky top-0 z-50">
        <div className="flex items-center justify-between h-12 px-4">
          <div className="flex items-center gap-3">
            <span className="font-medium text-sm truncate">{session.quiz?.title}</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium truncate max-w-[120px]">{playerName}</span>
            <div className="text-right">
              <span className="text-xs text-muted-foreground">Score</span>
              <p className="font-bold text-primary">{score}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4">
        {/* WAITING */}
        {state === 'WAITING' && (
          <div className="text-center py-20 space-y-4">
            <div className="animate-pulse">
              <Zap className="h-16 w-16 text-primary mx-auto" />
            </div>
            <h2 className="text-2xl font-bold">Waiting for instructor...</h2>
            <p className="text-muted-foreground">The quiz will begin shortly. Stay on this page.</p>
          </div>
        )}

        {/* QUESTION ACTIVE */}
        {state === 'QUESTION_ACTIVE' && currentQuestion && (
          <div className="space-y-6 animate-in">
            {/* Progress & Timer */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {currentIndex + 1} / {questions.length}
              </span>
              {timer > 0 && (
                <div className={`flex items-center gap-1 text-lg font-mono font-bold ${timer <= 5 ? 'text-destructive animate-pulse' : 'text-primary'}`}>
                  <Clock className="h-4 w-4" /> {timer}s
                </div>
              )}
              <Badge variant="outline">{currentQuestion.points} pts</Badge>
            </div>
            <Progress value={((currentIndex + 1) / questions.length) * 100} className="h-1" />

            {/* Question */}
            <Card>
              <CardHeader>
                <Badge variant="outline" className="w-fit mb-2 text-xs">{currentQuestion.type}</Badge>
                <CardTitle className="text-lg">{currentQuestion.title}</CardTitle>
                {currentQuestion.description && (
                  <p className="text-sm text-muted-foreground">{currentQuestion.description}</p>
                )}
              </CardHeader>
            </Card>

            {/* MCQ / TRUE_FALSE */}
            {['MCQ', 'TRUE_FALSE'].includes(currentQuestion.type) && (
              <div className="space-y-3">
                {currentQuestion.optionsData?.options?.map((opt: any, i: number) => (
                  <Button
                    key={opt.id}
                    variant={selectedAnswer === opt.id ? 'default' : 'outline'}
                    className={`w-full justify-start text-left h-auto py-4 px-4 ${
                      selectedAnswer === opt.id ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => {
                      if (!answerSubmitted) submitAnswer(opt.id);
                    }}
                    disabled={answerSubmitted}
                  >
                    <span className="font-mono text-muted-foreground mr-3">
                      {String.fromCharCode(65 + i)}
                    </span>
                    {opt.text}
                  </Button>
                ))}
              </div>
            )}

            {/* Multi-select */}
            {currentQuestion.type === 'MULTI_SELECT' && (
              <MultiSelectAnswer
                options={currentQuestion.optionsData?.options || []}
                submitted={answerSubmitted}
                onSubmit={submitAnswer}
              />
            )}

            {/* Fill blank / Short answer / Numeric / Long answer */}
            {['FILL_BLANK', 'SHORT_ANSWER', 'NUMERIC'].includes(currentQuestion.type) && (
              <TextInputAnswer
                type={currentQuestion.type === 'NUMERIC' ? 'number' : 'text'}
                submitted={answerSubmitted}
                onSubmit={submitAnswer}
                placeholder={
                  currentQuestion.type === 'NUMERIC'
                    ? 'Enter a number...'
                    : 'Type your answer...'
                }
              />
            )}

            {currentQuestion.type === 'LONG_ANSWER' && (
              <TextInputAnswer
                type="text"
                submitted={answerSubmitted}
                onSubmit={submitAnswer}
                placeholder="Type your answer..."
                multiline
              />
            )}

            {/* Code */}
            {currentQuestion.type === 'CODE' && (
              <div className="space-y-4">
                <CodeSandbox
                  language={currentQuestion.optionsData?.language || 'python'}
                  starterCode={currentQuestion.optionsData?.starterCode || ''}
                  testCases={currentQuestion.optionsData?.testCases || []}
                  readOnly={answerSubmitted}
                  onSubmit={(code, language) => submitAnswer({ code, language })}
                />
              </div>
            )}

            {answerSubmitted && (
              <div className="text-center p-4 bg-muted rounded-lg">
                <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <p className="font-medium">Answer submitted!</p>
                <p className="text-sm text-muted-foreground">Waiting for instructor...</p>
              </div>
            )}
          </div>
        )}

        {/* LOCKED */}
        {state === 'LOCKED' && (
          <div className="text-center py-20 space-y-4">
            <LockIcon className="h-16 w-16 text-muted-foreground mx-auto" />
            <h2 className="text-2xl font-bold">Answers Locked</h2>
            <p className="text-muted-foreground">Waiting for results...</p>
          </div>
        )}

        {/* RESULTS */}
        {state === 'RESULTS' && (
          <div className="space-y-6 animate-in">
            {lastResult && (
              <Card className={lastResult.correct ? 'border-green-500' : 'border-red-400'}>
                <CardContent className="pt-6 text-center">
                  {lastResult.correct ? (
                    <>
                      <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-3 animate-score-pop" />
                      <h3 className="text-2xl font-bold text-green-600">Correct!</h3>
                      <p className="text-lg">+{lastResult.points} points</p>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-16 w-16 text-red-400 mx-auto mb-3" />
                      <h3 className="text-2xl font-bold text-red-500">Incorrect</h3>
                    </>
                  )}
                </CardContent>
              </Card>
            )}
            <p className="text-center text-muted-foreground">Waiting for next question...</p>
          </div>
        )}

        {/* COMPLETED */}
        {state === 'COMPLETED' && (
          <div className="space-y-8 py-8 animate-in">
            <div className="text-center">
              <Trophy className="h-20 w-20 text-yellow-500 mx-auto mb-4 animate-score-pop" />
              <h2 className="text-3xl font-bold">Quiz Complete!</h2>
              <p className="text-xl text-muted-foreground mt-2">
                Thank you for participating!
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
    </FullscreenGuard>
  );
}

// ─── Sub-components ─────────────────────────────────────

function MultiSelectAnswer({
  options,
  submitted,
  onSubmit,
}: {
  options: any[];
  submitted: boolean;
  onSubmit: (data: any) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);

  return (
    <div className="space-y-3">
      {options.map((opt: any, i: number) => (
        <Button
          key={opt.id}
          variant={selected.includes(opt.id) ? 'default' : 'outline'}
          className={`w-full justify-start text-left h-auto py-4 px-4 ${
            selected.includes(opt.id) ? 'ring-2 ring-primary' : ''
          }`}
          onClick={() => {
            if (!submitted) {
              setSelected((prev) =>
                prev.includes(opt.id) ? prev.filter((id) => id !== opt.id) : [...prev, opt.id]
              );
            }
          }}
          disabled={submitted}
        >
          <input
            type="checkbox"
            checked={selected.includes(opt.id)}
            readOnly
            className="mr-3 rounded"
          />
          {opt.text}
        </Button>
      ))}
      {!submitted && selected.length > 0 && (
        <Button variant="arena" className="w-full" onClick={() => onSubmit(selected.join(','))}>
          <Send className="mr-2 h-4 w-4" /> Submit Answer
        </Button>
      )}
    </div>
  );
}

function TextInputAnswer({
  type,
  submitted,
  onSubmit,
  placeholder,
  multiline = false,
}: {
  type: string;
  submitted: boolean;
  onSubmit: (data: any) => void;
  placeholder: string;
  multiline?: boolean;
}) {
  const [value, setValue] = useState('');

  return (
    <div className="space-y-3">
      {multiline ? (
        <textarea
          className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
          placeholder={placeholder}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={submitted}
        />
      ) : (
        <Input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={submitted}
          className="text-lg h-14"
        />
      )}
      {!submitted && value && (
        <Button variant="arena" className="w-full" onClick={() => onSubmit(value)}>
          <Send className="mr-2 h-4 w-4" /> Submit Answer
        </Button>
      )}
    </div>
  );
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
