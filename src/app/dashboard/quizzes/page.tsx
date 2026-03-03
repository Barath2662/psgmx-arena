'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Plus, Search, BookOpen, Play, Trash2, Edit, Clock, Square, BarChart3, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

export default function QuizzesPage() {
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [qRes, sRes] = await Promise.all([
        fetch('/api/quiz'),
        fetch('/api/session'),
      ]);
      const qData = await qRes.json();
      const sData = await sRes.json();
      setQuizzes(qData.quizzes || []);
      setSessions(sData.sessions || []);
    } catch (error) {
      toast.error('Failed to load quizzes');
    } finally {
      setLoading(false);
    }
  }

  // Find the active (non-completed) session for a quiz
  function getSessionForQuiz(quizId: string) {
    return sessions.find((s: any) => s.quizId === quizId && s.state !== 'COMPLETED');
  }

  function getCompletedSession(quizId: string) {
    return sessions.find((s: any) => s.quizId === quizId && s.state === 'COMPLETED');
  }

  async function deleteQuiz(id: string) {
    if (!confirm('Are you sure you want to delete this quiz and all its sessions?')) return;
    try {
      const res = await fetch(`/api/quiz/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || 'Failed to delete quiz');
        return;
      }
      setQuizzes((prev) => prev.filter((q) => q.id !== id));
      toast.success('Quiz deleted');
    } catch {
      toast.error('Failed to delete quiz');
    }
  }

  async function publishQuiz(id: string) {
    try {
      const res = await fetch(`/api/quiz/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PUBLISHED' }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || 'Failed to publish');
        return;
      }
      toast.success('Quiz published! Session auto-created.');
      fetchData();
    } catch {
      toast.error('Failed to publish quiz');
    }
  }

  async function startQuizNow(sessionId: string) {
    try {
      const res = await fetch(`/api/session/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to start');
        return;
      }
      toast.success('Quiz started!');
      fetchData();
    } catch {
      toast.error('Failed to start quiz');
    }
  }

  async function endQuizNow(sessionId: string) {
    if (!confirm('End this quiz? All student answers will be saved.')) return;
    try {
      const res = await fetch(`/api/session/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'end' }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to end');
        return;
      }
      toast.success('Quiz ended!');
      fetchData();
    } catch {
      toast.error('Failed to end quiz');
    }
  }

  const filtered = quizzes.filter(
    (q) =>
      q.title.toLowerCase().includes(search.toLowerCase()) ||
      q.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Quizzes</h1>
          <p className="text-muted-foreground">Create and manage your quizzes</p>
        </div>
        <Link href="/dashboard/quizzes/new">
          <Button variant="arena">
            <Plus className="mr-2 h-4 w-4" /> New Quiz
          </Button>
        </Link>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search quizzes..."
          className="pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-6 h-48" />
            </Card>
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((quiz) => (
            <Card key={quiz.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg line-clamp-2">{quiz.title}</CardTitle>
                  <Badge
                    variant={
                      quiz.status === 'PUBLISHED'
                        ? 'success'
                        : quiz.status === 'ARCHIVED'
                        ? 'secondary'
                        : 'outline'
                    }
                  >
                    {quiz.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {quiz.description || 'No description'}
                </p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4 flex-wrap">
                  <span className="flex items-center gap-1">
                    <BookOpen className="h-3 w-3" /> {quiz.questions?.length ?? 0} questions
                  </span>
                  {quiz.scheduledStartTime && (
                    <span className="flex items-center gap-1 text-blue-500">
                      <Calendar className="h-3 w-3" /> {new Date(quiz.scheduledStartTime).toLocaleString()}
                    </span>
                  )}
                  {(() => {
                    const session = getSessionForQuiz(quiz.id);
                    if (session?.state === 'QUESTION_ACTIVE') {
                      return <Badge variant="success" className="text-xs">Live</Badge>;
                    }
                    if (session?.state === 'WAITING') {
                      return <Badge variant="warning" className="text-xs">Waiting</Badge>;
                    }
                    return null;
                  })()}
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Link href={`/dashboard/quizzes/${quiz.id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full">
                      <Edit className="mr-1 h-3 w-3" /> Edit
                    </Button>
                  </Link>
                  {quiz.status === 'DRAFT' && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => publishQuiz(quiz.id)}
                    >
                      Publish
                    </Button>
                  )}
                  {quiz.status === 'PUBLISHED' && (() => {
                    const session = getSessionForQuiz(quiz.id);
                    if (session?.state === 'WAITING') {
                      return (
                        <Button
                          variant="arena"
                          size="sm"
                          onClick={() => startQuizNow(session.id)}
                        >
                          <Play className="mr-1 h-3 w-3" /> Start Now
                        </Button>
                      );
                    } else if (session?.state === 'QUESTION_ACTIVE') {
                      return (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => endQuizNow(session.id)}
                        >
                          <Square className="mr-1 h-3 w-3" /> End
                        </Button>
                      );
                    }
                    const completed = getCompletedSession(quiz.id);
                    if (completed) {
                      return (
                        <Link href={`/dashboard/analytics/${completed.id}`}>
                          <Button variant="outline" size="sm">
                            <BarChart3 className="mr-1 h-3 w-3" /> Results
                          </Button>
                        </Link>
                      );
                    }
                    return null;
                  })()}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteQuiz(quiz.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <BookOpen className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No quizzes found</h3>
            <p className="text-muted-foreground mb-4">
              {search ? 'Try a different search term' : 'Create your first quiz to get started'}
            </p>
            <Link href="/dashboard/quizzes/new">
              <Button variant="arena">
                <Plus className="mr-2 h-4 w-4" /> Create Quiz
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
