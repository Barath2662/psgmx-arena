import Redis from 'ioredis';

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

function createRedisClient(): Redis {
  const url = process.env.REDIS_URL || 'redis://localhost:6379';
  
  const client = new Redis(url, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    lazyConnect: true,
  });

  client.on('error', (err) => {
    console.error('Redis connection error:', err.message);
  });

  client.on('connect', () => {
    console.log('✅ Redis connected');
  });

  return client;
}

export const redis = globalForRedis.redis ?? createRedisClient();

if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redis;

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
