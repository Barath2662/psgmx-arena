'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  Plus,
  Trash2,
  GripVertical,
  Play,
  Save,
  Loader2,
  Code2,
  CheckCircle,
  Circle,
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

const QUESTION_TYPES = [
  { value: 'MCQ', label: 'Multiple Choice', icon: '🔘' },
  { value: 'MULTI_SELECT', label: 'Multi Select', icon: '☑️' },
  { value: 'TRUE_FALSE', label: 'True / False', icon: '✅' },
  { value: 'FILL_BLANK', label: 'Fill in the Blank', icon: '📝' },
  { value: 'SHORT_ANSWER', label: 'Short Answer', icon: '✏️' },
  { value: 'NUMERIC', label: 'Numeric', icon: '🔢' },
  { value: 'CODE', label: 'Code', icon: '💻' },
  { value: 'ORDERING', label: 'Ordering', icon: '🔀' },
  { value: 'MATCH_FOLLOWING', label: 'Match the Following', icon: '🔗' },
  { value: 'DRAG_DROP', label: 'Drag & Drop', icon: '🎯' },
  { value: 'CASE_BASED', label: 'Case Based', icon: '📋' },
  { value: 'RAPID_FIRE', label: 'Rapid Fire', icon: '⚡' },
  { value: 'LONG_ANSWER', label: 'Long Answer', icon: '📄' },
  { value: 'HOTSPOT', label: 'Hotspot', icon: '📍' },
  { value: 'MATRIX', label: 'Matrix', icon: '🗄️' },
  { value: 'SLIDER', label: 'Slider', icon: '🎚️' },
  { value: 'FILE_UPLOAD', label: 'File Upload', icon: '📎' },
  { value: 'DRAWING', label: 'Drawing', icon: '🎨' },
];

