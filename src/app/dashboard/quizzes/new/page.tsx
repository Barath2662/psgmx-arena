'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function NewQuizPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    mode: 'LIVE',
    timePerQuestion: 30,
    maxAttempts: 1,
    shuffleQuestions: false,
    shuffleOptions: false,
    showResults: true,
    enableCodeQuestions: false,
    enableLeaderboard: true,
    enablePowerUps: false,
    passingScore: 50,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error);
        return;
      }

      toast.success('Quiz created! Now add questions.');
      router.push(`/dashboard/quizzes/${data.quiz.id}`);
    } catch {
      toast.error('Failed to create quiz');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/quizzes">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Create New Quiz</h1>
          <p className="text-muted-foreground">Set up your quiz settings</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Quiz Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Data Structures Midterm Review"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
                minLength={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="Brief description of this quiz..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Mode</Label>
              <Select value={form.mode} onValueChange={(v) => setForm({ ...form, mode: v })}>
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
            <CardTitle>Quiz Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Time per Question (seconds)</Label>
                <Input
                  type="number"
                  min={5}
                  max={600}
                  value={form.timePerQuestion}
                  onChange={(e) => setForm({ ...form, timePerQuestion: parseInt(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Max Attempts</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={form.maxAttempts}
                  onChange={(e) => setForm({ ...form, maxAttempts: parseInt(e.target.value) })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Passing Score (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={form.passingScore}
                onChange={(e) => setForm({ ...form, passingScore: parseInt(e.target.value) })}
              />
            </div>

            {/* Toggle settings */}
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
                    checked={(form as any)[setting.key]}
                    onChange={(e) => setForm({ ...form, [setting.key]: e.target.checked })}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm">{setting.label}</span>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end">
          <Link href="/dashboard/quizzes">
            <Button variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" variant="arena" disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Create Quiz
          </Button>
        </div>
      </form>
    </div>
  );
}
