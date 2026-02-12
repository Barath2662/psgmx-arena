'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Zap, Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import toast from 'react-hot-toast';

export default function JoinPage() {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState('');
  const [guestName, setGuestName] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/session/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          joinCode: joinCode.toUpperCase(),
          guestName: guestName || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Failed to join');
        return;
      }

      const sessionId = data.session.id;
      const participantId = data.participant.id;

      // Store participant info
      sessionStorage.setItem('participantId', participantId);
      sessionStorage.setItem('participantName', data.participant.name || guestName);

      toast.success('Joined successfully!');
      router.push(`/play/${sessionId}`);
    } catch (error) {
      toast.error('Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center gradient-arena p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Zap className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl">Join Quiz</CardTitle>
          <CardDescription>Enter the 6-digit code to join a live session</CardDescription>
        </CardHeader>
        <form onSubmit={handleJoin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="joinCode">Session Code</Label>
              <Input
                id="joinCode"
                placeholder="ABC123"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
                className="text-center text-2xl tracking-widest font-mono h-14"
                maxLength={6}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="guestName">Your Name (optional if logged in)</Label>
              <Input
                id="guestName"
                placeholder="Your display name"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button
              type="submit"
              className="w-full"
              variant="arena"
              size="lg"
              disabled={loading || joinCode.length !== 6}
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="mr-2 h-4 w-4" />
              )}
              Join Session
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              <Link href="/auth/login" className="text-primary hover:underline">
                Sign in
              </Link>{' '}
              for full features
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
