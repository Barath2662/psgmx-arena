'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
  Home,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function PlaySessionPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const [session, setSession] = useState<any>(null);
  const [state, setState] = useState('WAITING');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [globalTimer, setGlobalTimer] = useState(0);
  const [answers, setAnswers] = useState<Record<number, any>>({});
  const [savedAnswers, setSavedAnswers] = useState<Record<number, boolean>>({});
  const [participantId, setParticipantId] = useState('');
  const [score, setScore] = useState(0);
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [playerName, setPlayerName] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [results, setResults] = useState<{ totalScore: number; correctCount: number; totalQuestions: number } | null>(null);

  const startTimeRef = useRef<number>(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoSubmitRef = useRef(false);
  const sessionRef = useRef<any>(null);
  const answersRef = useRef<Record<number, any>>({});
  const savedAnswersRef = useRef<Record<number, boolean>>({});
  const participantIdRef = useRef('');

  // Keep refs in sync
  useEffect(() => { sessionRef.current = session; }, [session]);
  useEffect(() => { answersRef.current = answers; }, [answers]);
  useEffect(() => { savedAnswersRef.current = savedAnswers; }, [savedAnswers]);
  useEffect(() => { participantIdRef.current = participantId; }, [participantId]);

  // Initialize participantId from sessionStorage on mount
  useEffect(() => {
    const storedPid = sessionStorage.getItem('participantId');
    if (storedPid) {
      setParticipantId(storedPid);
    }
  }, []);

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

  // Submit function that uses refs instead of state (for timer callback)
  const doAutoSubmit = useCallback(async () => {
    if (autoSubmitRef.current) return;
    autoSubmitRef.current = true;

    const sess = sessionRef.current;
    const pid = participantIdRef.current;
    const ans = answersRef.current;
    const saved = savedAnswersRef.current;
    const questions = sess?.quiz?.questions || [];

    try {
      // Save any unsaved answers
      for (let i = 0; i < questions.length; i++) {
        if (ans[i] !== undefined && !saved[i]) {
          await fetch(`/api/session/${sessionId}/answer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              participantId: pid,
              questionId: questions[i].id,
              answerData: ans[i],
              timeTakenMs: startTimeRef.current ? Date.now() - startTimeRef.current : 0,
            }),
          });
        }
      }

      // Fetch final results
      const res = await fetch(`/api/session/${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        const participant = (data.session.participants || []).find((p: any) => p.id === pid);
        if (participant) {
          setScore(participant.totalScore || 0);
          setTotalCorrect(participant.correctCount || 0);
          setResults({
            totalScore: participant.totalScore || 0,
            correctCount: participant.correctCount || 0,
            totalQuestions: questions.length,
          });
        }
      }
    } catch { /* silent */ }

    setQuizSubmitted(true);
    if (timerRef.current) clearInterval(timerRef.current);
    if (pollRef.current) clearInterval(pollRef.current);
    toast('Time is up! Quiz auto-submitted.', { icon: '⏰' });
  }, [sessionId]);

  // Fetch session data (for polling)
  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch(`/api/session/${sessionId}`);
      const data = await res.json();
      if (!res.ok) return;

      const s = data.session;
      setSession(s);
      setState(s.state);

      // If session just started, set up overall timer
      if (s.state === 'QUESTION_ACTIVE' && s.startedAt && !startTimeRef.current) {
        startTimeRef.current = new Date(s.startedAt).getTime();
        const totalSeconds = s.quiz?.timePerQuestion || 1800;
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        const remaining = Math.max(0, totalSeconds - elapsed);
        setGlobalTimer(remaining);

        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
          setGlobalTimer((prev) => {
            if (prev <= 1) {
              if (timerRef.current) clearInterval(timerRef.current);
              doAutoSubmit();
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }

      if (s.state === 'COMPLETED' && !quizSubmitted) {
        // Try to get the participant's results even if they didn't explicitly submit
        if (participantIdRef.current) {
          const participant = (s.participants || []).find(
            (p: any) => p.id === participantIdRef.current
          );
          if (participant && (participant.totalScore > 0 || participant.correctCount > 0)) {
            setScore(participant.totalScore || 0);
            setTotalCorrect(participant.correctCount || 0);
            setResults({
              totalScore: participant.totalScore || 0,
              correctCount: participant.correctCount || 0,
              totalQuestions: (s.quiz?.questions || []).length,
            });
          }
        }
        setQuizSubmitted(true);
        if (timerRef.current) clearInterval(timerRef.current);
      }
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, [sessionId, quizSubmitted, doAutoSubmit]);

  // Initial fetch + polling every 2s
  useEffect(() => {
    fetchSession();
    pollRef.current = setInterval(fetchSession, 2000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fetchSession]);

  // Save a single answer to the server (auto-save)
  const saveAnswer = useCallback(
    async (questionIndex: number, answerData: any) => {
      if (!participantId || !session) return;
      const question = session.quiz?.questions?.[questionIndex];
      if (!question) return;

      try {
        const res = await fetch(`/api/session/${sessionId}/answer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            participantId,
            questionId: question.id,
            answerData,
            timeTakenMs: startTimeRef.current ? Date.now() - startTimeRef.current : 0,
          }),
        });
        if (res.ok) {
          setSavedAnswers((prev) => ({ ...prev, [questionIndex]: true }));
        }
      } catch { /* silent */ }
    },
    [participantId, sessionId, session]
  );

  // Handle selecting an answer
  const selectAnswer = useCallback(
    (questionIndex: number, answerData: any) => {
      if (quizSubmitted) return;
      setAnswers((prev) => ({ ...prev, [questionIndex]: answerData }));
      saveAnswer(questionIndex, answerData);
    },
    [quizSubmitted, saveAnswer]
  );

  // Submit the entire quiz
  const handleSubmitQuiz = useCallback(async () => {
    if (submitting || quizSubmitted) return;
    setSubmitting(true);

    try {
      const questions = session?.quiz?.questions || [];
      for (let i = 0; i < questions.length; i++) {
        if (answers[i] !== undefined && !savedAnswers[i]) {
          await saveAnswer(i, answers[i]);
        }
      }

      const res = await fetch(`/api/session/${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        const participant = (data.session.participants || []).find(
          (p: any) => p.id === participantId
        );
        if (participant) {
          setScore(participant.totalScore || 0);
          setTotalCorrect(participant.correctCount || 0);
          setResults({
            totalScore: participant.totalScore || 0,
            correctCount: participant.correctCount || 0,
            totalQuestions: questions.length,
          });
        }
      }

      setQuizSubmitted(true);
      if (timerRef.current) clearInterval(timerRef.current);
      if (pollRef.current) clearInterval(pollRef.current);
      toast.success('Quiz submitted successfully!');
    } catch {
      toast.error('Error submitting quiz');
    } finally {
      setSubmitting(false);
    }
  }, [submitting, quizSubmitted, session, answers, savedAnswers, saveAnswer, sessionId, participantId]);

  // Format timer as MM:SS
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (loading || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-arena">
        <Loader2 className="h-12 w-12 animate-spin text-white" />
      </div>
    );
  }

  const questions = session.quiz?.questions || [];
  const currentQuestion = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const totalQuestions = questions.length;

  return (
    <FullscreenGuard active={state === 'QUESTION_ACTIVE' && !quizSubmitted}>
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="border-b bg-card sticky top-0 z-50">
        <div className="flex items-center justify-between h-12 px-4">
          <div className="flex items-center gap-3">
            <span className="font-medium text-sm truncate">{session.quiz?.title}</span>
          </div>
          <div className="flex items-center gap-4">
            {state === 'QUESTION_ACTIVE' && !quizSubmitted && globalTimer > 0 && (
              <div className={`flex items-center gap-1 text-lg font-mono font-bold ${globalTimer <= 60 ? 'text-destructive animate-pulse' : 'text-primary'}`}>
                <Clock className="h-4 w-4" /> {formatTime(globalTimer)}
              </div>
            )}
            <div className="text-right">
              <span className="text-xs text-muted-foreground">Answered</span>
              <p className="font-bold text-primary">{answeredCount}/{totalQuestions}</p>
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

        {/* QUESTION ACTIVE — Free Navigation */}
        {state === 'QUESTION_ACTIVE' && !quizSubmitted && (
          <div className="space-y-4 animate-in">
            {/* Question Navigator */}
            <div className="flex flex-wrap gap-2 justify-center">
              {questions.map((_: any, i: number) => (
                <button
                  key={i}
                  onClick={() => setCurrentIndex(i)}
                  className={`w-10 h-10 rounded-lg text-sm font-bold border-2 transition-all ${
                    currentIndex === i
                      ? 'border-primary bg-primary text-primary-foreground'
                      : answers[i] !== undefined
                      ? 'border-green-500 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                      : 'border-muted-foreground/30 hover:border-primary/50'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>

            <Progress value={(answeredCount / totalQuestions) * 100} className="h-1" />

            {currentQuestion && (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs">{currentQuestion.type}</Badge>
                      <Badge variant="outline">{currentQuestion.points} pts</Badge>
                    </div>
                    <CardTitle className="text-lg mt-2">
                      Q{currentIndex + 1}. {currentQuestion.title}
                    </CardTitle>
                    {currentQuestion.description && (
                      <p className="text-sm text-muted-foreground">{currentQuestion.description}</p>
                    )}
                  </CardHeader>
                </Card>

                {['MCQ', 'TRUE_FALSE'].includes(currentQuestion.type) && (
                  <div className="space-y-3">
                    {currentQuestion.optionsData?.options?.map((opt: any, i: number) => (
                      <Button
                        key={opt.id}
                        variant={answers[currentIndex] === opt.id ? 'default' : 'outline'}
                        className={`w-full justify-start text-left h-auto py-4 px-4 ${answers[currentIndex] === opt.id ? 'ring-2 ring-primary' : ''}`}
                        onClick={() => selectAnswer(currentIndex, opt.id)}
                      >
                        <span className="font-mono text-muted-foreground mr-3">{String.fromCharCode(65 + i)}</span>
                        {opt.text}
                      </Button>
                    ))}
                  </div>
                )}

                {currentQuestion.type === 'MULTI_SELECT' && (
                  <MultiSelectAnswer
                    options={currentQuestion.optionsData?.options || []}
                    value={answers[currentIndex] || ''}
                    onSelect={(val) => selectAnswer(currentIndex, val)}
                  />
                )}

                {['FILL_BLANK', 'SHORT_ANSWER', 'NUMERIC'].includes(currentQuestion.type) && (
                  <TextInputAnswer
                    type={currentQuestion.type === 'NUMERIC' ? 'number' : 'text'}
                    value={answers[currentIndex] || ''}
                    onSave={(val) => selectAnswer(currentIndex, val)}
                    placeholder={currentQuestion.type === 'NUMERIC' ? 'Enter a number...' : 'Type your answer...'}
                  />
                )}

                {currentQuestion.type === 'LONG_ANSWER' && (
                  <TextInputAnswer
                    type="text"
                    value={answers[currentIndex] || ''}
                    onSave={(val) => selectAnswer(currentIndex, val)}
                    placeholder="Type your answer..."
                    multiline
                  />
                )}

                {currentQuestion.type === 'CODE' && (
                  <CodeSandbox
                    language={currentQuestion.optionsData?.language || 'python'}
                    starterCode={currentQuestion.optionsData?.starterCode || ''}
                    testCases={currentQuestion.optionsData?.testCases || []}
                    readOnly={false}
                    onSubmit={(code, language) => selectAnswer(currentIndex, { code, language })}
                  />
                )}

                {savedAnswers[currentIndex] && (
                  <div className="flex items-center gap-1 text-sm text-green-600">
                    <CheckCircle className="h-4 w-4" /> Answer saved
                  </div>
                )}

                <div className="flex justify-between pt-2">
                  <Button variant="outline" onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))} disabled={currentIndex === 0}>
                    <ChevronLeft className="mr-1 h-4 w-4" /> Previous
                  </Button>
                  {currentIndex < totalQuestions - 1 ? (
                    <Button variant="outline" onClick={() => setCurrentIndex(currentIndex + 1)}>
                      Next <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  ) : (
                    <Button variant="arena" onClick={handleSubmitQuiz} disabled={submitting}>
                      {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                      Submit Quiz
                    </Button>
                  )}
                </div>

                {currentIndex < totalQuestions - 1 && (
                  <div className="text-center pt-2">
                    <Button variant="arena" size="lg" className="w-full" onClick={handleSubmitQuiz} disabled={submitting}>
                      {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                      Submit Quiz ({answeredCount}/{totalQuestions} answered)
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* QUIZ SUBMITTED or COMPLETED */}
        {(quizSubmitted || state === 'COMPLETED') && (
          <div className="space-y-8 py-8 animate-in">
            <div className="text-center">
              <Trophy className="h-20 w-20 text-yellow-500 mx-auto mb-4 animate-score-pop" />
              <h2 className="text-3xl font-bold">Quiz Complete!</h2>
              {(!results && Object.keys(answers).length === 0) ? (
                <p className="text-xl text-muted-foreground mt-2">This quiz has already ended. You did not submit any answers.</p>
              ) : (
                <p className="text-xl text-muted-foreground mt-2">Thank you for participating!</p>
              )}
            </div>

            {results && (
              <Card className="border-primary/50">
                <CardContent className="pt-6">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-3xl font-bold text-primary">{results.totalScore}</p>
                      <p className="text-sm text-muted-foreground">Total Score</p>
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-green-600">{results.correctCount}</p>
                      <p className="text-sm text-muted-foreground">Correct</p>
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-red-400">{results.totalQuestions - results.correctCount}</p>
                      <p className="text-sm text-muted-foreground">Wrong</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <Progress value={(results.correctCount / results.totalQuestions) * 100} className="h-3" />
                    <p className="text-center text-sm text-muted-foreground mt-2">
                      {Math.round((results.correctCount / results.totalQuestions) * 100)}% Accuracy
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex flex-col items-center gap-3">
              <Link href="/dashboard">
                <Button variant="arena" size="lg">
                  <Home className="mr-2 h-5 w-5" /> Go to Dashboard
                </Button>
              </Link>
              <Link href="/dashboard/leaderboard">
                <Button variant="outline" size="lg">
                  <Trophy className="mr-2 h-5 w-5" /> View Leaderboard
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
    </FullscreenGuard>
  );
}

// ─── Sub-components ─────────────────────────────────────

function MultiSelectAnswer({ options, value, onSelect }: { options: any[]; value: string; onSelect: (data: string) => void }) {
  const selectedIds = new Set(value ? value.split(',') : []);
  const toggle = (optId: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(optId)) newSet.delete(optId); else newSet.add(optId);
    onSelect(Array.from(newSet).join(','));
  };

  return (
    <div className="space-y-3">
      {options.map((opt: any) => (
        <Button
          key={opt.id}
          variant={selectedIds.has(opt.id) ? 'default' : 'outline'}
          className={`w-full justify-start text-left h-auto py-4 px-4 ${selectedIds.has(opt.id) ? 'ring-2 ring-primary' : ''}`}
          onClick={() => toggle(opt.id)}
        >
          <input type="checkbox" checked={selectedIds.has(opt.id)} readOnly className="mr-3 rounded" />
          {opt.text}
        </Button>
      ))}
    </div>
  );
}

function TextInputAnswer({ type, value, onSave, placeholder, multiline = false }: { type: string; value: string; onSave: (data: string) => void; placeholder: string; multiline?: boolean }) {
  const [localValue, setLocalValue] = useState(value || '');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setLocalValue(value || ''); }, [value]);

  const handleChange = (newVal: string) => {
    setLocalValue(newVal);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (newVal.trim()) onSave(newVal);
    }, 800);
  };

  return (
    <div className="space-y-3">
      {multiline ? (
        <textarea
          className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
          placeholder={placeholder}
          value={localValue}
          onChange={(e) => handleChange(e.target.value)}
        />
      ) : (
        <Input type={type} placeholder={placeholder} value={localValue} onChange={(e) => handleChange(e.target.value)} className="text-lg h-14" />
      )}
      {localValue && localValue !== value && (
        <Button variant="arena" size="sm" onClick={() => onSave(localValue)}>
          <Send className="mr-1 h-3 w-3" /> Save Answer
        </Button>
      )}
    </div>
  );
}
