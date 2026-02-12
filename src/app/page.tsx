import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Zap,
  Code2,
  BarChart3,
  Users,
  Trophy,
  Shield,
  ArrowRight,
  Github,
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Navbar */}
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <Zap className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">PSGMX Arena</span>
          </Link>
          <div className="flex items-center space-x-4">
            <Link href="/join">
              <Button variant="ghost">Join Quiz</Button>
            </Link>
            <Link href="/auth/login">
              <Button variant="outline">Login</Button>
            </Link>
            <Link href="/auth/register">
              <Button variant="arena">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="gradient-arena py-24 text-white">
        <div className="container text-center">
          <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl mb-6">
            Live Quizzes.
            <br />
            Real-Time Coding.
            <br />
            <span className="text-arena-200">Zero Lag.</span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-arena-200 mb-8">
            Create live quizzes and coding sessions, students join instantly, everyone moves
            question-by-question in sync, results update in real time. Fully open-source.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/auth/register">
              <Button size="xl" className="bg-white text-arena-900 hover:bg-arena-100">
                Start Teaching <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/join">
              <Button size="xl" variant="outline" className="border-white text-white hover:bg-white/10">
                Join a Quiz
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="container">
          <h2 className="text-3xl font-bold text-center mb-12">Everything You Need</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={<Zap className="h-8 w-8" />}
              title="Real-Time Sync"
              description="WebSocket-powered live sessions. No polling, no lag. Instructor controls the flow, students follow in lockstep."
            />
            <FeatureCard
              icon={<Code2 className="h-8 w-8" />}
              title="Code Sandbox"
              description="Monaco Editor with 10+ language support. Sandboxed execution via Piston. Hidden test cases, partial scoring."
            />
            <FeatureCard
              icon={<BarChart3 className="h-8 w-8" />}
              title="Live Analytics"
              description="Real-time accuracy tracking, time analysis, score distribution. Export as CSV or PDF."
            />
            <FeatureCard
              icon={<Users className="h-8 w-8" />}
              title="150+ Concurrent Users"
              description="Optimized broadcast architecture. Single event per action, Redis-backed state, batched DB writes."
            />
            <FeatureCard
              icon={<Trophy className="h-8 w-8" />}
              title="Gamification"
              description="Live leaderboards, streaks, power-ups, avatars. Keep students engaged without gimmicks."
            />
            <FeatureCard
              icon={<Shield className="h-8 w-8" />}
              title="18+ Question Types"
              description="MCQ, multi-select, fill blanks, drag & drop, match, code, numeric, case-based, rapid-fire, and more."
            />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-muted/50">
        <div className="container">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <StepCard step={1} title="Create Quiz" description="Add questions, set timers, enable code challenges. AI assist available." />
            <StepCard step={2} title="Go Live" description="Start a session, share the 6-digit code. Students join instantly." />
            <StepCard step={3} title="Track Results" description="Live leaderboard, real-time analytics, exportable reports." />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Zap className="h-5 w-5 text-primary" />
            <span className="font-semibold">PSGMX Arena</span>
          </div>
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <span>100% Open Source</span>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground"
            >
              <Github className="h-5 w-5" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="text-primary mb-2">{icon}</div>
        <CardTitle className="text-xl">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription className="text-base">{description}</CardDescription>
      </CardContent>
    </Card>
  );
}

function StepCard({
  step,
  title,
  description,
}: {
  step: number;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center">
      <div className="w-12 h-12 rounded-full gradient-arena text-white flex items-center justify-center text-xl font-bold mx-auto mb-4">
        {step}
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}
