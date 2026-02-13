'use client';

import { useEffect, useState, useCallback, type ReactNode } from 'react';
import { AlertTriangle, Maximize, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface FullscreenGuardProps {
  children: ReactNode;
  /** Whether fullscreen mode is currently required (e.g., session is active) */
  active: boolean;
  /** Called when the user exits fullscreen while test is active */
  onViolation?: () => void;
}

export function FullscreenGuard({ children, active, onViolation }: FullscreenGuardProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [violations, setViolations] = useState(0);
  const [showWarning, setShowWarning] = useState(false);

  const enterFullscreen = useCallback(async () => {
    try {
      await document.documentElement.requestFullscreen();
      setIsFullscreen(true);
      setShowWarning(false);
    } catch (err) {
      console.error('Fullscreen request denied:', err);
    }
  }, []);

  const exitFullscreen = useCallback(async () => {
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch {}
    }
    setIsFullscreen(false);
  }, []);

  useEffect(() => {
    if (!active) {
      // When test ends, exit fullscreen
      exitFullscreen();
      return;
    }

    // When test becomes active, enter fullscreen
    enterFullscreen();

    function handleFullscreenChange() {
      const inFullscreen = !!document.fullscreenElement;
      setIsFullscreen(inFullscreen);

      if (!inFullscreen && active) {
        // User exited fullscreen during test
        setViolations((v) => v + 1);
        setShowWarning(true);
        onViolation?.();
      }
    }

    // Prevent common escape keys during fullscreen
    function handleKeyDown(e: KeyboardEvent) {
      if (!active) return;
      // Block Alt+Tab, Alt+F4, Ctrl+W, etc.
      if (
        (e.altKey && e.key === 'Tab') ||
        (e.altKey && e.key === 'F4') ||
        (e.ctrlKey && e.key === 'w') ||
        (e.ctrlKey && e.key === 'W')
      ) {
        e.preventDefault();
      }
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [active, enterFullscreen, exitFullscreen, onViolation]);

  // Show a "please go fullscreen" prompt if test is active but not in fullscreen
  if (active && !isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
        <Card className="max-w-md shadow-2xl border-destructive/30">
          <CardHeader className="text-center space-y-3">
            <div className="flex justify-center">
              <div className="p-4 rounded-full bg-destructive/10">
                <ShieldAlert className="h-10 w-10 text-destructive" />
              </div>
            </div>
            <CardTitle className="text-xl">Fullscreen Required</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              This test requires fullscreen mode. Please click below to continue.
            </p>
            {violations > 0 && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span>
                  Fullscreen exit detected ({violations} time{violations > 1 ? 's' : ''}).
                  This activity is logged.
                </span>
              </div>
            )}
            <Button
              variant="arena"
              size="lg"
              className="w-full"
              onClick={enterFullscreen}
            >
              <Maximize className="mr-2 h-5 w-5" /> Enter Fullscreen
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show a subtle warning banner at the top if there have been violations
  return (
    <>
      {showWarning && violations > 0 && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-destructive/90 text-destructive-foreground p-2 text-center text-sm">
          <AlertTriangle className="inline h-4 w-4 mr-1" />
          Fullscreen exit detected. Please stay in fullscreen during the test.
        </div>
      )}
      {children}
    </>
  );
}
