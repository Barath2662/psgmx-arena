'use client';

import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';

const REPO_URL = 'https://github.com/psgmx-arena/psgmx-arena';

export function GitHubStar({ variant = 'button' }: { variant?: 'button' | 'badge' }) {
  if (variant === 'badge') {
    return (
      <a
        href={REPO_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border bg-card hover:bg-muted transition-colors"
      >
        <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
        Star on GitHub
      </a>
    );
  }

  return (
    <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
      <Button variant="outline" size="sm" className="gap-2">
        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
        Star on GitHub
      </Button>
    </a>
  );
}
