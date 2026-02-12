'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Trophy, Medal, Crown, Star, TrendingUp, Flame } from 'lucide-react';

interface LeaderboardEntry {
  participantId: string;
  name: string;
  score: number;
  rank: number;
  streak?: number;
  avatar?: string;
}

interface LiveLeaderboardProps {
  entries: LeaderboardEntry[];
  currentUserId?: string;
  maxDisplay?: number;
  showAnimation?: boolean;
}

export default function LiveLeaderboard({
  entries,
  currentUserId,
  maxDisplay = 10,
  showAnimation = true,
}: LiveLeaderboardProps) {
  const [animatingScores, setAnimatingScores] = useState<Record<string, boolean>>({});
  const [prevScores, setPrevScores] = useState<Record<string, number>>({});

  useEffect(() => {
    const newAnimating: Record<string, boolean> = {};
    entries.forEach((e) => {
      if (prevScores[e.participantId] !== undefined && prevScores[e.participantId] < e.score) {
        newAnimating[e.participantId] = true;
      }
    });
    setAnimatingScores(newAnimating);

    const scores: Record<string, number> = {};
    entries.forEach((e) => (scores[e.participantId] = e.score));
    setPrevScores(scores);

    if (Object.keys(newAnimating).length > 0) {
      const t = setTimeout(() => setAnimatingScores({}), 1000);
      return () => clearTimeout(t);
    }
  }, [entries]);

  const maxScore = Math.max(...entries.map((e) => e.score), 1);
  const sorted = [...entries].sort((a, b) => b.score - a.score).slice(0, maxDisplay);

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="h-5 w-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />;
    if (rank === 3) return <Medal className="h-5 w-5 text-amber-600" />;
    return <span className="text-sm font-mono text-muted-foreground w-5 text-center">#{rank}</span>;
  };

  const getRowBg = (rank: number, isCurrentUser: boolean) => {
    if (isCurrentUser) return 'bg-primary/10 border-primary';
    if (rank === 1) return 'bg-yellow-500/5 border-yellow-500/30';
    if (rank === 2) return 'bg-gray-500/5 border-gray-500/20';
    if (rank === 3) return 'bg-amber-500/5 border-amber-500/20';
    return 'bg-card border-border';
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Trophy className="h-5 w-5 text-yellow-500" /> Live Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {sorted.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-4">No scores yet</p>
        )}
        {sorted.map((entry, i) => {
          const rank = i + 1;
          const isCurrentUser = entry.participantId === currentUserId;
          const isAnimating = animatingScores[entry.participantId];

          return (
            <div
              key={entry.participantId}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                getRowBg(rank, isCurrentUser)
              } ${showAnimation && isAnimating ? 'animate-score-pop' : ''}`}
            >
              {/* Rank */}
              <div className="flex-shrink-0 w-8 flex justify-center">
                {getRankIcon(rank)}
              </div>

              {/* Avatar + Name */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center text-xs font-bold text-white">
                    {(entry.name || 'P')[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {entry.name || `Player ${rank}`}
                      {isCurrentUser && (
                        <Badge variant="outline" className="ml-2 text-xs">You</Badge>
                      )}
                    </p>
                    {entry.streak && entry.streak > 1 && (
                      <div className="flex items-center gap-1 text-xs text-orange-500">
                        <Flame className="h-3 w-3" /> {entry.streak} streak
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Score bar */}
              <div className="w-24 hidden sm:block">
                <Progress value={(entry.score / maxScore) * 100} className="h-2" />
              </div>

              {/* Score */}
              <div className="text-right flex-shrink-0">
                <span className={`font-bold ${isAnimating ? 'text-green-500' : ''}`}>
                  {entry.score}
                </span>
              </div>
            </div>
          );
        })}

        {/* Show current user if not in top */}
        {currentUserId && !sorted.find((e) => e.participantId === currentUserId) && (
          (() => {
            const userEntry = entries.find((e) => e.participantId === currentUserId);
            if (!userEntry) return null;
            const userRank = entries.filter((e) => e.score > userEntry.score).length + 1;
            return (
              <>
                <div className="text-center text-xs text-muted-foreground py-1">...</div>
                <div className="flex items-center gap-3 p-3 rounded-lg border bg-primary/10 border-primary">
                  <div className="flex-shrink-0 w-8 text-center">
                    <span className="text-sm font-mono">#{userRank}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {userEntry.name} <Badge variant="outline" className="ml-2 text-xs">You</Badge>
                    </p>
                  </div>
                  <span className="font-bold">{userEntry.score}</span>
                </div>
              </>
            );
          })()
        )}
      </CardContent>
    </Card>
  );
}
