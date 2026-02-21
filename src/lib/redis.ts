/**
 * In-memory store replacing Redis for localhost single-instance deployment.
 * Provides the same API surface used by socket handlers and API routes.
 */

// ─── In-Memory Key-Value Store ────────────────────────────

interface StoreEntry {
  value: string;
  expiresAt?: number; // ms timestamp
}

const store = new Map<string, StoreEntry>();

// Sorted-set emulation: key → Map<member, score>
const sortedSets = new Map<string, Map<string, number>>();

// Counter emulation
const counters = new Map<string, number>();

// Cleanup expired keys periodically (every 30s)
setInterval(() => {
  const now = Date.now();
  const expiredKeys: string[] = [];
  store.forEach((entry, key) => {
    if (entry.expiresAt && entry.expiresAt <= now) {
      expiredKeys.push(key);
    }
  });
  expiredKeys.forEach(key => store.delete(key));
}, 30_000);

/**
 * Minimal Redis-compatible interface for the in-memory store.
 * Only the methods actually used by this codebase are implemented.
 */
export const redis = {
  async get(key: string): Promise<string | null> {
    const entry = store.get(key);
    if (!entry) return null;
    if (entry.expiresAt && entry.expiresAt <= Date.now()) {
      store.delete(key);
      return null;
    }
    return entry.value;
  },

  async set(key: string, value: string, ...args: any[]): Promise<'OK'> {
    let ttlMs: number | undefined;
    // Parse optional EX / PX arguments
    for (let i = 0; i < args.length; i++) {
      const flag = String(args[i]).toUpperCase();
      if (flag === 'EX' && args[i + 1] !== undefined) {
        ttlMs = Number(args[i + 1]) * 1000;
        i++;
      } else if (flag === 'PX' && args[i + 1] !== undefined) {
        ttlMs = Number(args[i + 1]);
        i++;
      }
    }
    store.set(key, {
      value,
      expiresAt: ttlMs ? Date.now() + ttlMs : undefined,
    });
    return 'OK';
  },

  async del(...keys: string[]): Promise<number> {
    let deleted = 0;
    for (const key of keys) {
      if (store.delete(key)) deleted++;
      if (sortedSets.delete(key)) deleted++;
      if (counters.delete(key)) deleted++;
    }
    return deleted;
  },

  async incr(key: string): Promise<number> {
    const current = counters.get(key) || 0;
    const next = current + 1;
    counters.set(key, next);
    return next;
  },

  async expire(key: string, seconds: number): Promise<number> {
    const entry = store.get(key);
    if (entry) {
      entry.expiresAt = Date.now() + seconds * 1000;
      return 1;
    }
    // For counters, wrap into store
    if (counters.has(key)) {
      store.set(key, {
        value: String(counters.get(key)),
        expiresAt: Date.now() + seconds * 1000,
      });
      return 1;
    }
    return 0;
  },

  async keys(pattern: string): Promise<string[]> {
    // Simple glob-to-regex conversion for session:*:* patterns
    const regexStr = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    const regex = new RegExp(`^${regexStr}$`);
    const matches: string[] = [];
    store.forEach((_entry, key) => {
      if (regex.test(key)) matches.push(key);
    });
    return matches;
  },

  async zadd(key: string, score: number, member: string): Promise<number> {
    let set = sortedSets.get(key);
    if (!set) {
      set = new Map();
      sortedSets.set(key, set);
    }
    const isNew = !set.has(member);
    set.set(member, score);
    return isNew ? 1 : 0;
  },

  async zrevrange(
    key: string,
    start: number,
    stop: number,
    withScores?: string
  ): Promise<string[]> {
    const set = sortedSets.get(key);
    if (!set) return [];

    const entries: Array<[string, number]> = [];
    set.forEach((score, member) => entries.push([member, score]));
    const sorted = entries.sort((a, b) => b[1] - a[1]);
    const sliced = sorted.slice(start, stop + 1);

    if (withScores?.toUpperCase() === 'WITHSCORES') {
      const result: string[] = [];
      for (const [member, score] of sliced) {
        result.push(member, String(score));
      }
      return result;
    }

    return sliced.map(([member]) => member);
  },
};

console.log('✅ In-memory store initialized (no Redis required)');

// ─── Session State Helpers ────────────────────────────────

const SESSION_PREFIX = 'session:';
const LEADERBOARD_PREFIX = 'leaderboard:';
const TIMER_PREFIX = 'timer:';

export const sessionKeys = {
  state: (sessionId: string) => `${SESSION_PREFIX}${sessionId}:state`,
  currentQuestion: (sessionId: string) => `${SESSION_PREFIX}${sessionId}:question`,
  participants: (sessionId: string) => `${SESSION_PREFIX}${sessionId}:participants`,
  answers: (sessionId: string, questionIndex: number) =>
    `${SESSION_PREFIX}${sessionId}:answers:${questionIndex}`,
  leaderboard: (sessionId: string) => `${LEADERBOARD_PREFIX}${sessionId}`,
  timer: (sessionId: string) => `${TIMER_PREFIX}${sessionId}`,
};

export async function setSessionState(sessionId: string, state: string): Promise<void> {
  await redis.set(sessionKeys.state(sessionId), state, 'EX', 86400); // 24h TTL
}

export async function getSessionState(sessionId: string): Promise<string | null> {
  return redis.get(sessionKeys.state(sessionId));
}

export async function updateLeaderboard(
  sessionId: string,
  participantId: string,
  score: number
): Promise<void> {
  await redis.zadd(sessionKeys.leaderboard(sessionId), score, participantId);
}

export async function getLeaderboard(
  sessionId: string,
  top: number = 10
): Promise<Array<{ participantId: string; score: number }>> {
  const results = await redis.zrevrange(
    sessionKeys.leaderboard(sessionId),
    0,
    top - 1,
    'WITHSCORES'
  );

  const leaderboard: Array<{ participantId: string; score: number }> = [];
  for (let i = 0; i < results.length; i += 2) {
    leaderboard.push({
      participantId: results[i],
      score: parseInt(results[i + 1], 10),
    });
  }
  return leaderboard;
}

export async function setTimer(sessionId: string, seconds: number): Promise<void> {
  const expiresAt = Date.now() + seconds * 1000;
  await redis.set(sessionKeys.timer(sessionId), expiresAt.toString(), 'EX', seconds + 5);
}

export async function getTimerRemaining(sessionId: string): Promise<number> {
  const expiresAt = await redis.get(sessionKeys.timer(sessionId));
  if (!expiresAt) return 0;
  const remaining = Math.max(0, parseInt(expiresAt, 10) - Date.now());
  return Math.ceil(remaining / 1000);
}
