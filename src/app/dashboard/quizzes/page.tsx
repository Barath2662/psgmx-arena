'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Plus, Search, BookOpen, Play, Trash2, Edit, MoreVertical } from 'lucide-react';
import toast from 'react-hot-toast';

export default function QuizzesPage() {
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQuizzes();
  }, []);

  async function fetchQuizzes() {
    try {
      const res = await fetch('/api/quiz');
      const data = await res.json();
      setQuizzes(data.quizzes || []);
    } catch (error) {
      toast.error('Failed to load quizzes');
    } finally {
      setLoading(false);
    }
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
      await fetch(`/api/quiz/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PUBLISHED' }),
      });
      setQuizzes((prev) =>
        prev.map((q) => (q.id === id ? { ...q, status: 'PUBLISHED' } : q))
      );
      toast.success('Quiz published!');
    } catch {
      toast.error('Failed to publish quiz');
    }
  }

  async function startSession(quizId: string) {
    try {
      const res = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quizId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error);
        return;
      }
      toast.success(`Session created! Code: ${data.session.joinCode}`);
      window.location.href = `/session/${data.session.id}/host`;
    } catch {
      toast.error('Failed to start session');
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
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                  <span className="flex items-center gap-1">
                    <BookOpen className="h-3 w-3" /> {quiz.questions?.length ?? 0} questions
                  </span>
                </div>
                <div className="flex gap-2">
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
                  {quiz.status === 'PUBLISHED' && (
                    <Button
                      variant="arena"
                      size="sm"
                      onClick={() => startSession(quiz.id)}
                    >
                      <Play className="mr-1 h-3 w-3" /> Go Live
                    </Button>
                  )}
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
