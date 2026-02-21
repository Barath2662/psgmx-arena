'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';
import { Zap, Loader2, User, Lock, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import toast from 'react-hot-toast';


function isRegisterNumber(input: string): boolean {
  return /^\d{2}MX\d{3}$/i.test(input.trim());
}

/** Convert register number to synthetic email for Supabase Auth */
function toSyntheticEmail(regNo: string): string {
  return `${regNo.toLowerCase()}@student.psgmx`;
}

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    const input = identifier.trim();
    if (!input || !password) return;
    setLoading(true);

    try {
      // If input looks like a register number, convert to synthetic email
      const email = isRegisterNumber(input)
        ? toSyntheticEmail(input)
        : input;

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      // Check if user must change password
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        if (data.user?.mustChangePassword) {
          toast.success('Please change your default password');
          router.push('/auth/change-password');
        } else {
          toast.success('Signed in successfully!');
          router.push('/dashboard');
        }
        router.refresh();
      } else {
        toast.success('Signed in successfully!');
        router.push('/dashboard');
        router.refresh();
      }
    } catch {
      toast.error('Failed to sign in');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 via-background to-primary/10 p-4">
      <Card className="w-full max-w-md shadow-2xl border-primary/20">
        <CardHeader className="text-center space-y-3">
          <div className="flex justify-center">
            <div className="p-3 rounded-2xl bg-primary/10">
              <Zap className="h-10 w-10 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">PSGMX Arena</CardTitle>
          <CardDescription>
            Sign in with your email or register number
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="identifier" className="flex items-center gap-2">
                <User className="h-4 w-4" /> Email or Register Number
              </Label>
              <Input
                id="identifier"
                type="text"
                placeholder="Register Number"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                autoFocus
                className="h-12 text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center gap-2">
                <Lock className="h-4 w-4" /> Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-12 text-base"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full h-12 text-base" variant="arena" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <LogIn className="mr-2 h-5 w-5" />}
              Sign In
            </Button>
            <Link
              href="/auth/forgot-password"
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              Forgot your password?
            </Link>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
