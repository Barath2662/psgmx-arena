import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { customAlphabet } from 'nanoid';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Generate 6-character join codes
const nanoid = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 6);
export function generateJoinCode(): string {
  return nanoid();
}

// Format time display
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Calculate score based on time taken
export function calculateScore(
  basePoints: number,
  timeTakenMs: number,
  timeLimitMs: number,
  isCorrect: boolean
): number {
  if (!isCorrect) return 0;
  // Bonus for speed: up to 50% extra for fastest answers
  const timeRatio = Math.max(0, 1 - timeTakenMs / timeLimitMs);
  const speedBonus = Math.round(basePoints * 0.5 * timeRatio);
  return basePoints + speedBonus;
}

// Streak multiplier
export function getStreakMultiplier(streak: number): number {
  if (streak >= 5) return 1.5;
  if (streak >= 3) return 1.25;
  if (streak >= 2) return 1.1;
  return 1;
}

// Validate email
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Truncate text
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

// Deep copy
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

// Percentage
export function percentage(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}

// Ordinal suffix
export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
