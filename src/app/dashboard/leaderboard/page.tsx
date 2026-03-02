'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trophy, Crown, Medal, Star, TrendingUp, Award, Calendar, Loader2 } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';

interface LeaderboardEntry {
  rank: number;
  userId: string | null;
  name: string;
  email?: string | null;
  totalScore?: number;
  score?: number;
  correctCount?: number;
  streak?: number;
}

interface SessionOption {
  id: string;
  title: string;
  joinCode: string;
  state: string;
}

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<SessionOption[]>([]);
  const [selectedSession, setSelectedSession] = useState<string>('');

  // Fetch completed sessions for test selector
  useEffect(() => {
    fetch('/api/session?state=COMPLETED')
      .then((r) => r.json())
      .then((data) => {
        const opts = (data.sessions || []).map((s: any) => ({
          id: s.id,
          title: s.quiz?.title || s.joinCode,
          joinCode: s.joinCode,
          state: s.state,
        }));
        setSessions(opts);
        // Auto-select first if available
        if (opts.length > 0 && !selectedSession) {
          setSelectedSession(opts[0].id);
        }
      })
      .catch(console.error);
  }, []);

  // Fetch leaderboard when selected session changes
  useEffect(() => {
    if (!selectedSession) {
      setLeaderboard([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    fetch(`/api/leaderboard?type=session&id=${selectedSession}`)
      .then((r) => r.json())
      .then((data) => {
        setLeaderboard(data.leaderboard || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedSession]);

  // Find current user's position
  const myEntry = leaderboard.find((e) => e.userId === user?.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Trophy className="h-6 w-6 text-yellow-500" /> Test Leaderboard
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Select a test to view its leaderboard</p>
      </div>

      {/* Session selector */}
      <Card>
        <CardContent className="pt-4">
          <label className="text-sm font-medium mb-2 block">Select a test</label>
          <select
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={selectedSession}
            onChange={(e) => setSelectedSession(e.target.value)}
          >
            <option value="">Choose a completed test...</option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title} ({s.joinCode})
              </option>
            ))}
          </select>
        </CardContent>
      </Card>

      {/* My rank banner */}
      {myEntry && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-2xl font-bold">
                {myEntry.rank === 1 ? '🥇' : myEntry.rank === 2 ? '🥈' : myEntry.rank === 3 ? '🥉' : `#${myEntry.rank}`}
              </div>
              <div>
                <p className="font-semibold">Your Position</p>
                <p className="text-sm text-muted-foreground">
                  Score: {myEntry.score ?? myEntry.totalScore ?? 0}
                  {myEntry.correctCount != null && ` · ${myEntry.correctCount} correct`}
                </p>
              </div>
            </div>
            <Badge variant="success">You</Badge>
          </CardContent>
        </Card>
      )}

      {/* Stats summary */}
      {!loading && leaderboard.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <Trophy className="h-6 w-6 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{leaderboard.length}</p>
                <p className="text-xs text-muted-foreground">Players</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <TrendingUp className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{leaderboard[0]?.score ?? leaderboard[0]?.totalScore ?? 0}</p>
                <p className="text-xs text-muted-foreground">Top Score</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Crown className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{leaderboard[0]?.name?.split(' ')[0] || '—'}</p>
                <p className="text-xs text-muted-foreground">#1 Player</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Award className="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {Math.round(
                    leaderboard.reduce((s, e) => s + (e.score ?? e.totalScore ?? 0), 0) /
                      leaderboard.length
                  )}
                </p>
                <p className="text-xs text-muted-foreground">Avg Score</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Leaderboard table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" /> Test Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {!selectedSession
                ? 'Select a test above to view its leaderboard'
                : 'No leaderboard data yet.'}
            </div>
          ) : (
            <div className="space-y-2">
              {leaderboard.map((entry) => {
                const isMe = entry.userId === user?.id;
                return (
                  <div
                    key={`${entry.rank}-${entry.userId}`}
                    className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                      isMe
                        ? 'bg-primary/10 border-primary/50 ring-1 ring-primary/20'
                        : entry.rank <= 3
                        ? 'bg-muted/50'
                        : ''
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 text-center">
                        {entry.rank === 1 ? (
                          <Crown className="h-7 w-7 text-yellow-500 mx-auto" />
                        ) : entry.rank === 2 ? (
                          <Medal className="h-6 w-6 text-gray-400 mx-auto" />
                        ) : entry.rank === 3 ? (
                          <Medal className="h-6 w-6 text-amber-600 mx-auto" />
                        ) : (
                          <span className="text-lg font-mono font-bold text-muted-foreground">
                            #{entry.rank}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="font-semibold flex items-center gap-2">
                          {entry.name}
                          {isMe && (
                            <Badge variant="outline" className="text-[10px]">
                              You
                            </Badge>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {entry.correctCount != null && `${entry.correctCount} correct`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-primary">
                        {entry.score ?? entry.totalScore ?? 0}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
