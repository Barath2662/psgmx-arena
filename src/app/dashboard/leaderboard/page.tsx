'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Crown, Medal, Star, TrendingUp, Award } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';

interface SessionHistoryEntry {
  id: string;
  quizTitle: string;
  score: number;
  rank: number;
  totalParticipants: number;
  date: string;
}

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [history, setHistory] = useState<SessionHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a real app, fetch from API
    setHistory([
      {
        id: '1',
        quizTitle: 'Data Structures Midterm',
        score: 850,
        rank: 2,
        totalParticipants: 45,
        date: '2024-01-15',
      },
      {
        id: '2',
        quizTitle: 'Algorithms Week 3',
        score: 920,
        rank: 1,
        totalParticipants: 38,
        date: '2024-01-12',
      },
      {
        id: '3',
        quizTitle: 'OOP Concepts',
        score: 760,
        rank: 5,
        totalParticipants: 52,
        date: '2024-01-08',
      },
    ]);
    setLoading(false);
  }, []);

  const totalScore = history.reduce((sum, h) => sum + h.score, 0);
  const avgRank =
    history.length > 0
      ? (history.reduce((sum, h) => sum + h.rank, 0) / history.length).toFixed(1)
      : '-';
  const wins = history.filter((h) => h.rank === 1).length;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Leaderboard & Achievements</h1>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-500/10">
              <Trophy className="h-6 w-6 text-yellow-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalScore}</p>
              <p className="text-xs text-muted-foreground">Total Score</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <TrendingUp className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{avgRank}</p>
              <p className="text-xs text-muted-foreground">Avg Rank</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <Crown className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{wins}</p>
              <p className="text-xs text-muted-foreground">1st Place Wins</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Award className="h-6 w-6 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{history.length}</p>
              <p className="text-xs text-muted-foreground">Quizzes Taken</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Achievements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" /> Achievements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {[
              { icon: '🏆', title: 'First Win', desc: 'Win your first quiz', unlocked: wins > 0 },
              { icon: '🔥', title: 'On Fire', desc: '5-question streak', unlocked: true },
              { icon: '⚡', title: 'Speed Demon', desc: 'Answer in under 3s', unlocked: true },
              { icon: '💯', title: 'Perfect Score', desc: 'Get 100% on a quiz', unlocked: false },
              { icon: '🎯', title: 'Sharpshooter', desc: '10 correct in a row', unlocked: false },
              { icon: '📚', title: 'Scholar', desc: 'Complete 10 quizzes', unlocked: false },
              { icon: '🌟', title: 'Rising Star', desc: 'Top 3 finish', unlocked: history.some((h) => h.rank <= 3) },
              { icon: '💪', title: 'Consistent', desc: '5 quizzes in a week', unlocked: false },
            ].map((ach) => (
              <div
                key={ach.title}
                className={`p-4 rounded-lg border text-center transition-all ${
                  ach.unlocked
                    ? 'bg-card border-primary/30'
                    : 'bg-muted/50 opacity-50 grayscale'
                }`}
              >
                <div className="text-3xl mb-2">{ach.icon}</div>
                <p className="font-medium text-sm">{ach.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{ach.desc}</p>
                {ach.unlocked && (
                  <Badge variant="success" className="mt-2 text-xs">Unlocked</Badge>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Session History */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {history.map((h) => (
              <div
                key={h.id}
                className="flex items-center justify-between p-4 rounded-lg border"
              >
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    {h.rank === 1 ? (
                      <Crown className="h-6 w-6 text-yellow-500" />
                    ) : h.rank <= 3 ? (
                      <Medal className="h-6 w-6 text-gray-400" />
                    ) : (
                      <span className="text-lg font-mono">#{h.rank}</span>
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{h.quizTitle}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(h.date).toLocaleDateString()} &middot; {h.totalParticipants} players
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-primary">{h.score}</p>
                  <p className="text-xs text-muted-foreground">
                    Rank {h.rank}/{h.totalParticipants}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
