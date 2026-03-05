'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Users, Clock, Play, BarChart3, Square, Loader2, Trash2, RotateCcw, CheckSquare, Calendar } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import toast from 'react-hot-toast';

export default function SessionsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Retest dialog
  const [retestSession, setRetestSession] = useState<any | null>(null);
  const [retestParticipants, setRetestParticipants] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [retestLoading, setRetestLoading] = useState(false);
  const [loadingParticipants, setLoadingParticipants] = useState(false);

  // Reschedule dialog
  const [rescheduleSession, setRescheduleSession] = useState<any | null>(null);
  const [rescheduleStart, setRescheduleStart] = useState('');
  const [rescheduleEnd, setRescheduleEnd] = useState('');
  const [rescheduling, setRescheduling] = useState(false);

  useEffect(() => {
    fetchSessions();
  }, []);

  function fetchSessions() {
    fetch('/api/session')
      .then((r) => r.json())
      .then((data) => setSessions(data.sessions || []))
      .catch(() => toast.error('Failed to load sessions'))
      .finally(() => setLoading(false));
  }

  async function sessionAction(sessionId: string, action: string) {
    setActionLoading(sessionId);
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
      if (action === 'start') {
        toast.success('Quiz started! Redirecting to host controls...');
        router.push(`/session/${sessionId}/host`);
        return;
      }
      toast.success(action === 'end' ? 'Quiz ended!' : 'Done');
      fetchSessions();
    } catch {
      toast.error('Action failed');
    } finally {
      setActionLoading(null);
    }
  }

  async function deleteSession(sessionId: string, title: string) {
    if (!confirm(`Delete session for "${title}"? This will permanently remove all participant data and answers.`)) return;
    setDeletingId(sessionId);
    try {
      const res = await fetch(`/api/session/${sessionId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to delete session');
        return;
      }
      toast.success('Session deleted');
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch {
      toast.error('Failed to delete session');
    } finally {
      setDeletingId(null);
    }
  }

  async function openRetest(session: any) {
    setRetestSession(session);
    setSelectedIds(new Set());
    setLoadingParticipants(true);
    try {
      const res = await fetch('/api/admin/users?role=STUDENT&limit=1000');
      const data = await res.json();
      setRetestParticipants((data.users || []).map((u: any) => ({
        id: u.id,
        name: u.name || u.email,
        registerNumber: u.registerNumber,
        email: u.email,
      })));
    } catch {
      toast.error('Failed to load students');
    } finally {
      setLoadingParticipants(false);
    }
  }

  function openReschedule(session: any) {
    const start = session.quiz?.scheduledStartTime
      ? new Date(session.quiz.scheduledStartTime).toISOString().slice(0, 16)
      : '';
    const end = session.quiz?.scheduledEndTime
      ? new Date(session.quiz.scheduledEndTime).toISOString().slice(0, 16)
      : '';
    setRescheduleStart(start);
    setRescheduleEnd(end);
    setRescheduleSession(session);
  }

  async function handleReschedule() {
    if (!rescheduleStart) {
      toast.error('Please set a start date & time');
      return;
    }
    setRescheduling(true);
    try {
      const res = await fetch(`/api/session/${rescheduleSession.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reschedule',
          scheduledStartTime: new Date(rescheduleStart).toISOString(),
          scheduledEndTime: rescheduleEnd ? new Date(rescheduleEnd).toISOString() : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to reschedule');
        return;
      }
      toast.success('Session rescheduled — will auto-start at the new time');
      setRescheduleSession(null);
      fetchSessions();
    } catch {
      toast.error('Failed to reschedule');
    } finally {
      setRescheduling(false);
    }
  }

  function toggleParticipant(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selectedIds.size === retestParticipants.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(retestParticipants.map((p) => p.id)));
    }
  }

  async function runRetest() {
    if (selectedIds.size === 0) {
      toast.error('Select at least one student');
      return;
    }
    setRetestLoading(true);
    let succeeded = 0;
    let failed = 0;
    for (const userId of Array.from(selectedIds)) {
      try {
        const res = await fetch(`/api/session/${retestSession.id}/restart-user`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId }),
        });
        if (res.ok) succeeded++;
        else failed++;
      } catch {
        failed++;
      }
    }
    setRetestLoading(false);
    if (failed === 0) {
      toast.success(`Retest enabled for ${succeeded} student${succeeded > 1 ? 's' : ''}`);
    } else {
      toast.error(`${succeeded} reset, ${failed} failed`);
    }
    setRetestSession(null);
  }

  const stateColors: Record<string, 'success' | 'warning' | 'secondary' | 'default' | 'destructive'> = {
    WAITING: 'warning',
    QUESTION_ACTIVE: 'success',
    LOCKED: 'default',
    RESULTS: 'default',
    COMPLETED: 'secondary',
  };

  const stateLabels: Record<string, string> = {
    WAITING: 'Scheduled',
    QUESTION_ACTIVE: 'Live',
    COMPLETED: 'Completed',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Sessions</h1>
        <p className="text-muted-foreground">Manage your quiz sessions</p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-6 h-24" />
            </Card>
          ))}
        </div>
      ) : sessions.length > 0 ? (
        <div className="space-y-4">
          {sessions.map((s) => (
            <Card key={s.id}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="space-y-1">
                    <h3 className="font-semibold text-lg">{s.quiz?.title}</h3>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" /> {s.participants?.length ?? 0} participants
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(s.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={stateColors[s.state] || 'default'}>
                      {stateLabels[s.state] || s.state}
                    </Badge>
                    {s.state === 'WAITING' && (
                      <Button
                        variant="arena"
                        size="sm"
                        onClick={() => sessionAction(s.id, 'start')}
                        disabled={actionLoading === s.id}
                      >
                        {actionLoading === s.id ? (
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        ) : (
                          <Play className="mr-1 h-3 w-3" />
                        )}
                        Start Now
                      </Button>
                    )}
                    {s.state === 'QUESTION_ACTIVE' && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          if (confirm('End this quiz? All student answers will be saved.')) {
                            sessionAction(s.id, 'end');
                          }
                        }}
                        disabled={actionLoading === s.id}
                      >
                        {actionLoading === s.id ? (
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        ) : (
                          <Square className="mr-1 h-3 w-3" />
                        )}
                        End Quiz
                      </Button>
                    )}
                    {s.state === 'COMPLETED' && (
                      <>
                        <Link href={`/dashboard/analytics/${s.id}`}>
                          <Button variant="outline" size="sm">
                            <BarChart3 className="mr-1 h-3 w-3" /> Analytics
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openReschedule(s)}
                          className="text-blue-500 hover:text-blue-600 border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950"
                          title="Reschedule this session"
                        >
                          <Calendar className="mr-1 h-3 w-3" /> Reschedule
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openRetest(s)}
                          className="text-orange-500 hover:text-orange-600 border-orange-300 hover:bg-orange-50 dark:hover:bg-orange-950"
                          title="Reset students to allow retesting"
                        >
                          <RotateCcw className="mr-1 h-3 w-3" /> Retest
                        </Button>
                      </>
                    )}
                    {/* Delete session */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteSession(s.id, s.quiz?.title || 'session')}
                      disabled={deletingId === s.id}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      title="Delete session"
                    >
                      {deletingId === s.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Trash2 className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Play className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No sessions yet</h3>
            <p className="text-muted-foreground mb-4">
              Publish a quiz to auto-create a session
            </p>
            <Link href="/dashboard/quizzes">
              <Button variant="arena">Go to Quizzes</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Reschedule Dialog */}
      <Dialog open={!!rescheduleSession} onOpenChange={(open) => { if (!open) setRescheduleSession(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-500" /> Reschedule Session
            </DialogTitle>
            <DialogDescription>
              Set a new start time for <strong>{rescheduleSession?.quiz?.title}</strong>. The session will reset to Scheduled and auto-start at the new time. Existing participant records are kept — use Retest to clear specific students.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="reschedStart">New Start Date &amp; Time *</Label>
              <Input
                id="reschedStart"
                type="datetime-local"
                value={rescheduleStart}
                onChange={(e) => setRescheduleStart(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reschedEnd">End Date &amp; Time (optional)</Label>
              <Input
                id="reschedEnd"
                type="datetime-local"
                value={rescheduleEnd}
                onChange={(e) => setRescheduleEnd(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRescheduleSession(null)}>Cancel</Button>
            <Button variant="arena" onClick={handleReschedule} disabled={rescheduling || !rescheduleStart}>
              {rescheduling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Calendar className="mr-2 h-4 w-4" />}
              Reschedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Retest Dialog */}
      <Dialog open={!!retestSession} onOpenChange={(open) => { if (!open) setRetestSession(null); }}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-orange-500" /> Retest Students
            </DialogTitle>
            <DialogDescription>
              Select students to reset. Their answers and scores will be cleared so they can retake the test.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-2 py-2 min-h-0">
            {loadingParticipants ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : retestParticipants.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No students found in the system</p>
            ) : (
              <>
                {/* Select All */}
                <label className="flex items-center gap-3 p-2 rounded hover:bg-muted cursor-pointer border-b mb-1">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === retestParticipants.length && retestParticipants.length > 0}
                    onChange={toggleAll}
                    className="rounded"
                  />
                  <span className="text-sm font-medium flex items-center gap-1">
                    <CheckSquare className="h-3.5 w-3.5" /> Select All ({retestParticipants.length})
                  </span>
                </label>
                {retestParticipants.map((p) => (
                  <label key={p.id} className="flex items-center gap-3 p-2 rounded hover:bg-muted cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(p.id)}
                      onChange={() => toggleParticipant(p.id)}
                      className="rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{p.registerNumber || p.email}</p>
                    </div>
                  </label>
                ))}
              </>
            )}
          </div>

          <DialogFooter className="flex items-center gap-2 justify-between pt-2">
            <span className="text-sm text-muted-foreground">
              {selectedIds.size} selected
            </span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setRetestSession(null)}>Cancel</Button>
              <Button
                variant="arena"
                onClick={runRetest}
                disabled={retestLoading || selectedIds.size === 0 || retestParticipants.length === 0}
              >
                {retestLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
                Reset & Enable Retest
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
