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
  const [showAddQuestion, setShowAddQuestion] = useState(false);

  // Question form
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
  }, [quizId]);

  async function fetchQuiz() {
    try {
      const res = await fetch(`/api/quiz/${quizId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setQuiz(data.quiz);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load quiz');
    } finally {
      setLoading(false);
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
    // Note: would need a DELETE endpoint for individual questions
    setQuiz((prev: any) => ({
      ...prev,
      questions: prev.questions.filter((q: any) => q.id !== questionId),
    }));
    toast.success('Question removed');
  }

  async function publishQuiz() {
    try {
      await fetch(`/api/quiz/${quizId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PUBLISHED' }),
      });
      setQuiz((prev: any) => ({ ...prev, status: 'PUBLISHED' }));
      toast.success('Quiz published!');
    } catch {
      toast.error('Failed to publish');
    }
  }

  async function startSession() {
    try {
      const res = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quizId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push(`/session/${data.session.id}/host`);
    } catch (error: any) {
      toast.error(error.message);
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
            <Button variant="arena" onClick={startSession}>
              <Play className="mr-2 h-4 w-4" /> Go Live
            </Button>
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
                          {['python', 'javascript', 'java', 'c', 'cpp', 'go', 'rust'].map((l) => (
                            <SelectItem key={l} value={l}>
                              {l}
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
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Quiz Settings</CardTitle>
              <CardDescription>Modify quiz behavior and rules</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Mode</Label>
                  <p className="text-sm font-medium">{quiz.mode}</p>
                </div>
                <div className="space-y-2">
                  <Label>Time per Question</Label>
                  <p className="text-sm font-medium">{quiz.timePerQuestion}s</p>
                </div>
                <div className="space-y-2">
                  <Label>Max Attempts</Label>
                  <p className="text-sm font-medium">{quiz.maxAttempts}</p>
                </div>
                <div className="space-y-2">
                  <Label>Passing Score</Label>
                  <p className="text-sm font-medium">{quiz.passingScore}%</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {quiz.shuffleQuestions && <Badge>Shuffle Questions</Badge>}
                {quiz.shuffleOptions && <Badge>Shuffle Options</Badge>}
                {quiz.showResults && <Badge>Show Results</Badge>}
                {quiz.enableCodeQuestions && <Badge>Code Questions</Badge>}
                {quiz.enableLeaderboard && <Badge>Leaderboard</Badge>}
                {quiz.enablePowerUps && <Badge>Power-ups</Badge>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
