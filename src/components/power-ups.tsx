'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles,
  Shield,
  Timer,
  Lightbulb,
  Scissors,
  Lock,
} from 'lucide-react';
import toast from 'react-hot-toast';

export type PowerUpType = 'SECOND_CHANCE' | 'TIME_FREEZE' | 'FIFTY_FIFTY' | 'HINT';

interface PowerUp {
  type: PowerUpType;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
}

const POWER_UPS: PowerUp[] = [
  {
    type: 'SECOND_CHANCE',
    label: 'Second Chance',
    description: 'Submit another answer if wrong',
    icon: Shield,
    color: 'text-blue-500',
  },
  {
    type: 'TIME_FREEZE',
    label: 'Time Freeze',
    description: 'Pause the timer for 10s',
    icon: Timer,
    color: 'text-cyan-500',
  },
  {
    type: 'FIFTY_FIFTY',
    label: '50/50',
    description: 'Remove two wrong options',
    icon: Scissors,
    color: 'text-purple-500',
  },
  {
    type: 'HINT',
    label: 'Hint',
    description: 'Get a helpful hint',
    icon: Lightbulb,
    color: 'text-yellow-500',
  },
];

interface PowerUpBarProps {
  availablePowerUps: Record<PowerUpType, number>;
  onUsePowerUp: (type: PowerUpType) => void;
  disabled?: boolean;
}

export default function PowerUpBar({
  availablePowerUps,
  onUsePowerUp,
  disabled = false,
}: PowerUpBarProps) {
  const [usedThisQuestion, setUsedThisQuestion] = useState<PowerUpType[]>([]);

  const handleUse = (type: PowerUpType) => {
    if (disabled) return;
    if (usedThisQuestion.includes(type)) {
      toast.error('Already used this power-up this round');
      return;
    }
    if ((availablePowerUps[type] || 0) <= 0) {
      toast.error('No power-ups remaining');
      return;
    }
    setUsedThisQuestion((prev) => [...prev, type]);
    onUsePowerUp(type);
  };

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1">
      <Sparkles className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      {POWER_UPS.map((pu) => {
        const remaining = availablePowerUps[pu.type] || 0;
        const used = usedThisQuestion.includes(pu.type);
        const isDisabled = disabled || remaining <= 0 || used;
        const Icon = pu.icon;

        return (
          <Button
            key={pu.type}
            variant="outline"
            size="sm"
            className={`flex items-center gap-1.5 text-xs relative ${
              isDisabled ? 'opacity-50' : ''
            }`}
            onClick={() => handleUse(pu.type)}
            disabled={isDisabled}
            title={pu.description}
          >
            <Icon className={`h-3.5 w-3.5 ${pu.color}`} />
            {pu.label}
            {remaining > 0 && (
              <Badge variant="secondary" className="h-4 w-4 p-0 flex items-center justify-center text-[10px] ml-1">
                {remaining}
              </Badge>
            )}
            {used && <Lock className="h-3 w-3 absolute -top-1 -right-1 text-muted-foreground" />}
          </Button>
        );
      })}
    </div>
  );
}

// Streak display component
export function StreakDisplay({ streak }: { streak: number }) {
  if (streak < 2) return null;

  const multiplier = streak >= 10 ? 2.0 : streak >= 5 ? 1.5 : streak >= 3 ? 1.2 : 1.0;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/30 animate-pulse">
      <span className="text-lg">🔥</span>
      <div>
        <span className="font-bold text-sm text-orange-500">{streak} Streak!</span>
        {multiplier > 1 && (
          <span className="text-xs text-muted-foreground ml-1">×{multiplier}</span>
        )}
      </div>
    </div>
  );
}

// Achievement popup
export function AchievementPopup({
  title,
  description,
  icon,
  onClose,
}: {
  title: string;
  description: string;
  icon: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-in fade-in">
      <Card className="max-w-sm mx-4 animate-score-pop">
        <CardContent className="p-6 text-center">
          <div className="text-5xl mb-3">{icon}</div>
          <h3 className="text-xl font-bold mb-1">{title}</h3>
          <p className="text-sm text-muted-foreground mb-4">{description}</p>
          <Button onClick={onClose} variant="arena" size="sm">
            Continue
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
