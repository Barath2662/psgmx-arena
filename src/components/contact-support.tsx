'use client';

import { Mail, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const SUPPORT_EMAIL = 'barathvikramansk@gmail.com';

export function ContactSupport({ variant = 'button' }: { variant?: 'button' | 'link' | 'card' }) {
  if (variant === 'link') {
    return (
      <a
        href={`mailto:${SUPPORT_EMAIL}`}
        className="text-sm text-primary hover:underline inline-flex items-center gap-1"
      >
        <Mail className="h-3 w-3" /> Contact Support
      </a>
    );
  }

  if (variant === 'card') {
    return (
      <div className="p-4 rounded-xl border bg-card shadow-sm text-center space-y-3">
        <div className="flex justify-center">
          <div className="p-3 rounded-full bg-blue-500/10">
            <MessageCircle className="h-6 w-6 text-blue-500" />
          </div>
        </div>
        <div>
          <p className="font-semibold text-sm">Need Help?</p>
          <p className="text-xs text-muted-foreground">Report issues or get support</p>
        </div>
        <a href={`mailto:${SUPPORT_EMAIL}`}>
          <Button variant="outline" size="sm" className="w-full">
            <Mail className="mr-2 h-3 w-3" /> {SUPPORT_EMAIL}
          </Button>
        </a>
      </div>
    );
  }

  return (
    <a href={`mailto:${SUPPORT_EMAIL}`}>
      <Button variant="outline" size="sm">
        <Mail className="mr-2 h-4 w-4" /> Contact Support
      </Button>
    </a>
  );
}