export default function QuizEditPage() {
  const params = useParams();
  const router = useRouter();
  const quizId = params.quizId as string;

  const [quiz, setQuiz] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    title: '',
    description: '',
    mode: 'LIVE',
    timeLimitMinutes: 30,
    maxAttempts: 1,
    shuffleQuestions: false,
    shuffleOptions: false,
    showResults: true,
    enableCodeQuestions: false,
    enableLeaderboard: true,
    enablePowerUps: false,
    passingScore: 50,
    scheduledStartTime: '',
    scheduledEndTime: '',
    syllabus: '',
  });

  const [quizSession, setQuizSession] = useState<any>(null);
  const [loadingSession, setLoadingSession] = useState(false);
  const [newQuestion, setNewQuestion] = useState<{
    type: string;
    title: string;
    description: string;
    points: number;
    timeLimit: number | undefined;
    explanation: string;
    allowPartial: boolean;
    optionsData: {
      options: { id: string; text: string; isCorrect: boolean }[];
      tolerance?: number;
      language?: string;
      starterCode?: string;
      [key: string]: any;
    };
    correctAnswer: string;
  }>({
    type: 'MCQ',
    title: '',
    description: '',
    points: 10,
    timeLimit: undefined,
    explanation: '',
    allowPartial: false,
    optionsData: { options: [{ id: 'a', text: '', isCorrect: false }, { id: 'b', text: '', isCorrect: false }] },
    correctAnswer: '',
  });

  useEffect(() => {
    fetchQuiz();
    fetchQuizSession();
  }, [quizId]);

  async function fetchQuizSession() {
    try {
      const res = await fetch(`/api/session?quizId=${quizId}`);
      const data = await res.json();
      const sessions: any[] = data.sessions || [];
      // Prefer non-COMPLETED session; fall back to most recent
      const active = sessions.find((s) => s.state !== 'COMPLETED') || sessions[0] || null;
      setQuizSession(active);
    } catch { /* silent */ }
  }

  async function fetchQuiz() {
    try {
      const res = await fetch(`/api/quiz/${quizId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setQuiz(data.quiz);
      setSettingsForm({
        title: data.quiz.title || '',
        description: data.quiz.description || '',
        mode: data.quiz.mode || 'LIVE',
        timeLimitMinutes: Math.round((data.quiz.timePerQuestion || 1800) / 60),
        maxAttempts: data.quiz.maxAttempts || 1,
        shuffleQuestions: data.quiz.shuffleQuestions || false,
        shuffleOptions: data.quiz.shuffleOptions || false,
        showResults: data.quiz.showResults ?? true,
        enableCodeQuestions: data.quiz.enableCodeQuestions || false,
        enableLeaderboard: data.quiz.enableLeaderboard ?? true,
        enablePowerUps: data.quiz.enablePowerUps || false,
        passingScore: data.quiz.passingScore ?? 50,
        scheduledStartTime: data.quiz.scheduledStartTime || '',
        scheduledEndTime: data.quiz.scheduledEndTime || '',
        syllabus: data.quiz.syllabus || '',
      });
    } catch (error: any) {
      toast.error(error.message || 'Failed to load quiz');
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings() {
    setSavingSettings(true);
    try {
      const res = await fetch(`/api/quiz/${quizId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: settingsForm.title,
          description: settingsForm.description || undefined,
          mode: settingsForm.mode,
          timePerQuestion: settingsForm.timeLimitMinutes * 60,
          maxAttempts: settingsForm.maxAttempts,
          shuffleQuestions: settingsForm.shuffleQuestions,
          shuffleOptions: settingsForm.shuffleOptions,
          showResults: settingsForm.showResults,
          enableCodeQuestions: settingsForm.enableCodeQuestions,
          enableLeaderboard: settingsForm.enableLeaderboard,
          enablePowerUps: settingsForm.enablePowerUps,
          passingScore: settingsForm.passingScore,
          scheduledStartTime: settingsForm.scheduledStartTime || undefined,
          scheduledEndTime: settingsForm.scheduledEndTime || undefined,
          syllabus: settingsForm.syllabus || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save settings');
      setQuiz((prev: any) => ({ ...prev, ...data.quiz }));
      toast.success('Settings saved!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save settings');
    } finally {
      setSavingSettings(false);
    }
  }

  async function addQuestion() {
    setSaving(true);
    try {
      const payload: any = { ...newQuestion };

      // For MCQ/Multi-Select/True-False, compute correctAnswer from options
      if (['MCQ', 'MULTI_SELECT', 'TRUE_FALSE'].includes(payload.type)) {
        const correct = payload.optionsData.options
          .filter((o: any) => o.isCorrect)
          .map((o: any) => o.id);
        payload.correctAnswer = correct.join(',');
      }

      const res = await fetch(`/api/quiz/${quizId}/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setQuiz((prev: any) => ({
        ...prev,
        questions: [...(prev.questions || []), data.question],
      }));

      // Reset form
      setNewQuestion({
        type: 'MCQ',
        title: '',
        description: '',
        points: 10,
        timeLimit: undefined,
        explanation: '',
        allowPartial: false,
        optionsData: { options: [{ id: 'a', text: '', isCorrect: false }, { id: 'b', text: '', isCorrect: false }] },
        correctAnswer: '',
      });

      setShowAddQuestion(false);
      toast.success('Question added!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to add question');
    } finally {
      setSaving(false);
    }
  }

  async function deleteQuestion(questionId: string) {
    if (!confirm('Delete this question?')) return;
    try {
      const res = await fetch(`/api/quiz/${quizId}/questions?questionId=${questionId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete');
      }
      setQuiz((prev: any) => ({
        ...prev,
        questions: prev.questions.filter((q: any) => q.id !== questionId),
      }));
      toast.success('Question deleted');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete question');
    }
  }

  async function publishQuiz() {
    try {
      const res = await fetch(`/api/quiz/${quizId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PUBLISHED' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to publish');
      setQuiz((prev: any) => ({ ...prev, status: 'PUBLISHED' }));
      toast.success('Quiz published! Session auto-created.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to publish');
    }
  }

  async function startQuizNow() {
    try {
      const sRes = await fetch(`/api/session?quizId=${quizId}`);
      const sData = await sRes.json();
      const sessions: any[] = sData.sessions || [];

      // Already live — go to host page
      const liveSession = sessions.find((s: any) => s.state === 'QUESTION_ACTIVE');
      if (liveSession) {
        router.push(`/session/${liveSession.id}/host`);
        return;
      }

      let waitingSession = sessions.find((s: any) => s.state === 'WAITING');

      // No active session at all — create one first
      if (!waitingSession) {
        const createRes = await fetch('/api/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quizId, allowLateJoin: true, guestMode: false }),
        });
        const createData = await createRes.json();
        if (!createRes.ok) {
          toast.error(createData.error || 'Failed to create session');
          return;
        }
        waitingSession = createData.session;
        toast.success('New session created.');
      }

      const res = await fetch(`/api/session/${waitingSession.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Quiz started! Redirecting to host controls...');
      router.push(`/session/${waitingSession.id}/host`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to start');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!quiz) {
    return <p className="text-center text-muted-foreground py-20">Quiz not found</p>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/quizzes">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{quiz.title}</h1>
              <Badge variant={quiz.status === 'PUBLISHED' ? 'success' : 'outline'}>
                {quiz.status}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {quiz.questions?.length || 0} questions &middot; {quiz.mode}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {quiz.status === 'DRAFT' && (
            <Button onClick={publishQuiz} disabled={!quiz.questions?.length}>
              Publish
            </Button>
          )}
          {quiz.status === 'PUBLISHED' && (
            <>
              {quizSession && (
                <Badge
                  variant={
                    quizSession.state === 'QUESTION_ACTIVE' ? 'success'
                    : quizSession.state === 'WAITING' ? 'warning'
                    : 'secondary'
                  }
                  className="text-sm px-3 py-1"
                >
                  {quizSession.state === 'QUESTION_ACTIVE' ? 'Live'
                    : quizSession.state === 'WAITING' ? 'Scheduled'
                    : 'Completed'}
                </Badge>
              )}
              <Button variant="arena" onClick={startQuizNow}>
                <Play className="mr-2 h-4 w-4" />
                {quizSession?.state === 'QUESTION_ACTIVE' ? 'Go to Host' : 'Start Now'}
              </Button>
            </>
          )}
        </div>
      </div>

      <Tabs defaultValue="questions">
        <TabsList>
          <TabsTrigger value="questions">Questions</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Questions Tab */}
        <TabsContent value="questions" className="space-y-4">
          {quiz.questions?.map((q: any, i: number) => (
            <Card key={q.id}>
              <CardContent className="pt-4">
                <div className="flex items-start gap-4">
                  <div className="flex items-center gap-2 text-muted-foreground pt-1">
                    <GripVertical className="h-4 w-4 cursor-grab" />
                    <span className="text-sm font-mono w-6">{i + 1}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">
                        {QUESTION_TYPES.find((t) => t.value === q.type)?.icon}{' '}
                        {QUESTION_TYPES.find((t) => t.value === q.type)?.label}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {q.points} pts
                      </Badge>
                    </div>
                    <p className="font-medium">{q.title}</p>
                    {q.description && (
                      <p className="text-sm text-muted-foreground mt-1">{q.description}</p>
                    )}
                    {q.optionsData?.options && (
                      <div className="mt-2 space-y-1">
                        {q.optionsData.options.map((opt: any) => (
                          <div
                            key={opt.id}
                            className={`text-sm flex items-center gap-2 ${
                              opt.isCorrect ? 'text-green-600 font-medium' : 'text-muted-foreground'
                            }`}
                          >
                            {opt.isCorrect ? (
                              <CheckCircle className="h-3 w-3" />
                            ) : (
                              <Circle className="h-3 w-3" />
                            )}
                            {opt.text}
                          </div>
                        ))}
                      </div>
                    )}
                    {q.type === 'CODE' && q.optionsData && (
                      <div className="mt-2 space-y-1">
                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                          <Code2 className="h-3 w-3" />
                          Language: <Badge variant="outline" className="text-xs">{q.optionsData.language || 'python'}</Badge>
                          {q.optionsData.testCases?.length > 0 && (
                            <span className="ml-2">{q.optionsData.testCases.length} test case(s)</span>
                          )}
                        </div>
                        {q.optionsData.starterCode && (
                          <pre className="text-xs font-mono bg-muted p-2 rounded mt-1 max-h-20 overflow-hidden">
                            {q.optionsData.starterCode.slice(0, 150)}{q.optionsData.starterCode.length > 150 ? '...' : ''}
                          </pre>
                        )}
                      </div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteQuestion(q.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Add Question Button */}
          <Dialog open={showAddQuestion} onOpenChange={setShowAddQuestion}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full border-dashed h-16">
                <Plus className="mr-2 h-5 w-5" /> Add Question
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Question</DialogTitle>
                <DialogDescription>Choose a question type and fill in the details</DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Question Type</Label>
                  <Select
                    value={newQuestion.type}
                    onValueChange={(v) => {
                      const defaults: any = { optionsData: { options: [] }, correctAnswer: '' };
                      if (['MCQ', 'MULTI_SELECT'].includes(v)) {
                        defaults.optionsData = {
                          options: [
                            { id: 'a', text: '', isCorrect: false },
                            { id: 'b', text: '', isCorrect: false },
                          ],
                        };
                      } else if (v === 'TRUE_FALSE') {
                        defaults.optionsData = {
                          options: [
                            { id: 'true', text: 'True', isCorrect: false },
                            { id: 'false', text: 'False', isCorrect: false },
                          ],
                        };
                      } else if (v === 'CODE') {
                        defaults.optionsData = {
                          language: 'python',
                          starterCode: '',
                          testCases: [{ input: '', expectedOutput: '', description: '' }],
                        };
                      } else if (v === 'NUMERIC') {
                        defaults.optionsData = { answer: 0, tolerance: 0 };
                      } else if (v === 'FILL_BLANK') {
                        defaults.optionsData = {
                          blanks: [{ id: 'b1', answer: '', acceptedAnswers: [] }],
                        };
                      }
                      setNewQuestion({ ...newQuestion, type: v, ...defaults });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {QUESTION_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.icon} {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Question *</Label>
                  <textarea
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="Enter your question..."
                    value={newQuestion.title}
                    onChange={(e) => setNewQuestion({ ...newQuestion, title: e.target.value })}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Points</Label>
                    <Input
                      type="number"
                      min={1}
                      value={newQuestion.points}
                      onChange={(e) => setNewQuestion({ ...newQuestion, points: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Time Limit Override (seconds)</Label>
                    <Input
                      type="number"
                      min={5}
                      placeholder="Use quiz default"
                      value={newQuestion.timeLimit || ''}
                      onChange={(e) =>
                        setNewQuestion({
                          ...newQuestion,
                          timeLimit: e.target.value ? parseInt(e.target.value) : undefined,
                        })
                      }
                    />
                  </div>
                </div>

                {/* MCQ / Multi-Select / True-False Options */}
                {['MCQ', 'MULTI_SELECT', 'TRUE_FALSE'].includes(newQuestion.type) && (
                  <div className="space-y-3">
                    <Label>Options</Label>
                    {newQuestion.optionsData.options.map((opt: any, i: number) => (
                      <div key={opt.id} className="flex items-center gap-2">
                        <input
                          type={newQuestion.type === 'MULTI_SELECT' ? 'checkbox' : 'radio'}
                          name="correctOption"
                          checked={opt.isCorrect}
                          onChange={() => {
                            const options = [...newQuestion.optionsData.options];
                            if (newQuestion.type !== 'MULTI_SELECT') {
                              options.forEach((o: any) => (o.isCorrect = false));
                            }
                            options[i].isCorrect = !options[i].isCorrect;
                            setNewQuestion({
                              ...newQuestion,
                              optionsData: { options },
                            });
                          }}
                          className="rounded"
                        />
                        <Input
                          placeholder={`Option ${opt.id.toUpperCase()}`}
                          value={opt.text}
                          onChange={(e) => {
                            const options = [...newQuestion.optionsData.options];
                            options[i].text = e.target.value;
                            setNewQuestion({
                              ...newQuestion,
                              optionsData: { options },
                            });
                          }}
                          className="flex-1"
                        />
                        {newQuestion.type !== 'TRUE_FALSE' && i >= 2 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              const options = newQuestion.optionsData.options.filter(
                                (_: any, j: number) => j !== i
                              );
                              setNewQuestion({ ...newQuestion, optionsData: { options } });
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                    {newQuestion.type !== 'TRUE_FALSE' && newQuestion.optionsData.options.length < 6 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const nextId = String.fromCharCode(97 + newQuestion.optionsData.options.length);
                          setNewQuestion({
                            ...newQuestion,
                            optionsData: {
                              options: [
                                ...newQuestion.optionsData.options,
                                { id: nextId, text: '', isCorrect: false },
                              ],
                            },
                          });
                        }}
                      >
                        <Plus className="mr-1 h-3 w-3" /> Add Option
                      </Button>
                    )}
                  </div>
                )}

                {/* Fill in the Blank */}
                {newQuestion.type === 'FILL_BLANK' && (
                  <div className="space-y-2">
                    <Label>Correct Answer</Label>
                    <Input
                      placeholder="The correct answer"
                      value={newQuestion.correctAnswer}
                      onChange={(e) => setNewQuestion({ ...newQuestion, correctAnswer: e.target.value })}
                    />
                  </div>
                )}

                {/* Numeric */}
                {newQuestion.type === 'NUMERIC' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Correct Answer</Label>
                      <Input
                        type="number"
                        value={newQuestion.correctAnswer}
                        onChange={(e) => setNewQuestion({ ...newQuestion, correctAnswer: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Tolerance (±)</Label>
                      <Input
                        type="number"
                        min={0}
                        value={newQuestion.optionsData?.tolerance || 0}
                        onChange={(e) =>
                          setNewQuestion({
                            ...newQuestion,
                            optionsData: { ...newQuestion.optionsData, tolerance: parseFloat(e.target.value) },
                          })
                        }
                      />
                    </div>
                  </div>
                )}

                {/* Short/Long answer */}
                {['SHORT_ANSWER', 'LONG_ANSWER'].includes(newQuestion.type) && (
                  <div className="space-y-2">
                    <Label>Expected Answer (for grading)</Label>
                    <textarea
                      className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      placeholder="Expected answer..."
                      value={newQuestion.correctAnswer}
                      onChange={(e) => setNewQuestion({ ...newQuestion, correctAnswer: e.target.value })}
                    />
                  </div>
                )}

                {/* Code question */}
                {newQuestion.type === 'CODE' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Language</Label>
                      <Select
                        value={newQuestion.optionsData?.language || 'python'}
                        onValueChange={(v) =>
                          setNewQuestion({
                            ...newQuestion,
                            optionsData: { ...newQuestion.optionsData, language: v },
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[
                            { value: 'python', label: 'Python' },
                            { value: 'javascript', label: 'JavaScript' },
                            { value: 'typescript', label: 'TypeScript' },
                            { value: 'java', label: 'Java' },
                            { value: 'c', label: 'C' },
                            { value: 'c++', label: 'C++' },
                          ].map((l) => (
                            <SelectItem key={l.value} value={l.value}>
                              {l.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Starter Code</Label>
                      <textarea
                        className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                        placeholder="# Write starter code..."
                        value={newQuestion.optionsData?.starterCode || ''}
                        onChange={(e) =>
                          setNewQuestion({
                            ...newQuestion,
                            optionsData: { ...newQuestion.optionsData, starterCode: e.target.value },
                          })
                        }
                      />
                    </div>
                    {/* Test Cases */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Test Cases</Label>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const testCases = [...(newQuestion.optionsData?.testCases || [])];
                            testCases.push({ input: '', expectedOutput: '', description: '' });
                            setNewQuestion({
                              ...newQuestion,
                              optionsData: { ...newQuestion.optionsData, testCases },
                            });
                          }}
                        >
                          <Plus className="mr-1 h-3 w-3" /> Add Test Case
                        </Button>
                      </div>
                      {(newQuestion.optionsData?.testCases || []).map((tc: any, i: number) => (
                        <div key={i} className="border rounded-lg p-3 space-y-2 bg-muted/30">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Test Case {i + 1}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-destructive"
                              onClick={() => {
                                const testCases = (newQuestion.optionsData?.testCases || []).filter((_: any, j: number) => j !== i);
                                setNewQuestion({
                                  ...newQuestion,
                                  optionsData: { ...newQuestion.optionsData, testCases },
                                });
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Description (optional)</Label>
                            <Input
                              placeholder="e.g. Basic test case"
                              value={tc.description || ''}
                              onChange={(e) => {
                                const testCases = [...(newQuestion.optionsData?.testCases || [])];
                                testCases[i] = { ...testCases[i], description: e.target.value };
                                setNewQuestion({
                                  ...newQuestion,
                                  optionsData: { ...newQuestion.optionsData, testCases },
                                });
                              }}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs">Input (stdin)</Label>
                              <textarea
                                className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-2 py-1 text-xs font-mono"
                                placeholder="stdin input..."
                                value={tc.input || ''}
                                onChange={(e) => {
                                  const testCases = [...(newQuestion.optionsData?.testCases || [])];
                                  testCases[i] = { ...testCases[i], input: e.target.value };
                                  setNewQuestion({
                                    ...newQuestion,
                                    optionsData: { ...newQuestion.optionsData, testCases },
                                  });
                                }}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Expected Output</Label>
                              <textarea
                                className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-2 py-1 text-xs font-mono"
                                placeholder="Expected stdout..."
                                value={tc.expectedOutput || ''}
                                onChange={(e) => {
                                  const testCases = [...(newQuestion.optionsData?.testCases || [])];
                                  testCases[i] = { ...testCases[i], expectedOutput: e.target.value };
                                  setNewQuestion({
                                    ...newQuestion,
                                    optionsData: { ...newQuestion.optionsData, testCases },
                                  });
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                      {(!newQuestion.optionsData?.testCases || newQuestion.optionsData.testCases.length === 0) && (
                        <p className="text-xs text-muted-foreground text-center py-2">
                          No test cases added. Add at least one to auto-grade code submissions.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Explanation (shown after answering)</Label>
                  <textarea
                    className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="Explain the correct answer..."
                    value={newQuestion.explanation}
                    onChange={(e) => setNewQuestion({ ...newQuestion, explanation: e.target.value })}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddQuestion(false)}>
                  Cancel
                </Button>
                <Button
                  variant="arena"
                  onClick={addQuestion}
                  disabled={saving || !newQuestion.title}
                >
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                  Add Question
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="s-title">Quiz Title *</Label>
                <Input
                  id="s-title"
                  value={settingsForm.title}
                  onChange={(e) => setSettingsForm({ ...settingsForm, title: e.target.value })}
                  minLength={3}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="s-description">Description</Label>
                <textarea
                  id="s-description"
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  placeholder="Brief description..."
                  value={settingsForm.description}
                  onChange={(e) => setSettingsForm({ ...settingsForm, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Mode</Label>
                <Select value={settingsForm.mode} onValueChange={(v) => setSettingsForm({ ...settingsForm, mode: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LIVE">Live (Instructor-controlled)</SelectItem>
                    <SelectItem value="SELF_PACED">Self-Paced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Schedule &amp; Settings</CardTitle>
              <CardDescription>Update timing, attempts, schedule, and feature toggles.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Total Time Limit (minutes)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={120}
                    value={settingsForm.timeLimitMinutes}
                    onChange={(e) => setSettingsForm({ ...settingsForm, timeLimitMinutes: parseInt(e.target.value) || 30 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max Attempts</Label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={settingsForm.maxAttempts}
                    onChange={(e) => setSettingsForm({ ...settingsForm, maxAttempts: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Scheduled Start Time</Label>
                  <Input
                    type="datetime-local"
                    value={settingsForm.scheduledStartTime ? new Date(new Date(settingsForm.scheduledStartTime).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, scheduledStartTime: e.target.value ? new Date(e.target.value).toISOString() : '' })}
                  />
                  <p className="text-xs text-muted-foreground">Quiz auto-starts at this time</p>
                </div>
                <div className="space-y-2">
                  <Label>Scheduled End Time</Label>
                  <Input
                    type="datetime-local"
                    value={settingsForm.scheduledEndTime ? new Date(new Date(settingsForm.scheduledEndTime).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, scheduledEndTime: e.target.value ? new Date(e.target.value).toISOString() : '' })}
                  />
                  <p className="text-xs text-muted-foreground">Optional end time</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="s-syllabus">Syllabus / Topics Covered</Label>
                <textarea
                  id="s-syllabus"
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  placeholder="e.g., Unit 1: Arrays &amp; Strings"
                  value={settingsForm.syllabus}
                  onChange={(e) => setSettingsForm({ ...settingsForm, syllabus: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">Students can view this once the test is scheduled.</p>
              </div>

              <div className="space-y-2">
                <Label>Passing Score (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={settingsForm.passingScore}
                  onChange={(e) => setSettingsForm({ ...settingsForm, passingScore: parseInt(e.target.value) })}
                />
              </div>

              <div className="space-y-3">
                {[
                  { key: 'shuffleQuestions', label: 'Shuffle Questions' },
                  { key: 'shuffleOptions', label: 'Shuffle Options' },
                  { key: 'showResults', label: 'Show Results to Students' },
                  { key: 'enableCodeQuestions', label: 'Enable Code Questions' },
                  { key: 'enableLeaderboard', label: 'Enable Leaderboard' },
                  { key: 'enablePowerUps', label: 'Enable Power-ups' },
                ].map((setting) => (
                  <label key={setting.key} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(settingsForm as any)[setting.key]}
                      onChange={(e) => setSettingsForm({ ...settingsForm, [setting.key]: e.target.checked })}
                      className="rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <span className="text-sm">{setting.label}</span>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button variant="arena" onClick={saveSettings} disabled={savingSettings || !settingsForm.title}>
              {savingSettings ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Settings
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
